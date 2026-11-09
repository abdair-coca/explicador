import { useLayoutEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import type { ScenePayload } from '../../server/src/scene.ts';
import { boxWithin, zoomIn, zoomOut, type Box } from './animation/zoom';
import { exportUrl, post, staticScene, useScene, type ClickReply, type Connection } from './api';
import { ArchScene, FlowScene, type DrillHandler } from './components/scenes';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Presenter } from './presentation/Presenter';
import { cn } from '@/lib/utils';

const connectionText: Record<Connection, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  lost: 'Disconnected: is Claude Code still running?',
  forbidden: 'Open the link Claude gave you (this one has no valid token)',
  static: 'Offline copy',
};
const offline = staticScene !== null;

type Notice = { tone: 'info' | 'warning'; text: React.ReactNode } | undefined;
/** A scene change the user started: zoom into the clicked node, or out to a breadcrumb. */
type Transition = { direction: 'in'; fromKey: string; box: Box | undefined } | { direction: 'out'; toKey: string };

export function App() {
  const { scene, connection } = useScene();
  const [notice, setNotice] = useState<Notice>();
  const [transition, setTransition] = useState<Transition>();
  const [presenting, setPresenting] = useState(false);
  const main = useRef<HTMLElement>(null);
  const shown = useRef<number | undefined>(undefined);

  // When a new scene arrives, animate it if it answers the user's last click or breadcrumb.
  useLayoutEffect(() => {
    if (!scene || scene.version === shown.current) return;
    shown.current = scene.version;
    const element = main.current;
    if (element && transition?.direction === 'in' && scene.trail.at(-1)?.key === transition.fromKey) {
      zoomIn(element, transition.box);
      setTransition(undefined);
      setNotice(undefined);
    } else if (element && transition?.direction === 'out' && scene.key === transition.toKey) {
      zoomOut(element, undefined);
      setTransition(undefined);
    }
  }, [scene, transition]);

  const drill: DrillHandler = (block, node, element) => {
    if (!scene) return;
    const box = main.current ? boxWithin(element, main.current) : undefined;
    setTransition({ direction: 'in', fromKey: scene.key, box });
    post<ClickReply>('click', { block, node }).then(
      (reply) => {
        if (reply.status === 'opened') return;
        if (reply.status === 'sent') {
          setNotice({ tone: 'info', text: <>Asked Claude to explain “{reply.topic}”. The scene appears here when it is ready.</> });
        } else if (reply.status === 'no-monitor') {
          setTransition(undefined);
          setNotice({
            tone: 'warning',
            text: (
              <>
                Claude Code is not listening for clicks from this tab (the Explicador monitor is not running). Ask in Claude
                Code: <code>/explicador:explain {reply.topic}</code>
              </>
            ),
          });
        } else {
          setTransition(undefined);
          setNotice({ tone: 'warning', text: 'This scene changed in the meantime; click again.' });
        }
      },
      () => {
        setTransition(undefined);
        setNotice({ tone: 'warning', text: 'Could not reach Claude Code. Is it still running?' });
      },
    );
  };

  const back = (key: string): void => {
    setTransition({ direction: 'out', toKey: key });
    setNotice(undefined);
    post<{ status: string }>('open', { key }).then(
      (reply) => {
        if (reply.status !== 'opened') {
          setTransition(undefined);
          setNotice({ tone: 'warning', text: 'That scene is no longer cached; ask Claude to explain it again.' });
        }
      },
      () => setTransition(undefined),
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-3">
          <span className="font-semibold tracking-tight">Explicador</span>
          {scene && (
            <nav aria-label="Scenes" className="flex flex-wrap items-center gap-x-2">
              {scene.trail.map((entry) => (
                <span key={entry.key} className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  {offline ? (
                    <span>{entry.topic}</span>
                  ) : (
                    <button type="button" className="text-primary hover:underline" onClick={() => back(entry.key)}>
                      {entry.topic}
                    </button>
                  )}
                </span>
              ))}
              <span className="text-muted-foreground">/</span>
              <span className="font-medium" aria-current="page">
                {scene.topic}
              </span>
              <Badge variant={scene.status === 'fresh' ? 'success' : 'warning'}>
                {scene.status === 'fresh' ? 'Up to date' : 'Stale'}
              </Badge>
            </nav>
          )}
          {scene && (
            <span className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPresenting(true)}>
                ▶ Present
              </Button>
              {!offline && (
                <a
                  href={exportUrl}
                  download={`${scene.key}.html`}
                  className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium hover:bg-muted"
                  title="Download this scene as one HTML file that works offline"
                >
                  ⤓ Export
                </a>
              )}
            </span>
          )}
          <span className={cn('flex items-center gap-2 text-xs text-muted-foreground', !scene && 'ml-auto')}>
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                connection === 'live' || connection === 'static' ? 'bg-emerald-500' : connection === 'connecting' ? 'bg-amber-400' : 'bg-red-500',
              )}
            />
            {connectionText[connection]}
          </span>
        </div>
      </header>
      {notice && (
        <div className="mx-auto max-w-5xl px-6 pt-4">
          <div
            role="status"
            className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
              notice.tone === 'info'
                ? 'border-border bg-muted text-foreground'
                : 'border-warning-foreground/30 bg-warning text-warning-foreground',
            )}
          >
            {notice.tone === 'info' && <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />}
            <p className="flex-1">{notice.text}</p>
            <Button variant="ghost" size="sm" onClick={() => setNotice(undefined)} aria-label="Dismiss">
              ✕
            </Button>
          </div>
        </div>
      )}
      <main ref={main} className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {scene ? <Scene scene={scene} onDrill={offline ? undefined : drill} /> : <Empty />}
      </main>
      {scene && presenting && <Presenter key={scene.version} scene={scene} onExit={() => setPresenting(false)} />}
    </div>
  );
}

function Scene({ scene, onDrill }: { scene: ScenePayload; onDrill: DrillHandler | undefined }) {
  return (
    <>
      {scene.status === 'stale' && (
        <div role="alert" className="rounded-lg border border-warning-foreground/30 bg-warning px-4 py-3 text-sm text-warning-foreground">
          <p className="font-medium">This scene may be out of date: files it references changed after it was made.</p>
          <ul className="mt-1 list-disc pl-5">
            {scene.changes.map((c) => (
              <li key={c.path}>
                <code>{c.path}</code> ({c.change})
              </li>
            ))}
          </ul>
          <p className="mt-1">Ask Claude to explain it again to refresh it.</p>
        </div>
      )}
      {scene.blocks.map((block, i) => {
        // Keyed by version so a new scene restarts its animations.
        const key = `${scene.version}-${i}`;
        if (block.type === 'arch') return <ArchScene key={key} block={block} onDrill={onDrill} />;
        if (block.type === 'flow') return <FlowScene key={key} block={block} onDrill={onDrill} />;
        return (
          <div key={key} className="prose-exl max-w-3xl">
            <Markdown>{block.text}</Markdown>
          </div>
        );
      })}
      <p className="pt-2 text-xs text-muted-foreground">
        Generated {new Date(scene.savedAt).toLocaleString()} ·{' '}
        {onDrill ? 'Click a node to go deeper; groups zoom in.' : 'Offline copy: groups zoom in; ask Claude Code to go deeper.'}
      </p>
    </>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
      <p className="text-base font-medium text-foreground">Waiting for a scene</p>
      <p className="mt-1 text-sm">
        In Claude Code, run <code className="rounded bg-muted px-1.5 py-0.5">/explicador:explain login</code> or ask for any
        explanation. Scenes appear here as soon as they are ready.
      </p>
    </div>
  );
}
