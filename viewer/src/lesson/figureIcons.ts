// The pictograms of <figure> (F34): line art in a 24 × 24 box, stroked in the shape's color like the viewer's own icons.
// A closed set, so every figure speaks the same visual language. `signal` also has three lamps (see `signalLamps`).
import type { FigureColor, FigureIcon } from '../../../server/src/scene.ts';

export const iconPaths: Record<FigureIcon, string[]> = {
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  person: ['M12 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M5 22v-3a7 7 0 0 1 14 0v3'],
  car: ['M2 16v-4l3-5h10l4 5h3v4Z', 'M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z', 'M8 12h9'],
  drop: ['M12 2.5s-6.5 7.2-6.5 12a6.5 6.5 0 0 0 13 0c0-4.8-6.5-12-6.5-12Z'],
  house: ['M3 11 12 3l9 8', 'M5 10v11h14V10', 'M10 21v-6h4v6'],
  tree: ['M12 22v-6', 'M12 2 5 12h4l-3 4h12l-3-4h4Z'],
  signal: ['M8 1.5h8a1.5 1.5 0 0 1 1.5 1.5v18a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 21V3A1.5 1.5 0 0 1 8 1.5Z'],
  battery: ['M3 7h15v10H3Z', 'M18 10h2v4h-2', 'M6 10v4', 'M9 10v4'],
  magnet: ['M5 3h4v9a3 3 0 0 0 6 0V3h4v9a7 7 0 0 1-14 0Z', 'M5 7h4', 'M15 7h4'],
  cloud: ['M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.5 4.3 4.3 0 0 0 7 18Z'],
  factory: ['M2 21V11l6 3.5V11l6 3.5V4h4v17Z', 'M2 21h20'],
  phone: ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z', 'M11 18h2'],
  server: ['M4 3h16v7H4Z', 'M4 14h16v7H4Z', 'M8 6.5h.01', 'M8 17.5h.01'],
  coin: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M14.5 9a2.5 2 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2a2.5 2 0 0 1-2.5-1.5', 'M12 6v1.5', 'M12 16.5V18'],
  heart: ['M12 20.5s-8.5-5.2-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 5.8-8.5 11-8.5 11Z'],
  leaf: ['M5 19c0-9 6-15 15-15 0 9-6 15-15 15Z', 'M5 19 14 10'],
  bulb: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  lock: ['M5 11h14v10H5Z', 'M8 11V7a4 4 0 0 1 8 0v4'],
};

/** A traffic signal's lamps, top to bottom, and the color that lights each: `set="light: green"` changes the light. */
export const signalLamps: { cy: number; color: FigureColor }[] = [
  { cy: 6, color: 'red' },
  { cy: 12, color: 'yellow' },
  { cy: 18, color: 'green' },
];

/** The lamp a signal's color lights, if any (orange counts as yellow). */
export function litLamp(color: FigureColor): number | undefined {
  const index = signalLamps.findIndex((lamp) => lamp.color === (color === 'orange' ? 'yellow' : color));
  return index < 0 ? undefined : index;
}
