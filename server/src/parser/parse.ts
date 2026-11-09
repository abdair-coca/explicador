// EXL parser: Markdown with a closed catalog of JSX-like scene tags.
// Tags are recognized only at the start of a line outside code fences; everything else is Markdown.
import { readElement, ExlSyntaxError, type Element } from './reader.ts';
import {
  cardinalities,
  fieldKeys,
  nodeKinds,
  statusRoles,
  type Cardinality,
  type DataBlock,
  type Entity,
  type Field,
  type FieldKey,
  type StateBlock,
  type Status,
  type Transition,
  type WalkStep,
  type ArchEdge,
  type Drill,
  type Block,
  type ExlError,
  type FlowStep,
  type NodeKind,
  type ParseResult,
  type Ref,
  type SceneGroup,
  type SceneNode,
} from './types.ts';

interface TagSpec {
  attrs: Record<string, 'required' | 'optional'>;
  children?: readonly string[];
  /** Whether the tag holds text (narration) instead of being self-closing. */
  text?: boolean;
}

export const catalog: Record<string, TagSpec> = {
  arch: { attrs: { id: 'optional', title: 'required' }, children: ['node', 'group', 'edge', 'drill'] },
  flow: { attrs: { id: 'optional', title: 'required' }, children: ['node', 'step', 'drill'] },
  group: { attrs: { id: 'required', label: 'required', desc: 'optional', kind: 'optional' }, children: ['node', 'group'] },
  drill: { attrs: { node: 'required', topic: 'required' } },
  data: { attrs: { id: 'optional', title: 'required' }, children: ['entity', 'relation', 'drill'] },
  entity: { attrs: { id: 'required', label: 'required', desc: 'optional', ref: 'optional' }, children: ['field'] },
  field: { attrs: { name: 'required', type: 'optional', key: 'optional' } },
  relation: { attrs: { from: 'required', to: 'required', card: 'required', label: 'optional' } },
  state: { attrs: { id: 'optional', title: 'required' }, children: ['status', 'transition', 'walk', 'drill'] },
  status: { attrs: { id: 'required', label: 'required', desc: 'optional', role: 'optional', ref: 'optional' } },
  transition: { attrs: { from: 'required', to: 'required', event: 'required', ref: 'optional' } },
  walk: { attrs: {}, children: ['go'] },
  go: { attrs: { event: 'required' }, text: true },
  node: { attrs: { id: 'required', label: 'required', desc: 'optional', kind: 'optional', ref: 'optional' } },
  edge: { attrs: { from: 'required', to: 'required', label: 'optional' } },
  step: { attrs: { from: 'required', to: 'optional', label: 'optional', ref: 'optional' }, text: true },
};

const topLevelTags = ['arch', 'flow', 'data', 'state'];

export const limits = {
  idLength: 40,
  labelLength: 80,
  descLength: 80,
  titleLength: 120,
  topicLength: 80,
  fieldLength: 60,
  fields: 40,
  narrationLength: 600,
  nodes: 60,
  edges: 120,
  steps: 100,
} as const;

const ID = new RegExp(`^[A-Za-z][A-Za-z0-9_-]{0,${limits.idLength - 1}}$`);
const REF = /^([^:\s]+?)(?::(\d+)(?:-(\d+))?)?$/;
// A tag at the start of a line (up to 3 spaces, as Markdown allows). Autolinks such as <https://…> are not tags.
const LINE_TAG = /^( {0,3})<(\/?)([A-Za-z][\w-]*)(?![\w:@.-])/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

class Locator {
  private readonly lineStarts: number[] = [0];

  constructor(src: string) {
    for (let i = 0; i < src.length; i += 1) if (src[i] === '\n') this.lineStarts.push(i + 1);
  }

  error(offset: number, message: string): ExlError {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if ((this.lineStarts[mid] ?? 0) <= offset) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: offset - (this.lineStarts[low] ?? 0) + 1, message };
  }
}

export function parseExl(source: string): ParseResult {
  const src = source.replace(/\r\n?/g, '\n');
  const at = new Locator(src);
  const errors: ExlError[] = [];
  const blocks: Block[] = [];
  let markdownStart = 0;
  let pos = 0;
  let fence: string | undefined;

  const flushMarkdown = (end: number): void => {
    const text = src.slice(markdownStart, end).trim();
    if (text) blocks.push({ type: 'markdown', text });
  };

  while (pos < src.length) {
    const newline = src.indexOf('\n', pos);
    const lineEnd = newline === -1 ? src.length : newline;
    const line = src.slice(pos, lineEnd);
    const fenceMatch = FENCE.exec(line)?.[1];
    const tag = fence || fenceMatch ? undefined : LINE_TAG.exec(line);

    if (fence) {
      if (fenceMatch && fenceMatch[0] === fence[0] && fenceMatch.length >= fence.length) fence = undefined;
    } else if (fenceMatch) {
      fence = fenceMatch;
    } else if (tag) {
      const [, indent = '', closing, name = ''] = tag;
      const tagStart = pos + indent.length;
      if (closing) {
        errors.push(at.error(tagStart, `Unexpected closing tag </${name}>`));
        return { ok: false, errors };
      }
      if (!topLevelTags.includes(name)) {
        const parents = topLevelTags.filter((tag) => catalog[tag]?.children?.includes(name)).map((tag) => `<${tag}>`);
        const message = !catalog[name]
          ? `Unknown tag <${name}>. EXL top-level tags: ${topLevelTags.join(', ')}`
          : parents.length > 0
            ? `<${name}> must be inside ${parents.join(' or ')}`
            : `<${name}> must be inside a scene block`;
        errors.push(at.error(tagStart, message));
        return { ok: false, errors };
      }
      flushMarkdown(pos);
      let element: Element;
      let end: number;
      try {
        [element, end] = readElement(src, tagStart);
      } catch (error) {
        if (!(error instanceof ExlSyntaxError)) throw error;
        errors.push(at.error(error.offset, error.message));
        return { ok: false, errors };
      }
      const block = buildBlock(element, blocks.length + 1, (offset, message) => errors.push(at.error(offset, message)));
      if (block) blocks.push(block);
      markdownStart = end;
      pos = end;
      continue;
    }
    pos = lineEnd + 1;
  }
  flushMarkdown(src.length);

  checkBlockIds(blocks, errors);
  if (!blocks.some((block) => block.type !== 'markdown') && errors.length === 0) {
    errors.push({ line: 1, column: 1, message: 'A scene needs at least one <arch>, <flow>, <data> or <state>' });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, scene: { blocks }, refs: collectRefs(blocks) };
}

type Report = (offset: number, message: string) => void;

function buildBlock(element: Element, ordinal: number, report: Report): Block | undefined {
  if (element.name === 'data') return buildData(element, ordinal, report);
  if (element.name === 'state') return buildState(element, ordinal, report);
  const spec = catalog[element.name];
  if (!spec) return undefined;
  const attrs = readAttrs(element, spec, report);
  if (element.selfClosing) report(element.offset, `<${element.name}> must have children`);

  const id = attrs.id ?? `${element.name}-${ordinal}`;
  if (attrs.id !== undefined) checkId(attrs.id, element, report);
  const title = checkText(attrs.title ?? '', 'title', limits.titleLength, element, report);

  const nodes: SceneNode[] = [];
  const groups: SceneGroup[] = [];
  const edges: ArchEdge[] = [];
  const steps: FlowStep[] = [];
  const drills: Drill[] = [];
  const children = childElements(element, spec, report);

  const nodeIds = new Set<string>();
  const groupIds = new Set<string>();
  const claim = (id: string, child: Element): boolean => {
    if (!nodeIds.has(id) && !groupIds.has(id)) return true;
    report(child.offset, `Duplicate node id "${id}"`);
    return false;
  };
  const collect = (members: Element[], parent: string | undefined): void => {
    for (const child of members) {
      if (child.name === 'node') {
        const node = buildNode(child, report);
        if (!node || !claim(node.id, child)) continue;
        nodeIds.add(node.id);
        nodes.push(parent ? { ...node, group: parent } : node);
      } else if (child.name === 'group') {
        const group = buildGroup(child, report);
        const inner = childElements(child, catalog.group ?? { attrs: {} }, report);
        if (!group || !claim(group.id, child)) continue;
        groupIds.add(group.id);
        groups.push(parent ? { ...group, parent } : group);
        if (!inner.some((c) => c.name === 'node' || c.name === 'group')) {
          report(child.offset, '<group> needs at least one <node>');
        }
        collect(inner, group.id);
      }
    }
  };
  collect(children, undefined);

  const checkNodeRef = (value: string | undefined, attr: string, child: Element, allowGroups: boolean): void => {
    if (value === undefined || nodeIds.has(value) || (allowGroups && groupIds.has(value))) return;
    report(child.attrs.get(attr)?.offset ?? child.offset, `"${attr}" refers to unknown node "${value}"`);
  };
  for (const child of children.filter((c) => c.name !== 'node' && c.name !== 'group')) {
    const childSpec = catalog[child.name];
    if (!childSpec) continue;
    const a = readAttrs(child, childSpec, report);
    if (child.name === 'drill') {
      if (!child.selfClosing) report(child.offset, '<drill> must be self-closing: <drill node="a" topic="..." />');
      const offset = child.attrs.get('node')?.offset ?? child.offset;
      if (a.node !== undefined && !nodeIds.has(a.node)) {
        report(
          offset,
          groupIds.has(a.node)
            ? `"node" must name a <node>: "${a.node}" is a <group>, which zooms in by itself`
            : `"node" refers to unknown node "${a.node}"`,
        );
      } else if (a.node !== undefined && drills.some((d) => d.node === a.node)) {
        report(offset, `Node "${a.node}" already has a <drill>`);
      }
      const topic = checkText(a.topic ?? '', 'topic', limits.topicLength, child, report);
      if (topic && !/[\p{L}\p{N}]/u.test(topic)) report(child.offset, '"topic" needs letters or digits');
      if (a.node !== undefined && a.topic !== undefined) drills.push({ node: a.node, topic });
      continue;
    }
    checkNodeRef(a.from, 'from', child, child.name === 'edge');
    checkNodeRef(a.to, 'to', child, child.name === 'edge');
    const label = a.label === undefined ? undefined : checkText(a.label, 'label', limits.labelLength, child, report);
    if (child.name === 'edge') {
      if (!child.selfClosing) report(child.offset, '<edge> must be self-closing: <edge from="a" to="b" />');
      edges.push({ from: a.from ?? '', to: a.to ?? '', ...(label ? { label } : {}) });
    } else {
      const narration = child.children
        .map((c) => {
          if (c.kind === 'element') report(c.offset, `<${c.name}> is not allowed inside <step>`);
          return c.kind === 'text' ? c.text : '';
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (!narration) report(child.offset, '<step> needs narration text: <step from="a" to="b">What happens.</step>');
      else if (narration.length > limits.narrationLength) {
        report(child.offset, `Step narration is longer than ${limits.narrationLength} characters`);
      }
      const ref = a.ref === undefined ? undefined : parseRef(a.ref, child, report);
      steps.push({
        from: a.from ?? '',
        ...(a.to ? { to: a.to } : {}),
        ...(label ? { label } : {}),
        ...(ref ? { ref } : {}),
        narration,
      });
    }
  }

  if (nodes.length === 0) report(element.offset, `<${element.name}> needs at least one <node>`);
  if (nodes.length + groups.length > limits.nodes) {
    report(element.offset, `<${element.name}> has more than ${limits.nodes} nodes and groups`);
  }
  if (element.name === 'arch') {
    if (edges.length > limits.edges) report(element.offset, `<arch> has more than ${limits.edges} edges`);
    return { type: 'arch', id, title, nodes, groups, edges, drills };
  }
  if (steps.length === 0) report(element.offset, '<flow> needs at least one <step>');
  if (steps.length > limits.steps) report(element.offset, `<flow> has more than ${limits.steps} steps`);
  return { type: 'flow', id, title, nodes, steps, drills };
}

/** Child elements a tag allows; stray text and other tags are reported. */
function childElements(element: Element, spec: TagSpec, report: Report): Element[] {
  const children: Element[] = [];
  for (const child of element.children) {
    if (child.kind === 'text') {
      if (child.text.trim()) report(child.offset, `Text is not allowed directly inside <${element.name}>`);
      continue;
    }
    if (!spec.children?.includes(child.name)) {
      const allowed = (spec.children ?? []).map((name) => `<${name}>`).join(', ');
      report(child.offset, `<${child.name}> is not allowed inside <${element.name}>; use ${allowed}`);
      continue;
    }
    children.push(child);
  }
  return children;
}

function buildGroup(element: Element, report: Report): SceneGroup | undefined {
  const spec = catalog.group;
  if (!spec) return undefined;
  const a = readAttrs(element, spec, report);
  if (element.selfClosing) report(element.offset, '<group> must contain <node> elements');
  if (a.id === undefined || a.label === undefined) return undefined;
  checkId(a.id, element, report);
  const label = checkText(a.label, 'label', limits.labelLength, element, report);
  return { id: a.id, label, ...readDesc(a.desc, element, report), kind: parseKind(a.kind, element, report) };
}

/** The optional one-line `desc`, as a spreadable object. */
function readDesc(value: string | undefined, element: Element, report: Report): { desc?: string } {
  if (value === undefined) return {};
  const desc = checkText(value, 'desc', limits.descLength, element, report);
  return desc ? { desc } : {};
}

function parseKind(value: string | undefined, element: Element, report: Report): NodeKind {
  if (value === undefined) return 'module';
  if ((nodeKinds as readonly string[]).includes(value)) return value as NodeKind;
  report(element.attrs.get('kind')?.offset ?? element.offset, `Unknown kind "${value}"; use ${nodeKinds.join(', ')}`);
  return 'module';
}

function buildNode(element: Element, report: Report): SceneNode | undefined {
  const spec = catalog.node;
  if (!spec) return undefined;
  const a = readAttrs(element, spec, report);
  if (!element.selfClosing) report(element.offset, '<node> must be self-closing: <node id="a" label="A" />');
  if (a.id === undefined || a.label === undefined) return undefined;
  checkId(a.id, element, report);
  const label = checkText(a.label, 'label', limits.labelLength, element, report);
  const desc = readDesc(a.desc, element, report);
  const kind = parseKind(a.kind, element, report);
  const ref = a.ref === undefined ? undefined : parseRef(a.ref, element, report);
  return { id: a.id, label, ...desc, kind, ...(ref ? { ref } : {}) };
}

function readAttrs(element: Element, spec: TagSpec, report: Report): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};
  for (const [name, attr] of element.attrs) {
    if (!(name in spec.attrs)) {
      const allowed = Object.keys(spec.attrs).join(', ');
      report(attr.offset, `Unknown attribute "${name}" on <${element.name}>; allowed: ${allowed}`);
      continue;
    }
    values[name] = attr.value;
  }
  for (const [name, need] of Object.entries(spec.attrs)) {
    if (need === 'required' && values[name] === undefined) {
      report(element.offset, `<${element.name}> is missing the "${name}" attribute`);
    }
  }
  return values;
}

function checkId(id: string, element: Element, report: Report): void {
  if (!ID.test(id)) {
    report(
      element.attrs.get('id')?.offset ?? element.offset,
      `Invalid id "${id}": start with a letter, then letters, digits, "-" or "_" (max ${limits.idLength})`,
    );
  }
}

function checkText(value: string, attr: string, max: number, element: Element, report: Report): string {
  const offset = element.attrs.get(attr)?.offset ?? element.offset;
  const text = value.trim();
  if (/[\r\n]/.test(text)) report(offset, `"${attr}" must be a single line`);
  else if (!text) report(offset, `"${attr}" must not be empty`);
  else if (text.length > max) report(offset, `"${attr}" is longer than ${max} characters`);
  return text;
}

export function parseRefString(value: string): Ref | string {
  const m = REF.exec(value.trim());
  if (!m?.[1]) return 'expected "path", "path:line" or "path:start-end"';
  const path = m[1].replace(/^\.\//, '');
  if (path.includes('\\')) return 'use forward slashes in paths';
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return 'use a path relative to the project root';
  if (path.split('/').some((part) => part === '..' || part === '')) return 'the path must stay inside the project';
  const start = m[2] === undefined ? undefined : Number(m[2]);
  const end = m[3] === undefined ? undefined : Number(m[3]);
  if (start !== undefined && start < 1) return 'line numbers start at 1';
  if (start !== undefined && end !== undefined && end < start) return 'the end line is before the start line';
  return { path, ...(start !== undefined ? { start } : {}), ...(end !== undefined ? { end } : {}) };
}

function parseRef(value: string, element: Element, report: Report): Ref | undefined {
  const ref = parseRefString(value);
  if (typeof ref === 'string') {
    report(element.attrs.get('ref')?.offset ?? element.offset, `Invalid ref "${value}": ${ref}`);
    return undefined;
  }
  return ref;
}

function checkBlockIds(blocks: Block[], errors: ExlError[]): void {
  const seen = new Set<string>();
  for (const block of blocks) {
    if (block.type === 'markdown') continue;
    if (seen.has(block.id)) errors.push({ line: 1, column: 1, message: `Duplicate scene id "${block.id}"` });
    seen.add(block.id);
  }
}

function collectRefs(blocks: Block[]): string[] {
  const paths = new Set<string>();
  const add = (ref: Ref | undefined): void => {
    if (ref) paths.add(ref.path);
  };
  for (const block of blocks) {
    if (block.type === 'arch' || block.type === 'flow') block.nodes.forEach((node) => add(node.ref));
    if (block.type === 'flow') block.steps.forEach((step) => add(step.ref));
    if (block.type === 'data') block.entities.forEach((entity) => add(entity.ref));
    if (block.type === 'state') {
      block.states.forEach((status) => add(status.ref));
      block.transitions.forEach((transition) => add(transition.ref));
    }
  }
  return [...paths].sort();
}

/** id and title shared by every scene block. */
function blockHead(element: Element, spec: TagSpec, ordinal: number, report: Report): { id: string; title: string } {
  const attrs = readAttrs(element, spec, report);
  if (element.selfClosing) report(element.offset, `<${element.name}> must have children`);
  if (attrs.id !== undefined) checkId(attrs.id, element, report);
  return {
    id: attrs.id ?? `${element.name}-${ordinal}`,
    title: checkText(attrs.title ?? '', 'title', limits.titleLength, element, report),
  };
}

/** Reads a <drill> for a block whose clickable items have the given ids. */
function readDrill(child: Element, ids: Set<string>, drills: Drill[], report: Report): void {
  const a = readAttrs(child, catalog.drill ?? { attrs: {} }, report);
  if (!child.selfClosing) report(child.offset, '<drill> must be self-closing: <drill node="a" topic="..." />');
  const offset = child.attrs.get('node')?.offset ?? child.offset;
  if (a.node !== undefined && !ids.has(a.node)) report(offset, `"node" refers to unknown item "${a.node}"`);
  else if (a.node !== undefined && drills.some((d) => d.node === a.node)) report(offset, `"${a.node}" already has a <drill>`);
  const topic = checkText(a.topic ?? '', 'topic', limits.topicLength, child, report);
  if (topic && !/[\p{L}\p{N}]/u.test(topic)) report(child.offset, '"topic" needs letters or digits');
  if (a.node !== undefined && a.topic !== undefined) drills.push({ node: a.node, topic });
}

function narrationOf(element: Element, report: Report): string {
  const narration = element.children
    .map((c) => {
      if (c.kind === 'element') report(c.offset, `<${c.name}> is not allowed inside <${element.name}>`);
      return c.kind === 'text' ? c.text : '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!narration) report(element.offset, `<${element.name}> needs narration text`);
  else if (narration.length > limits.narrationLength) {
    report(element.offset, `Narration is longer than ${limits.narrationLength} characters`);
  }
  return narration;
}

function buildData(element: Element, ordinal: number, report: Report): DataBlock {
  const spec = catalog.data ?? { attrs: {} };
  const { id, title } = blockHead(element, spec, ordinal, report);
  const children = childElements(element, spec, report);
  const entities: Entity[] = [];
  const relations: DataBlock['relations'] = [];
  const drills: Drill[] = [];
  const ids = new Set<string>();

  for (const child of children.filter((c) => c.name === 'entity')) {
    const a = readAttrs(child, catalog.entity ?? { attrs: {} }, report);
    if (a.id === undefined || a.label === undefined) continue;
    checkId(a.id, child, report);
    if (ids.has(a.id)) report(child.offset, `Duplicate entity id "${a.id}"`);
    ids.add(a.id);
    const fields: Field[] = [];
    for (const row of childElements(child, catalog.entity ?? { attrs: {} }, report)) {
      const f = readAttrs(row, catalog.field ?? { attrs: {} }, report);
      if (!row.selfClosing) report(row.offset, '<field> must be self-closing: <field name="id" type="int" key="pk" />');
      if (f.name === undefined) continue;
      const name = checkText(f.name, 'name', limits.fieldLength, row, report);
      if (fields.some((existing) => existing.name === name)) report(row.offset, `Duplicate field "${name}" in "${a.id}"`);
      const type = f.type === undefined ? undefined : checkText(f.type, 'type', limits.fieldLength, row, report);
      let key: FieldKey | undefined;
      if (f.key !== undefined) {
        if ((fieldKeys as readonly string[]).includes(f.key)) key = f.key as FieldKey;
        else report(row.attrs.get('key')?.offset ?? row.offset, `Unknown key "${f.key}"; use ${fieldKeys.join(', ')}`);
      }
      fields.push({ name, ...(type ? { type } : {}), ...(key ? { key } : {}) });
    }
    if (fields.length > limits.fields) report(child.offset, `<entity> has more than ${limits.fields} fields`);
    const ref = a.ref === undefined ? undefined : parseRef(a.ref, child, report);
    entities.push({
      id: a.id,
      label: checkText(a.label, 'label', limits.labelLength, child, report),
      ...readDesc(a.desc, child, report),
      fields,
      ...(ref ? { ref } : {}),
    });
  }

  for (const child of children.filter((c) => c.name !== 'entity')) {
    if (child.name === 'drill') {
      readDrill(child, ids, drills, report);
      continue;
    }
    const a = readAttrs(child, catalog.relation ?? { attrs: {} }, report);
    if (!child.selfClosing) report(child.offset, '<relation> must be self-closing');
    for (const attr of ['from', 'to'] as const) {
      const value = a[attr];
      if (value !== undefined && !ids.has(value)) {
        report(child.attrs.get(attr)?.offset ?? child.offset, `"${attr}" refers to unknown entity "${value}"`);
      }
    }
    if (a.card !== undefined && !(cardinalities as readonly string[]).includes(a.card)) {
      report(child.attrs.get('card')?.offset ?? child.offset, `Unknown card "${a.card}"; use ${cardinalities.join(', ')}`);
    }
    const label = a.label === undefined ? undefined : checkText(a.label, 'label', limits.labelLength, child, report);
    relations.push({ from: a.from ?? '', to: a.to ?? '', card: (a.card ?? '1-n') as Cardinality, ...(label ? { label } : {}) });
  }

  if (entities.length === 0) report(element.offset, '<data> needs at least one <entity>');
  if (entities.length > limits.nodes) report(element.offset, `<data> has more than ${limits.nodes} entities`);
  if (relations.length > limits.edges) report(element.offset, `<data> has more than ${limits.edges} relations`);
  return { type: 'data', id, title, entities, relations, drills };
}

function buildState(element: Element, ordinal: number, report: Report): StateBlock {
  const spec = catalog.state ?? { attrs: {} };
  const { id, title } = blockHead(element, spec, ordinal, report);
  const children = childElements(element, spec, report);
  const states: Status[] = [];
  const transitions: Transition[] = [];
  const walk: WalkStep[] = [];
  const drills: Drill[] = [];
  const ids = new Set<string>();

  for (const child of children.filter((c) => c.name === 'status')) {
    const a = readAttrs(child, catalog.status ?? { attrs: {} }, report);
    if (!child.selfClosing) report(child.offset, '<status> must be self-closing: <status id="a" label="A" />');
    if (a.id === undefined || a.label === undefined) continue;
    checkId(a.id, child, report);
    if (ids.has(a.id)) report(child.offset, `Duplicate state id "${a.id}"`);
    ids.add(a.id);
    let role: Status['role'] = 'normal';
    if (a.role !== undefined) {
      if ((statusRoles as readonly string[]).includes(a.role)) role = a.role as Status['role'];
      else report(child.attrs.get('role')?.offset ?? child.offset, `Unknown role "${a.role}"; use ${statusRoles.join(', ')}`);
    }
    if (role === 'initial' && states.some((s) => s.role === 'initial')) {
      report(child.offset, 'Only one <status> can have role="initial"');
    }
    const ref = a.ref === undefined ? undefined : parseRef(a.ref, child, report);
    states.push({
      id: a.id,
      label: checkText(a.label, 'label', limits.labelLength, child, report),
      ...readDesc(a.desc, child, report),
      role,
      ...(ref ? { ref } : {}),
    });
  }

  for (const child of children.filter((c) => c.name === 'transition')) {
    const a = readAttrs(child, catalog.transition ?? { attrs: {} }, report);
    if (!child.selfClosing) report(child.offset, '<transition> must be self-closing');
    for (const attr of ['from', 'to'] as const) {
      const value = a[attr];
      if (value !== undefined && !ids.has(value)) {
        report(child.attrs.get(attr)?.offset ?? child.offset, `"${attr}" refers to unknown state "${value}"`);
      }
    }
    const event = checkText(a.event ?? '', 'event', limits.labelLength, child, report);
    const ref = a.ref === undefined ? undefined : parseRef(a.ref, child, report);
    transitions.push({ from: a.from ?? '', to: a.to ?? '', event, ...(ref ? { ref } : {}) });
  }

  const initial = states.find((s) => s.role === 'initial');
  if (states.length > 0 && !initial) report(element.offset, '<state> needs one <status role="initial">');
  const walks = children.filter((c) => c.name === 'walk');
  if (walks.length > 1) report(walks[1]?.offset ?? element.offset, 'Only one <walk> per <state>');
  const first = walks[0];
  if (first) {
    if (first.attrs.size > 0) readAttrs(first, catalog.walk ?? { attrs: {} }, report);
    let current = initial?.id;
    const steps = childElements(first, catalog.walk ?? { attrs: {} }, report);
    if (steps.length === 0) report(first.offset, '<walk> needs at least one <go>');
    for (const go of steps) {
      const a = readAttrs(go, catalog.go ?? { attrs: {} }, report);
      const narration = narrationOf(go, report);
      if (a.event === undefined || current === undefined) continue;
      const matches = transitions.flatMap((t, index) => (t.from === current && t.event === a.event ? [index] : []));
      const offset = go.attrs.get('event')?.offset ?? go.offset;
      if (matches.length === 0) {
        report(offset, `No <transition> leaves "${current}" on event "${a.event}"`);
        current = undefined;
        continue;
      }
      if (matches.length > 1) report(offset, `Several transitions leave "${current}" on event "${a.event}"`);
      const index = matches[0] ?? 0;
      const transition = transitions[index];
      if (!transition) continue;
      walk.push({ transition: index, from: transition.from, to: transition.to, event: transition.event, narration });
      current = transition.to;
    }
    if (walk.length > limits.steps) report(first.offset, `<walk> has more than ${limits.steps} steps`);
  }
  for (const child of children.filter((c) => c.name === 'drill')) readDrill(child, ids, drills, report);

  if (states.length === 0) report(element.offset, '<state> needs at least one <status>');
  if (states.length > limits.nodes) report(element.offset, `<state> has more than ${limits.nodes} states`);
  if (transitions.length > limits.edges) report(element.offset, `<state> has more than ${limits.edges} transitions`);
  return { type: 'state', id, title, states, transitions, walk, drills };
}
