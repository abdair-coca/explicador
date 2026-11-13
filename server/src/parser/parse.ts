// EXL parser: Markdown with a closed catalog of JSX-like scene tags.
// Tags are recognized only at the start of a line outside code fences; everything else is Markdown.
import { readElement, ExlSyntaxError, type Element } from './reader.ts';
import {
  blockHead,
  catalog,
  checkId,
  checkMath,
  checkText,
  childElements,
  limits,
  narrationOf,
  parseRef,
  readAbout,
  readAttrs,
  readCode,
  readDesc,
  readDrill,
  topLevelTags,
  withCodes,
  type Report,
} from './common.ts';
import { buildCalc, buildChapter, buildChart, buildConcept, buildJourney, buildMatrix, buildQuiz, buildStats, buildTheme, buildThreshold, buildTrace } from './lesson.ts';
import { buildCompare, buildCosine, buildDerive, buildPlot, buildScatter, buildSpace, buildTimeline } from './visuals.ts';
import {
  cardinalities,
  fieldKeys,
  linkKinds,
  nodeKinds,
  statusRoles,
  type Cardinality,
  type LinkKind,
  type DataBlock,
  type Entity,
  type Field,
  type FieldKey,
  type StateBlock,
  type Status,
  type Transition,
  type WalkStep,
  type ArchEdge,
  type CodeSnippet,
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

export { catalog, limits, parseRefString, topLevelTags } from './common.ts';

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
    const raw = src.slice(markdownStart, end);
    const text = raw.trim();
    if (!text) return;
    checkMath(text, markdownStart + raw.indexOf(text), (offset, message) => errors.push(at.error(offset, message)), true);
    blocks.push({ type: 'markdown', text });
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

  checkTheme(blocks, errors);
  checkBlockIds(blocks, errors);
  checkChapterStages(blocks, errors);
  if (!blocks.some((block) => block.type !== 'markdown' && block.type !== 'theme') && errors.length === 0) {
    errors.push({ line: 1, column: 1, message: 'A scene needs at least one scene tag, such as <arch>, <flow>, <journey> or <chapter>' });
  }
  if (blocks.filter((block) => block.type === 'chapter').length > limits.chapters) {
    errors.push({ line: 1, column: 1, message: `A lesson has at most ${limits.chapters} chapters` });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, scene: { blocks }, refs: collectRefs(blocks) };
}

const builders: Record<string, (element: Element, ordinal: number, report: Report) => Block> = {
  data: buildData,
  state: buildState,
  chapter: buildChapter,
  stats: buildStats,
  journey: buildJourney,
  trace: buildTrace,
  chart: buildChart,
  matrix: buildMatrix,
  quiz: buildQuiz,
  calc: buildCalc,
  threshold: buildThreshold,
  concept: buildConcept,
  theme: buildTheme,
  plot: buildPlot,
  derive: buildDerive,
  scatter: buildScatter,
  compare: buildCompare,
  timeline: buildTimeline,
  space: buildSpace,
  cosine: buildCosine,
};

function buildBlock(element: Element, ordinal: number, report: Report): Block | undefined {
  const build = builders[element.name];
  if (build) return build(element, ordinal, report);
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
  const codes: CodeSnippet[] = [];
  const children = childElements(element, spec, report);

  const nodeIds = new Set<string>();
  const groupIds = new Set<string>();
  /** Where each step starts, for the continuity check. */
  const stepStarts: { from: string; offset: number }[] = [];
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
    if (child.name === 'code') {
      readCode(child, nodeIds, codes, report);
      continue;
    }
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
    const kind = readLinkKind(a.kind, child, report);
    if (child.name === 'edge') {
      if (!child.selfClosing) report(child.offset, '<edge> must be self-closing: <edge from="a" to="b" />');
      edges.push({ from: a.from ?? '', to: a.to ?? '', ...(label ? { label } : {}), ...(kind ? { kind } : {}) });
    } else {
      if (kind === 'return' && !a.to) {
        report(child.offset, 'A <step kind="return"> needs "to": the node the answer goes back to');
      }
      stepStarts.push({ from: a.from ?? '', offset: child.attrs.get('from')?.offset ?? child.offset });
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
        ...(kind ? { kind } : {}),
        ...(ref ? { ref } : {}),
        narration,
      });
    }
  }
  checkContinuity(stepStarts, steps, nodeIds, report);

  if (nodes.length === 0) report(element.offset, `<${element.name}> needs at least one <node>`);
  if (nodes.length + groups.length > limits.nodes) {
    report(element.offset, `<${element.name}> has more than ${limits.nodes} nodes and groups`);
  }
  if (element.name === 'arch') {
    if (edges.length > limits.edges) report(element.offset, `<arch> has more than ${limits.edges} edges`);
    return { type: 'arch', id, title, nodes, groups, edges, drills, ...withCodes(codes) };
  }
  if (steps.length === 0) report(element.offset, '<flow> needs at least one <step>');
  if (steps.length > limits.steps) report(element.offset, `<flow> has more than ${limits.steps} steps`);
  return { type: 'flow', id, title, nodes, steps, drills, ...withCodes(codes) };
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

/** `kind` of an edge or step; undefined for a call, the default. */
function readLinkKind(value: string | undefined, element: Element, report: Report): Exclude<LinkKind, 'call'> | undefined {
  if (value === undefined || value === 'call') return undefined;
  if ((linkKinds as readonly string[]).includes(value)) return value as Exclude<LinkKind, 'call'>;
  report(element.attrs.get('kind')?.offset ?? element.offset, `Unknown kind "${value}"; use ${linkKinds.join(', ')}`);
  return undefined;
}

/**
 * A flow is one story: after the first step, every step starts at a node an earlier step
 * already reached, so the highlight never jumps to a part nobody has called yet.
 */
function checkContinuity(starts: { from: string; offset: number }[], steps: FlowStep[], nodeIds: Set<string>, report: Report): void {
  const inPlay: string[] = [];
  steps.forEach((step, i) => {
    const start = starts[i];
    if (i > 0 && start && nodeIds.has(step.from) && !inPlay.includes(step.from)) {
      report(
        start.offset,
        `Step ${i + 1} starts at "${step.from}", which no earlier step reached. ` +
          `Start it at a node already in the story (${inPlay.join(', ')}) or first add the step that reaches "${step.from}"`,
      );
    }
    for (const id of [step.from, step.to]) if (id && !inPlay.includes(id)) inPlay.push(id);
  });
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
  if (a.id === undefined || a.label === undefined) return undefined;
  checkId(a.id, element, report);
  const label = checkText(a.label, 'label', limits.labelLength, element, report);
  const desc = readDesc(a.desc, element, report);
  const about = readAbout(element, [], report);
  const kind = parseKind(a.kind, element, report);
  const ref = a.ref === undefined ? undefined : parseRef(a.ref, element, report);
  return { id: a.id, label, ...desc, ...about, kind, ...(ref ? { ref } : {}) };
}

/** One <theme> at most, and before every other tag: it dresses the whole scene. */
function checkTheme(blocks: Block[], errors: ExlError[]): void {
  const tags = blocks.filter((block) => block.type !== 'markdown');
  const themes = tags.filter((block) => block.type === 'theme');
  if (themes.length > 1) errors.push({ line: 1, column: 1, message: 'Only one <theme> per scene; a chapter can take its own with <chapter theme="…">' });
  else if (themes.length === 1 && tags[0]?.type !== 'theme') {
    errors.push({ line: 1, column: 1, message: 'Put <theme> before every other tag, right after the title' });
  }
}

function checkBlockIds(blocks: Block[], errors: ExlError[]): void {
  const seen = new Set<string>();
  for (const block of blocks) {
    if (block.type === 'markdown') continue;
    if (seen.has(block.id)) errors.push({ line: 1, column: 1, message: `Duplicate scene id "${block.id}"` });
    seen.add(block.id);
  }
}

/** A chapter's `stage` names a stage of a <journey> in the scene: the map its card shows. */
function checkChapterStages(blocks: Block[], errors: ExlError[]): void {
  const stages = blocks.flatMap((block) => (block.type === 'journey' ? block.stages.map((stage) => stage.id) : []));
  for (const block of blocks) {
    if (block.type !== 'chapter' || block.stage === undefined || stages.includes(block.stage)) continue;
    errors.push({
      line: 1,
      column: 1,
      message:
        stages.length === 0
          ? `Chapter "${block.title}" names stage="${block.stage}", but the scene has no <journey>: add one in the intro with a <stage> per step of the process`
          : `Chapter "${block.title}" names stage="${block.stage}", which no <journey> has; the stages are ${stages.join(', ')}`,
    });
  }
}

function collectRefs(blocks: Block[]): string[] {
  const paths = new Set<string>();
  const add = (ref: Ref | undefined): void => {
    if (ref) paths.add(ref.path);
  };
  for (const block of blocks) {
    switch (block.type) {
      case 'arch':
        block.nodes.forEach((node) => add(node.ref));
        break;
      case 'flow':
        block.nodes.forEach((node) => add(node.ref));
        block.steps.forEach((step) => add(step.ref));
        break;
      case 'data':
        block.entities.forEach((entity) => add(entity.ref));
        break;
      case 'state':
        block.states.forEach((status) => add(status.ref));
        block.transitions.forEach((transition) => add(transition.ref));
        break;
      case 'journey':
        block.stages.forEach((stage) => add(stage.ref));
        break;
      case 'stats':
        block.stats.forEach((stat) => add(stat.ref));
        break;
      case 'trace':
        add(block.ref);
        block.values.forEach((value) => add(value.ref));
        break;
      case 'chapter':
      case 'chart':
      case 'matrix':
      case 'threshold':
      case 'concept':
      case 'plot':
      case 'derive':
      case 'scatter':
      case 'compare':
      case 'space':
      case 'cosine':
        add(block.ref);
        break;
      case 'timeline':
        add(block.ref);
        block.events.forEach((event) => add(event.ref));
        break;
      case 'calc':
        add(block.ref);
        block.parts.forEach((part) => add(part.ref));
        break;
      default:
        break;
    }
    if ('codes' in block) block.codes?.forEach((code) => add(code.ref));
  }
  return [...paths].sort();
}

function buildData(element: Element, ordinal: number, report: Report): DataBlock {
  const spec = catalog.data ?? { attrs: {} };
  const { id, title } = blockHead(element, spec, ordinal, report);
  const children = childElements(element, spec, report);
  const entities: Entity[] = [];
  const relations: DataBlock['relations'] = [];
  const drills: Drill[] = [];
  const codes: CodeSnippet[] = [];
  const ids = new Set<string>();

  for (const child of children.filter((c) => c.name === 'entity')) {
    const a = readAttrs(child, catalog.entity ?? { attrs: {} }, report);
    if (a.id === undefined || a.label === undefined) continue;
    checkId(a.id, child, report);
    if (ids.has(a.id)) report(child.offset, `Duplicate entity id "${a.id}"`);
    ids.add(a.id);
    const fields: Field[] = [];
    // Text between the fields is the entity's long description.
    const about = readAbout(child, ['field'], report);
    for (const row of child.children.filter((c): c is Element => c.kind === 'element' && c.name === 'field')) {
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
      ...about,
      fields,
      ...(ref ? { ref } : {}),
    });
  }

  for (const child of children.filter((c) => c.name !== 'entity')) {
    if (child.name === 'drill') {
      readDrill(child, ids, drills, report);
      continue;
    }
    if (child.name === 'code') {
      readCode(child, ids, codes, report);
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
  return { type: 'data', id, title, entities, relations, drills, ...withCodes(codes) };
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
      ...readAbout(child, [], report),
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
  const codes: CodeSnippet[] = [];
  for (const child of children.filter((c) => c.name === 'code')) readCode(child, ids, codes, report);

  if (states.length === 0) report(element.offset, '<state> needs at least one <status>');
  if (states.length > limits.nodes) report(element.offset, `<state> has more than ${limits.nodes} states`);
  if (transitions.length > limits.edges) report(element.offset, `<state> has more than ${limits.edges} transitions`);
  return { type: 'state', id, title, states, transitions, walk, drills, ...withCodes(codes) };
}
