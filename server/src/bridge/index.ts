// Local HTTP bridge between the MCP server, the viewer tab and the click monitor.
// 127.0.0.1 only, Host check against DNS rebinding, per-launch token on every API call,
// and an Origin check on every POST from the page.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScenePayload } from '../scene.ts';

export type { ScenePayload } from '../scene.ts';

export type SceneInput = Omit<ScenePayload, 'version'>;

/** Handler for POST /api/<name>; receives the parsed JSON body, returns the JSON reply. */
export type Action = (body: Record<string, unknown>) => Record<string, unknown>;

export interface BridgeOptions {
  /** Folder with the built viewer (`viewer/dist`). */
  viewerDir?: string;
  /** Called instead of opening a browser; tests and headless runs use it. */
  openUrl?: (url: string) => void;
}

const defaultViewerDir = fileURLToPath(new URL('../../../viewer/dist/', import.meta.url));
const MAX_BODY_BYTES = 4096;
const KEEPALIVE_MS = 25_000;
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const securityHeaders = {
  'content-security-policy':
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  // The token travels in the page URL; never leak it through Referer.
  'referrer-policy': 'no-referrer',
};

export class Bridge {
  readonly token = randomBytes(16).toString('hex');
  private readonly server: Server = createServer();
  private readonly viewerDir: string;
  private readonly openUrl: (url: string) => void;
  private readonly viewerStreams = new Set<ServerResponse>();
  private readonly monitorStreams = new Set<ServerResponse>();
  private readonly actions = new Map<string, Action>();
  private readonly keepalive: NodeJS.Timeout;
  private scene: ScenePayload | undefined;
  private version = 0;
  private origin = '';

  constructor(options: BridgeOptions = {}) {
    this.viewerDir = resolve(options.viewerDir ?? defaultViewerDir);
    this.openUrl = options.openUrl ?? openInBrowser;
    this.server.on('request', (req, res) => {
      this.handle(req, res).catch((error: unknown) => {
        if (!res.headersSent) send(res, 500, { error: String(error) });
      });
    });
    // Comments keep idle streams open through proxies and reveal dead connections.
    this.keepalive = setInterval(() => {
      for (const res of [...this.viewerStreams, ...this.monitorStreams]) res.write(': keepalive\n\n');
    }, KEEPALIVE_MS);
    this.keepalive.unref();
  }

  async start(port = 0): Promise<string> {
    await new Promise<void>((done, fail) => {
      this.server.once('error', fail);
      this.server.listen(port, '127.0.0.1', done);
    });
    const address = this.server.address() as AddressInfo;
    this.origin = `http://127.0.0.1:${address.port}`;
    return this.url;
  }

  get url(): string {
    return `${this.origin}/?t=${this.token}`;
  }

  get pageOrigin(): string {
    return this.origin;
  }

  get viewers(): number {
    return this.viewerStreams.size;
  }

  get monitors(): number {
    return this.monitorStreams.size;
  }

  get current(): ScenePayload | undefined {
    return this.scene;
  }

  get viewerBuilt(): boolean {
    return existsSync(join(this.viewerDir, 'index.html'));
  }

  /** Registers POST /api/<name>. */
  action(name: string, handler: Action): void {
    this.actions.set(name, handler);
  }

  /** Shows a scene in every open viewer tab; opens a tab when none is connected. */
  publish(scene: SceneInput): ScenePayload {
    this.version += 1;
    this.scene = { ...scene, version: this.version };
    const message = `event: scene\ndata: ${JSON.stringify({ version: this.version })}\n\n`;
    for (const res of this.viewerStreams) res.write(message);
    if (this.viewerStreams.size === 0) this.openUrl(this.url);
    return this.scene;
  }

  /** Sends one single-line message to every connected click monitor; returns how many got it. */
  sendToMonitors(message: string): number {
    const line = message.replace(/[\r\n]+/g, ' ');
    for (const res of this.monitorStreams) res.write(`event: click\ndata: ${line}\n\n`);
    return this.monitorStreams.size;
  }

  close(): Promise<void> {
    clearInterval(this.keepalive);
    for (const res of [...this.viewerStreams, ...this.monitorStreams]) res.end();
    this.viewerStreams.clear();
    this.monitorStreams.clear();
    return new Promise((done) => this.server.close(() => done()));
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const host = this.origin.slice('http://'.length);
    if (req.headers.host !== host) return send(res, 403, { error: 'bad host' });
    const url = new URL(req.url ?? '/', this.origin);

    if (url.pathname.startsWith('/api/')) {
      // EventSource cannot set headers, so the viewer's event stream takes the token as a query parameter.
      const token = req.headers['x-token'] ?? url.searchParams.get('t');
      if (token !== this.token) return send(res, 403, { error: 'bad token' });
      const name = url.pathname.slice('/api/'.length);
      if (req.method === 'GET') {
        if (name === 'scene') return send(res, 200, { scene: this.scene ?? null });
        if (name === 'events') return this.stream(req, res, this.viewerStreams, true);
        if (name === 'clicks') return this.stream(req, res, this.monitorStreams, false);
        return send(res, 404, { error: 'not found' });
      }
      const action = this.actions.get(name);
      if (req.method !== 'POST' || !action) return send(res, 404, { error: 'not found' });
      if (!allowedOrigins(this.origin).includes(req.headers.origin ?? '')) {
        return send(res, 403, { error: 'bad origin' });
      }
      const body = parseJson(await readBody(req));
      if (!body) return send(res, 400, { error: 'expected a JSON object' });
      return send(res, 200, action(body));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
    this.serveStatic(url.pathname, res);
  }

  private stream(req: IncomingMessage, res: ServerResponse, streams: Set<ServerResponse>, hello: boolean): void {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      ...securityHeaders,
    });
    res.write(hello ? `event: scene\ndata: ${JSON.stringify({ version: this.version })}\n\n` : ': connected\n\n');
    streams.add(res);
    req.on('close', () => streams.delete(res));
  }

  private serveStatic(pathname: string, res: ServerResponse): void {
    if (!this.viewerBuilt) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', ...securityHeaders });
      res.end('The Explicador viewer is not built. Run "npm install && npm run build" in the plugin folder.');
      return;
    }
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const file = resolve(this.viewerDir, relative);
    const inside = file.startsWith(this.viewerDir + sep);
    const target = inside && existsSync(file) && statSync(file).isFile() ? file : join(this.viewerDir, 'index.html');
    const type = contentTypes[extname(target)] ?? 'application/octet-stream';
    const immutable = target.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      'content-type': type,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-store',
      ...securityHeaders,
    });
    res.end(readFileSync(target));
  }
}

/** The page's own origin, plus the Vite dev server when one is configured for development. */
function allowedOrigins(origin: string): string[] {
  const dev = process.env.EXPLICADOR_DEV_ORIGIN;
  return dev ? [origin, dev] : [origin];
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...securityHeaders });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of req) {
    body += String(chunk);
    if (body.length > MAX_BODY_BYTES) throw new Error('body too large');
  }
  return body;
}

function parseJson(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export function openInBrowser(url: string): void {
  if (process.env.EXPLICADOR_NO_BROWSER) return;
  const [command, args] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  // A missing opener (headless machine) must not crash the MCP server; the URL is in the tool result.
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}
