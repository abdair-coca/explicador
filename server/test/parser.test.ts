import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type ArchBlock, type FlowBlock } from '../src/parser/index.ts';

const valid = `# Login

The form posts the credentials to the API.

<arch id="overview" title="Login architecture">
  <node id="form" label="Login form" kind="ui" ref="src/ui/login-form.js" />
  <node id="api" label="Auth routes" kind="service" ref="src/api/routes.js:12-30" />
  <node id="db" label="Users table" kind="store" />
  <edge from="form" to="api" label="POST /login" />
  <edge from="api" to="db" />
</arch>

Then the flow:

<flow id="login" title="Logging in">
  <node id="form" label="Login form" kind="ui" />
  <node id="api" label="Auth routes" kind="service" />
  <step from="form" to="api" label="POST /login" ref="src/api/routes.js:12">
    The form sends &quot;email&quot; and password.
  </step>
  <step from="api">Checks the password hash.</step>
</flow>

\`\`\`html
<arch>not a tag inside a fence</arch>
\`\`\`

See <https://example.com> for more.
`;

function errorsOf(source: string): string[] {
  const result = parseExl(source);
  assert.equal(result.ok, false, 'expected errors');
  return result.ok ? [] : result.errors.map((e) => `${e.line}:${e.column} ${e.message}`);
}

describe('parseExl: valid documents', () => {
  it('parses Markdown, <arch> and <flow> blocks in order', () => {
    const result = parseExl(valid);
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const types = result.scene.blocks.map((b) => b.type);
    assert.deepEqual(types, ['markdown', 'arch', 'markdown', 'flow', 'markdown']);

    const arch = result.scene.blocks[1] as ArchBlock;
    assert.equal(arch.id, 'overview');
    assert.equal(arch.nodes.length, 3);
    assert.deepEqual(arch.nodes[1]?.ref, { path: 'src/api/routes.js', start: 12, end: 30 });
    assert.equal(arch.nodes[2]?.kind, 'store');
    assert.deepEqual(arch.edges[0], { from: 'form', to: 'api', label: 'POST /login' });

    const flow = result.scene.blocks[3] as FlowBlock;
    assert.equal(flow.steps.length, 2);
    assert.equal(flow.steps[0]?.narration, 'The form sends "email" and password.');
    assert.equal(flow.steps[1]?.to, undefined);
  });

  it('leaves tags inside code fences and autolinks as Markdown', () => {
    const result = parseExl(valid);
    assert.ok(result.ok);
    const last = result.scene.blocks.at(-1);
    assert.equal(last?.type, 'markdown');
    assert.match(last?.type === 'markdown' ? last.text : '', /<arch>not a tag inside a fence<\/arch>/);
    assert.match(last?.type === 'markdown' ? last.text : '', /<https:\/\/example.com>/);
  });

  it('collects the referenced files without line ranges', () => {
    const result = parseExl(valid);
    assert.ok(result.ok);
    assert.deepEqual(result.refs, ['src/api/routes.js', 'src/ui/login-form.js']);
  });

  it('defaults ids, kinds and accepts CRLF line endings', () => {
    const result = parseExl('<arch title="A">\r\n<node id="a" label="A" />\r\n</arch>\r\n');
    assert.ok(result.ok);
    const arch = result.scene.blocks[0] as ArchBlock;
    assert.equal(arch.id, 'arch-1');
    assert.equal(arch.nodes[0]?.kind, 'module');
  });
});

describe('parseExl: invalid documents', () => {
  it('rejects unknown tags at the top level and inside blocks', () => {
    assert.match(errorsOf('<script>alert(1)</script>')[0] ?? '', /^1:1 Unknown tag <script>/);
    const inside = errorsOf('<arch title="A">\n  <node id="a" label="A" />\n  <div />\n</arch>');
    assert.deepEqual(inside, ['3:3 <div> is not allowed inside <arch>; use <node>, <group>, <edge>, <drill>']);
  });

  it('rejects child tags outside a block', () => {
    assert.deepEqual(errorsOf('<node id="a" label="A" />'), ['1:1 <node> must be inside <arch> or <flow>']);
  });

  it('rejects embedded JavaScript expressions', () => {
    const errors = errorsOf('<arch title={title}>\n</arch>');
    assert.match(errors[0] ?? '', /^1:13 Embedded expressions are not allowed/);
  });

  it('reports unknown and missing attributes, bad kinds, ids and refs', () => {
    const errors = errorsOf(
      [
        '<arch title="A" color="red">',
        '  <node id="1a" label="A" kind="robot" ref="../secret.txt" />',
        '  <node label="B" />',
        '</arch>',
      ].join('\n'),
    );
    assert.deepEqual(errors, [
      '1:17 Unknown attribute "color" on <arch>; allowed: id, title',
      '2:9 Invalid id "1a": start with a letter, then letters, digits, "-" or "_" (max 40)',
      '2:27 Unknown kind "robot"; use actor, ui, service, module, function, store, external',
      '2:40 Invalid ref "../secret.txt": the path must stay inside the project',
      '3:3 <node> is missing the "id" attribute',
    ]);
  });

  it('reports edges and steps that point to unknown nodes', () => {
    const errors = errorsOf(
      [
        '<flow title="F">',
        '  <node id="a" label="A" />',
        '  <step from="a" to="ghost">Goes nowhere.</step>',
        '</flow>',
      ].join('\n'),
    );
    assert.deepEqual(errors, ['3:18 "to" refers to unknown node "ghost"']);
  });

  it('requires narration, nodes and steps', () => {
    const errors = errorsOf('<flow title="F">\n  <node id="a" label="A" />\n  <step from="a"></step>\n</flow>');
    assert.match(errors[0] ?? '', /<step> needs narration text/);
    assert.match(errorsOf('<arch title="A"></arch>')[0] ?? '', /<arch> needs at least one <node>/);
    assert.match(errorsOf('<flow title="F"><node id="a" label="A" /></flow>')[0] ?? '', /needs at least one <step>/);
  });

  it('rejects duplicate node and scene ids', () => {
    const errors = errorsOf(
      '<arch id="x" title="A">\n<node id="a" label="A" />\n<node id="a" label="B" />\n</arch>\n<arch id="x" title="B"><node id="b" label="B" /></arch>',
    );
    assert.deepEqual(errors, ['3:1 Duplicate node id "a"', '1:1 Duplicate scene id "x"']);
  });

  it('requires at least one scene block', () => {
    assert.deepEqual(errorsOf('Just prose.'), ['1:1 A scene needs at least one <arch>, <flow>, <data> or <state>']);
  });

  it('rejects mismatched closing tags', () => {
    const errors = errorsOf('<arch title="A">\n<node id="a" label="A" />\n</flow>');
    assert.deepEqual(errors, ['3:1 Expected </arch> but found </flow>']);
  });
});

describe('parseExl: incomplete documents', () => {
  it('reports an unclosed block where it was opened', () => {
    const errors = errorsOf('Intro\n\n<arch title="A">\n  <node id="a" label="A" />\n');
    assert.deepEqual(errors, ['3:1 Unclosed <arch>: expected </arch>']);
  });

  it('reports input that ends inside a tag', () => {
    assert.deepEqual(errorsOf('<arch title="A">\n  <node id="a" lab'), [
      '2:3 Unexpected end of input inside the <node> tag',
    ]);
    assert.deepEqual(errorsOf('<arch title="A'), ['1:1 Unexpected end of input inside the <arch> tag']);
  });

  it('reports an unclosed step', () => {
    const errors = errorsOf('<flow title="F">\n<node id="a" label="A" />\n<step from="a">Half a sentence');
    assert.deepEqual(errors, ['3:1 Unclosed <step>: expected </step>']);
  });

  it('reports a literal "<" in narration', () => {
    const errors = errorsOf('<flow title="F">\n<node id="a" label="A" />\n<step from="a">a < b</step>\n</flow>');
    assert.match(errors[0] ?? '', /^3:18 Expected a tag name after "<"/);
  });
});

describe('parseExl: groups and drills', () => {
  const doc = [
    '<arch id="a" title="Shop">',
    '  <node id="form" label="Login form" kind="ui" />',
    '  <group id="auth" label="Auth" kind="service">',
    '    <node id="routes" label="Auth routes" ref="src/api/auth-routes.js" />',
    '    <group id="core" label="Core">',
    '      <node id="service" label="Auth service" />',
    '    </group>',
    '  </group>',
    '  <edge from="form" to="routes" />',
    '  <edge from="routes" to="core" label="calls" />',
    '  <drill node="routes" topic="auth routes" />',
    '</arch>',
    '<flow title="F">',
    '  <node id="x" label="X" />',
    '  <step from="x">Does it.</step>',
    '  <drill node="x" topic="x internals" />',
    '</flow>',
  ].join('\n');

  it('nests nodes in groups and keeps drills', () => {
    const result = parseExl(doc);
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const arch = result.scene.blocks[0] as ArchBlock;
    assert.deepEqual(arch.groups, [
      { id: 'auth', label: 'Auth', kind: 'service' },
      { id: 'core', label: 'Core', kind: 'module', parent: 'auth' },
    ]);
    assert.deepEqual(
      arch.nodes.map((n) => [n.id, n.group]),
      [
        ['form', undefined],
        ['routes', 'auth'],
        ['service', 'core'],
      ],
    );
    assert.deepEqual(arch.edges[1], { from: 'routes', to: 'core', label: 'calls' });
    assert.deepEqual(arch.drills, [{ node: 'routes', topic: 'auth routes' }]);
    assert.deepEqual((result.scene.blocks[1] as FlowBlock).drills, [{ node: 'x', topic: 'x internals' }]);
    assert.deepEqual(result.refs, ['src/api/auth-routes.js']);
  });

  it('rejects bad groups and drills', () => {
    const errors = errorsOf(
      [
        '<arch title="A">',
        '  <node id="a" label="A" />',
        '  <group id="g" label="G"></group>',
        '  <group id="a" label="Dup"><node id="b" label="B" /></group>',
        '  <drill node="g" topic="t" />',
        '  <drill node="ghost" topic="t" />',
        '  <drill node="a" topic="?" />',
        '  <drill node="a" topic="again" />',
        '</arch>',
      ].join('\n'),
    );
    assert.deepEqual(errors, [
      '3:3 <group> needs at least one <node>',
      '4:3 Duplicate node id "a"',
      '5:10 "node" must name a <node>: "g" is a <group>, which zooms in by itself',
      '6:10 "node" refers to unknown node "ghost"',
      '7:3 "topic" needs letters or digits',
      '8:10 Node "a" already has a <drill>',
    ]);
  });

  it('allows groups only in <arch> and steps only between nodes', () => {
    assert.match(
      errorsOf('<flow title="F"><node id="a" label="A" /><group id="g" label="G"><node id="b" label="B" /></group><step from="a">x</step></flow>')[0] ?? '',
      /<group> is not allowed inside <flow>/,
    );
  });
});

describe('parseExl: <data>', () => {
  const doc = [
    '<data id="model" title="Shop data">',
    '  <entity id="user" label="User" ref="src/db/users.js">',
    '    <field name="id" type="int" key="pk" />',
    '    <field name="email" type="string" key="unique" />',
    '  </entity>',
    '  <entity id="cart" label="Cart" ref="src/cart/cart-service.js">',
    '    <field name="userId" type="int" key="fk" />',
    '  </entity>',
    '  <entity id="session" label="Session" />',
    '  <relation from="user" to="cart" card="1-n" label="owns" />',
    '  <drill node="user" topic="users table" />',
    '</data>',
  ].join('\n');

  it('parses entities, fields, relations and drills', () => {
    const result = parseExl(doc);
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const block = result.scene.blocks[0];
    assert.equal(block?.type, 'data');
    if (block?.type !== 'data') return;
    assert.deepEqual(block.entities[0]?.fields, [
      { name: 'id', type: 'int', key: 'pk' },
      { name: 'email', type: 'string', key: 'unique' },
    ]);
    assert.deepEqual(block.entities[2], { id: 'session', label: 'Session', fields: [] });
    assert.deepEqual(block.relations, [{ from: 'user', to: 'cart', card: '1-n', label: 'owns' }]);
    assert.deepEqual(block.drills, [{ node: 'user', topic: 'users table' }]);
    assert.deepEqual(result.refs, ['src/cart/cart-service.js', 'src/db/users.js']);
  });

  it('rejects bad keys, cards, duplicates and unknown entities', () => {
    const errors = errorsOf(
      [
        '<data title="D">',
        '  <entity id="a" label="A">',
        '    <field name="x" key="primary" />',
        '    <field name="x" />',
        '  </entity>',
        '  <relation from="a" to="b" card="many" />',
        '  <drill node="ghost" topic="t" />',
        '</data>',
      ].join('\n'),
    );
    assert.deepEqual(errors, [
      '3:21 Unknown key "primary"; use pk, fk, unique',
      '4:5 Duplicate field "x" in "a"',
      '6:22 "to" refers to unknown entity "b"',
      '6:29 Unknown card "many"; use 1-1, 1-n, n-1, n-n',
      '7:10 "node" refers to unknown item "ghost"',
    ]);
  });

  it('reports a <field> outside an entity and an unclosed entity', () => {
    assert.deepEqual(errorsOf('<field name="x" />'), ['1:1 <field> must be inside a scene block']);
    assert.deepEqual(errorsOf('<data title="D">\n<entity id="a" label="A">\n<field name="x" />\n</data>'), [
      '4:1 Expected </entity> but found </data>',
    ]);
  });
});

describe('parseExl: <state>', () => {
  const doc = [
    '<state id="session" title="Session lifecycle">',
    '  <status id="anon" label="Anonymous" role="initial" />',
    '  <status id="active" label="Logged in" ref="src/auth/sessions.js:7-11" />',
    '  <status id="expired" label="Expired" role="final" />',
    '  <transition from="anon" to="active" event="login ok" ref="src/auth/auth-service.js" />',
    '  <transition from="active" to="anon" event="logout" />',
    '  <transition from="active" to="expired" event="1 h passes" />',
    '  <walk>',
    '    <go event="login ok">The password matches.</go>',
    '    <go event="logout">The cookie is cleared.</go>',
    '    <go event="login ok">Back in.</go>',
    '    <go event="1 h passes">The TTL runs out.</go>',
    '  </walk>',
    '  <drill node="active" topic="sessions" />',
    '</state>',
  ].join('\n');

  it('parses states, transitions and follows the walk from the initial state', () => {
    const result = parseExl(doc);
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const block = result.scene.blocks[0];
    if (block?.type !== 'state') return assert.fail('expected <state>');
    assert.deepEqual(
      block.states.map((s) => [s.id, s.role]),
      [
        ['anon', 'initial'],
        ['active', 'normal'],
        ['expired', 'final'],
      ],
    );
    assert.deepEqual(
      block.walk.map((w) => [w.transition, w.from, w.to]),
      [
        [0, 'anon', 'active'],
        [1, 'active', 'anon'],
        [0, 'anon', 'active'],
        [2, 'active', 'expired'],
      ],
    );
    assert.equal(block.walk[3]?.narration, 'The TTL runs out.');
    assert.deepEqual(result.refs, ['src/auth/auth-service.js', 'src/auth/sessions.js']);
  });

  it('needs exactly one initial state and a walk that follows real transitions', () => {
    const errors = errorsOf(
      [
        '<state title="S">',
        '  <status id="a" label="A" role="initial" />',
        '  <status id="b" label="B" role="initial" />',
        '  <status id="c" label="C" role="start" />',
        '  <transition from="a" to="b" event="go" />',
        '  <transition from="a" to="c" event="go" />',
        '  <transition from="b" to="z" event="x" />',
        '  <walk><go event="go">Ambiguous.</go><go event="nope">Nothing.</go></walk>',
        '</state>',
      ].join('\n'),
    );
    assert.deepEqual(errors, [
      '3:3 Only one <status> can have role="initial"',
      '4:28 Unknown role "start"; use initial, final',
      '7:24 "to" refers to unknown state "z"',
      '8:13 Several transitions leave "a" on event "go"',
      '8:43 No <transition> leaves "b" on event "nope"',
    ]);
    assert.match(errorsOf('<state title="S"><status id="a" label="A" /></state>')[0] ?? '', /needs one <status role="initial">/);
  });

  it('reports an unclosed walk step', () => {
    assert.deepEqual(errorsOf('<state title="S">\n<status id="a" label="A" role="initial" />\n<walk><go event="x">half'), [
      '3:7 Unclosed <go>: expected </go>',
    ]);
  });
});
