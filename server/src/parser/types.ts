// EXL document model shared by the parser, the cache and the viewer.

export const nodeKinds = ['actor', 'ui', 'service', 'module', 'function', 'store', 'external'] as const;
export type NodeKind = (typeof nodeKinds)[number];

/** A pointer into the analyzed project: `path`, `path:line` or `path:start-end`. */
export interface Ref {
  path: string;
  start?: number;
  end?: number;
}

export interface SceneNode {
  id: string;
  label: string;
  kind: NodeKind;
  ref?: Ref;
  /** Id of the enclosing <group>, if any. */
  group?: string;
}

/** A box of nodes inside <arch>; the viewer shows it collapsed and zooms into it on click. */
export interface SceneGroup {
  id: string;
  label: string;
  kind: NodeKind;
  /** Id of the enclosing <group>, if any. */
  parent?: string;
}

/** A node that leads to a deeper scene, explained under `topic`. */
export interface Drill {
  node: string;
  topic: string;
}

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowStep {
  from: string;
  /** Absent when the step is an action inside `from`. */
  to?: string;
  label?: string;
  ref?: Ref;
  narration: string;
}

export interface MarkdownBlock {
  type: 'markdown';
  text: string;
}

export interface ArchBlock {
  type: 'arch';
  id: string;
  title: string;
  nodes: SceneNode[];
  groups: SceneGroup[];
  /** Endpoints may be nodes or groups. */
  edges: ArchEdge[];
  drills: Drill[];
}

export interface FlowBlock {
  type: 'flow';
  id: string;
  title: string;
  nodes: SceneNode[];
  steps: FlowStep[];
  drills: Drill[];
}

export const fieldKeys = ['pk', 'fk', 'unique'] as const;
export type FieldKey = (typeof fieldKeys)[number];

export interface Field {
  name: string;
  type?: string;
  key?: FieldKey;
}

export interface Entity {
  id: string;
  label: string;
  fields: Field[];
  ref?: Ref;
}

export const cardinalities = ['1-1', '1-n', 'n-1', 'n-n'] as const;
export type Cardinality = (typeof cardinalities)[number];

export interface Relation {
  from: string;
  to: string;
  card: Cardinality;
  label?: string;
}

/** A data model: entities with fields, and relations between them. */
export interface DataBlock {
  type: 'data';
  id: string;
  title: string;
  entities: Entity[];
  relations: Relation[];
  drills: Drill[];
}

export const statusRoles = ['initial', 'final'] as const;

export interface Status {
  id: string;
  label: string;
  role: 'initial' | 'final' | 'normal';
  ref?: Ref;
}

export interface Transition {
  from: string;
  to: string;
  event: string;
  ref?: Ref;
}

/** One step of a narrated walk: the transition taken from the current state. */
export interface WalkStep {
  /** Index into `transitions`. */
  transition: number;
  from: string;
  to: string;
  event: string;
  narration: string;
}

/** A state machine, optionally with a narrated walk from the initial state. */
export interface StateBlock {
  type: 'state';
  id: string;
  title: string;
  states: Status[];
  transitions: Transition[];
  walk: WalkStep[];
  drills: Drill[];
}

export type SceneBlock = ArchBlock | FlowBlock | DataBlock | StateBlock;

export type Block = MarkdownBlock | SceneBlock;

export interface Scene {
  blocks: Block[];
}

export interface ExlError {
  line: number;
  column: number;
  message: string;
}

export type ParseResult =
  | { ok: true; scene: Scene; refs: string[] }
  | { ok: false; errors: ExlError[] };
