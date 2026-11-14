// A claim weighed point by point (F27): the claim on top, the reasons for it on one side and the objections on the other,
// each objection with its reply, and the verdict last. In Present mode (`shown` is the current part) the claim comes
// first, then each point in the order the scene weighs them, then the verdict. On the page everything shows.
import type { ArgumentBlock } from '../../../server/src/scene.ts';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame } from '../components/scenes';
import { cn } from '@/lib/utils';
import { t } from '../i18n';

export function ArgumentView({ block, shown }: { block: ArgumentBlock; shown?: number }) {
  const presenting = shown !== undefined;
  const reveal = (part: number) => (presenting ? { 'data-part': part, 'data-fx': 'rise', 'data-stage': part <= shown ? 'shown' : 'future' } : {});
  const point = (side: 'support' | 'objection') =>
    block.points.flatMap((item, i) =>
      item.side !== side
        ? []
        : [
            <li key={i} className={cn('argument-point', side, presenting && i + 1 === shown && 'current')} {...reveal(i + 1)}>
              <strong className="argument-label">{item.label}</strong>
              <p>
                <InlineMarkdown text={item.narration} />
              </p>
              {item.reply && (
                <p className="argument-reply">
                  <span aria-hidden="true">↳ </span>
                  <InlineMarkdown text={item.reply} />
                </p>
              )}
            </li>,
          ],
    );
  const verdictPart = block.points.length + 1;
  return (
    <div className={cn('argument', presenting && 'argument-slide')}>
      <p className="argument-claim" {...reveal(0)}>
        <InlineMarkdown text={block.claim} />
      </p>
      <div className="argument-sides">
        <section aria-label={t('For')}>
          <h3 className="argument-side-title support">{t('For')}</h3>
          <ol>{point('support')}</ol>
        </section>
        <section aria-label={t('Against')}>
          <h3 className="argument-side-title objection">{t('Against')}</h3>
          <ol>{point('objection')}</ol>
        </section>
      </div>
      {block.verdict && (
        <p className="argument-verdict" {...reveal(verdictPart)}>
          <span className="argument-verdict-tag">{t('Verdict')}</span>
          <InlineMarkdown text={block.verdict} />
        </p>
      )}
    </div>
  );
}

export function ArgumentScene({ block }: { block: ArgumentBlock }) {
  return (
    <SceneFrame kind="Argument" title={block.title}>
      <div className="p-5">
        <ArgumentView block={block} />
      </div>
    </SceneFrame>
  );
}
