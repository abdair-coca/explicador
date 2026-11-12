// "You are here": the whole process as a strip of stages, the ones already explained ticked, the chapter's stage lit
// and the ones to come faint. It opens each chapter, so every part of a deep dive is seen in its place.
import { CheckIcon, kindIcon } from '../components/icons';
import { cn } from '@/lib/utils';
import type { StageMap } from './stageMap';

export function StageMapView({ map, night = false }: { map: StageMap; night?: boolean }) {
  return (
    <ol className={cn('stage-map', night && 'night')} aria-label="Where this chapter is in the whole process">
      {map.stages.map((stage, i) => {
        const where = i < map.current ? 'past' : i === map.current ? 'here' : 'next';
        return (
          <li key={stage.id} className={cn('stage-map-stop', where)} aria-current={where === 'here' ? 'step' : undefined}>
            <span className="stage-map-dot" aria-hidden="true">
              {where === 'past' ? (
                <CheckIcon size={14} />
              ) : (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
                  {kindIcon[stage.kind].map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
              )}
            </span>
            <span className="stage-map-label">{stage.label}</span>
            {where === 'here' && <span className="sr-only">(you are here)</span>}
          </li>
        );
      })}
    </ol>
  );
}
