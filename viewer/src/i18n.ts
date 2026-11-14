// The viewer's own words in the scene's language (F31). A scene written in Spanish gets its buttons, badges and
// captions in Spanish; any other scene keeps them in English. The language is read from the scene's own text (no
// attribute to write), and the words are looked up by their English text, so a missing translation shows the English.
import type { Block } from '../../server/src/scene.ts';

export type Language = 'en' | 'es';

const STOP: Record<Language, ReadonlySet<string>> = {
  es: new Set(
    'el la los las de del que y en un una es por con para se no su sus al lo como más pero le ya o este esta estos estas sí porque entre cuando muy sin sobre también hasta hay donde desde todo todos nos durante uno les ni contra ese eso ante ellos esto antes algunos qué unos otro otra otros otras tanto esa mucho cada cuál cómo qué tu tus son está están ser fue sea'.split(' '),
  ),
  en: new Set(
    'the of and to in is that for it as with was on are by this be from or an at which you not have but can their they its more if will when each your what how into one all there these those then than so do does after before only also'.split(' '),
  ),
};

/** Keys whose values are names in the code or the project, not the scene's prose. */
const SKIP = new Set(['id', 'ref', 'path', 'type', 'kind', 'node', 'from', 'to', 'code', 'lines', 'cells', 'shape', 'color', 'points', 'at']);

function strings(value: unknown, out: string[], key = ''): void {
  if (SKIP.has(key)) return;
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, out, k);
}

/** The scene's language: Spanish when its words are more often Spanish function words than English ones. */
export function sceneLanguage(blocks: readonly Block[]): Language {
  const texts: string[] = [];
  strings(blocks, texts);
  let es = 0;
  let en = 0;
  for (const word of texts.join(' ').toLowerCase().split(/[^\p{L}]+/u)) {
    if (STOP.es.has(word)) es += 1;
    if (STOP.en.has(word)) en += 1;
  }
  return es > en ? 'es' : 'en';
}

/** Spanish for each English text the viewer shows a reader. */
export const es: Record<string, string> = {
  // Presenter and page.
  Present: 'Presentar',
  Presenting: 'Presentando',
  'Up to date': 'Al día',
  Stale: 'Desactualizada',
  Export: 'Exportar',
  Back: 'Atrás',
  Next: 'Siguiente',
  Replay: 'Repetir',
  'to move': 'para avanzar',
  'next slide': 'siguiente slide',
  subtitles: 'subtítulos',
  'full screen': 'pantalla completa',
  sound: 'sonido',
  'Esc to leave': 'Esc para salir',
  'Waiting for a scene': 'Esperando una escena',
  Lesson: 'Lección',
  Practice: 'Práctica',
  'Your score': 'Tu puntuación',
  'Your questions': 'Tus preguntas',
  'What it does': 'Qué hace',
  'Key code': 'Código clave',
  'Comes from': 'Viene de',
  Predict: 'Predice',
  Chapter: 'Capítulo',
  Play: 'Reproducir',
  Pause: 'Pausa',
  Review: 'Repaso',
  'Right.': 'Correcto.',
  'Not this one.': 'Esta no.',
  'Show the answer': 'Ver la respuesta',
  Yes: 'Sí',
  'Not yet': 'Todavía no',
  // Component kinds.
  Architecture: 'Arquitectura',
  Flow: 'Flujo',
  Trace: 'Paso a paso',
  System: 'Sistema',
  Structure: 'Estructura',
  Figure: 'Figura',
  Journey: 'Recorrido',
  Timeline: 'Línea de tiempo',
  Compare: 'Comparación',
  Concept: 'Concepto',
  Check: 'Comprueba',
  Annotated: 'Texto anotado',
  Argument: 'Argumento',
  Calculation: 'Cálculo',
  Comparison: 'Comparación',
  Cosine: 'Coseno',
  Data: 'Datos',
  Derivation: 'Derivación',
  Plot: 'Gráfica',
  Scatter: 'Dispersión',
  States: 'Estados',
  'Vector space': 'Espacio vectorial',
  'What if': 'Y si',
  // Concept cards.
  'Think of it as': 'Piénsalo como',
  Formula: 'Fórmula',
  Example: 'Ejemplo',
  // Quiz.
  Answer: 'Respuesta',
  'Not quite. Try another option.': 'No del todo. Prueba otra opción.',
  'Right!': '¡Correcto!',
  'Did you know it?': '¿Lo sabías?',
  Done: 'Hecho',
  'Try again': 'Intentar de nuevo',
  Known: 'Lo sé',
  'Review again': 'Repasar otra vez',
  // Argument.
  For: 'A favor',
  Against: 'En contra',
  Verdict: 'Veredicto',
  // Trace.
  Input: 'Entrada',
  Step: 'Paso',
  words: 'palabras',
  items: 'elementos',
  rows: 'filas',
  bars: 'barras',
  dimensions: 'dimensiones',
  removed: 'quitados',
  added: 'añadidos',
  changed: 'cambiados',
  Steps: 'Pasos',
  'earlier steps': 'pasos anteriores',
  'What this step changed': 'Qué cambió este paso',
  // Box kinds and lines.
  actor: 'actor',
  ui: 'interfaz',
  service: 'servicio',
  module: 'módulo',
  function: 'función',
  store: 'almacén',
  external: 'externo',
  person: 'persona',
  object: 'objeto',
  place: 'lugar',
  signal: 'señal',
  step: 'paso',
  group: 'grupo',
  call: 'llama',
  'answer back': 'responde',
  'async (queue, event)': 'asíncrono (cola, evento)',
  'goes to': 'pasa a',
  'answers back': 'responde',
  'tells later': 'avisa después',
  'Answer back': 'Responde',
  'Answers back': 'Responde',
  of: 'de',
  Async: 'Asíncrono',
  'Tells later': 'Avisa después',
  'inside · zoom in': 'dentro · acercar',
};

const dictionaries: Record<Language, Record<string, string>> = { en: {}, es };
let current: Language = 'en';

/** Sets the language the viewer speaks; the app calls it with the scene's language before drawing it. */
export function setLanguage(language: Language): void {
  current = language;
}

export function language(): Language {
  return current;
}

/** The text in the viewer's language; the English text itself when there is no translation. */
export function t(text: string): string {
  return dictionaries[current][text] ?? text;
}
