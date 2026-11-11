// Subtle sounds for Present mode, synthesized with the Web Audio API, so no audio files: a pop for each part, a
// whoosh for a chapter, a ding for a right answer. Off until the presenter turns them on; the browser remembers it.

export type Cue = 'pop' | 'whoosh' | 'ding';

const KEY = 'explicador.sound';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): Store | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The remembered choice: off when nothing is stored or storage is blocked. */
export function remembered(storage: Pick<Storage, 'getItem'> | undefined = browserStorage()): boolean {
  try {
    return storage?.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function remember(on: boolean, storage: Pick<Storage, 'setItem'> | undefined = browserStorage()): void {
  try {
    storage?.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Blocked storage: the choice lasts until the page closes.
  }
}

let enabled: boolean | undefined;
let context: AudioContext | undefined;

export function soundEnabled(): boolean {
  enabled ??= remembered();
  return enabled;
}

/** A running audio context, created on the first use (a key press or a click, so the browser allows it). */
function audio(): AudioContext | undefined {
  if (typeof AudioContext === 'undefined') return undefined;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function setSound(on: boolean): void {
  enabled = on;
  remember(on);
  if (on) audio();
}

/** Plays a cue when sound is on and the browser has Web Audio; returns whether it played. */
export function play(cue: Cue): boolean {
  if (!soundEnabled()) return false;
  const ctx = audio();
  if (!ctx) return false;
  const at = ctx.currentTime;
  if (cue === 'pop') pop(ctx, at);
  else if (cue === 'whoosh') whoosh(ctx, at);
  else ding(ctx, at);
  return true;
}

/** A gain that rises fast to `peak` and fades out over `length` seconds. */
function envelope(ctx: AudioContext, at: number, peak: number, length: number, attack = 0.005): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  gain.connect(ctx.destination);
  return gain;
}

function pop(ctx: AudioContext, at: number): void {
  const tone = ctx.createOscillator();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(560, at);
  tone.frequency.exponentialRampToValueAtTime(260, at + 0.09);
  tone.connect(envelope(ctx, at, 0.09, 0.12));
  tone.start(at);
  tone.stop(at + 0.13);
}

function whoosh(ctx: AudioContext, at: number): void {
  const length = 0.5;
  const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.9;
  band.frequency.setValueAtTime(350, at);
  band.frequency.exponentialRampToValueAtTime(2600, at + 0.22);
  band.frequency.exponentialRampToValueAtTime(500, at + length);
  source.connect(band);
  band.connect(envelope(ctx, at, 0.16, length, 0.16));
  source.start(at);
  source.stop(at + length);
}

function ding(ctx: AudioContext, at: number): void {
  // Two bright notes a moment apart (E6, then A6), each ringing out.
  [1318.5, 1760].forEach((frequency, i) => {
    const start = at + i * 0.09;
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(frequency, start);
    tone.connect(envelope(ctx, start, 0.08, 0.7));
    tone.start(start);
    tone.stop(start + 0.72);
  });
}
