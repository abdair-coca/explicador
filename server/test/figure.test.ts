import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type FigureBlock, type WithArc } from '../src/parser/index.ts';
import { codeWarnings, figureWarnings, formWarnings, subtitleWarnings } from '../src/rules.ts';

const shapes = [
  '<circle id="drop" x="60" y="24" r="14" color="blue" label="Raindrop" />',
  '<circle id="sun" x="6" y="9" r="4" color="yellow" label="Sun" />',
  '<arrow id="light" points="4 18 47 18" label="White light" />',
  '<arrow id="red" points="52 35 33 52" color="red" head="end" />',
  '<angle id="angle" at="32 53" from="70 53" to="52 35" color="red" label="42°" />',
  '<zone id="sky" points="0 0 100 0 100 10" color="gray" />',
  '<box id="ground" x="0" y="56" w="100" h="4" color="green" />',
  '<label id="note" x="80" y="45">Your eye</label>',
].join('\n');
const shows = ['<show items="sun light">Sunlight reaches the drop.</show>', '<show items="red angle">Red leaves at 42°.</show>'].join('\n');
const figure = (body = `${shapes}\n${shows}`, attrs = ''): string => `<figure title="The drop sends the light back"${attrs} arc="answer">\n${body}\n</figure>`;

const blockOf = (source: string): FigureBlock & WithArc => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  const block = parsed.scene.blocks.find((item) => item.type === 'figure');
  assert.ok(block && block.type === 'figure');
  return block;
};
const errorsOf = (source: string): string => {
  const parsed = parseExl(source);
  assert.equal(parsed.ok, false, 'expected errors');
  return parsed.ok ? '' : formatErrors(parsed.errors);
};

describe('<figure>', () => {
  it('reads every shape on its grid and the part each one appears in', () => {
    const block = blockOf(figure());
    assert.equal(block.arc, 'answer');
    assert.deepEqual([block.width, block.height], [100, 60]);
    assert.deepEqual(
      block.shapes.map((shape) => [shape.kind, shape.id, shape.appear]),
      [
        ['circle', 'drop', 0],
        ['circle', 'sun', 1],
        ['arrow', 'light', 1],
        ['arrow', 'red', 2],
        ['angle', 'angle', 2],
        ['zone', 'sky', 0],
        ['box', 'ground', 0],
        ['label', 'note', 0],
      ],
    );
    const light = block.shapes[2];
    assert.ok(light?.kind === 'arrow');
    assert.deepEqual(light.points, [[4, 18], [47, 18]]);
    assert.equal(light.head, 'end');
    assert.equal(light.color, 'ink');
    const note = block.shapes[7];
    assert.ok(note?.kind === 'label');
    assert.equal(note.text, 'Your eye');
    assert.deepEqual(block.shows.map((show) => show.items), [[1, 2], [3, 4]]);
    assert.equal(block.shows[1]?.narration, 'Red leaves at 42°.');
  });

  it('takes another grid, and a figure with no show', () => {
    const block = blockOf(figure('<box x="150" y="80" w="40" h="10" label="Wall" />', ' size="200 100"'));
    assert.deepEqual([block.width, block.height, block.shows.length], [200, 100, 0]);
    assert.match(errorsOf(figure('<box x="1" y="1" w="4" h="4" />', ' size="10 300"')), /"size" is the grid's width and height/);
  });

  it('refuses points outside the grid, bad numbers and bad lists', () => {
    assert.match(errorsOf(figure('<circle x="120" y="10" r="3" />')), /"x" 120 10 is outside the figure \(0–100 across, 0–60 down\)/);
    assert.match(errorsOf(figure('<box x="90" y="10" w="20" h="3" />')), /"w" 110 13 is outside the figure/);
    assert.match(errorsOf(figure('<circle x="ten" y="10" r="3" />')), /"x" must be a number/);
    assert.match(errorsOf(figure('<circle x="10" y="10" r="0" />')), /"r" must be a number of at least 0.5/);
    assert.match(errorsOf(figure('<arrow points="10 10 20" />')), /"points" is a list of points, each "x y" or a place on a shape/);
    assert.match(errorsOf(figure('<arrow points="10 10" />')), /"points" needs 2–12 points/);
    assert.match(errorsOf(figure('<zone points="1 1 5 5" />')), /"points" needs 3–16 points/);
    assert.match(errorsOf(figure('<angle at="10 10" from="10 10" to="20 20" />')), /"from" and "to" away from its corner/);
    assert.match(errorsOf(figure('<circle x="10" y="10" r="3" color="pink" />')), /Unknown color "pink"; use ink, red/);
    assert.match(errorsOf(figure('<arrow points="1 1 9 9" head="left" />')), /Unknown head "left"/);
    assert.match(errorsOf(figure('<label x="5" y="5" label="Sun" >Sun</label>')), /Unknown attribute "label" on <label>/);
  });

  it('refuses shows that name unknown or already shown shapes, and a figure with nothing at rest', () => {
    assert.match(errorsOf(figure(`${shapes}\n<show items="moon">The moon.</show>`)), /"items" names unknown shape "moon"/);
    assert.match(errorsOf(figure(`${shapes}\n<show items="sun">Sun.</show>\n<show items="sun">Again.</show>`)), /Shape "sun" already appears in an earlier <show>/);
    assert.match(errorsOf(figure('<circle id="a" x="5" y="5" r="2" />\n<show items="a">Only.</show>')), /Every shape waits for a <show>/);
    assert.match(errorsOf(figure('')), /<figure> needs at least one shape/);
    assert.match(errorsOf(figure(`${shapes}\n<show items="sun"></show>`)), /<show> needs narration text/);
    assert.match(errorsOf(figure('<circle id="a" x="5" y="5" r="2" />\n<circle id="a" x="9" y="5" r="2" />')), /Duplicate shape id "a"/);
  });

  it('moves, recolors, hides and pulses shapes on screen, and sends a dot along an arrow (F32)', () => {
    const block = blockOf(
      figure(
        `${shapes}\n${shows}\n<show move="drop: 70 30 80 30; note: 60 40" set="sun: orange" pulse="red" flow="light" ask="Where does the drop go?">The drop drifts.</show>\n<show hide="sun">The Sun sets.</show>`,
      ),
    );
    const third = block.shows[2];
    assert.deepEqual(third?.moves, [
      { shape: 0, path: [[70, 30], [80, 30]] },
      { shape: 7, path: [[60, 40]] },
    ]);
    assert.deepEqual(third?.sets, [{ shape: 1, color: 'orange' }]);
    assert.deepEqual([third?.pulses, third?.flows, third?.ask], [[3], [2], 'Where does the drop go?']);
    assert.equal(block.states.length, 5);
    assert.deepEqual(block.states[2]?.[0], { offset: [0, 0], color: 'blue', hidden: false });
    assert.deepEqual(block.states[3]?.[0], { offset: [20, 6], color: 'blue', hidden: false });
    assert.deepEqual(block.states[3]?.[7], { offset: [-20, -5], color: 'ink', hidden: false });
    assert.equal(block.states[3]?.[1]?.color, 'orange');
    assert.equal(block.states[4]?.[1]?.hidden, true);
    // The state carries on: the drop is still where it went.
    assert.deepEqual(block.states[4]?.[0]?.offset, [20, 6]);
  });

  it('refuses changes to shapes not drawn yet, hidden, unknown, or out of the grid, and a show that does nothing', () => {
    assert.match(errorsOf(figure(`${shapes}\n<show set="red: green">Too early.</show>\n<show items="red">Now.</show>`)), /"set" changes "red" before it is drawn: show it first/);
    assert.match(errorsOf(figure(`${shapes}\n<show hide="drop">Gone.</show>\n<show move="drop: 10 10">Moves.</show>`)), /"move" changes "drop", which an earlier <show> hid/);
    assert.match(errorsOf(figure(`${shapes}\n<show pulse="moon">Moon.</show>`)), /"pulse" names unknown shape "moon"/);
    assert.match(errorsOf(figure(`${shapes}\n<show move="drop: 120 10">Away.</show>`)), /"move" 120 10 is outside the figure/);
    assert.match(errorsOf(figure(`${shapes}\n<show move="drop 10 10">Bad.</show>`)), /"move" is "id: …" pairs separated by ";"/);
    assert.match(errorsOf(figure(`${shapes}\n<show set="drop: pink">Pink.</show>`)), /Unknown set "pink"/);
    assert.match(errorsOf(figure(`${shapes}\n<show flow="drop">Dot.</show>`)), /"flow" sends a dot along an <arrow> or an <arc>; "drop" is a <circle>/);
    assert.match(errorsOf(figure(`${shapes}\n<show>Nothing.</show>`)), /A <show> needs something to show/);
  });

  it('places points on shapes declared before, and draws normals (F33)', () => {
    const block = blockOf(
      figure(
        [
          '<circle id="drop" x="60" y="24" r="10" />',
          '<box id="wall" x="10" y="40" w="20" h="10" />',
          '<arrow id="ray" points="5 24 drop.left" />',
          '<arrow id="bounce" points="drop@0 drop@90 wall.top-right" />',
          '<normal id="n" at="drop@180" length="10" />',
          '<normal id="m" at="wall.top" />',
          '<angle at="drop.center" from="ray.start" to="bounce.middle" />',
          '<label x="50" y="5">Sky</label>',
          '<show move="drop: wall.center">It falls.</show>',
        ].join('\n'),
      ),
    );
    const at = (i: number) => block.shapes[i];
    const ray = at(2);
    assert.ok(ray?.kind === 'arrow');
    assert.deepEqual(ray.points, [[5, 24], [50, 24]]);
    const bounce = at(3);
    assert.ok(bounce?.kind === 'arrow');
    assert.deepEqual(bounce.points.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]), [[70, 24], [60, 34], [30, 40]]);
    const n = at(4);
    assert.ok(n?.kind === 'normal');
    assert.deepEqual([n.at, n.points, n.color], [[50, 24], [[55, 24], [45, 24]], 'gray']);
    const m = at(5);
    assert.ok(m?.kind === 'normal');
    assert.deepEqual(m.points, [[20, 46], [20, 34]]);
    const angle = at(6);
    assert.ok(angle?.kind === 'angle');
    assert.deepEqual([angle.at, angle.from], [[60, 24], [5, 24]]);
    assert.deepEqual(block.states[1]?.[0]?.offset, [-40, 21]);
  });

  it('refuses places on unknown shapes, on later ones, and places a shape does not have', () => {
    assert.match(errorsOf(figure('<arrow points="1 1 drop.left" />\n<circle id="drop" x="50" y="20" r="5" />')), /"points" names "drop", which is no shape declared before this one/);
    assert.match(errorsOf(figure('<box id="b" x="1" y="1" w="5" h="5" />\n<arrow points="1 1 b@30" />')), /"b@30" is no place on <box> "b"; use b.center, b.left/);
    assert.match(errorsOf(figure('<circle id="c" x="10" y="10" r="5" />\n<arrow points="1 1 c.start" />')), /use c.center, c.left, c.right, c.top, c.bottom, or c@degrees/);
    assert.match(errorsOf(figure('<arrow points="1 1 here" />')), /"here" is neither a number nor a place on a shape/);
    assert.match(errorsOf(figure('<circle id="c" x="10" y="10" r="5" />\n<normal at="c.center" />')), /<normal at> is a point on the edge of a circle/);
    assert.match(errorsOf(figure('<circle id="c" x="98" y="10" r="5" />\n<arrow points="1 1 c@0" />')), /"points" 103 10 is outside the figure/);
  });

  it('warns when an arrow stops short, an angle is drawn at another angle, or a shape hides a label', () => {
    const warn = (body: string): string => figureWarnings([blockOf(figure(body))]).join('\n');
    const drop = '<circle id="drop" x="60" y="24" r="10" label="Drop" />';
    assert.match(warn(`${drop}\n<arrow id="ray" points="5 24 48.5 24" />`), /the arrow "ray" ends 1.5 from the edge of "drop": end it on the edge with a place on the shape \(drop@180\)/);
    assert.equal(warn(`${drop}\n<arrow id="ray" points="5 24 drop.left" />`), '');
    assert.equal(warn(`${drop}\n<arrow id="ray" points="drop.center 95 24" />`), '', 'a line from the middle means it');
    assert.equal(warn(`${drop}\n<arrow id="ray" points="5 5 20 5" />`), '', 'far away');
    assert.match(warn(`${drop}\n<angle id="a" at="10 50" from="30 50" to="20 38" label="42°" />`), /the angle "a" says 42° but is drawn at 50°/);
    assert.equal(warn(`${drop}\n<angle id="a" at="10 50" from="30 50" to="20 41" label="42°" />`), '');
    assert.match(warn(`${drop}\n<box id="car" x="55" y="20" w="10" h="8" />`), /"car" covers the middle of "drop" and hides its label "Drop"/);
    assert.equal(warn(`${drop}\n<box id="car" x="55" y="20" w="10" h="8" />\n<show items="car">Later.</show>`), '', 'it arrives later');
  });

  it('draws pictograms, arcs and measures, with their places (F34)', () => {
    const block = blockOf(
      figure(
        [
          '<icon id="sun" kind="sun" x="10" y="10" color="orange" label="Sun" />',
          '<icon id="light" kind="signal" x="50" y="20" size="6" color="red" />',
          '<arc id="bow" x="50" y="52" r="40" from="200" to="340" color="red" label="Bow" />',
          '<arc id="orbit" x="80" y="30" r="10" from="0" to="0" head="end" />',
          '<measure id="m" from="sun.right" to="light.left" offset="2">33 m</measure>',
          '<arrow points="sun.bottom bow@270 bow.end" />',
          '<show set="light: green" flow="orbit">Green.</show>',
        ].join('\n'),
      ),
    );
    const [sun, light, bow, orbit, measure, arrow] = block.shapes;
    assert.ok(sun?.kind === 'icon' && light?.kind === 'icon' && bow?.kind === 'arc' && orbit?.kind === 'arc' && measure?.kind === 'measure' && arrow?.kind === 'arrow');
    assert.deepEqual([sun.icon, sun.size, light.size, light.color], ['sun', 8, 6, 'red']);
    assert.deepEqual([bow.from, bow.to, bow.head, orbit.head], [200, 340, 'none', 'end']);
    assert.equal(measure.label, '33 m');
    // From (14, 10) to (47, 20), moved 2 to the left of the way it runs.
    const [[ax, ay], [bx, by]] = measure.points.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]) as [[number, number], [number, number]];
    assert.ok(Math.abs(ax - 14.58) < 0.01 && Math.abs(ay - 8.09) < 0.01 && Math.abs(bx - 47.58) < 0.01 && Math.abs(by - 18.09) < 0.01, JSON.stringify(measure.points));
    assert.deepEqual(arrow.points.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), [[10, 14], [50, 12], [87.6, 38.3]]);
    assert.equal(block.states[1]?.[1]?.color, 'green');
    assert.deepEqual(block.shows[0]?.flows, [3]);
  });

  it('refuses unknown pictograms and measures without a length or a distance', () => {
    assert.match(errorsOf(figure('<icon kind="dragon" x="10" y="10" />')), /Unknown kind "dragon"; use sun, eye, person, car/);
    assert.match(errorsOf(figure('<measure from="1 1" to="1 1">0 m</measure>')), /<measure> needs "from" and "to" apart/);
    assert.match(errorsOf(figure('<measure from="1 1" to="9 1"></measure>')), /<measure> needs narration text/);
    assert.match(errorsOf(figure('<icon id="i" kind="eye" x="10" y="10" />\n<arrow points="1 1 i@30" />')), /"i@30" is no place on <icon> "i"/);
  });

  it('keeps a one-line description of a shape, for the page to show on a click (F35)', () => {
    const block = blockOf(figure('<circle id="drop" x="50" y="20" r="5" label="Drop" desc="Water, round because of its surface tension" />'));
    assert.equal(block.shapes[0]?.desc, 'Water, round because of its surface tension');
    assert.match(errorsOf(figure(`<circle x="50" y="20" r="5" desc="${'a'.repeat(81)}" />`)), /"desc" is longer than 80 characters/);
  });

  it('keeps to its limits', () => {
    const many = Array.from({ length: 41 }, (_, i) => `<circle x="${(i % 10) * 9 + 5}" y="${Math.floor(i / 10) * 10 + 5}" r="1" />`).join('\n');
    assert.match(errorsOf(figure(many)), /more than 40 shapes/);
    assert.match(errorsOf(figure(`<label x="5" y="5">${'a'.repeat(61)}</label>`)), /up to 60 characters/);
  });

  it('draws the forms structure and process, asks short subtitles, and asks no code of a scene without files', () => {
    const scene = (form: string): string =>
      `# Why is it red on top?\n\n<brief form="${form}">\n<audience>Anyone</audience>\n<question>Why?</question>\n<example>One drop at 42°</example>\n<misconception>That it is an object</misconception>\n<check>Predict the colour on top</check>\n<terms>dispersion</terms>\n</brief>\n\n${figure()}`;
    for (const form of ['process', 'structure']) {
      const parsed = parseExl(scene(form));
      assert.ok(parsed.ok);
      assert.deepEqual(formWarnings(parsed.scene), [], form);
    }
    const long = blockOf(figure(`${shapes}\n<show items="sun">${'word '.repeat(30)}</show>`));
    assert.match(subtitleWarnings([long]).join('\n'), /<figure> "The drop sends the light back" show 1 \(30 words\)/);
    assert.deepEqual(codeWarnings([blockOf(figure())], []), []);
  });
});
