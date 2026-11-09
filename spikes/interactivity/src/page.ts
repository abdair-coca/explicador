// Local test page: serves the click buttons and forwards clicks to the server.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { clickRequestSchema, type Click } from './click.ts';
import { logEvent, spikeDir } from './log.ts';

export interface PageHandlers {
  onClick(click: Click): Promise<string>;
  state(): Record<string, unknown>;
}

const MAX_BODY_BYTES = 4096;
const pageTemplate = readFileSync(new URL('./page.html', import.meta.url), 'utf8');

export async function startPage(handlers: PageHandlers): Promise<string> {
  const token = randomBytes(16).toString('hex');
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const host = `127.0.0.1:${port}`;
  const origin = `http://${host}`;

  server.on('request', (req, res) => {
    handle(req, res).catch((error: unknown) => send(res, 500, { error: String(error) }));
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Host check blocks DNS rebinding; the token blocks other local pages and processes.
    if (req.headers.host !== host) return send(res, 403, { error: 'bad host' });
    const url = new URL(req.url ?? '/', origin);

    if (req.method === 'GET' && url.pathname === '/') {
      if (url.searchParams.get('t') !== token) return send(res, 403, { error: 'bad token' });
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(pageTemplate.replace('__TOKEN__', token));
      return;
    }
    if (req.headers['x-token'] !== token) return send(res, 403, { error: 'bad token' });
    if (req.method === 'GET' && url.pathname === '/state') return send(res, 200, handlers.state());
    if (req.method === 'POST' && url.pathname === '/click') {
      if (req.headers.origin !== origin) return send(res, 403, { error: 'bad origin' });
      const parsed = clickRequestSchema.safeParse(JSON.parse(await readBody(req)));
      if (!parsed.success) return send(res, 400, { error: 'invalid click' });
      const status = await handlers.onClick({ ...parsed.data, at: new Date().toISOString() });
      return send(res, 200, { status });
    }
    send(res, 404, { error: 'not found' });
  }

  const pageUrl = `${origin}/?t=${token}`;
  logEvent('page_started', { port });
  writeFileSync(join(spikeDir, 'url.txt'), `${pageUrl}\n`);
  return pageUrl;
}

export function openInBrowser(url: string): void {
  const [command, args] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
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
