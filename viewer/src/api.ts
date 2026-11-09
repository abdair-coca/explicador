// Talks to the bridge: GET /api/scene with the per-launch token, and an event stream for updates.
import { useEffect, useState } from 'react';
import type { ScenePayload } from '../../server/src/scene.ts';

const token = new URLSearchParams(window.location.search).get('t') ?? '';

export type Connection = 'connecting' | 'live' | 'lost' | 'forbidden';

async function fetchScene(): Promise<ScenePayload | null> {
  const response = await fetch('/api/scene', { headers: { 'x-token': token }, cache: 'no-store' });
  if (response.status === 403) throw new Error('forbidden');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return ((await response.json()) as { scene: ScenePayload | null }).scene;
}

export function useScene(): { scene: ScenePayload | null; connection: Connection } {
  const [scene, setScene] = useState<ScenePayload | null>(null);
  const [connection, setConnection] = useState<Connection>(token ? 'connecting' : 'forbidden');

  useEffect(() => {
    if (!token) return;
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
    events.onerror = () => setConnection(events.readyState === EventSource.CLOSED ? 'forbidden' : 'lost');
    return () => events.close();
  }, []);

  return { scene, connection };
}
