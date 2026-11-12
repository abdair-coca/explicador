// A function drawn on its axes, with real inputs marked on it. In Present mode (`shown` is the current part) the axes
// and curves draw first; then each mark is a part: a point travels along the curve from the previous mark to this one
// while its reading follows, then its guides draw and its label lands. On the page everything shows, and the curves
// draw once when the plot comes into view.
import { useLayoutEffect, useRef } from 'react';
import { curveValue } from '../../../server/src/parser/plotMath.ts';
import type { PlotBlock } from '../../../server/src/scene.ts';
import { gsap, reducedMotion, tokens } from '../animation/motion';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame } from '../components/scenes';
import { cn } from '@/lib/utils';
import { useFirstVisible } from './hooks';
import { formatY, PLOT, plotModel, type PlotModel } from './plotGeometry';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

/** The point that travels the curve in Present mode, with its live reading. */
function useRunner(model: PlotModel, shown: number | undefined) {
  const dot = useRef<SVGGElement>(null);
  const reading = useRef<SVGTextElement>(null);
  const at = useRef<{ x: number; curve: number } | undefined>(undefined);
  useLayoutEffect(() => {
    const group = dot.current;
    const mark = shown === undefined || shown === 0 ? undefined : model.marks[shown - 1];
    if (!group) return;
    if (!mark) {
      at.current = undefined;
      gsap.set(group, { autoAlpha: 0 });
      return;
    }
    const curve = model.curves[mark.curve]?.curve;
    const place = (x: number): void => {
      const y = curve ? curveValue(curve, x) : Number.NaN;
      if (!Number.isFinite(y)) return;
      gsap.set(group, { x: model.sx(x), y: model.sy(y) });
      if (reading.current) reading.current.textContent = formatY(y);
    };
    // It starts where it was, or at the left end of the curve the first time and when it changes curve.
    const from = at.current && at.current.curve === mark.curve ? at.current.x : model.domain[0];
    at.current = { x: mark.x, curve: mark.curve };
    gsap.killTweensOf(group);
    if (reducedMotion()) {
      gsap.set(group, { autoAlpha: 0 });
      return;
    }
    const runner = { x: from };
    place(from);
    const tween = gsap.timeline();
    tween.to(group, { autoAlpha: 1, duration: tokens.dur.fast }, 0);
    tween.to(runner, { x: mark.x, duration: tokens.dur.travel, ease: tokens.ease.move, onUpdate: () => place(runner.x) }, 0);
    // Once it arrives the mark's own dot and label take over.
    tween.to(group, { autoAlpha: 0, duration: tokens.dur.fast }, tokens.dur.travel + 0.05);
    return () => {
      tween.kill();
    };
  }, [model, shown]);
  return { dot, reading };
}

export function PlotView({ block, shown }: { block: PlotBlock; shown?: number }) {
  const model = plotModel(block);
  const presenting = shown !== undefined;
  const svg = useRef<SVGSVGElement>(null);
  const { dot, reading } = useRunner(model, shown);
  // On the page the curves draw once, when the plot scrolls into view.
  useFirstVisible(svg, () => {
    if (presenting || reducedMotion() || !svg.current) return;
    gsap.from(svg.current.querySelectorAll('.plot-curve'), { drawSVG: 0, duration: tokens.dur.draw, ease: tokens.ease.draw, stagger: tokens.stagger.loose });
  });
  const part = (index: number, fx: string) => (presenting ? { 'data-part': index, 'data-fx': fx, 'data-stage': index > shown ? 'future' : 'shown' } : {});
  const bottom = PLOT.height - PLOT.bottom;
  const current = presenting && shown > 0 ? model.marks[shown - 1] : undefined;
  const summary = model.marks.map((mark) => `${mark.label}: ${mark.xText} gives ${mark.yText}`).join('; ');

  return (
    <div className="plot">
      <svg ref={svg} viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} role="img" aria-label={`${block.title}${summary ? `. ${summary}` : ''}`} className="plot-svg">
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
          <path d={`M${PLOT.left} ${model.zeroY ?? bottom} H${PLOT.width - PLOT.right}`} className="plot-axis plot-draw" />
          <path d={`M${model.zeroX ?? PLOT.left} ${bottom} V${PLOT.top}`} className="plot-axis plot-draw" />
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
          {model.curves.map((curve, i) => (
            <path key={i} d={curve.d} className="plot-curve" style={{ stroke: SERIES[i % SERIES.length] }} />
          ))}
        </g>
        {model.marks.map((mark, i) => (
          <g key={i} className={cn('plot-mark', current === mark && 'current')} {...part(i + 1, 'mark')}>
            <path d={`M${mark.px} ${model.zeroY ?? bottom} V${mark.py}`} className="plot-guide" />
            <path d={`M${mark.px} ${mark.py} H${model.zeroX ?? PLOT.left}`} className="plot-guide" />
            <circle cx={mark.px} cy={mark.py} r={7} className="plot-dot" />
            {/* The outer group places the label; the inner one is what moves, so its place survives the animation. */}
            <g transform={`translate(${mark.px > PLOT.width * 0.62 ? mark.px - 12 : mark.px + 12} ${mark.py > PLOT.top + 46 ? mark.py - 16 : mark.py + 30})`}>
              <g className="plot-tag">
                <text textAnchor={mark.px > PLOT.width * 0.62 ? 'end' : 'start'}>
                  <tspan className="plot-tag-label">{mark.label}</tspan>
                  <tspan className="plot-tag-value" dx={8}>
                    {mark.xText} → {mark.yText}
                  </tspan>
                </text>
              </g>
            </g>
          </g>
        ))}
        {/* The travelling point: placed by `useRunner`, never part of the page view. */}
        <g ref={dot} className="plot-runner" style={{ visibility: 'hidden' }} aria-hidden="true">
          <circle r={11} className="plot-runner-ring" />
          <circle r={6} className="plot-runner-dot" />
          <text ref={reading} y={-18} textAnchor="middle" className="plot-runner-reading" />
        </g>
      </svg>
      {model.curves.length > 1 && (
        <ul className="plot-legend">
          {model.curves.map((curve, i) => (
            <li key={i}>
              <span className="plot-swatch" style={{ background: SERIES[i % SERIES.length] }} />
              {curve.label}
            </li>
          ))}
        </ul>
      )}
      {presenting
        ? current?.narration && (
            <p key={shown} className="plot-note animate-fade-up" aria-live="polite">
              <InlineMarkdown text={current.narration} />
            </p>
          )
        : model.marks.some((mark) => mark.narration) && (
            <ol className="plot-notes">
              {model.marks.map((mark, i) => (
                <li key={i}>
                  <strong>{mark.label}</strong> ({mark.xText} → {mark.yText}){mark.narration && ': '}
                  {mark.narration && <InlineMarkdown text={mark.narration} />}
                </li>
              ))}
            </ol>
          )}
    </div>
  );
}

export function PlotScene({ block }: { block: PlotBlock }) {
  return (
    <SceneFrame kind="Plot" title={block.title}>
      <div className="p-5">
        <PlotView block={block} />
      </div>
    </SceneFrame>
  );
}
