import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildStandalone, exportCsp, ExportError } from '../src/export/index.ts';
import type { ScenePayload } from '../src/scene.ts';
import { fakeViewer, tempProject } from './helpers.ts';


const scene: ScenePayload = {
  version: 3,
  topic: 'Login <&> "quotes"',
  key: 'login',
  status: 'fresh',
  changes: [],
  savedAt: '2026-11-09T00:00:00Z',
  trail: [],
  blocks: [{ type: 'markdown', text: '</script><script>alert(1)</script>   done' }],
};

describe('buildStandalone', () => {
  it('inlines the viewer and embeds the scene in one file', () => {
    const html = buildStandalone(tempProject(fakeViewer), scene);
    assert.ok(!/\ssrc="/.test(html), 'no external scripts');
    assert.ok(!/\shref="(?!data:)/.test(html), 'no external stylesheets');
    assert.ok(html.includes(`content="${exportCsp}"`), 'CSP forbids network access');
    assert.match(exportCsp, /default-src 'none'/);
    assert.ok(html.includes('const s = "<\\/script>"; const r = "$&$1";'), 'script kept verbatim apart from </script');
    assert.ok(html.includes('<style>body{color:red}/* <\\/style> */</style>'));
    assert.ok(html.includes('<title>Login &#60;&#38;&#62; &#34;quotes&#34; · Explicador</title>'));
  });

  it('embeds the scene as JSON that cannot close its script element', () => {
    const html = buildStandalone(tempProject(fakeViewer), scene);
    const match = /<script type="application\/json" id="explicador-scene">([\s\S]*?)<\/script>/.exec(html);
    assert.ok(match?.[1]);
    assert.ok(!match[1].includes('<'));
    assert.deepEqual(JSON.parse(match[1]), scene);
    // Exactly the JSON element and the inlined module: the scene text added no script.
    assert.equal(html.match(/<script\b/g)?.length, 2);
  });

  it('fails clearly when the viewer is not built or an asset is missing', () => {
    assert.throws(() => buildStandalone(tempProject(), scene), ExportError);
    const broken: Record<string, string> = { ...fakeViewer };
    delete broken['assets/index-abc.css'];
    assert.throws(() => buildStandalone(tempProject(broken), scene), /Missing viewer asset/);
  });
});
