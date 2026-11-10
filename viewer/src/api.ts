// Talks to the bridge: GET /api/scene with the per-launch token, and an event stream for updates.
import { useEffect, useState } from 'react';
import type { Notebook, Question, QuestionsPayload, ScenePayload, Tour } from '../../server/src/scene.ts';

const token = new URLSearchParams(window.location.search).get('t') ?? '';

/** An exported file carries its scene inline and has no server behind it. */
const embedded = document.getElementById('explicador-scene')?.textContent;
export const staticScene: ScenePayload | null = embedded ? (JSON.parse(embedded) as ScenePayload) : null;

export const exportUrl = `/api/export?t=${encodeURIComponent(token)}`;

export type Connection = 'connecting' | 'live' | 'lost' | 'forbidden' | 'static';

async function fetchScene(): Promise<ScenePayload | null> {
  const response = await fetch('/api/scene', { headers: { 'x-token': token }, cache: 'no-store' });
  if (response.status === 403) throw new Error('forbidden');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return ((await response.json()) as { scene: ScenePayload | null }).scene;
}

const noQuestions: Question[] = [];

export function useScene(): { scene: ScenePayload | null; questions: Question[]; tour: Tour | undefined; connection: Connection } {
  const [scene, setScene] = useState<ScenePayload | null>(staticScene);
  const [asked, setAsked] = useState<QuestionsPayload>();
  const [tour, setTour] = useState<Tour>();
  const [connection, setConnection] = useState<Connection>(staticScene ? 'static' : token ? 'connecting' : 'forbidden');

  useEffect(() => {
    if (staticScene || !token) return;
    const events = new EventSource(`/api/events?t=${encodeURIComponent(token)}`);
    let latest = -1;
    events.addEventListener('scene', (event) => {
      setConnection('live');
      const { version } = JSON.parse((event as MessageEvent<string>).data) as { version: number };
      if (version === latest) return;
      latest = version;
      fetchScene().then(setScene, (error: unknown) =>
        setConnection(error instanceof Error && error.message === 'forbidden' ? 'forbidden' : 'lost'),
      );
    });
    // Questions travel apart from the scene, so an answer never restarts the scene's animations.
    events.addEventListener('questions', (event) => {
      setAsked(JSON.parse((event as MessageEvent<string>).data) as QuestionsPayload);
    });
    // A code tour Claude started in the chat; the code window plays it.
    events.addEventListener('tour', (event) => {
      setTour(JSON.parse((event as MessageEvent<string>).data) as Tour);
    });
    events.onerror = () => setConnection(events.readyState === EventSource.CLOSED ? 'forbidden' : 'lost');
    return () => events.close();
  }, []);

  // The two events are independent: show questions only once they belong to the scene on screen.
  return { scene, questions: scene && asked?.key === scene.key ? asked.questions : noQuestions, tour, connection };
}

/** POST /api/<name>; the bridge checks the token and that the request comes from this page. */
export async function post<T>(name: 'click' | 'open' | 'ask' | 'follow' | 'explain', body: Record<string, string | number>): Promise<T> {
  const response = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: { 'x-token': token, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export type AskReply =
  | { status: 'sent'; id: string }
  | { status: 'no-monitor' }
  | { status: 'invalid'; message: string }
  | { status: 'unknown' };

export type ClickReply =
  | { status: 'opened'; topic: string }
  | { status: 'sent'; topic: string; monitors: number }
  | { status: 'no-monitor'; topic: string; message: string }
  | { status: 'unknown' };

export type FileReply =
  | { ok: true; lines: string[] }
  | { ok: true; notebook: Notebook }
  | { ok: false; error: 'missing' | 'denied' | 'binary' | 'too-large' | 'invalid' | 'unreachable' };

const fileErrors = new Set(['missing', 'denied', 'binary', 'too-large', 'invalid']);

export type ExplainReply = { status: 'sent' } | { status: 'no-monitor' } | { status: 'unknown' };

/** GET /api/file: a text file of the project, for the code window. */
export async function fetchFile(path: string): Promise<FileReply> {
  try {
    const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`, { headers: { 'x-token': token }, cache: 'no-store' });
    const body = (await response.json()) as { lines?: string[]; notebook?: Notebook; error?: string };
    if (response.ok && body.notebook) return { ok: true, notebook: body.notebook };
    if (response.ok && body.lines) return { ok: true, lines: body.lines };
    return { ok: false, error: body.error && fileErrors.has(body.error) ? (body.error as 'missing') : 'unreachable' };
  } catch {
    return { ok: false, error: 'unreachable' };
  }
}

/** GET /api/tree: the project's files, for the explorer. */
export async function fetchTree(): Promise<{ files: string[]; truncated: boolean } | undefined> {
  try {
    const response = await fetch('/api/tree', { headers: { 'x-token': token }, cache: 'no-store' });
    return response.ok ? ((await response.json()) as { files: string[]; truncated: boolean }) : undefined;
  } catch {
    return undefined;
  }
}
