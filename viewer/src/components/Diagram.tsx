// SVG rendering of a laid-out scene in the Titi style. Highlighting and the moving token are driven by props.
import { useId } from 'react';
import type { LinkKind } from '../../../server/src/scene.ts';
import { staggerStep } from '../animation/reveal';
import {
  BOX,
  EDGE_LABEL,
  ENTITY,
  STATE,
  caption,
  edgeLabelWidth,
  entityHeader,
  type LaidEdge,
  type LaidNode,
  type Layout,
  type Point,
} from '../layout/elk';
import type { ViewNode } from '../layout/levels';
import { kindIcon } from './icons';
import { cn } from '@/lib/utils';

/** The diagram never shrinks below this scale to fit; it scrolls sideways instead, so text stays legible. */
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.15;

export interface DiagramProps {
  layout: Layout;
  /** Remount key: changing it replays the reveal animation. */
  revealKey?: number;
  activeNodes?: ReadonlySet<string>;
  /** Node whose details are open in the side panel. */
  selected?: string | undefined;
  /** Boxes the user asked about → whether an answer is still pending; they carry a question mark. */
  asked?: ReadonlyMap<string, boolean> | undefined;
  activeEdge?: string;
  /** Label shown on the active edge (the step label), overriding the edge's own label. */
  activeLabel?: string;
  /** Node that pulses when a step happens inside it. */
  pulseNode?: string;
  /** Changes on every step so the token restarts its run along the active edge. */
  tokenKey?: number;
  reducedMotion?: boolean;
  ariaLabel: string;
  /** Called when a node, a group or a drill is clicked (or activated with the keyboard). */
  onNodeClick?: (id: string, element: Element) => void;
  /** Draw arrowheads (off for data relations, which are not directed). */
  arrows?: boolean;
  /** Which nodes take clicks; by default every node that is not context. */
  isClickable?: (node: ViewNode) => boolean;
}

export function Diagram(props: DiagramProps) {
  const { layout, revealKey = 0, activeNodes, activeEdge, reducedMotion } = props;
  const markerId = useId().replace(/:/g, '');
  const focus = activeNodes !== undefined && activeNodes.size > 0;
  // Reveal order: by layer (x), then top to bottom; boxes first, then edges, then labels.
  const order = [...layout.nodes].sort((a, b) => a.x - b.x || a.y - b.y).map((n) => n.node.id);
  const step = staggerStep(order.length);
  const nodeDelay = (id: string): number => order.indexOf(id) * step;
  const edgeDelay = Math.max(0, order.length - 1) * step + 150;
  const labelDelay = edgeDelay + 250;
  const active = layout.edges.find((e) => e.id === activeEdge);
  const overlay = active && props.activeLabel ? props.activeLabel : undefined;
  const marker = (edge: LaidEdge): string | undefined =>
    props.arrows === false ? undefined : `url(#${markerId}-arrow${edge.id === activeEdge ? '-active' : ''})`;
  const kinds = new Set(layout.edges.map((e) => e.kind ?? 'call'));

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${Math.max(layout.width, 1)} ${Math.max(layout.height, 1)}`}
          className="mx-auto block h-auto"
          style={{ width: '100%', minWidth: layout.width * MIN_SCALE, maxWidth: Math.max(layout.width, 320) * MAX_SCALE }}
          role="group"
          aria-label={props.ariaLabel}
        >
          <defs>
            <marker id={`${markerId}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--edge)" />
            </marker>
            <marker id={`${markerId}-arrow-active`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--foreground)" />
            </marker>
          </defs>
          <g key={revealKey} className="reveal">
            {layout.edges.map((edge) => (
              <g
                key={edge.id}
                className={cn(
                  'scene-edge',
                  `kind-${edge.kind ?? 'call'}`,
                  edge.id === activeEdge && 'active',
                  focus && edge.id !== activeEdge && 'dimmed',
                )}
              >
                <path className="halo" d={edge.path} />
                <path
                  className="line"
                  d={edge.path}
                  markerEnd={marker(edge)}
                  style={{ ['--len' as string]: edge.length.toFixed(1), animationDelay: `${edgeDelay}ms` }}
                />
              </g>
            ))}
            {layout.nodes.map((node) => (
              <Node
                key={node.node.id}
                laid={node}
                delay={nodeDelay(node.node.id)}
                active={activeNodes?.has(node.node.id) ?? false}
                selected={props.selected === node.node.id}
                asked={props.asked?.get(node.node.id)}
                dimmed={focus && !activeNodes?.has(node.node.id) && props.selected !== node.node.id}
                pulse={props.pulseNode === node.node.id && !reducedMotion}
                {...(props.onNodeClick && node.node.role !== 'context' && (props.isClickable?.(node.node) ?? true)
                  ? { onClick: props.onNodeClick }
                  : {})}
              />
            ))}
            {layout.edges.map((edge) =>
              edge.label && !(edge.id === activeEdge && overlay) ? (
                <EdgeLabel
                  key={edge.id}
                  at={edge.labelAt ?? edge.mid}
                  label={edge.label}
                  active={edge.id === activeEdge}
                  dimmed={focus && edge.id !== activeEdge}
                  delay={labelDelay}
                />
              ) : null,
            )}
          </g>
          {active && overlay && (
            // Keyed by step so the label pops in again whenever the step changes.
            <EdgeLabel key={`${active.id}-${props.tokenKey ?? 0}`} at={active.labelAt ?? active.mid} label={overlay} active pop />
          )}
          {active && !reducedMotion && (
            <circle key={props.tokenKey} r="7" className="token">
              <animateMotion dur="0.7s" fill="freeze" path={active.path} calcMode="spline" keyTimes="0;1" keySplines="0.33 1 0.68 1" />
            </circle>
          )}
        </svg>
      </div>
      {(kinds.has('return') || kinds.has('async')) && <EdgeLegend kinds={kinds} />}
    </div>
  );
}

const linkKinds: LinkKind[] = ['call', 'return', 'async'];
const legendText: Record<LinkKind, string> = { call: 'call', return: 'answer back', async: 'async (queue, event)' };

/** What the line styles mean; shown only when a diagram mixes them. */
function EdgeLegend({ kinds }: { kinds: ReadonlySet<LinkKind> }) {
  return (
    <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-bold text-muted-foreground" aria-label="Line styles">
      {linkKinds
        .filter((kind) => kind === 'call' || kinds.has(kind))
        .map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <svg width="34" height="10" aria-hidden="true" className={`scene-edge kind-${kind}`}>
              <path className="line" d="M2 5 H26" />
              <path d="M26 1 L33 5 L26 9 z" fill="var(--edge)" />
            </svg>
            {legendText[kind]}
          </li>
        ))}
    </ul>
  );
}

function EdgeLabel(props: { at: Point; label: string; active: boolean; dimmed?: boolean; delay?: number; pop?: boolean }) {
  const { at, label } = props;
  const width = edgeLabelWidth(label);
  const height = EDGE_LABEL.height;
  return (
    <g
      className={cn('edge-label-group', props.active && 'active', props.dimmed && 'dimmed', props.pop && 'animate-pop-in')}
      style={{
        ...(props.delay !== undefined ? { animationDelay: `${props.delay}ms` } : {}),
        transformBox: 'fill-box',
        transformOrigin: 'center',
      }}
    >
      <rect className="edge-label-bg" x={at.x - width / 2} y={at.y - height / 2} width={width} height={height} rx={height / 2} />
      <text className="edge-label" x={at.x} y={at.y + 4.5} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function Node(props: {
  laid: LaidNode;
  delay: number;
  active: boolean;
  selected: boolean;
  /** Defined when the user asked about this box; true while an answer is pending. */
  asked?: boolean | undefined;
  dimmed: boolean;
  pulse: boolean;
  onClick?: (id: string, element: Element) => void;
}) {
  const { laid, onClick } = props;
  const { node } = laid;
  const role = node.role ?? 'node';
  const ref = node.ref
    ? `${node.ref.path}${node.ref.start ? `:${node.ref.start}${node.ref.end ? `-${node.ref.end}` : ''}` : ''}`
    : undefined;
  const action = role === 'group' ? `Zoom into ${node.label}` : `Show the details of ${node.label}`;
  const activate = (element: Element): void => onClick?.(node.id, element);
  const radius = node.shape === 'state' ? Math.min(laid.height / 2, 24) : node.kind === 'actor' && !node.shape ? 22 : 16;
  return (
    <g
      transform={`translate(${laid.x} ${laid.y})`}
      data-node-id={node.id}
      className={cn(
        'scene-node',
        `kind-${node.kind}`,
        role,
        node.shape,
        onClick && 'clickable',
        props.active && 'active',
        props.selected && 'selected',
        props.dimmed && 'dimmed',
      )}
      {...(onClick && role !== 'group' ? { 'aria-pressed': props.selected } : {})}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': node.desc ? `${action}. ${node.desc}` : action,
            onClick: (event: React.MouseEvent<SVGGElement>) => activate(event.currentTarget),
            onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              activate(event.currentTarget);
            },
          }
        : {})}
    >
      <title>{[node.label, node.desc, ref, onClick ? action : '', props.asked === undefined ? '' : props.asked ? 'Waiting for an answer' : 'Has answers'].filter(Boolean).join('\n')}</title>
      <g className="node-inner" style={{ animationDelay: `${props.delay}ms` }}>
        <g className="node-pop">
          {node.shape === 'start' ? (
            <circle className="start-dot" cx={laid.width / 2} cy={laid.height / 2} r={8} />
          ) : (
            <>
              {role === 'group' && (
                <>
                  <rect className="shadow" x={BOX.stack} y={BOX.stack + BOX.shadow} width={laid.width} height={laid.height} rx={radius} />
                  <rect className="stack" x={BOX.stack} y={BOX.stack} width={laid.width} height={laid.height} rx={radius} />
                </>
              )}
              {role !== 'context' && <rect className="shadow" y={BOX.shadow} width={laid.width} height={laid.height} rx={radius} />}
              <g className="face">
                {props.pulse && <rect className="pulse" width={laid.width} height={laid.height} rx={radius} />}
                <rect className="body" width={laid.width} height={laid.height} rx={radius} />
                {node.shape === 'entity' ? (
                  <EntityBody laid={laid} />
                ) : node.shape === 'state' ? (
                  <StateBody laid={laid} />
                ) : (
                  <BoxBody laid={laid} />
                )}
                {props.asked !== undefined && (
                  // On the top-left corner, clear of the drill mark. The inner group animates, so the position stays on the outer one.
                  <g transform="translate(5 5)">
                    <g className={cn('asked-mark', props.asked && 'waiting')}>
                      <circle r={11} />
                      <text y={4.5} textAnchor="middle">
                        ?
                      </text>
                    </g>
                  </g>
                )}
              </g>
            </>
          )}
        </g>
      </g>
    </g>
  );
}

function Chip({ x, y, icon }: { x: number; y: number; icon: string[] }) {
  const r = BOX.chip / 2;
  return (
    <>
      <circle className="chip" cx={x + r} cy={y + r} r={r} />
      <g className="chip-icon" transform={`translate(${x + 5} ${y + 5}) scale(${16 / 24})`}>
        {icon.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </>
  );
}

function BoxBody({ laid }: { laid: LaidNode }) {
  const { node } = laid;
  const role = node.role ?? 'node';
  const labelTop = BOX.padY + BOX.chip + BOX.gap;
  const descTop = labelTop + laid.lines.length * BOX.labelLine + BOX.descGap;
  const middle = BOX.padY + BOX.chip / 2;
  return (
    <>
      <Chip x={BOX.padX} y={BOX.padY} icon={kindIcon[node.kind]} />
      <text className="caption" x={BOX.padX + BOX.chip + 8} y={middle + 4.5}>
        {caption(node)}
      </text>
      {node.drill && role === 'node' && (
        <text className="drill-mark" x={laid.width - BOX.padX} y={middle + 5.5} textAnchor="end">
          ↘
        </text>
      )}
      {laid.lines.map((line, i) => (
        <text key={i} className="label" x={BOX.padX} y={labelTop + 15 + i * BOX.labelLine}>
          {line}
        </text>
      ))}
      {laid.descLines.map((line, i) => (
        <text key={i} className="desc" x={BOX.padX} y={descTop + 13.5 + i * BOX.descLine}>
          {line}
        </text>
      ))}
      {role === 'group' && (
        <text className="hint" x={BOX.padX} y={laid.height - BOX.padY}>
          {node.members} inside · zoom in
        </text>
      )}
    </>
  );
}

const keyBadge: Record<string, string> = { pk: 'PK', fk: 'FK', unique: 'UQ' };

function EntityBody({ laid }: { laid: LaidNode }) {
  const fields = laid.node.fields ?? [];
  const header = entityHeader(laid.descLines.length);
  const w = laid.width;
  return (
    <>
      <path className="entity-header" d={`M1 17a16 16 0 0 1 16-16h${w - 34}a16 16 0 0 1 16 16v${header - 17}H1Z`} />
      <line x1={0} x2={w} y1={header} y2={header} stroke="var(--border)" strokeWidth={2} />
      <Chip x={BOX.padX} y={9} icon={kindIcon.entity} />
      <text className="label" x={BOX.padX + BOX.chip + 10} y={27}>
        {laid.node.label}
      </text>
      {laid.node.drill && (
        <text className="drill-mark" x={w - BOX.padX} y={27} textAnchor="end">
          ↘
        </text>
      )}
      {laid.descLines.map((line, i) => (
        <text key={i} className="desc" x={BOX.padX} y={53 + i * BOX.descLine}>
          {line}
        </text>
      ))}
      {fields.map((field, i) => {
        const top = header + 4 + i * ENTITY.row;
        return (
          <g key={field.name}>
            {field.key && (
              <>
                <rect className={`key-badge key-${field.key}`} x={BOX.padX} y={top + 5} width={26} height={15} rx={7.5} />
                <text className={`key-text key-${field.key}`} x={BOX.padX + 13} y={top + 16} textAnchor="middle">
                  {keyBadge[field.key]}
                </text>
              </>
            )}
            <text className="field-name" x={BOX.padX + (field.key ? 34 : 0)} y={top + 17}>
              {field.name}
            </text>
            {field.type && (
              <text className="field-type" x={w - BOX.padX} y={top + 17} textAnchor="end">
                {field.type}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}

function StateBody({ laid }: { laid: LaidNode }) {
  const radius = Math.min(laid.height / 2, 24);
  const text = laid.lines.length * BOX.labelLine + (laid.descLines.length > 0 ? BOX.descGap + laid.descLines.length * BOX.descLine : 0);
  const top = (laid.height - text) / 2;
  const descTop = top + laid.lines.length * BOX.labelLine + BOX.descGap;
  return (
    <>
      {laid.node.final && (
        <rect className="final-ring" x={5} y={5} width={laid.width - 10} height={laid.height - 10} rx={radius - 5} />
      )}
      {laid.lines.map((line, i) => (
        <text key={i} className="label" x={laid.width / 2} y={top + 15 + i * BOX.labelLine} textAnchor="middle">
          {line}
        </text>
      ))}
      {laid.descLines.map((line, i) => (
        <text key={i} className="desc" x={laid.width / 2} y={descTop + 13.5 + i * BOX.descLine} textAnchor="middle">
          {line}
        </text>
      ))}
      {laid.node.drill && (
        <text className="drill-mark" x={laid.width - STATE.padX + 8} y={laid.height / 2 + 5} textAnchor="end">
          ↘
        </text>
      )}
    </>
  );
}
