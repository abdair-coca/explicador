// Jupyter notebooks (nbformat 4) reduced to what the viewer shows: numbered cells with their source and outputs.
// Outputs are filtered here, so the viewer never receives scripts, widgets or megabytes of base64.
import type { Notebook, NotebookCell, NotebookOutput } from './parser/types.ts';

export const notebookLimits = {
  /** Larger notebooks are not read. */
  fileBytes: 8 * 1024 * 1024,
  /** Base64 characters of one image. */
  imageChars: 400_000,
  /** Base64 characters of all images together. */
  imagesTotal: 4_000_000,
  htmlChars: 40_000,
  textChars: 6000,
  sourceChars: 30_000,
} as const;

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

/** nbformat stores text as a string or as an array of lines. */
function joined(value: unknown): string {
  if (typeof value === 'string') return value;
  return Array.isArray(value) ? value.filter((part): part is string => typeof part === 'string').join('') : '';
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Parses the text of an `.ipynb` file; undefined when it is not a notebook this code understands. */
export function parseNotebook(text: string): Notebook | undefined {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isObject(json) || !Array.isArray(json.cells) || typeof json.nbformat !== 'number' || json.nbformat < 4) return undefined;
  const meta = isObject(json.metadata) ? json.metadata : {};
  const info = isObject(meta.language_info) ? meta.language_info : {};
  const kernel = isObject(meta.kernelspec) ? meta.kernelspec : {};
  const language = [info.name, kernel.language].find((value): value is string => typeof value === 'string') ?? 'python';

  const budget = { images: 0 };
  const cells = json.cells.map((raw, i): NotebookCell => {
    const cell = isObject(raw) ? raw : {};
    const type = cell.cell_type === 'markdown' || cell.cell_type === 'code' ? cell.cell_type : 'raw';
    const source = clip(joined(cell.source), notebookLimits.sourceChars);
    const result: NotebookCell = { n: i + 1, type, source };
    if (type === 'code') {
      if (typeof cell.execution_count === 'number') result.count = cell.execution_count;
      const outputs = (Array.isArray(cell.outputs) ? cell.outputs : []).flatMap((output) => convertOutput(output, budget));
      if (outputs.length > 0) result.outputs = outputs;
    }
    return result;
  });
  return { language, cells };
}

function convertOutput(raw: unknown, budget: { images: number }): NotebookOutput[] {
  if (!isObject(raw)) return [];
  const type = raw.output_type;
  if (type === 'stream') {
    const text = clip(joined(raw.text).replace(ANSI, ''), notebookLimits.textChars);
    return text ? [{ kind: 'text', stream: raw.name === 'stderr' ? 'stderr' : 'stdout', text }] : [];
  }
  if (type === 'error') {
    const trace = Array.isArray(raw.traceback) ? raw.traceback.filter((line): line is string => typeof line === 'string').join('\n') : '';
    const text = trace || `${String(raw.ename ?? 'Error')}: ${String(raw.evalue ?? '')}`;
    return [{ kind: 'text', stream: 'error', text: clip(text.replace(ANSI, ''), notebookLimits.textChars) }];
  }
  if (type !== 'execute_result' && type !== 'display_data') return [];
  const data = isObject(raw.data) ? raw.data : {};

  for (const mime of ['image/png', 'image/jpeg'] as const) {
    if (data[mime] === undefined) continue;
    const base64 = joined(data[mime]).replace(/\s+/g, '');
    if (base64.length > notebookLimits.imageChars || budget.images + base64.length > notebookLimits.imagesTotal) {
      return [{ kind: 'omitted', label: `${mime === 'image/png' ? 'PNG' : 'JPEG'} image (${Math.round((base64.length * 3) / 4 / 1024)} KB)` }];
    }
    budget.images += base64.length;
    return [{ kind: 'image', mime, data: base64 }];
  }
  const html = joined(data['text/html']);
  // Scripts and widgets cannot run here; a plain-text version, if there is one, tells the same.
  if (html && html.length <= notebookLimits.htmlChars && !/<script|<iframe|<object|<embed/i.test(html)) return [{ kind: 'html', html }];
  const plain = joined(data['text/plain']) || joined(data['text/markdown']);
  if (plain) return [{ kind: 'text', stream: 'result', text: clip(plain.replace(ANSI, ''), notebookLimits.textChars) }];
  const kinds = Object.keys(data);
  return kinds.length > 0 ? [{ kind: 'omitted', label: kinds[0] ?? 'output' }] : [];
}

/** The cells of a ref range (1-based, inclusive), with their source only: what an answer or a key-code card quotes. */
export function quoteCells(notebook: Notebook, start: number, end: number): NotebookCell[] {
  return notebook.cells.slice(start - 1, end).map(({ n, type, source, count }) => ({ n, type, source, ...(count !== undefined ? { count } : {}) }));
}

/** Compact text for the agent (the read_notebook tool): an outline, or the full source of some cells. */
export function describeNotebook(path: string, notebook: Notebook, range?: { start: number; end: number }): string {
  const header = `Notebook ${path}: ${notebook.language}, ${notebook.cells.length} cells. Refs use cell numbers, e.g. "${path}:3-5".`;
  const flat = (text: string): string => text.replace(/\s+/g, ' ').trim();
  const outputText = (cell: NotebookCell): string =>
    (cell.outputs ?? [])
      .map((o) => (o.kind === 'text' ? `${o.stream}: ${clip(flat(o.text), 160)}` : o.kind === 'image' ? 'image' : o.kind === 'html' ? 'table/html' : `omitted ${o.label}`))
      .join(' | ');

  if (!range) {
    const lines = notebook.cells.map((cell) => {
      const out = outputText(cell);
      return `[${cell.n}] ${cell.type}${cell.count !== undefined ? ` In[${cell.count}]` : ''}: ${clip(flat(cell.source), 200) || '(empty)'}${out ? `  => ${out}` : ''}`;
    });
    return [header, 'Outline (first 200 characters of each cell). Ask for a range with cells "3-5" to read them whole.', ...lines].join('\n');
  }
  const picked = notebook.cells.slice(range.start - 1, range.end);
  if (picked.length === 0) return `${header}\nNo cells in ${range.start}-${range.end}.`;
  return [
    header,
    ...picked.map((cell) => {
      const out = outputText(cell);
      return [`--- [${cell.n}] ${cell.type}${cell.count !== undefined ? ` In[${cell.count}]` : ''}`, clip(cell.source, 3000), out ? `=> ${out}` : ''].filter(Boolean).join('\n');
    }),
  ].join('\n');
}
