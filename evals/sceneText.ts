// The text of a scene as a reader meets it, in order: the cover, the prose and every component's words (titles, boxes,
// steps, notes, checks). No ids, refs, code lines or decoration. The comprehension eval (F22) gives a small model this
// text and nothing else, so what is not in it cannot be understood from it.
import type { Block, Scene } from '../server/src/scene.ts';

/** Fields that point at something (ids, refs, kinds) and say nothing to a reader. */
const SKIP = new Set(['type', 'id', 'ref', 'kind', 'lines', 'cells', 'missing', 'drills', 'codes', 'node', 'dims', 'theme', 'accent', 'stage', 'winner', 'chartType', 'role', 'key', 'arc']);

const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** One value as a line of text: strings as they are, lists joined, objects field by field without the pointers. */
function inline(value: unknown): string {
  if (value === undefined || value === null || value === false) return '';
  if (typeof value === 'string') return clean(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(inline).filter(Boolean).join('; ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // A list value says its items twice (as text and as items): keep the items.
    const itemized = Array.isArray(record.items) && record.items.length > 0;
    return Object.entries(value)
      .filter(([key]) => !SKIP.has(key) && !(itemized && key === 'text'))
      .map(([key, item]) => ({ key, text: inline(item) }))
      .filter((part) => part.text !== '')
      .map((part) => (/^(label|text|name|value|title|narration|note|term)$/.test(part.key) ? part.text : `${part.key}: ${part.text}`))
      .join(' | ');
  }
  return '';
}

interface Boxed {
  id: string;
  label: string;
  desc?: string;
  about?: string;
}

const box = (item: Boxed): string => `- ${item.label}${item.desc ? `: ${clean(item.desc)}` : ''}${item.about ? ` (${clean(item.about)})` : ''}`;

/** What one block says, as lines; the heading names the tag and the title like a slide's heading. */
function blockLines(block: Block): string[] {
  switch (block.type) {
    case 'markdown':
      return [block.text];
    case 'theme':
      return [];
    case 'chapter':
      return [`## Chapter: ${block.title}`, ...(block.goal ? [`Goal: ${block.goal}`] : [])];
    case 'arch': {
      const label = new Map([...block.nodes, ...block.groups].map((item) => [item.id, item.label]));
      return [
        `## ${block.title}`,
        ...block.groups.map(box),
        ...block.nodes.map(box),
        ...block.edges.map((edge) => `- ${label.get(edge.from) ?? edge.from} → ${label.get(edge.to) ?? edge.to}${edge.label ? `: ${edge.label}` : ''}`),
        ...(block.codes ?? []).map((code) => `Code note: ${clean(code.note)}`),
      ];
    }
    case 'flow': {
      const label = new Map(block.nodes.map((item) => [item.id, item.label]));
      return [
        `## ${block.title}`,
        ...block.nodes.map(box),
        ...block.steps.map((step, i) => `${i + 1}. ${label.get(step.from) ?? step.from}${step.to ? ` → ${label.get(step.to) ?? step.to}` : ''}${step.label ? ` [${step.label}]` : ''}: ${clean(step.narration)}`),
        ...(block.codes ?? []).map((code) => `Code note: ${clean(code.note)}`),
      ];
    }
    case 'data': {
      const label = new Map(block.entities.map((item) => [item.id, item.label]));
      return [
        `## ${block.title}`,
        ...block.entities.map((entity) => `${box(entity)} — fields: ${entity.fields.map((field) => field.name).join(', ')}`),
        ...block.relations.map((rel) => `- ${label.get(rel.from) ?? rel.from} ${rel.card} ${label.get(rel.to) ?? rel.to}${rel.label ? `: ${rel.label}` : ''}`),
      ];
    }
    case 'state': {
      const label = new Map(block.states.map((item) => [item.id, item.label]));
      return [
        `## ${block.title}`,
        ...block.states.map(box),
        ...block.transitions.map((t) => `- ${label.get(t.from) ?? t.from} → ${label.get(t.to) ?? t.to}: ${t.event}`),
        ...block.walk.map((step, i) => `${i + 1}. ${step.event}: ${clean(step.narration)}`),
      ];
    }
    case 'structure': {
      const label = new Map(block.members.map((item) => [item.id, item.label]));
      const name = (id: string): string => label.get(id) ?? id;
      const shape = (block.states.at(-1)?.members ?? [])
        .map((place) => (place.parent === undefined ? `${name(place.id)} (top)` : `${name(place.id)} under ${name(place.parent)}${place.side ? ` (${place.side})` : ''}`))
        .join('; ');
      return [
        `## ${block.title}`,
        ...block.changes.map((change, i) => `${i + 1}. ${change.label}: ${clean(change.narration)}`),
        `${block.changes.length > 0 ? 'In the end' : 'Shape'}: ${shape}`,
        ...block.members.filter((member) => member.desc).map(box),
      ];
    }
    case 'annotated':
      return [`## ${block.title}`, block.passage, ...block.notes.map((note, i) => `${i + 1}. "${note.quote}"${note.label ? ` (${note.label})` : ''}: ${clean(note.narration)}`)];
    case 'argument':
      return [
        `## ${block.title}`,
        `Claim: ${block.claim}`,
        ...block.points.map((point) => `- ${point.side === 'support' ? 'For' : 'Against'}: ${point.label}: ${clean(point.narration)}${point.reply ? ` Reply: ${clean(point.reply)}` : ''}`),
        ...(block.verdict ? [`Verdict: ${block.verdict}`] : []),
      ];
    case 'system': {
      const label = new Map(block.factors.map((item) => [item.id, item.label]));
      const name = (id: string): string => label.get(id) ?? id;
      return [
        `## ${block.title}`,
        ...block.factors.map(box),
        ...block.links.map((link) => `- More ${name(link.from)} brings ${link.sign === 'same' ? 'more' : 'less'} ${name(link.to)}${link.label ? ` (${link.label})` : ''}`),
        ...block.loops.map((loop) => `Loop${loop.label ? ` "${loop.label}"` : ''} (${loop.kind}): ${loop.through.map(name).join(' → ')} → ${name(loop.through[0] ?? '')}`),
        ...block.steps.map((step, i) => `${i + 1}. ${name(step.factor)} goes ${step.change}${step.reversed ? ' (pushed back)' : ''}: ${clean(step.narration)}`),
      ];
    }
    case 'figure': {
      const said = (shape: (typeof block.shapes)[number]): string | undefined => (shape.kind === 'label' ? shape.text : shape.label);
      const at = (part: number): string[] => block.shapes.filter((shape) => shape.appear === part).flatMap((shape) => said(shape) ?? []);
      return [
        `## ${block.title}`,
        ...(at(0).length > 0 ? [`Drawn: ${at(0).join('; ')}`] : []),
        ...block.shows.map((show, i) => {
          const name = (index: number): string => block.shapes[index]?.id ?? String(index);
          const changes = [
            ...show.moves.map((move) => `${name(move.shape)} moves`),
            ...show.sets.map((set) => `${name(set.shape)} turns ${set.color}`),
            ...show.hides.map((index) => `${name(index)} disappears`),
            ...show.pulses.map((index) => `${name(index)} pulses`),
            ...show.flows.map((index) => `something travels along ${name(index)}`),
          ];
          const drawn = [...at(i + 1), ...changes];
          return `${i + 1}. ${drawn.length > 0 ? `${drawn.join('; ')}: ` : ''}${clean(show.narration)}`;
        }),
      ];
    }
    case 'derive':
      return [`## ${block.title}`, ...block.lines.map((line, i) => `${i + 1}. ${line.tex}${line.note ? ` — ${clean(line.note)}` : ''}`)];
    case 'compare':
      return [`## ${block.title}`, `Compared: ${block.a} | ${block.b}`, ...block.rows.map((row) => `- ${row.label}: ${block.a} = ${clean(row.a)}; ${block.b} = ${clean(row.b)}`)];
    case 'quiz':
      return [
        `## Check: ${block.question}`,
        ...block.options.map((option) => `- ${option.text}${option.correct ? ' (correct)' : ''}${option.why ? ` — ${clean(option.why)}` : ''}`),
        ...(block.answer ? [`Answer: ${clean(block.answer)}`] : []),
      ];
    case 'concept':
      return [`## Concept: ${block.term}`, `Definition: ${clean(block.define)}`, ...(block.analogy ? [`Analogy: ${clean(block.analogy)}`] : []), ...(block.formula ? [`Formula: ${block.formula}`] : []), ...(block.example ? [`Example: ${block.example.trim()}`] : [])];
    default: {
      const title = 'title' in block && typeof block.title === 'string' ? block.title : '';
      const rest = Object.entries(block)
        .filter(([key]) => !SKIP.has(key) && key !== 'title')
        .flatMap(([key, value]) => {
          if (Array.isArray(value)) return [`${key}:`, ...value.map((item) => `- ${inline(item)}`).filter((line) => line !== '- ')];
          const text = inline(value);
          return text ? [`${key}: ${text}`] : [];
        });
      return [`## ${title || block.type} (${block.type})`, ...rest];
    }
  }
}

/** The whole scene as plain text, blocks separated by a blank line. */
export function sceneText(scene: Scene): string {
  return scene.blocks
    .map((block) => blockLines(block).join('\n').trim())
    .filter(Boolean)
    .join('\n\n');
}
