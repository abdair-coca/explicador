// The card that opens a chapter in Present mode, on the night surface. `choreo.ts` plays it as one timeline (the
// `chapter` effect): the number drops in while its digits roll, a yellow rule draws, the title rises word by word
// and the goal follows; in a deep dive the map of the whole process arrives last, with this chapter's stage lit. When the next slide opens, the title travels into the progress bar's label (a shared view
// transition name).
import type { ChapterBlock } from '../../../server/src/scene.ts';
import { FlagIcon } from '../components/icons';
import { ThemeGlyph } from '../theme/Backdrop';
import { themes, type Theme } from '../theme/themes';
import { RollingNumber } from './effects';
import type { StageMap } from '../lesson/stageMap';
import { StageMapView } from '../lesson/StageMapView';
import { t } from '../i18n';

export function ChapterCard({ block, number, of, theme, map }: { block: ChapterBlock; number: number; of: number; theme: Theme; map?: StageMap | undefined }) {
  return (
    <div className="mx-auto w-full max-w-5xl py-6" data-part={0} data-fx="chapter">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <span className="chapter-number">
          <RollingNumber value={String(number).padStart(2, '0')} delay={280} />
        </span>
        <span className="chapter-count pb-[0.9em] text-sm font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
          {t('Chapter')} {number} {t('of')} {of}
          {theme.name !== 'plain' && (
            <span className="ml-3 inline-flex items-center gap-1.5 text-primary">
              <ThemeGlyph theme={theme} size={16} />
              {t(themes[theme.name].label)}
            </span>
          )}
        </span>
      </div>
      <span className="chapter-rule mt-4 block h-2 w-28 rounded-full bg-primary" aria-hidden="true" />
      <h2 className="chapter-title mt-8 text-[clamp(2.4rem,6vw,4.75rem)] font-black leading-[1.05] tracking-tight text-foreground">{block.title}</h2>
      {block.goal && (
        <p className="chapter-goal mt-6 flex max-w-3xl items-start gap-3 text-[clamp(1.15rem,2.2vw,1.65rem)] font-semibold leading-snug text-muted-foreground">
          <FlagIcon size={26} className="mt-1 shrink-0 text-primary" />
          {block.goal}
        </p>
      )}
      {map && (
        <div className="chapter-map mt-10">
          <StageMapView map={map} night />
        </div>
      )}
    </div>
  );
}
