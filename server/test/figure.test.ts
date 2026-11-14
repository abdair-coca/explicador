import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type FigureBlock, type WithArc } from '../src/parser/index.ts';
import { codeWarnings, formWarnings, subtitleWarnings } from '../src/rules.ts';

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
    assert.match(errorsOf(figure('<arrow points="10 10 20" />')), /"points" is a list of "x y" pairs/);
    assert.match(errorsOf(figure('<arrow points="10 10" />')), /"points" needs 2–12 "x y" pairs/);
    assert.match(errorsOf(figure('<zone points="1 1 5 5" />')), /"points" needs 3–16 "x y" pairs/);
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
