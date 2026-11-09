// Stroke icons (24×24, round caps), the Titi way: SVG in the chrome, never emoji.
import type { NodeKind } from '../../../server/src/scene.ts';

type IconProps = { className?: string; size?: number };

function icon(paths: string[]) {
  return function Icon({ className, size = 18 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
}

export const PlayIcon = icon(['M7 4.5v15l12-7.5Z']);
export const PauseIcon = icon(['M8 5v14', 'M16 5v14']);
export const PrevIcon = icon(['M19 19.5 9 12l10-7.5Z', 'M5 19V5']);
export const NextIcon = icon(['M5 4.5 15 12 5 19.5Z', 'M19 5v14']);
export const ReplayIcon = icon(['M3.5 12a8.5 8.5 0 1 0 2.6-6.1', 'M3.5 4v5h5']);
export const DownloadIcon = icon(['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14']);
export const PresentIcon = icon(['M3 4h18v12H3Z', 'M8 21h8', 'M12 16v5', 'm10 8 4 2-4 2Z']);
export const ExpandIcon = icon(['M8 3H3v5', 'M16 3h5v5', 'M8 21H3v-5', 'M16 21h5v-5']);
export const CloseIcon = icon(['M18 6 6 18', 'm6 6 12 12']);
export const ZoomOutIcon = icon(['M4 14h6v6', 'M20 10h-6V4', 'm14 10 7-7', 'm3 21 7-7']);
export const ArrowLeftIcon = icon(['M19 12H5', 'm12 19-7-7 7-7']);
export const ArrowRightIcon = icon(['M5 12h14', 'm12 5 7 7-7 7']);
export const SendIcon = icon(['M12 19V5', 'm5 12 7-7 7 7']);
export const ChatIcon = icon(['M4 5h16v11H9l-5 4Z']);
export const InfoIcon = icon(['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16v-4', 'M12 8h.01']);
export const AlertIcon = icon(['M12 3 2 20.5h20Z', 'M12 9.5v5', 'M12 17.5h.01']);
export const SparkIcon = icon(['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'm6 6 2.5 2.5', 'm15.5 15.5 2.5 2.5', 'm6 18 2.5-2.5', 'm15.5 8.5 2.5-2.5']);

/** Icon paths for each node kind, drawn inside the diagram's SVG (24×24 box). */
export const kindIcon: Record<NodeKind | 'entity' | 'state', string[]> = {
  actor: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 21a7.5 7.5 0 0 1 15 0'],
  ui: ['M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z', 'M3 9h18'],
  service: ['M4 3.5h16v7H4Z', 'M4 13.5h16v7H4Z', 'M8 7h.01', 'M8 17h.01'],
  module: ['M21 8 12 3 3 8v8l9 5 9-5Z', 'm3 8 9 5 9-5', 'M12 13v8'],
  function: ['m8 6-6 6 6 6', 'm16 6 6 6-6 6'],
  store: ['M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
  external: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
  entity: ['M3 5h18v14H3Z', 'M3 10h18', 'M9 10v9'],
  state: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
};
