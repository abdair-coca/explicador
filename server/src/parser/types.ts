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

export type Block = MarkdownBlock | ArchBlock | FlowBlock;

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
