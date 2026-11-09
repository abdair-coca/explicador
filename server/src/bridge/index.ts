// Local HTTP bridge between the MCP server and the viewer tab.
// 127.0.0.1 only, Host check against DNS rebinding, per-launch token on every API call.
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

export interface BridgeOptions {
  /** Folder with the built viewer (`viewer/dist`). */
  viewerDir?: string;
  /** Called instead of opening a browser; tests and headless runs use it. */
  openUrl?: (url: string) => void;
}

const defaultViewerDir = fileURLToPath(new URL('../../../viewer/dist/', import.meta.url));
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
  private readonly listeners = new Set<ServerResponse>();
  private scene: ScenePayload | undefined;
  private version = 0;
  private origin = '';

  constructor(options: BridgeOptions = {}) {
    this.viewerDir = resolve(options.viewerDir ?? defaultViewerDir);
    this.openUrl = options.openUrl ?? openInBrowser;
    this.server.on('request', (req, res) => {
      try {
        this.handle(req, res);
      } catch (error) {
        send(res, 500, { error: String(error) });
      }
    });
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

  get viewers(): number {
    return this.listeners.size;
  }

  get viewerBuilt(): boolean {
    return existsSync(join(this.viewerDir, 'index.html'));
  }

  /** Shows a scene in every open viewer tab; opens a tab when none is connected. */
  publish(scene: SceneInput): ScenePayload {
    this.version += 1;
    this.scene = { ...scene, version: this.version };
    const message = `event: scene\ndata: ${JSON.stringify({ version: this.version })}\n\n`;
    for (const res of this.listeners) res.write(message);
    if (this.listeners.size === 0) this.openUrl(this.url);
    return this.scene;
  }

  close(): Promise<void> {
    for (const res of this.listeners) res.end();
    this.listeners.clear();
    return new Promise((done) => this.server.close(() => done()));
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    const host = this.origin.slice('http://'.length);
    if (req.headers.host !== host) return send(res, 403, { error: 'bad host' });
    const url = new URL(req.url ?? '/', this.origin);

    if (url.pathname.startsWith('/api/')) {
      // EventSource cannot set headers, so the event stream takes the token as a query parameter.
      const token = req.headers['x-token'] ?? url.searchParams.get('t');
      if (token !== this.token) return send(res, 403, { error: 'bad token' });
      if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
      if (url.pathname === '/api/scene') {
        if (!this.scene) return send(res, 200, { scene: null });
        return send(res, 200, { scene: this.scene });
      }
      if (url.pathname === '/api/events') return this.subscribe(req, res);
      return send(res, 404, { error: 'not found' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
    this.serveStatic(url.pathname, res);
  }

  private subscribe(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      ...securityHeaders,
    });
    res.write(`event: scene\ndata: ${JSON.stringify({ version: this.version })}\n\n`);
    this.listeners.add(res);
    req.on('close', () => this.listeners.delete(res));
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

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...securityHeaders });
  res.end(JSON.stringify(body));
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
