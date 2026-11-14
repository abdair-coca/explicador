// EXL document model shared by the parser, the cache and the viewer.

/** Kinds of software, then (F31) everyday kinds for any other topic: a person, a thing, a place, a signal, a step. */
export const softwareKinds = ['actor', 'ui', 'service', 'module', 'function', 'store', 'external'] as const;
export const everydayKinds = ['person', 'object', 'place', 'signal', 'step'] as const;
export const nodeKinds = [...softwareKinds, ...everydayKinds] as const;
export type NodeKind = (typeof nodeKinds)[number];

/** A pointer into the analyzed project: `path`, `path:line`, `path:start-end`, or a document's section, `path#Heading`. */
export interface Ref {
  path: string;
  start?: number;
  end?: number;
  /** A section of a document by its heading (F28); the server fills `start` and `end` with its lines when it shows the scene. */
  heading?: string;
}

export interface SceneNode {
  id: string;
  label: string;
  /** One line on what the part does, shown inside the box. */
  desc?: string;
  /** Longer explanation (the tag's body, Markdown), shown in the detail panel. */
  about?: string;
  kind: NodeKind;
  ref?: Ref;
  /** Id of the enclosing <group>, if any. */
  group?: string;
}

/** A box of nodes inside <arch>; the viewer shows it collapsed and zooms into it on click. */
export interface SceneGroup {
  id: string;
  label: string;
  desc?: string;
  kind: NodeKind;
  /** Id of the enclosing <group>, if any. */
  parent?: string;
}

/** One output of a notebook cell, reduced to what the viewer can show safely. */
export type NotebookOutput =
  | { kind: 'text'; stream: 'stdout' | 'stderr' | 'result' | 'error'; text: string }
  | { kind: 'image'; mime: 'image/png' | 'image/jpeg'; data: string }
  /** HTML without scripts; the viewer shows it in a sandboxed frame. */
  /** `text` is the output's plain-text version (a DataFrame as text), which the agent reads instead of the HTML. */
  | { kind: 'html'; html: string; text?: string }
  /** Something too big or not showable; `label` says what it was. */
  | { kind: 'omitted'; label: string };

/** A cell of a Jupyter notebook. `n` is its 1-based position: the number refs use. */
export interface NotebookCell {
  n: number;
  type: 'markdown' | 'code' | 'raw';
  source: string;
  /** Execution count of a code cell, if it was run. */
  count?: number;
  outputs?: NotebookOutput[];
}

export interface Notebook {
  language: string;
  cells: NotebookCell[];
}

/** Key lines of code for a node, chosen by the agent and copied from the file by the server. */
export interface CodeSnippet {
  node: string;
  /** Always a line range. */
  ref: Ref;
  /** Why these lines matter. */
  note: string;
  /** The lines, filled in by the server from the file when the scene is shown. */
  lines?: string[];
  /** For a notebook ref (cell numbers), the cells with their source instead of lines. */
  cells?: NotebookCell[];
  /** Set by the server when the file or the lines are gone. */
  missing?: boolean;
}

/** A node that leads to a deeper scene, explained under `topic`. */
export interface Drill {
  node: string;
  topic: string;
}

/** How a part talks to another: a call (the default), the answer coming back, or a message nobody waits for. */
export const linkKinds = ['call', 'return', 'async'] as const;
export type LinkKind = (typeof linkKinds)[number];

export interface ArchEdge {
  from: string;
  to: string;
  label?: string;
  /** Absent for a call. */
  kind?: LinkKind;
}

export interface FlowStep {
  from: string;
  /** Absent when the step is an action inside `from`. */
  to?: string;
  label?: string;
  /** Absent for a call. */
  kind?: LinkKind;
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
  /** Key code for some nodes; absent when there is none. */
  codes?: CodeSnippet[];
}

export interface FlowBlock {
  type: 'flow';
  id: string;
  title: string;
  nodes: SceneNode[];
  steps: FlowStep[];
  drills: Drill[];
  codes?: CodeSnippet[];
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
  desc?: string;
  about?: string;
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
  codes?: CodeSnippet[];
}

export const statusRoles = ['initial', 'final'] as const;

export interface Status {
  id: string;
  label: string;
  desc?: string;
  about?: string;
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
  codes?: CodeSnippet[];
}

/** The kind of data a journey stage holds; it picks the stage's icon. */
export const stageKinds = ['file', 'table', 'text', 'matrix', 'split', 'model', 'metric'] as const;
export type StageKind = (typeof stageKinds)[number];

/** One stop on the data's path: what the data is at this point, and the operation that made it. */
export interface JourneyStage {
  id: string;
  label: string;
  /** The data's size or shape here, shown big ("49 582 reviews", "4 000 × 23 672"). */
  value?: string;
  kind: StageKind;
  /** The operation that produced this stage from the previous one, as code ("drop_duplicates()"). */
  op?: string;
  ref?: Ref;
  narration: string;
}

/** The path of the data through a notebook or pipeline, played stage by stage. */
export interface JourneyBlock {
  type: 'journey';
  id: string;
  title: string;
  stages: JourneyStage[];
  drills: Drill[];
  codes?: CodeSnippet[];
}

/** Blocks with clickable items (nodes, entities, states, stages), drills and key code. */
export type SceneBlock = ArchBlock | FlowBlock | DataBlock | StateBlock | JourneyBlock;

/** What a scene is about, which picks its decoration: a background motif, an accent color and a glyph. */
export const themeNames = [
  'plain', 'data', 'ml', 'math', 'text', 'web', 'network', 'database', 'security', 'code', 'hardware', 'business',
  'nature', 'space', 'science', 'history', 'health', 'food', 'art', 'society',
] as const;
export type ThemeName = (typeof themeNames)[number];
export const accentNames = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'pink'] as const;
export type AccentName = (typeof accentNames)[number];

/** The scene's theme. It draws nothing by itself: the viewer decorates the page and the slides with it. */
export interface ThemeBlock {
  type: 'theme';
  id: string;
  /** The first theme named. */
  name: ThemeName;
  /** Every theme named, when the scene names two or three: the viewer draws one of them at random (F36). */
  choices?: ThemeName[];
  /** Replaces the theme's own accent color; without it the viewer picks one at random. */
  accent?: AccentName;
}

/** Starts a chapter of a lesson; the chapter runs until the next one. */
export interface ChapterBlock {
  type: 'chapter';
  id: string;
  title: string;
  /** A theme for this chapter alone, when its subject differs from the scene's. */
  theme?: ThemeName;
  /** What the reader will understand by the end of the chapter. */
  goal?: string;
  /** The id of the <journey> stage this chapter explains: its card shows the whole journey with this stage lit. */
  stage?: string;
  /** The cells (or lines) the chapter explains; always a range. */
  ref?: Ref;
  /** Filled by the server when the scene is shown: the chapter's notebook cells, with their outputs. */
  cells?: NotebookCell[];
  /** Filled by the server for a chapter over a plain file: its lines. */
  lines?: string[];
  /** Set by the server when the file or the range is gone. */
  missing?: boolean;
}

/** A headline number. */
export interface Stat {
  /** As it should read, e.g. "84.6 %" or "49 582"; numbers in it count up. */
  value: string;
  label: string;
  ref?: Ref;
}

export interface StatsBlock {
  type: 'stats';
  id: string;
  title?: string;
  stats: Stat[];
}

/** One value of a trace: the input, or the result of one operation. */
export const traceKinds = ['text', 'list', 'table', 'bars', 'number', 'vector'] as const;
/**
 * The form a traced value takes at one step: a sentence, items, `name = value` rows, bars, one number, or a vector (an
 * embedding: numbers in order, of which the first ones are shown).
 */
export type TraceKind = (typeof traceKinds)[number];

/** One item of a `list` value, or one `name=value` row of a `table` or `bars` value. */
export interface TraceItem {
  name: string;
  value?: string;
}

export interface TraceValue {
  label: string;
  /** The value, whitespace collapsed. */
  text: string;
  /** Absent for `text`. */
  kind?: Exclude<TraceKind, 'text'>;
  /** The items of a `list`, `table` or `bars` value, in order; a `vector`'s numbers, named `1`, `2`, … */
  items?: TraceItem[];
  /** A `vector`'s real size when only its first numbers are shown (768 for a 768-dimension embedding). */
  dims?: number;
  /** The operation as code, e.g. `texto.lower()`. */
  code?: string;
  /** Why this operation matters. */
  note?: string;
  ref?: Ref;
}

/** One real value followed through a series of operations; the viewer shows what each one changes. */
export interface TraceBlock {
  type: 'trace';
  id: string;
  title: string;
  ref?: Ref;
  values: TraceValue[];
}

export const chartTypes = ['bars', 'hbars', 'line'] as const;
export type ChartType = (typeof chartTypes)[number];

/** One category (bars) or x position (line) with a value per series, written as the notebook prints them. */
export interface DataRow {
  label: string;
  values: string[];
}

export interface ChartBlock {
  type: 'chart';
  id: string;
  title: string;
  chartType: ChartType;
  /** Series names; one unnamed series when the chart has a single one. */
  series: string[];
  rows: DataRow[];
  /** Appended to every value, e.g. "%". */
  unit?: string;
  /** A series name or a row label to emphasize. */
  highlight?: string;
  ref?: Ref;
}

/** A cell, a whole row (`col` absent) or a whole column (`row` absent); 0-based. */
export interface CellPick {
  row?: number;
  col?: number;
}

export const confusionMetrics = ['accuracy', 'precision', 'recall', 'f1'] as const;
export type ConfusionMetric = (typeof confusionMetrics)[number];

/** A named highlight on a matrix: some cells and what they mean. */
export interface MatrixFocus {
  label?: string;
  /** Cells to highlight; empty for a metric, whose cells the viewer derives. */
  cells: CellPick[];
  /** Only in a confusion matrix: the viewer computes this metric from the counts. */
  metric?: ConfusionMetric;
  narration: string;
}

export interface MatrixBlock {
  type: 'matrix';
  id: string;
  title: string;
  cols: string[];
  rows: DataRow[];
  /** A confusion matrix: rows are the actual classes, columns the predicted ones, cells are counts. */
  kind?: 'confusion';
  /** Text of the top-left cell, e.g. "actual \ predicted". */
  corner?: string;
  /** Confusion matrices only: index of the positive class (default the last). */
  positive?: number;
  focuses: MatrixFocus[];
  ref?: Ref;
}

export interface QuizOption {
  text: string;
  correct?: true;
  /** Why this option is right or wrong; shown once it is picked. */
  why?: string;
}

/** A check: a multiple-choice question, or a flashcard (a question with a hidden answer). */
export interface QuizBlock {
  type: 'quiz';
  id: string;
  question: string;
  /** Empty for a flashcard. */
  options: QuizOption[];
  /** The flashcard's answer (Markdown); absent for a multiple-choice question. */
  answer?: string;
}

export const calcKinds = ['sum', 'logistic'] as const;
export type CalcKind = (typeof calcKinds)[number];

/** One term of a worked calculation: a feature's contribution, the intercept, … */
export interface CalcPart {
  label: string;
  /** As the notebook prints it, e.g. "-0.332". */
  value: string;
  note?: string;
  ref?: Ref;
}

/**
 * How a model scores one input, part by part. The viewer adds the parts; with `kind="logistic"` it also turns the
 * score into a probability with the sigmoid and decides the class against the threshold.
 */
export interface CalcBlock {
  type: 'calc';
  id: string;
  title: string;
  kind: CalcKind;
  parts: CalcPart[];
  /** The total the notebook printed; the parts add up to it within rounding. */
  total?: string;
  /** Logistic only: the class below and the class at or above the threshold. */
  classes?: [string, string];
  /** Logistic only; default 0.5. */
  threshold?: number;
  ref?: Ref;
}

/** One test input: the model's probability for the second class and its real class. */
export interface ThresholdPoint {
  score: string;
  actual: string;
  label?: string;
}

/** A decision threshold the reader moves over real predictions; the viewer recomputes the errors and metrics. */
export interface ThresholdBlock {
  type: 'threshold';
  id: string;
  title: string;
  /** The class below the threshold and the class at or above it. */
  classes: [string, string];
  /** Starting threshold; default 0.5. */
  at: number;
  points: ThresholdPoint[];
  ref?: Ref;
}

/** A new idea introduced from zero: what it is, an everyday analogy, its formula and a tiny worked example. */
export interface ConceptBlock {
  type: 'concept';
  id: string;
  term: string;
  /** One or two sentences (Markdown). */
  define: string;
  analogy?: string;
  /** LaTeX, without `$`. */
  formula?: string;
  /** Markdown, line breaks kept (it may hold a small table). */
  example?: string;
  ref?: Ref;
}

export const curveFns = ['sigmoid', 'tanh', 'relu', 'linear', 'quadratic', 'exp', 'log', 'gaussian'] as const;
export type CurveFn = (typeof curveFns)[number];

/** A curve of a plot: a function from the closed list with its parameters, or points the notebook printed. */
export interface PlotCurve {
  label?: string;
  fn?: CurveFn;
  params?: Record<string, number>;
  /** Left to right; the viewer joins them with straight lines. */
  points?: [number, number][];
}

/** A real input marked on a curve; the viewer computes its height. */
export interface PlotMark {
  /** As the notebook prints it. */
  x: string;
  label: string;
  /** Index of the curve it sits on; the first when absent. */
  curve?: number;
  narration?: string;
}

/** Functions drawn on their axes, with real inputs marked on them. */
export interface PlotBlock {
  type: 'plot';
  id: string;
  title: string;
  /** Axis labels. */
  x?: string;
  y?: string;
  /** The stretch of x shown; each function has a default. */
  from?: number;
  to?: number;
  curves: PlotCurve[];
  marks: PlotMark[];
  ref?: Ref;
}

/** One point of a scatter, with its coordinates as the notebook prints them. */
export interface ScatterDot {
  x: string;
  y: string;
  class: string;
  label?: string;
}

/**
 * Points of several classes on two axes, with the boundary a model draws between them: a straight line
 * (y = slope·x + intercept, with the class above it) or a path of points.
 */
export interface ScatterBlock {
  type: 'scatter';
  id: string;
  title: string;
  x?: string;
  y?: string;
  classes: string[];
  dots: ScatterDot[];
  boundary?: { slope?: number; intercept?: number; above?: string; points?: [number, number][] };
  ref?: Ref;
}

export const compareWinners = ['a', 'b', 'tie'] as const;

/** Two things side by side, row by row, with the better one marked where one is. */
export interface CompareBlock {
  type: 'compare';
  id: string;
  title: string;
  /** The names of the two sides. */
  a: string;
  b: string;
  rows: { label: string; a: string; b: string; winner?: (typeof compareWinners)[number] }[];
  ref?: Ref;
}

/** Events in order along a line. */
export interface TimelineBlock {
  type: 'timeline';
  id: string;
  title: string;
  events: { label: string; when?: string; narration: string; ref?: Ref }[];
  ref?: Ref;
}

export const structureDirections = ['down', 'right'] as const;
export type StructureDirection = (typeof structureDirections)[number];
export const structureSides = ['left', 'right'] as const;
export type StructureSide = (typeof structureSides)[number];

/** One part of a structure: a node of a tree, a person of an organization chart, a folder. */
export interface StructureMember {
  id: string;
  label: string;
  desc?: string;
  ref?: Ref;
}

/** Where a member sits in one state: under `parent` (none: a root), on a `side` when a binary tree needs it. */
export interface StructurePlace {
  id: string;
  parent?: string;
  side?: StructureSide;
}

/** One step from a state to the next, as the scene wrote it. */
export interface StructureChange {
  label: string;
  narration: string;
  /** A question the reader answers before the change shows (F29): "Where does 40 go?". */
  ask?: string;
  add: string[];
  remove: string[];
  move: StructurePlace[];
  mark: string[];
}

/** A state of the structure as the viewer draws it: the members there, in order, and those the step points at. */
export interface StructureState {
  members: StructurePlace[];
  mark: string[];
  /** Members that appeared in this state, so the viewer grows them out of their parent. */
  added: string[];
  /** The change that led here; absent for the state the structure starts in. */
  change?: number;
}

/**
 * A structure that changes state by state (F25): a tree growing value by value, an organization moving a team. The
 * parser plays the changes, so `states` holds every state in order, one per part of the slide.
 */
export interface StructureBlock {
  type: 'structure';
  id: string;
  title: string;
  direction: StructureDirection;
  members: StructureMember[];
  changes: StructureChange[];
  states: StructureState[];
  ref?: Ref;
}

export const linkSigns = ['same', 'opposite'] as const;
export type LinkSign = (typeof linkSigns)[number];
export const directions = ['up', 'down'] as const;
export type Direction = (typeof directions)[number];
export type LoopKind = 'reinforcing' | 'balancing';

/** A quantity of a causal system that can go up or down. */
export interface SystemFactor {
  id: string;
  label: string;
  desc?: string;
  ref?: Ref;
}

/** More of `from` brings more of `to` (`same`) or less (`opposite`). */
export interface SystemLink {
  from: string;
  to: string;
  sign: LinkSign;
  label?: string;
}

/** A cycle of links, found by the parser: reinforcing with an even number of `opposite` links, balancing with an odd one. */
export interface SystemLoop {
  /** Factor ids in the order the links run. */
  through: string[];
  /** Indexes of the links that close it, in the same order. */
  links: number[];
  kind: LoopKind;
  label?: string;
}

/** One step of a push through the system: a factor pushed, or an effect along a link. */
export interface SystemStep {
  kind: 'push' | 'effect';
  /** The factor that moves in this step. */
  factor: string;
  change: Direction;
  /** For an effect: the link it follows. */
  link?: number;
  /** The factor had moved the other way before: this step pushes it back. */
  reversed?: boolean;
  narration: string;
  /** A question the reader answers before the step shows (F29). */
  ask?: string;
}

/**
 * A causal system (F26): factors, signed links, the loops they close, and one push through it step by step. `moved`
 * holds, for each step, the direction of every factor that has moved so far.
 */
export interface SystemBlock {
  type: 'system';
  id: string;
  title: string;
  factors: SystemFactor[];
  links: SystemLink[];
  loops: SystemLoop[];
  steps: SystemStep[];
  moved: Record<string, Direction>[];
  ref?: Ref;
}

/** Colors a figure may use (F31): a closed list, so a figure looks like the rest of the viewer. */
export const figureColors = ['ink', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray'] as const;
export type FigureColor = (typeof figureColors)[number];
/** Where an arrow or an arc has its head; `start` (F36) points it back to its first point, so an arc turns counter-clockwise. */
export const arrowHeads = ['end', 'none', 'both', 'start'] as const;
/** The pictograms a figure may use (F34): a closed set, drawn as line art in the viewer's style. */
export const figureIcons = [
  'sun', 'eye', 'person', 'car', 'drop', 'house', 'tree', 'signal', 'battery', 'magnet',
  'cloud', 'factory', 'phone', 'server', 'coin', 'heart', 'leaf', 'bulb', 'clock', 'lock',
] as const;
export type FigureIcon = (typeof figureIcons)[number];
export type ArrowHead = (typeof arrowHeads)[number];
/** A point on a figure's grid: across, then down. */
export type Point = [number, number];

interface ShapeBase {
  id?: string;
  label?: string;
  /** What the shape is, in one line (F35): the page shows it when the shape is clicked. */
  desc?: string;
  color: FigureColor;
  /** The part it appears in: 0 from the start, n with the figure's n-th <show>. */
  appear: number;
}

/** One shape of a figure, on its grid (0 to `width` across, 0 to `height` down). */
export type FigureShape =
  /** A circle, or (F36) an ellipse when `ry`, its vertical radius, differs from `r`, then its horizontal one. */
  | (ShapeBase & { kind: 'circle'; x: number; y: number; r: number; ry?: number })
  | (ShapeBase & { kind: 'box'; x: number; y: number; w: number; h: number })
  /** A line through its points, with a head at its end, both ends or none: a ray of light, a path, a push. */
  | (ShapeBase & { kind: 'arrow'; points: Point[]; head: ArrowHead; dashed: boolean })
  /** The angle at `at` between the directions to `from` and to `to`. */
  | (ShapeBase & { kind: 'angle'; at: Point; from: Point; to: Point })
  | (ShapeBase & { kind: 'zone'; points: Point[] })
  /** The normal of a surface at `at` (F33): a dashed line across it, through `points` (its two ends). */
  | (ShapeBase & { kind: 'normal'; at: Point; points: [Point, Point] })
  /** A line pictogram from a closed set (F34), centered on x y and `size` wide. */
  | (ShapeBase & { kind: 'icon'; icon: FigureIcon; x: number; y: number; size: number })
  /** Part of a circle (F34) from `from` to `to` degrees (0 right, 90 down), clockwise on screen. */
  | (ShapeBase & { kind: 'arc'; x: number; y: number; r: number; from: number; to: number; head: ArrowHead })
  /** A dimension line between two points (F34), its `label` the length it measures. */
  | (ShapeBase & { kind: 'measure'; points: [Point, Point] })
  | (Omit<ShapeBase, 'label'> & { kind: 'label'; x: number; y: number; text: string });

/** A shape travelling along points (F32): its anchor (a circle's center, a box's corner…) goes through each, ending on the last. */
export interface FigureMove {
  shape: number;
  path: Point[];
}

/** A shape taking another color (F32): a light turning green. */
export interface FigureSet {
  shape: number;
  color: FigureColor;
}

/** Where a shape is, its color and whether it is hidden, after some shows (F32). */
export interface FigureState {
  /** How far its anchor has moved from where the shape is declared. */
  offset: Point;
  color: FigureColor;
  hidden: boolean;
}

/**
 * One part of a figure: the shapes it draws, and (F32) the shapes already drawn it moves, recolors, hides or pulses, and
 * the arrows a dot travels along, with what the narration says. Shape references are indexes into the figure's shapes.
 */
export interface FigureShow {
  items: number[];
  moves: FigureMove[];
  sets: FigureSet[];
  hides: number[];
  pulses: number[];
  flows: number[];
  narration: string;
  /** A question the reader answers before the show plays (F29). */
  ask?: string;
}

/** A drawing of a physical thing (F31): a raindrop and its rays, a crossing and its lights, revealed part by part. */
export interface FigureBlock {
  type: 'figure';
  id: string;
  title: string;
  width: number;
  height: number;
  shapes: FigureShape[];
  shows: FigureShow[];
  /** Every shape's state at the start (0) and after each show. */
  states: FigureState[][];
  ref?: Ref;
}

/** A note on a passage: the words it points at (`start`–`end` in the passage) and what it says about them. */
export interface AnnotatedNote {
  quote: string;
  start: number;
  end: number;
  label?: string;
  narration: string;
}

/** A text read part by part (F27): a clause of a lease, an article of a law, a paragraph of a page. */
export interface AnnotatedBlock {
  type: 'annotated';
  id: string;
  title: string;
  passage: string;
  notes: AnnotatedNote[];
  ref?: Ref;
}

/** A reason for the claim, or an objection to it with its reply. */
export interface ArgumentPoint {
  side: 'support' | 'objection';
  label: string;
  narration: string;
  reply?: string;
}

/** A claim weighed point by point (F27): the reasons for it, the objections to it and their replies, and a verdict. */
export interface ArgumentBlock {
  type: 'argument';
  id: string;
  title: string;
  claim: string;
  points: ArgumentPoint[];
  verdict?: string;
  ref?: Ref;
}

/** A formula derived line by line; the viewer moves the symbols two lines share. */
export interface DeriveBlock {
  type: 'derive';
  id: string;
  title: string;
  /** Each line is LaTeX without `$`, with an optional note on what changed. */
  lines: { tex: string; note?: string }[];
  ref?: Ref;
}

/** One item stored in a vector space (a chunk, a document, a product), at its place on the two axes shown. */
export interface SpaceItem {
  id: string;
  label: string;
  /** As written. With a real embedding of many dimensions, its 2-D projection. */
  x: string;
  y: string;
  /** The index's cluster it belongs to. */
  cluster?: string;
  /** Its real similarity to the query, as the system printed it; absent when the viewer computes the cosine. */
  score?: string;
  /** Said when the query is compared with it. */
  narration?: string;
}

/** A cluster of the index (its centroid): the query is compared only with the items of the cluster it falls in. */
export interface SpaceCluster {
  id: string;
  label: string;
  x: string;
  y: string;
  /** Said when the query is sent to this cluster. */
  narration?: string;
}

/**
 * A vector space: stored items as points, a query that lands among them (or none yet), the index's clusters if there
 * are any, and the k nearest items by cosine similarity. The viewer draws the angles and ranks the items; it computes the cosine
 * from the coordinates unless the items carry their real `score`.
 */
export interface SpaceBlock {
  type: 'space';
  id: string;
  title: string;
  x?: string;
  y?: string;
  /** How many nearest items the search returns. */
  k: number;
  /** The real number of dimensions when the axes are a 2-D projection. */
  dims?: number;
  clusters: SpaceCluster[];
  items: SpaceItem[];
  /** Absent for a picture of the stored items alone (the index's clusters, before any question). */
  query?: { label: string; x: string; y: string; cluster?: string; narration?: string };
  ref?: Ref;
}

/** One dimension of the two vectors a cosine compares, as written. */
export interface CosineDim {
  a: string;
  b: string;
  label?: string;
}

/**
 * The cosine similarity of two vectors worked out step by step: the products of each pair of numbers, their sum (the
 * dot product), the length of each vector and the division. The viewer does the arithmetic. When the vectors are longer
 * than what is shown (`size`), the real `score` is the result.
 */
export interface CosineBlock {
  type: 'cosine';
  id: string;
  title: string;
  /** The names of the two vectors ("question", "Refunds take 5 days"). */
  a: string;
  b: string;
  dims: CosineDim[];
  /** The vectors' real size when only their first numbers are shown. */
  size?: number;
  /** The real cosine, as printed; required when `size` hides numbers. */
  score?: string;
  ref?: Ref;
}

/** Blocks of lessons that hold no clickable items. */
export type LessonBlock = ChapterBlock | StatsBlock | TraceBlock | ChartBlock | MatrixBlock | QuizBlock | CalcBlock | ThresholdBlock | ConceptBlock | ThemeBlock | PlotBlock | DeriveBlock | ScatterBlock | CompareBlock | TimelineBlock | SpaceBlock | CosineBlock | StructureBlock | SystemBlock | AnnotatedBlock | ArgumentBlock | FigureBlock;

/**
 * What a component does in the scene's narrative (F24): poses the `question`, shows the brief's `example`, draws the
 * `idea` from it, sets the misconception in `contrast`, will `apply` it, gives the `answer`, asks a `check`, or sums up
 * in a `recap`.
 */
export const arcParts = ['question', 'example', 'idea', 'contrast', 'apply', 'answer', 'check', 'recap'] as const;
export type ArcPart = (typeof arcParts)[number];

/** A component's declared part of the arc; absent when the scene left it out. */
export interface WithArc {
  arc?: ArcPart;
}

export type Block = MarkdownBlock | ((SceneBlock | Exclude<LessonBlock, ChapterBlock | ThemeBlock>) & WithArc) | ChapterBlock | ThemeBlock;

/**
 * The form an idea takes, which picks the scene's picture: parts and how they relate (`structure`), steps or states
 * (`process`), amounts and how they change (`quantity`), causes and feedback (`system`), a document read part by part
 * (`annotated`), a thesis or a decision (`argument`), events in order (`timeline`).
 */
export const briefForms = ['structure', 'process', 'quantity', 'system', 'annotated', 'argument', 'timeline'] as const;
export type BriefForm = (typeof briefForms)[number];

/**
 * What the model decided before designing a scene (F23): for whom, which question it answers, the one example it
 * follows, the wrong idea it corrects, how the reader checks themselves and the terms they meet. It is never shown.
 */
export interface Brief {
  form: BriefForm;
  audience: string;
  question: string;
  example: string;
  misconception: string;
  check: string;
  terms: string[];
}

export interface Scene {
  blocks: Block[];
  /** Outside `blocks`, so the viewer, the slides, exports and the eval's scene text never show it. */
  brief?: Brief;
}

export interface ExlError {
  line: number;
  column: number;
  message: string;
}

export type ParseResult =
  | { ok: true; scene: Scene; refs: string[] }
  | { ok: false; errors: ExlError[] };
