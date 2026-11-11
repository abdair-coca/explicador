// Lesson charts: grouped bars from zero, horizontal (diverging) bars, and lines that draw. Drawn at the measured
// width so text stays crisp; every value is on screen (labels or the table view), the tooltip only adds detail.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChartBlock } from '../../../server/src/scene.ts';
import { ReplayButton, SceneFrame } from '../components/scenes';
import { TableIcon } from '../components/icons';
import { Button } from '../components/ui/button';
import { cn } from '@/lib/utils';
import { chartGeometry, entranceDelay, nearestIndex, seriesColor, seriesOf, withUnit, type ChartGeometry, type Mark } from './chart';

const kindName: Record<ChartBlock['chartType'], string> = { bars: 'Bar chart', hbars: 'Bar chart', line: 'Line chart' };

interface Tip {
  x: number;
  y: number;
  label: string;
  items: { series: string; text: string; color: string }[];
}

export function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const element = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const target = element.current;
    if (!target) return;
    setWidth(target.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setWidth(target.clientWidth));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return [element, width];
}

function Legend({ block }: { block: ChartBlock }) {
  const names = seriesOf(block);
  if (names.length < 2) return null;
  const muted = (name: string): boolean => block.highlight !== undefined && block.series.includes(block.highlight) && name !== block.highlight;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-bold" aria-label="Series">
      {names.map((name, s) => (
        <li key={name} className={cn('inline-flex items-center gap-2', muted(name) && 'text-muted-foreground')}>
          <svg width="16" height="12" aria-hidden="true">
            {block.chartType === 'line' ? (
              <line x1="1" y1="6" x2="15" y2="6" stroke={muted(name) ? 'var(--series-muted)' : seriesColor(s)} strokeWidth="3" strokeLinecap="round" />
            ) : (
              <rect x="1" y="1" width="14" height="10" rx="3" fill={muted(name) ? 'var(--series-muted)' : seriesColor(s)} />
            )}
          </svg>
          {name}
        </li>
      ))}
    </ul>
  );
}

function tipFor(block: ChartBlock, mark: Mark): Tip {
  const names = seriesOf(block);
  return { x: mark.x, y: mark.y, label: block.rows[mark.row]?.label ?? '', items: [{ series: names[mark.series] ?? '', text: mark.text, color: mark.color }] };
}

function Plot({ block, geometry, onTip }: { block: ChartBlock; geometry: ChartGeometry; onTip: (tip: Tip | undefined) => void }) {
  const g = geometry;
  const names = seriesOf(block);
  const horizontal = block.chartType === 'hbars';
  const [cross, setCross] = useState<number>();
  const marks = g.marks;
  const opacity = (mark: Mark): number => (mark.emphasis === 'dim' ? 0.35 : 1);
  const describe = (mark: Mark): string => [block.rows[mark.row]?.label, names[mark.series], mark.text].filter(Boolean).join(', ');
  const lineTip = (index: number): Tip => {
    const at = marks.filter((mark) => mark.row === index);
    return {
      x: g.xs?.[index] ?? 0,
      y: Math.min(...at.map((mark) => mark.y)),
      label: block.rows[index]?.label ?? '',
      items: at.map((mark) => ({ series: names[mark.series] ?? '', text: mark.text, color: mark.color })),
    };
  };
  return (
    <svg
      width={g.width}
      height={g.height}
      className="block overflow-visible"
      // A group, not an image: its marks are focusable and each one names its label, series and value.
      role="group"
      aria-roledescription="chart"
      aria-label={`${block.title}: ${block.rows.length} ${block.chartType === 'line' ? 'points' : 'rows'}; Tab through the marks, or use the Table view`}
      onMouseLeave={() => {
        setCross(undefined);
        onTip(undefined);
      }}
      onMouseMove={
        g.xs
          ? (event) => {
              const box = event.currentTarget.getBoundingClientRect();
              const index = nearestIndex(g.xs ?? [], event.clientX - box.left);
              setCross(index);
              onTip(lineTip(index));
            }
          : undefined
      }
    >
      {/* Grid and value axis. */}
      {g.ticks.map((tick) =>
        horizontal ? (
          <g key={tick.value}>
            <line className="chart-grid" x1={tick.at} x2={tick.at} y1={g.top} y2={g.bottom} />
            <text aria-hidden="true" className="chart-tick" x={tick.at} y={g.bottom + 18} textAnchor="middle">
              {tick.text}
            </text>
          </g>
        ) : (
          <g key={tick.value}>
            <line className="chart-grid" x1={g.left} x2={g.right} y1={tick.at} y2={tick.at} />
            <text aria-hidden="true" className="chart-tick" x={g.left - 8} y={tick.at + 4} textAnchor="end">
              {tick.text}
            </text>
          </g>
        ),
      )}
      {g.zero !== undefined &&
        (horizontal ? (
          <line className="chart-axis" x1={g.zero} x2={g.zero} y1={g.top} y2={g.bottom} />
        ) : (
          <line className="chart-axis" x1={g.left} x2={g.right} y1={g.zero} y2={g.zero} />
        ))}
      {g.labels.map((label, i) => (
        <text key={i} aria-hidden="true" className="chart-label" x={label.x} y={label.y} textAnchor={label.anchor}>
          {label.text !== label.full && <title>{label.full}</title>}
          {label.text}
        </text>
      ))}
      {/* Lines. */}
      {g.lines?.map((line) => (
        <g key={line.series} opacity={line.emphasis === 'muted' ? 0.9 : 1}>
          <path className="chart-line" d={line.d} stroke={line.color} pathLength={1} />
          {line.end && (
            <text aria-hidden="true" className="chart-label chart-fade" x={line.end.x} y={line.end.y} fill={line.color} style={{ animationDelay: '700ms' }}>
              {line.end.text}
            </text>
          )}
        </g>
      ))}
      {cross !== undefined && g.xs && <line className="chart-axis" x1={g.xs[cross]} x2={g.xs[cross]} y1={g.top} y2={g.bottom} strokeDasharray="3 3" />}
      {/* Marks: bars, or the dots of the lines. */}
      {marks.map((mark, i) => {
        const delay = entranceDelay(i, marks.length);
        const handlers = {
          tabIndex: 0,
          role: 'img' as const,
          'aria-label': describe(mark),
          onMouseEnter: g.xs ? undefined : () => onTip(tipFor(block, mark)),
          onMouseLeave: g.xs ? undefined : () => onTip(undefined),
          onFocus: () => {
            if (g.xs) setCross(mark.row);
            onTip(g.xs ? lineTip(mark.row) : tipFor(block, mark));
          },
          onBlur: () => {
            setCross(undefined);
            onTip(undefined);
          },
        };
        return (
          <g key={i} opacity={opacity(mark)}>
            {g.lines ? (
              <circle className="chart-mark chart-dot" cx={mark.x} cy={mark.y} r={cross === mark.row ? 5.5 : 4} fill={mark.color} style={{ animationDelay: `${300 + delay}ms` }} {...handlers} />
            ) : (
              <path className={cn('chart-mark', mark.grow)} d={mark.d} fill={mark.color} style={{ animationDelay: `${delay}ms` }} {...handlers} />
            )}
            {mark.showValue && (
              <text aria-hidden="true" className="chart-value chart-fade" x={mark.labelX} y={mark.labelY} textAnchor={mark.anchor} style={{ animationDelay: `${delay + 450}ms` }}>
                {mark.text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ChartTable({ block }: { block: ChartBlock }) {
  const names = seriesOf(block);
  return (
    <div className="prose-table">
      <table>
        <thead>
          <tr>
            <th>{block.chartType === 'line' ? 'Point' : 'Label'}</th>
            {names.map((name, s) => (
              <th key={s} style={{ textAlign: 'right' }}>
                {name || 'Value'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              <td>{row.label}</td>
              {row.values.map((value, s) => (
                <td key={s} style={{ textAlign: 'right' }} className="tabular-nums">
                  {withUnit(value, block.unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The chart itself (legend, plot and tooltip), at the width of its container. */
export function ChartView({ block }: { block: ChartBlock }) {
  const [frame, width] = useWidth();
  const geometry = useMemo(() => (width > 0 ? chartGeometry(block, width) : undefined), [block, width]);
  const [tip, setTip] = useState<Tip>();
  return (
    <div className="space-y-3">
      <Legend block={block} />
      <div ref={frame} className="relative w-full">
        {geometry && <Plot block={block} geometry={geometry} onTip={setTip} />}
        {tip && (
          // The focused mark already names its value; the tooltip is only for the eye.
          <div className="chart-tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
            <p className="mb-0.5 text-[0.72rem] font-bold opacity-75">{tip.label}</p>
            {tip.items.map((item, i) => (
              <p key={i} className="flex items-center gap-2 whitespace-nowrap">
                {tip.items.length > 1 || item.series ? <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.color }} aria-hidden="true" /> : null}
                <strong>{item.text}</strong>
                {item.series && <span className="opacity-75">{item.series}</span>}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartScene({ block }: { block: ChartBlock }) {
  const [table, setTable] = useState(false);
  const [run, setRun] = useState(0);
  return (
    <SceneFrame
      kind={kindName[block.chartType]}
      title={block.title}
      actions={
        <>
          <Button variant="ghost" size="sm" onClick={() => setTable((value) => !value)} aria-pressed={table}>
            <TableIcon size={16} />
            {table ? 'Chart' : 'Table'}
          </Button>
          {!table && <ReplayButton onClick={() => setRun((n) => n + 1)} />}
        </>
      }
    >
      <div className="p-5">{table ? <ChartTable block={block} /> : <ChartView key={run} block={block} />}</div>
    </SceneFrame>
  );
}
