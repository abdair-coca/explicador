// SVG rendering of a laid-out scene. Highlighting and the moving token are driven by props.
import { useId } from 'react';
import { ENTITY_HEADER, ENTITY_ROW, type Layout, type LaidEdge, type LaidNode } from '../layout/elk';
import type { ViewNode } from '../layout/levels';
import { cn } from '@/lib/utils';

export interface DiagramProps {
  layout: Layout;
  /** Remount key: changing it replays the reveal animation. */
  revealKey?: number;
  activeNodes?: ReadonlySet<string>;
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
  // Reveal order: by layer (x), then top to bottom.
  const order = [...layout.nodes].sort((a, b) => a.x - b.x || a.y - b.y).map((n) => n.node.id);
  const nodeDelay = (id: string): number => order.indexOf(id) * 110;
  const edgeDelay = order.length * 110 + 100;
  const active = layout.edges.find((e) => e.id === activeEdge);

  return (
    <svg
      viewBox={`0 0 ${Math.max(layout.width, 1)} ${Math.max(layout.height, 1)}`}
      className="mx-auto block h-auto max-h-[68vh] w-full"
      style={{ maxWidth: Math.max(layout.width, 320) * 1.25 }}
      role="img"
      aria-label={props.ariaLabel}
    >
      <defs>
        <marker id={`${markerId}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--edge)" />
        </marker>
        <marker id={`${markerId}-arrow-active`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--active)" />
        </marker>
      </defs>
      <g key={revealKey} className="reveal">
        {layout.edges.map((edge) => (
          <Edge
            key={edge.id}
            edge={edge}
            delay={edgeDelay}
            active={edge.id === activeEdge}
            dimmed={focus && edge.id !== activeEdge}
            label={edge.id === activeEdge ? (props.activeLabel ?? edge.label) : edge.label}
            marker={props.arrows === false ? undefined : `url(#${markerId}-arrow${edge.id === activeEdge ? '-active' : ''})`}
          />
        ))}
        {layout.nodes.map((node) => (
          <Node
            key={node.node.id}
            laid={node}
            delay={nodeDelay(node.node.id)}
            active={activeNodes?.has(node.node.id) ?? false}
            dimmed={focus && !activeNodes?.has(node.node.id)}
            pulse={props.pulseNode === node.node.id && !reducedMotion}
            {...(props.onNodeClick && node.node.role !== 'context' && (props.isClickable?.(node.node) ?? true)
              ? { onClick: props.onNodeClick }
              : {})}
          />
        ))}
      </g>
      {active && !reducedMotion && (
        <circle key={props.tokenKey} r="6" className="token">
          <animateMotion dur="0.9s" fill="freeze" path={active.path} calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
        </circle>
      )}
    </svg>
  );
}

function Edge(props: {
  edge: LaidEdge;
  delay: number;
  active: boolean;
  dimmed: boolean;
  label?: string | undefined;
  marker: string | undefined;
}) {
  const { edge, label } = props;
  const width = label ? label.length * 6.4 + 10 : 0;
  return (
    <g className={cn('scene-edge', props.active && 'active', props.dimmed && 'dimmed')}>
      <path
        d={edge.path}
        markerEnd={props.marker}
        style={{ ['--len' as string]: edge.length.toFixed(1), animationDelay: `${props.delay}ms` }}
      />
      {label && (
        <g className="edge-label-group" style={{ animationDelay: `${props.delay + 300}ms` }}>
          <rect className="edge-label-bg" x={edge.mid.x - width / 2} y={edge.mid.y - 9} width={width} height={18} rx={4} />
          <text className="edge-label" x={edge.mid.x} y={edge.mid.y + 4} textAnchor="middle">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function Node(props: {
  laid: LaidNode;
  delay: number;
  active: boolean;
  dimmed: boolean;
  pulse: boolean;
  onClick?: (id: string, element: Element) => void;
}) {
  const { laid, onClick } = props;
  const { node } = laid;
  const role = node.role ?? 'node';
  const radius = node.shape === 'state' ? laid.height / 2 : node.kind === 'actor' ? laid.height / 2 : 8;
  const ref = node.ref
    ? `${node.ref.path}${node.ref.start ? `:${node.ref.start}${node.ref.end ? `-${node.ref.end}` : ''}` : ''}`
    : undefined;
  const action =
    role === 'group' ? `Zoom into ${node.label}` : node.drill ? `Open ${node.drill}` : `Ask Claude to go deeper into ${node.label}`;
  const activate = (element: Element): void => onClick?.(node.id, element);
  return (
    <g
      transform={`translate(${laid.x} ${laid.y})`}
      data-node-id={node.id}
      className={cn(
        'scene-node',
        `kind-${node.kind}`,
        node.kind,
        role,
        node.shape,
        onClick && 'clickable',
        props.active && 'active',
        props.dimmed && 'dimmed',
      )}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': action,
            onClick: (event: React.MouseEvent<SVGGElement>) => activate(event.currentTarget),
            onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              activate(event.currentTarget);
            },
          }
        : {})}
    >
      <title>{[ref ? `${node.label} (${ref})` : node.label, onClick ? action : ''].filter(Boolean).join('\n')}</title>
      <g className="node-inner" style={{ animationDelay: `${props.delay}ms` }}>
        {props.pulse && <rect className="pulse" width={laid.width} height={laid.height} rx={radius} />}
        {node.shape === 'start' ? (
          <circle className="start-dot" cx={laid.width / 2} cy={laid.height / 2} r={8} />
        ) : node.shape === 'entity' ? (
          <EntityBody laid={laid} />
        ) : node.shape === 'state' ? (
          <StateBody laid={laid} />
        ) : (
          <BoxBody laid={laid} radius={radius} />
        )}
        {node.drill && role === 'node' && (
          <text className="drill-mark" x={laid.width - 10} y={17} textAnchor="end">
            ↘
          </text>
        )}
      </g>
    </g>
  );
}

function BoxBody({ laid, radius }: { laid: LaidNode; radius: number }) {
  const { node } = laid;
  const role = node.role ?? 'node';
  return (
    <>
      {role === 'group' && <rect className="stack" x={5} y={5} width={laid.width} height={laid.height} rx={radius} />}
      <rect className="body" width={laid.width} height={laid.height} rx={radius} />
      {node.kind !== 'actor' && <rect className="accent" x={0} y={10} width={4} height={laid.height - 20} rx={2} />}
      <text className="kind-caption" x={laid.width / 2} y={18} textAnchor="middle">
        {role === 'group' ? `${node.kind} · group` : node.kind}
      </text>
      {laid.lines.map((line, i) => (
        <text key={i} className="label" x={laid.width / 2} y={37 + i * 17} textAnchor="middle">
          {line}
        </text>
      ))}
      {role === 'group' && (
        <text className="hint" x={laid.width / 2} y={laid.height - 9} textAnchor="middle">
          {node.members} inside · zoom ⤢
        </text>
      )}
    </>
  );
}

const keyBadge: Record<string, string> = { pk: 'PK', fk: 'FK', unique: 'UQ' };

function EntityBody({ laid }: { laid: LaidNode }) {
  const fields = laid.node.fields ?? [];
  return (
    <>
      <rect className="body" width={laid.width} height={laid.height} rx={8} />
      <rect className="entity-header" width={laid.width} height={ENTITY_HEADER} rx={8} />
      <rect className="entity-header" y={ENTITY_HEADER - 8} width={laid.width} height={8} />
      <text className="label entity-title" x={14} y={22}>
        {laid.node.label}
      </text>
      {fields.map((field, i) => {
        const y = ENTITY_HEADER + 15 + i * ENTITY_ROW;
        return (
          <g key={field.name}>
            {field.key && (
              <text className={`field-key key-${field.key}`} x={14} y={y}>
                {keyBadge[field.key]}
              </text>
            )}
            <text className="field-name" x={field.key ? 40 : 14} y={y}>
              {field.name}
            </text>
            {field.type && (
              <text className="field-type" x={laid.width - 12} y={y} textAnchor="end">
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
  const radius = laid.height / 2;
  return (
    <>
      <rect className="body" width={laid.width} height={laid.height} rx={radius} />
      {laid.node.final && (
        <rect className="final-ring" x={4} y={4} width={laid.width - 8} height={laid.height - 8} rx={radius - 4} />
      )}
      {laid.lines.map((line, i) => (
        <text key={i} className="label" x={laid.width / 2} y={laid.height / 2 + 5 - ((laid.lines.length - 1) * 17) / 2 + i * 17} textAnchor="middle">
          {line}
        </text>
      ))}
    </>
  );
}
