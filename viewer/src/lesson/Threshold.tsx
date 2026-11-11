// "What if the model were stricter?": the reader drags the decision threshold over the real test predictions and
// sees which inputs change class, the confusion matrix and the metrics, recomputed live.
import { useId, useMemo, useState } from 'react';
import type { ThresholdBlock } from '../../../server/src/scene.ts';
import { SceneFrame } from '../components/scenes';
import { ReplayIcon } from '../components/icons';
import { Button } from '../components/ui/button';
import { cn } from '@/lib/utils';
import { useWidth } from './Chart';
import { CHAR_PX } from './chart';
import { formatRatio, metricNames } from './confusion';
import { MatrixGrid } from './Matrix';
import { changedFrom, dotsOf, matrixAt, metricsAt, predicted } from './threshold';

const LANE = 46;
const DOT = 7;

function Strip({ block, threshold }: { block: ThresholdBlock; threshold: number }) {
  const [frame, width] = useWidth();
  const left = Math.min(Math.max(...block.classes.map((name) => name.length + 7)) * CHAR_PX + 14, Math.round(width * 0.4));
  const right = width - 14;
  const dots = useMemo(() => (width > 0 ? dotsOf(block, left, right, DOT * 2 + 2) : []), [block, left, right, width]);
  const height = 2 * LANE + 40;
  const laneY = (lane: 0 | 1): number => 12 + (1 - lane) * LANE + LANE - 14;
  const x = (score: number): number => left + score * (right - left);
  return (
    <div ref={frame} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={`Test inputs along the probability of ${block.classes[1]}, threshold at ${threshold.toFixed(2)}`}>
          {/* What each side of the threshold is called. */}
          <rect x={left} y={4} width={Math.max(0, x(threshold) - left)} height={2 * LANE + 8} className="threshold-side below" />
          <rect x={x(threshold)} y={4} width={Math.max(0, right - x(threshold))} height={2 * LANE + 8} className="threshold-side above" />
          {/* Each side says what it is called, when it is wide enough to say it. */}
          {x(threshold) - left > (block.classes[0].length + 9) * CHAR_PX && (
            <text className="chart-tick" x={left + 6} y={18}>
              called {block.classes[0]}
            </text>
          )}
          {right - x(threshold) > (block.classes[1].length + 9) * CHAR_PX && (
            <text className="chart-tick" x={right - 6} y={18} textAnchor="end">
              called {block.classes[1]}
            </text>
          )}
          {([1, 0] as const).map((lane) => (
            <g key={lane}>
              <line className="chart-grid" x1={left} x2={right} y1={laneY(lane)} y2={laneY(lane)} />
              <text className="chart-label" x={left - 10} y={laneY(lane) + 4} textAnchor="end">
                actual {block.classes[lane]}
              </text>
            </g>
          ))}
          {/* Ticks step aside for the threshold's own label. */}
          {[0, 0.25, 0.5, 0.75, 1].filter((tick) => Math.abs(x(tick) - x(threshold)) > 30).map((tick) => (
            <text key={tick} className="chart-tick" x={x(tick)} y={height - 6} textAnchor="middle">
              {tick}
            </text>
          ))}
          {dots.map((dot) => {
            const point = block.points[dot.index];
            if (!point) return null;
            const correct = predicted(Number(point.score), threshold) === dot.lane;
            return (
              <circle
                key={dot.index}
                cx={dot.x}
                cy={laneY(dot.lane) - dot.stack * (DOT * 2 + 1)}
                r={DOT}
                className={cn('threshold-dot', correct ? 'hit' : 'miss')}
              >
                <title>{`${point.label ? `${point.label}: ` : ''}${point.score} (actual ${point.actual})`}</title>
              </circle>
            );
          })}
          <line className="threshold-line" x1={x(threshold)} x2={x(threshold)} y1={0} y2={2 * LANE + 16} />
          <text className="chart-value" x={x(threshold)} y={height - 6} textAnchor="middle">
            {threshold.toFixed(2)}
          </text>
        </svg>
      )}
    </div>
  );
}

/** The interactive view: strip, slider, matrix and metrics. */
export function ThresholdView({ block }: { block: ThresholdBlock }) {
  const [threshold, setThreshold] = useState(block.at);
  const slider = useId();
  const metrics = metricsAt(block, threshold);
  const changed = changedFrom(block, threshold);
  const matrix = useMemo(() => matrixAt(block, threshold), [block, threshold]);
  return (
    <div className="space-y-5">
      <Strip block={block} threshold={threshold} />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={slider} className="text-sm font-extrabold">
          Threshold
        </label>
        <input
          id={slider}
          type="range"
          min={0.01}
          max={0.99}
          step={0.01}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.currentTarget.value))}
          aria-valuetext={`${threshold.toFixed(2)}: ${changed} ${changed === 1 ? 'input changes' : 'inputs change'} class`}
          className="threshold-range min-w-[10rem] flex-1"
        />
        <span className="w-12 text-right font-mono text-base font-bold tabular-nums">{threshold.toFixed(2)}</span>
        <Button variant="ghost" size="sm" onClick={() => setThreshold(block.at)} disabled={threshold === block.at}>
          <ReplayIcon size={16} />
          Back to {block.at}
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <MatrixGrid block={matrix} />
        <div className="space-y-3">
          <ul className="grid grid-cols-3 gap-2" aria-live="polite">
            {metrics.map((metric) => (
              <li key={metric.metric} className="rounded-xl border-2 border-border bg-card px-3 py-2">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{metricNames[metric.metric]}</p>
                <p className="text-2xl font-black tabular-nums">{formatRatio(metric.value)}</p>
                <p className="font-mono text-[0.7rem] font-semibold text-muted-foreground [overflow-wrap:anywhere]">{metric.worked}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-muted-foreground">
            {changed === 0
              ? `At ${block.at}, the model's own threshold. Drag the slider: a higher threshold says "${block.classes[1]}" less often.`
              : `${changed} ${changed === 1 ? 'input is' : 'inputs are'} called differently than at ${block.at}.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ThresholdScene({ block }: { block: ThresholdBlock }) {
  return (
    <SceneFrame kind="What if" title={block.title}>
      <div className="p-5">
        <ThresholdView block={block} />
      </div>
    </SceneFrame>
  );
}
