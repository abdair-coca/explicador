// The cosine similarity of two vectors worked out step by step: the two vectors side by side, the product of each pair,
// their sum (the dot product), the length of each vector, and the division that gives the cosine, placed on a line from
// -1 (opposite) to 1 (same direction). In Present mode (`shown` is the current part) each step is a part; on the page
// they play with step controls.
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CosineBlock } from '../../../server/src/scene.ts';
import { usePlayback, useReducedMotion } from '../animation/playback';
import { SceneFrame, StepControls } from '../components/scenes';
import { Tex } from '../components/Tex';
import { runParts } from '../presentation/choreo';
import { planParts } from '../presentation/partPlan';
import { cn } from '@/lib/utils';
import { cosineModel, gaugeAt } from './cosineMath';
import { useFirstVisible } from './hooks';

const FORMULA = String.raw`\cos(\mathbf{a}, \mathbf{b}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\lVert \mathbf{a} \rVert \, \lVert \mathbf{b} \rVert}`;

function Cell({ text, value, share }: { text: string; value: number; share: number }) {
  return (
    <span className="cosine-cell">
      <span className={cn('trace-vector-swatch', value < 0 && 'negative')} style={{ '--share': share } as React.CSSProperties} />
      <span className={cn('trace-vector-number tabular-nums', value < 0 && 'text-miss')}>{text}</span>
    </span>
  );
}

export function CosineView({ block, shown }: { block: CosineBlock; shown?: number }) {
  const model = useMemo(() => cosineModel(block), [block]);
  const now = shown ?? model.parts.length - 1;
  const stage = (part: (typeof model.parts)[number], fx: string) => {
    const index = model.parts.indexOf(part);
    return { 'data-part': index, 'data-fx': fx, 'data-stage': index > now ? 'future' : 'shown' };
  };
  const columns = { gridTemplateColumns: `minmax(6rem, 12rem) repeat(${model.rows.length + (model.hidden > 0 ? 1 : 0)}, minmax(3.4rem, 1fr))` };
  const more = model.hidden > 0 ? `+${model.hidden.toLocaleString()}` : undefined;
  return (
    <div className="cosine">
      <div className="cosine-formula">
        <Tex tex={FORMULA} display />
      </div>
      <div className="cosine-grid" style={columns} {...stage('vectors', 'rise')}>
        <span className="cosine-name">
          <b className="cosine-tag a">a</b>
          {block.a}
        </span>
        {model.rows.map((row, i) => (
          <Cell key={i} text={row.aText} value={row.a} share={row.aShare} />
        ))}
        {more && <span className="cosine-more">{more}</span>}
        <span className="cosine-name">
          <b className="cosine-tag b">b</b>
          {block.b}
        </span>
        {model.rows.map((row, i) => (
          <Cell key={i} text={row.bText} value={row.b} share={row.bShare} />
        ))}
        {more && <span className="cosine-more">{more}</span>}
      </div>
      <div className="cosine-grid cosine-products" style={columns} {...stage('products', 'products')}>
        <span className="cosine-name">a × b, pair by pair</span>
        {model.rows.map((row, i) => (
          <span key={i} className={cn('cosine-product tabular-nums', row.product < 0 && 'negative')} title={`${row.aText} × ${row.bText}`}>
            {row.productText}
          </span>
        ))}
        {more && <span className="cosine-more">{more}</span>}
      </div>
      <p className="cosine-line" {...stage('sum', 'rise')}>
        <span className="cosine-step">Add them up</span>
        {model.full ? (
          <span className="tabular-nums">
            a · b ={' '}
            {model.rows
              .map((row) => row.productText)
              .join(' + ')
              .replaceAll('+ -', '− ')}{' '}
            = <strong>{model.dotText}</strong>
          </span>
        ) : (
          <span>
            a · b adds all <strong>{model.size.toLocaleString()}</strong> products: the {model.rows.length} shown and {model.hidden.toLocaleString()} more.
          </span>
        )}
      </p>
      {model.full && (
        <p className="cosine-line" {...stage('lengths', 'rise')}>
          <span className="cosine-step">Measure each arrow</span>
          <span className="tabular-nums">
            ‖a‖ = <strong>{model.normAText}</strong> · ‖b‖ = <strong>{model.normBText}</strong>
          </span>
        </p>
      )}
      <div className="cosine-result" {...stage('result', 'gauge')}>
        <p className="cosine-line">
          <span className="cosine-step">{model.full ? 'Divide' : 'Result'}</span>
          <span className="tabular-nums">
            {model.full ? (
              <>
                cos = {model.dotText} ÷ ({model.normAText} × {model.normBText}) = <strong className="cosine-value">{model.cosText}</strong>
              </>
            ) : (
              <>
                cos = <strong className="cosine-value">{model.cosText}</strong>
              </>
            )}
          </span>
        </p>
        <div
          className="cosine-gauge"
          style={{ '--at': gaugeAt(model.cos) } as React.CSSProperties}
          role="img"
          aria-label={`Cosine ${model.cosText}, on a scale from -1 to 1`}
        >
          <span className="cosine-gauge-track" />
          <span className="cosine-gauge-marker">{model.cosText}</span>
          <span className="cosine-gauge-tick" style={{ left: '0%' }}>
            −1 opposite
          </span>
          <span className="cosine-gauge-tick" style={{ left: '50%' }}>
            0 unrelated
          </span>
          <span className="cosine-gauge-tick" style={{ left: '100%' }}>
            1 same direction
          </span>
        </div>
      </div>
    </div>
  );
}

export function CosineScene({ block }: { block: CosineBlock }) {
  const model = useMemo(() => cosineModel(block), [block]);
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => model.parts.map(() => 2600), [model.parts]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (!reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const shown = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (body.current)
      runParts(
        body.current,
        planParts(shown.current === undefined ? undefined : { slide: 0, part: shown.current }, { slide: 0, part: playback.index }, reducedMotion),
      );
    shown.current = playback.index;
  }, [playback.index, reducedMotion]);
  return (
    <div ref={frame}>
      <SceneFrame kind="Cosine" title={block.title} actions={<StepControls playback={playback} />}>
        <div ref={body} className="p-5">
          <CosineView block={block} shown={playback.index} />
        </div>
      </SceneFrame>
    </div>
  );
}
