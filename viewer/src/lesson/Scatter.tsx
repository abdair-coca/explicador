// Points of two or more classes on two axes, with the boundary a model draws between them. In Present mode (`shown`
// is the current part) the axes draw, each class lands in turn, the boundary is traced while its two sides tint, and
// last the points on the wrong side are ringed and counted. On the page everything shows.
import type { ScatterBlock } from '../../../server/src/scene.ts';
import { SceneFrame } from '../components/scenes';
import { PLOT } from './plotGeometry';
import { markPath, scatterModel } from './scatterGeometry';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

export function ScatterView({ block, shown }: { block: ScatterBlock; shown?: number }) {
  const model = scatterModel(block);
  const presenting = shown !== undefined;
  const part = (index: number, fx: string) => (presenting ? { 'data-part': index, 'data-fx': fx, 'data-stage': index > shown ? 'future' : 'shown' } : {});
  const bottom = PLOT.height - PLOT.bottom;
  const boundaryPart = 1 + block.classes.length;
  const straight = block.boundary?.slope !== undefined;
  const total = block.dots.length;
  const counted = straight && (!presenting || shown > boundaryPart);
  const summary = block.classes.map((name, i) => `${model.dots.filter((dot) => dot.group === i).length} ${name}`).join(', ');

  return (
    <div className="plot">
      <svg viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} role="img" aria-label={`${block.title}: ${summary}${straight ? `; ${model.wrong} of ${total} on the wrong side of the boundary` : ''}`} className="plot-svg">
        {model.boundary && (
          <g {...part(boundaryPart, 'boundary')}>
            {model.sides.map((side) => (
              <polygon key={side.group} points={side.points} className="scatter-side" style={{ fill: SERIES[side.group % SERIES.length] }} />
            ))}
          </g>
        )}
        <g {...part(0, 'plot')}>
          {model.yTicks.map((tick) => (
            <g key={`y${tick.value}`}>
              <line x1={PLOT.left} x2={PLOT.width - PLOT.right} y1={tick.at} y2={tick.at} className="plot-grid" />
              <text x={PLOT.left - 10} y={tick.at} className="plot-tick" textAnchor="end" dominantBaseline="middle">
                {tick.text}
              </text>
            </g>
          ))}
          {model.xTicks.map((tick) => (
            <g key={`x${tick.value}`}>
              <line x1={tick.at} x2={tick.at} y1={bottom} y2={bottom + 6} className="plot-axis" />
              <text x={tick.at} y={bottom + 22} className="plot-tick" textAnchor="middle">
                {tick.text}
              </text>
            </g>
          ))}
          <path d={`M${PLOT.left} ${bottom} H${PLOT.width - PLOT.right}`} className="plot-axis plot-draw" />
          <path d={`M${PLOT.left} ${bottom} V${PLOT.top}`} className="plot-axis plot-draw" />
          {block.x && (
            <text x={PLOT.width - PLOT.right} y={PLOT.height - 8} className="plot-label" textAnchor="end">
              {block.x}
            </text>
          )}
          {block.y && (
            <text x={PLOT.left} y={12} className="plot-label" textAnchor="start">
              {block.y}
            </text>
          )}
        </g>
        {block.classes.map((name, group) => (
          <g key={name} {...part(1 + group, 'dots')}>
            {model.dots.map((dot, i) =>
              dot.group === group ? (
                // The outer group places the dot; the inner path is what moves.
                <g key={i} transform={`translate(${dot.px} ${dot.py})`}>
                  <path d={markPath(group, 6.5)} className="scatter-dot" style={{ fill: SERIES[group % SERIES.length] }}>
                    <title>{`${dot.label ? `${dot.label}: ` : ''}${name} (${block.dots[i]?.x}, ${block.dots[i]?.y})`}</title>
                  </path>
                </g>
              ) : null,
            )}
          </g>
        ))}
        {model.boundary && (
          <g {...part(boundaryPart, 'boundary')}>
            <path d={model.boundary} className="scatter-boundary" />
          </g>
        )}
        {straight && (
          <g {...part(boundaryPart + 1, 'wrong')}>
            {model.dots.map((dot, i) =>
              dot.wrong ? (
                <g key={i} transform={`translate(${dot.px} ${dot.py})`}>
                  <circle r={13} className="scatter-ring" />
                </g>
              ) : null,
            )}
          </g>
        )}
      </svg>
      <ul className="plot-legend">
        {block.classes.map((name, group) => (
          <li key={name}>
            <svg width={18} height={18} viewBox="-9 -9 18 18" aria-hidden="true">
              <path d={markPath(group, 6)} style={{ fill: SERIES[group % SERIES.length] }} />
            </svg>
            {name}
          </li>
        ))}
        {model.boundary && (
          <li>
            <span className="plot-swatch bg-foreground" />
            decision boundary
          </li>
        )}
      </ul>
      {counted && (
        <p key={presenting ? shown : 'page'} className="scatter-count animate-fade-up" aria-live="polite">
          <strong>
            {model.wrong} of {total}
          </strong>{' '}
          points fall on the wrong side of the boundary; <strong>{total - model.wrong}</strong> are on their own side.
        </p>
      )}
    </div>
  );
}

export function ScatterScene({ block }: { block: ScatterBlock }) {
  return (
    <SceneFrame kind="Scatter" title={block.title}>
      <div className="p-5">
        <ScatterView block={block} />
      </div>
    </SceneFrame>
  );
}
