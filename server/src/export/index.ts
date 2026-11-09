// Standalone export: one .html file with the viewer's JS and CSS inline and the scene embedded.
// It works from file:// with no server; a CSP forbids any network access.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { ScenePayload } from '../scene.ts';

export const SCENE_ELEMENT_ID = 'explicador-scene';

export const exportCsp =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'";

export class ExportError extends Error {}

export function buildStandalone(viewerDir: string, scene: ScenePayload): string {
  const root = resolve(viewerDir);
  const indexPath = join(root, 'index.html');
  if (!existsSync(indexPath)) throw new ExportError('The viewer is not built. Run "npm run build" in the plugin folder.');
  let html = readFileSync(indexPath, 'utf8');

  const asset = (path: string): string => {
    const file = resolve(root, path.replace(/^\//, ''));
    if (!file.startsWith(root + sep) || !existsSync(file)) throw new ExportError(`Missing viewer asset ${path}`);
    return readFileSync(file, 'utf8');
  };
  const scripts: string[] = [];
  html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>\s*/g, (_, src: string) => {
    scripts.push(asset(src));
    return '';
  });
  html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"[^>]*>/g, (_, href: string) => {
    return `<style>${asset(href).replace(/<\/style/gi, '<\\/style')}</style>`;
  });
  if (scripts.length === 0) throw new ExportError('The built viewer has no script to inline');
  if (/\s(?:src|href)="(?!data:)[^"]*"/.test(html)) throw new ExportError('The built viewer references a file that was not inlined');

  const data = JSON.stringify(scene).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const body = [
    `<script type="application/json" id="${SCENE_ELEMENT_ID}">${data}</script>`,
    ...scripts.map((code) => `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`),
  ].join('\n');
  // Function replacements: the inlined code may contain "$&" and similar patterns.
  return html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(scene.topic)} · Explicador</title>`)
    .replace('<meta charset="UTF-8" />', () => `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${exportCsp}" />`)
    .replace('</body>', () => `${body}\n  </body>`);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
