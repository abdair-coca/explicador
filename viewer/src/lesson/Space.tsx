// A vector space: the stored items as points, a query that lands among them, the index sending it to one cluster, the
// angle between the query and each item it compares with its cosine, and the k nearest items ranked. Both axes share
// one scale, so the angles on screen are the real ones. In Present mode (`shown` is the current part) each of those is
// a part; on the page the same parts play with step controls, and the narration of the part shows under the plot.
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { SpaceBlock } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame, StepControls } from '../components/scenes';
import { runParts } from '../presentation/choreo';
import { planParts } from '../presentation/partPlan';
import { subtitleOf } from '../presentation/subtitles';
import { cn } from '@/lib/utils';
import { useFirstVisible } from './hooks';
import { angleArc, labelPlaces, spaceModel } from './spaceGeometry';

const STAR = 'M0 -11 L3.2 -3.4 L11 -3.4 L4.8 1.6 L7 9.6 L0 4.8 L-7 9.6 L-4.8 1.6 L-11 -3.4 L-3.2 -3.4 Z';
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', '#8a5cf6', '#e0427f', '#0e9fb0', '#6b7280'];
const colorOf = (group: number): string => (group < 0 ? 'var(--foreground)' : (COLORS[group % COLORS.length] ?? 'var(--foreground)'));

/** An arrow from the origin; the head is drawn by the marker. */
function Arrow({ from, to, className }: { from: { px: number; py: number }; to: { px: number; py: number }; className: string }) {
  return <line x1={from.px} y1={from.py} x2={to.px} y2={to.py} className={className} markerEnd="url(#space-head)" />;
}

export function SpaceView({ block, shown }: { block: SpaceBlock; shown?: number }) {
  const model = useMemo(() => spaceModel(block), [block]);
  const now = shown ?? model.parts.length - 1;
  const partOf = (kind: string): number => model.parts.findIndex((part) => part.kind === kind);
  const stage = (index: number, fx: string) => ({ 'data-part': index, 'data-fx': fx, 'data-stage': index > now ? 'future' : 'shown' });
  const indexPart = partOf('index');
  const rankPart = partOf('rank');
  const probing = indexPart >= 0 && now >= indexPart;
  const ranked = rankPart >= 0 && now >= rankPart;
  const compareParts = model.parts.flatMap((part, index) => (part.kind === 'compare' ? [{ index, items: part.items }] : []));
  const current = model.parts[now];
  // The angle shows for the item compared alone in the current part; on the page at the end, for the best result.
  const angleItem = current?.kind === 'compare' && current.items.length === 1 ? current.items[0] : ranked ? model.ranking[0] : undefined;
  const best = model.ranking[0];
  const query = model.query;
  const label = block.query
    ? `${block.title}: ${block.items.length} items; the query "${block.query.label}" is closest to ${best !== undefined ? `"${block.items[best]?.label}"` : 'nothing'}`
    : `${block.title}: ${block.items.length} items in ${block.clusters.length} clusters`;
  // The compared items and the results label first, so theirs are the labels that always show.
  const labels = useMemo(() => {
    const order = block.items.map((_, i) => i).sort((a, b) => Number(model.items[b]?.candidate) - Number(model.items[a]?.candidate) || a - b);
    return labelPlaces(
      model,
      block.items.map((item) => item.label),
      order,
    );
  }, [block, model]);
  const sizes = block.clusters.map((_, c) => model.items.filter((item) => item.group === c).length);

  return (
    <div className="plot space">
      <svg viewBox={`0 0 ${model.width} ${model.height}`} role="img" aria-label={label} className={cn('plot-svg space-svg', probing && 'probing')}>
        <defs>
          <marker id="space-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 Z" className="space-head" />
          </marker>
        </defs>
        <g {...stage(0, 'plot')}>
          <line x1={0} x2={model.width} y1={model.origin.py} y2={model.origin.py} className="plot-grid" />
          <line x1={model.origin.px} x2={model.origin.px} y1={0} y2={model.height} className="plot-grid" />
          <circle cx={model.origin.px} cy={model.origin.py} r={4} className="space-origin" />
          <text x={model.origin.px - 8} y={model.origin.py + 18} className="plot-tick" textAnchor="end">
            0
          </text>
          {block.x && (
            <text x={model.width - 8} y={model.origin.py + 20} className="plot-label" textAnchor="end">
              {block.x}
            </text>
          )}
          {block.y && (
            <text x={model.origin.px - 8} y={14} className="plot-label" textAnchor="end">
              {block.y}
            </text>
          )}
          {block.clusters.map((cluster, c) => {
            const place = model.clusters[c];
            if (!place) return null;
            return (
              <g key={cluster.id} className={cn('space-cluster', c === model.probed && 'probed')} style={{ '--tint': colorOf(c) } as React.CSSProperties}>
                <circle cx={place.px} cy={place.py} r={place.r} className="space-zone" />
                <path
                  d={`M${place.px - 7} ${place.py - 7} L${place.px + 7} ${place.py + 7} M${place.px + 7} ${place.py - 7} L${place.px - 7} ${place.py + 7}`}
                  className="space-centroid"
                />
              </g>
            );
          })}
        </g>
        <g {...stage(0, 'space-items')}>
          {block.items.map((item, i) => {
            const place = model.items[i];
            if (!place) return null;
            const spot = labels[i];
            return (
              // The outer group places the item; the inner one is what moves.
              <g key={item.id} transform={`translate(${place.px} ${place.py})`}>
                <g className={cn('space-item', !place.candidate && 'outside', place.rank > 0 && ranked && 'result')}>
                  <circle r={7} className="space-dot" style={{ fill: colorOf(place.group) }}>
                    <title>{`${item.label} (${item.x}, ${item.y})`}</title>
                  </circle>
                  {spot && (
                    <text x={spot.x - place.px} y={spot.y - place.py} className="space-item-label" textAnchor={spot.anchor}>
                      {item.label}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </g>
        {query && indexPart >= 0 && model.probed >= 0 && model.clusters[model.probed] && (
          <g {...stage(indexPart, 'space-probe')}>
            <line x1={query.px} y1={query.py} x2={model.clusters[model.probed]?.px} y2={model.clusters[model.probed]?.py} className="space-probe" />
          </g>
        )}
        {compareParts.map(({ index, items }) =>
          items.map((i) => {
            const place = model.items[i];
            if (!place || !query) return null;
            const length = Math.min(
              Math.hypot(place.px - model.origin.px, place.py - model.origin.py),
              Math.hypot(query.px - model.origin.px, query.py - model.origin.py),
            );
            const arc = angleArc(model.origin, query, place, Math.max(36, Math.min(110, length * 0.5)));
            return (
              <g key={`${index}-${i}`}>
                <g {...stage(index, 'space-angle')} className={cn('space-angle', angleItem !== i && 'resting')}>
                  <Arrow from={model.origin} to={place} className="space-arrow" />
                  <path d={arc.path} className="space-arc" />
                  <text x={arc.label.x} y={arc.label.y} className="space-arc-label" textAnchor="middle" dominantBaseline="middle">
                    {model.realScores ? `cos ${place.scoreText}` : `cos ${place.scoreText} · ${arc.degrees}°`}
                  </text>
                </g>
                <g transform={`translate(${place.px + 12} ${place.py - 11})`}>
                  <g {...stage(index, 'pop')} className="space-score">
                    <text textAnchor="start" className="space-score-text">
                      {place.scoreText}
                    </text>
                  </g>
                </g>
              </g>
            );
          }),
        )}
        {query && compareParts.length > 0 && (
          <g {...stage(compareParts[0]?.index ?? 0, 'space-angle')}>
            <Arrow from={model.origin} to={query} className="space-arrow query" />
          </g>
        )}
        {query && (
          <g transform={`translate(${query.px} ${query.py})`}>
            <g {...stage(1, 'space-query')}>
              <circle r={18} className="space-query-ring" />
              <path d={STAR} className="space-query" />
            </g>
          </g>
        )}
        {rankPart >= 0 && (
          <g {...stage(rankPart, 'fade')}>
            {model.ranking.map((i, r) => {
              const place = model.items[i];
              return place ? (
                <g key={i} transform={`translate(${place.px} ${place.py})`}>
                  <circle r={15} className="space-ring" />
                  <text x={-17} y={-13} className="space-rank-number" textAnchor="middle">
                    {r + 1}
                  </text>
                </g>
              ) : null;
            })}
          </g>
        )}
      </svg>
      <div className="space-side">
        <div className="space-facts">
          {block.clusters.length > 0 && (
            <ul className={cn('space-legend', block.query && 'compact')} aria-label="Clusters of the index">
              {block.clusters.map((cluster, c) => (
                <li key={cluster.id} className={cn(probing && c !== model.probed && 'dim')}>
                  <span className="space-legend-dot" style={{ background: colorOf(c) }} />
                  <strong>{cluster.label}</strong>
                  <span className="tabular-nums text-muted-foreground">{sizes[c]}</span>
                </li>
              ))}
            </ul>
          )}
          {block.query && (
            <p {...stage(1, 'rise')} className="space-fact space-question">
              <svg width={22} height={22} viewBox="-12 -12 24 24" aria-hidden="true">
                <path d={STAR} className="space-query" />
              </svg>
              <strong>{block.query.label}</strong>
            </p>
          )}
          {indexPart >= 0 && model.probed >= 0 && (
            <p {...stage(indexPart, 'rise')} className="space-fact">
              Index: the query goes to <strong>{block.clusters[model.probed]?.label}</strong> and compares{' '}
              <strong>
                {model.candidates} of {block.items.length}
              </strong>{' '}
              items.
            </p>
          )}
          {block.dims !== undefined && (
            <p className="space-note">
              A 2-D view of {block.dims.toLocaleString()} dimensions
              {!block.query ? '.' : model.realScores ? '; the scores are the system’s own.' : '; the cosines are measured on this view.'}
            </p>
          )}
        </div>
        {rankPart >= 0 && (
          <ol {...stage(rankPart, 'rank')} className="space-rank" aria-label={`The ${model.ranking.length} nearest items`}>
            {model.ranking.map((i, r) => {
              const item = block.items[i];
              const place = model.items[i];
              if (!item || !place) return null;
              const top = model.items[model.ranking[0] ?? i]?.score ?? 1;
              return (
                <li key={item.id} className="space-rank-row">
                  <span className="space-rank-place">{r + 1}</span>
                  <span className="space-rank-label">{item.label}</span>
                  <span className="space-rank-track" aria-hidden="true">
                    <span className="space-rank-bar" style={{ '--share': top > 0 ? Math.max(0, place.score) / top : 0 } as React.CSSProperties} />
                  </span>
                  <span className="space-rank-score tabular-nums">{place.scoreText}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export function SpaceScene({ block }: { block: SpaceBlock }) {
  const model = useMemo(() => spaceModel(block), [block]);
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => model.parts.map((_, i) => stepDuration(subtitleOf(block, i) ?? '') + 900), [block, model.parts]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (!reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const shown = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (plot.current)
      runParts(
        plot.current,
        planParts(shown.current === undefined ? undefined : { slide: 0, part: shown.current }, { slide: 0, part: playback.index }, reducedMotion),
      );
    shown.current = playback.index;
  }, [playback.index, reducedMotion]);
  const said = subtitleOf(block, playback.index);
  return (
    <div ref={frame}>
      <SceneFrame kind="Vector space" title={block.title} actions={<StepControls playback={playback} />}>
        <div ref={plot} className="p-5">
          <SpaceView block={block} shown={playback.index} />
          <p key={playback.index} className="animate-fade-up mt-3 min-h-[1.5em] max-w-3xl text-base font-semibold leading-relaxed" aria-live="polite">
            {said && <InlineMarkdown text={said} />}
          </p>
        </div>
      </SceneFrame>
    </div>
  );
}
