// How a model scores one input: the parts join a waterfall one by one, the score is their sum, and a logistic
// model turns it into a probability on the sigmoid and decides the class. The viewer does all the arithmetic.
import { useMemo, useRef } from 'react';
import type { CalcBlock } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { SceneFrame, StepControls, StepProgress } from '../components/scenes';
import { cn } from '@/lib/utils';
import { useWidth } from './Chart';
import { calcModel, sigmoidCurve, waterfall, type CalcModel } from './calc';
import { useFirstVisible, useFollowCode } from './hooks';

/** What step `index` says: the part it adds, the score, the probability or the decision. */
export function calcNarration(block: CalcBlock, model: CalcModel, index: number): { title: string; text?: string | undefined } {
  const parts = model.rows.length;
  const row = model.rows[index];
  if (row) {
    return {
      title: `${row.label}: ${row.text} → ${row.after.toFixed(model.decimals)}`,
      text: row.note ?? (index === 0 ? 'The calculation starts here.' : row.value >= 0 ? 'It pushes the score up.' : 'It pushes the score down.'),
    };
  }
  const logistic = model.logistic;
  if (index === parts) return { title: `Score = ${model.totalText}`, text: model.roundingNote ?? 'The sum of every part.' };
  if (!logistic) return { title: '' };
  if (index === parts + 1) {
    return {
      title: `sigmoid(${model.totalText}) = ${logistic.probabilityText}`,
      text: `The sigmoid squeezes any score into a probability between 0 and 1: here, a ${logistic.probabilityText} chance of "${logistic.classes[1]}".`,
    };
  }
  const name = logistic.classes[logistic.decided];
  return {
    title: `${logistic.probabilityText} ${logistic.decided === 1 ? '≥' : '<'} ${logistic.threshold} → ${name}`,
    text: `The model answers "${name}" because the probability is ${logistic.decided === 1 ? 'at or above' : 'below'} the threshold ${logistic.threshold}.`,
  };
}

function stepLabels(model: CalcModel): string[] {
  return [...model.rows.map((row) => row.label), 'score', ...(model.logistic ? ['probability', 'decision'] : [])];
}

function WaterfallView({ model, index }: { model: CalcModel; index: number }) {
  const [frame, width] = useWidth();
  const w = useMemo(() => (width > 0 ? waterfall(model, width) : undefined), [model, width]);
  return (
    <div ref={frame} className="w-full">
      {w && (
        <svg width={w.width} height={w.height} className="block overflow-visible" role="group" aria-roledescription="waterfall" aria-label="Parts of the score">
          {w.ticks.map((tick) => (
            <g key={tick.text} aria-hidden="true">
              <line className="chart-grid" x1={tick.at} x2={tick.at} y1={0} y2={w.height - 22} />
              <text className="chart-tick" x={tick.at} y={w.height - 6} textAnchor="middle">
                {tick.text}
              </text>
            </g>
          ))}
          <line className="chart-axis" x1={w.zero} x2={w.zero} y1={0} y2={w.height - 22} aria-hidden="true" />
          {w.bars.map((bar, i) => {
            const shown = bar.total ? index >= model.rows.length : i <= index;
            const current = bar.total ? index === model.rows.length : i === index;
            const x = Math.min(bar.x0, bar.x1);
            const length = Math.max(Math.abs(bar.x1 - bar.x0), 2);
            const end = bar.up ? Math.max(bar.x0, bar.x1) : Math.min(bar.x0, bar.x1);
            const next = w.bars[i + 1];
            return (
              <g key={i} className={cn('calc-row', !shown && 'pending', current && 'current')} role="img" aria-label={`${bar.full} ${bar.text}, total ${bar.runningText}`}>
                {current && <rect x={0} y={bar.y - 6} width={w.width} height={w.rowHeight} rx={8} className="calc-current" />}
                <text className="chart-label" x={w.left - 10} y={bar.y + w.bar / 2 + 4} textAnchor="end" aria-hidden="true">
                  {bar.label !== bar.full && <title>{bar.full}</title>}
                  {bar.label}
                </text>
                {shown && (
                  <>
                    <rect
                      key={`bar-${shown}`}
                      className={cn('chart-mark', bar.up ? 'grow-right' : 'grow-left')}
                      x={x}
                      y={bar.y}
                      width={length}
                      height={w.bar}
                      rx={4}
                      fill={bar.total ? 'var(--foreground)' : bar.up ? 'var(--diverge-pos)' : 'var(--diverge-neg)'}
                    />
                    <text className="chart-value chart-fade" x={end + (bar.up ? 6 : -6)} y={bar.y + w.bar / 2 + 4} textAnchor={bar.up ? 'start' : 'end'} aria-hidden="true">
                      {bar.text}
                    </text>
                    {/* The dashed link carries the running total to the next part. */}
                    {next && !bar.total && !next.total && i < index && (
                      <line className="calc-link" x1={bar.x1} x2={bar.x1} y1={bar.y + w.bar} y2={next.y} aria-hidden="true" />
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function SigmoidView({ model, index }: { model: CalcModel; index: number }) {
  const logistic = model.logistic;
  const [frame, width] = useWidth();
  if (!logistic) return null;
  const decided = index >= model.rows.length + 2;
  const w = Math.min(width, 520);
  const h = 170;
  const pad = { left: 34, bottom: 22, top: 10 };
  const curve = w > 0 ? sigmoidCurve(model.total, w - pad.left - 10, h - pad.bottom - pad.top) : undefined;
  return (
    <div ref={frame} className="animate-fade-up grid gap-4 border-t border-border-soft pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        {curve && (
          <svg width={w} height={h} className="block overflow-visible" role="img" aria-label={`Sigmoid: score ${model.totalText} gives probability ${logistic.probabilityText}`}>
            <g transform={`translate(${pad.left},${pad.top})`}>
              {[0, 0.5, 1].map((p) => (
                <g key={p} aria-hidden="true">
                  <line className="chart-grid" x1={0} x2={w - pad.left - 10} y1={curve.at(p)} y2={curve.at(p)} />
                  <text className="chart-tick" x={-6} y={curve.at(p) + 4} textAnchor="end">
                    {p}
                  </text>
                </g>
              ))}
              <line className="calc-threshold" x1={0} x2={w - pad.left - 10} y1={curve.at(logistic.threshold)} y2={curve.at(logistic.threshold)} />
              <path className="chart-line" d={curve.d} stroke="var(--series-1)" pathLength={1} />
              <line className="calc-link" x1={curve.point.x} x2={curve.point.x} y1={h - pad.bottom - pad.top} y2={curve.point.y} />
              <circle className="chart-dot" cx={curve.point.x} cy={curve.point.y} r={6} fill={logistic.decided ? 'var(--diverge-pos)' : 'var(--diverge-neg)'} />
              <text className="chart-tick" x={curve.point.x} y={h - pad.top - 4} textAnchor="middle">
                score {model.totalText}
              </text>
            </g>
          </svg>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        <p className="text-right">
          <span className="block text-xs font-extrabold uppercase tracking-wide text-muted-foreground">P({logistic.classes[1]})</span>
          <span className="text-4xl font-black tabular-nums">{logistic.probabilityText}</span>
        </p>
        {decided && (
          <span className={cn('animate-pop-in rounded-full px-4 py-1.5 text-base font-black text-white', logistic.decided ? 'bg-[var(--diverge-pos)]' : 'bg-[var(--diverge-neg)]')}>
            → {logistic.classes[logistic.decided]}
          </span>
        )}
      </div>
    </div>
  );
}

/** The calculation at step `index` (presentation uses it directly). */
export function CalcView({ block, index }: { block: CalcBlock; index: number }) {
  const model = useMemo(() => calcModel(block), [block]);
  const said = calcNarration(block, model, index);
  return (
    <div className="space-y-4">
      <WaterfallView model={model} index={index} />
      {/* Mounted once it is reached, so it measures its width when it appears. */}
      {model.logistic && index > model.rows.length && <SigmoidView model={model} index={index} />}
      <div aria-live="polite" className="border-t border-border-soft pt-3">
        <p key={`t-${index}`} className="animate-fade-up font-mono text-base font-bold tabular-nums">
          {said.title}
        </p>
        {said.text && <p className="mt-1 max-w-3xl text-base font-semibold leading-relaxed">{said.text}</p>}
      </div>
    </div>
  );
}

export function CalcScene({ block }: { block: CalcBlock }) {
  const model = useMemo(() => calcModel(block), [block]);
  const reducedMotion = useReducedMotion();
  const durations = useMemo(
    () => Array.from({ length: model.steps }, (_, i) => stepDuration(calcNarration(block, model, i).text ?? '') - 800),
    [block, model],
  );
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (!reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  useFollowCode(block.parts[playback.index]?.ref ?? block.ref);
  return (
    <div ref={frame}>
      <SceneFrame kind="Calculation" title={block.title} actions={<StepControls playback={playback} />}>
        <div className="p-5">
          <CalcView block={block} index={playback.index} />
        </div>
        <StepProgress index={playback.index} labels={stepLabels(model)} onPick={playback.goTo} />
      </SceneFrame>
    </div>
  );
}
