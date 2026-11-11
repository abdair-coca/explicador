// Flat confetti in the lesson colors that bursts up from an element and falls; nothing with reduced motion.
import { reducedMotion } from './reveal';

const COLORS = ['var(--primary)', 'var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--hit)'];
const PIECES = 36;

export function confetti(from: Element): void {
  if (reducedMotion()) return;
  const box = from.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  // Inside the presenter, so the burst also shows in full screen.
  (from.closest('[role="dialog"]') ?? document.body).append(layer);
  const flights: Promise<unknown>[] = [];
  for (let i = 0; i < PIECES; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.background = COLORS[i % COLORS.length] ?? 'var(--primary)';
    piece.style.left = `${box.left + box.width * Math.random()}px`;
    piece.style.top = `${box.top + box.height / 2}px`;
    if (i % 3 === 0) piece.style.borderRadius = '9999px';
    layer.append(piece);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 170 + Math.random() * 230;
    const x = Math.cos(angle) * speed;
    const y = Math.sin(angle) * speed;
    const spin = (Math.random() - 0.5) * 900;
    const flight = piece.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${x}px, ${y}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${x * 1.3}px, ${y + 280}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' },
    );
    flights.push(flight.finished);
  }
  void Promise.allSettled(flights).then(() => layer.remove());
}
