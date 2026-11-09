import { useLayoutEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import type { ScenePayload } from '../../server/src/scene.ts';
import { staggerIn } from './animation/reveal';
import { boxWithin, zoomIn, zoomOut, type Box } from './animation/zoom';
import { exportUrl, post, staticScene, useScene, type ClickReply, type Connection } from './api';
import { AlertIcon, CloseIcon, DownloadIcon, InfoIcon, PresentIcon, SparkIcon } from './components/icons';
import { ArchScene, FlowScene, type DrillHandler } from './components/scenes';
import { DataScene, StateScene } from './components/views';
import { Badge } from './components/ui/badge';
import { Button, buttonVariants } from './components/ui/button';
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

  // When a new scene arrives, zoom if it answers the user's last click or breadcrumb; otherwise its blocks pop in.
  useLayoutEffect(() => {
    if (!scene || scene.version === shown.current) return;
    shown.current = scene.version;
    const element = main.current;
    if (!element) return;
    if (transition?.direction === 'in' && scene.trail.at(-1)?.key === transition.fromKey) {
      zoomIn(element, transition.box);
      setTransition(undefined);
      setNotice(undefined);
    } else if (transition?.direction === 'out' && scene.key === transition.toKey) {
      zoomOut(element, undefined);
      setTransition(undefined);
    } else {
      staggerIn(element.children);
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
                Code: <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono">/explicador:explain {reply.topic}</code>
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
      <header className="sticky top-0 z-10 border-b border-border-soft bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
          <span className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="h-3.5 w-3.5 rounded-full bg-primary shadow-[0_2px_0_var(--primary-dark)]" aria-hidden="true" />
            Explicador
          </span>
          {scene && (
            <nav aria-label="Scenes" className="flex flex-wrap items-center gap-x-2 text-sm">
              {scene.trail.map((entry) => (
                <span key={entry.key} className="flex items-center gap-2">
                  <span className="text-muted-foreground">/</span>
                  {offline ? (
                    <span className="font-bold">{entry.topic}</span>
                  ) : (
                    <button
                      type="button"
                      className="font-bold text-link transition-transform hover:underline active:scale-[0.96]"
                      onClick={() => back(entry.key)}
                    >
                      {entry.topic}
                    </button>
                  )}
                </span>
              ))}
              <span className="text-muted-foreground">/</span>
              <span className="font-extrabold" aria-current="page">
                {scene.topic}
              </span>
              <Badge variant={scene.status === 'fresh' ? 'success' : 'stale'}>{scene.status === 'fresh' ? 'Up to date' : 'Stale'}</Badge>
            </nav>
          )}
          {scene && (
            <span className="ml-auto flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => setPresenting(true)}>
                <PresentIcon size={16} />
                Present
              </Button>
              {!offline && (
                <a
                  href={exportUrl}
                  download={`${scene.key}.html`}
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                  title="Download this scene as one HTML file that works offline"
                >
                  <DownloadIcon size={16} />
                  Export
                </a>
              )}
            </span>
          )}
          <span className={cn('flex items-center gap-2 text-xs font-bold text-muted-foreground', !scene && 'ml-auto')}>
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                connection === 'live' || connection === 'static' ? 'bg-green-500' : connection === 'connecting' ? 'bg-primary' : 'bg-red-500',
              )}
            />
            {connectionText[connection]}
          </span>
        </div>
      </header>
      {notice && (
        <div className="mx-auto max-w-7xl px-6 pt-5">
          <div
            role="status"
            className={cn(
              'animate-pop-in flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold',
              notice.tone === 'info'
                ? 'border-border-soft bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                : 'border-warning-border bg-warning text-warning-foreground',
            )}
          >
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full text-white',
                notice.tone === 'info' ? 'bg-info' : 'bg-stale',
              )}
            >
              {notice.tone === 'info' ? <SparkIcon size={18} className="animate-pulse" /> : <AlertIcon size={18} />}
            </span>
            <p className="flex-1">{notice.text}</p>
            <Button variant="ghost" size="icon-sm" onClick={() => setNotice(undefined)} aria-label="Dismiss">
              <CloseIcon size={16} />
            </Button>
          </div>
        </div>
      )}
      <main ref={main} className="mx-auto max-w-7xl space-y-7 px-6 py-8">
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
        <div role="alert" className="flex gap-3 rounded-2xl border border-warning-border bg-warning px-4 py-3 text-sm text-warning-foreground">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stale text-white">
            <AlertIcon size={18} />
          </span>
          <div>
            <p className="font-extrabold">This scene may be out of date: files it references changed after it was made.</p>
            <ul className="mt-1 list-disc pl-5 font-semibold">
              {scene.changes.map((c) => (
                <li key={c.path}>
                  <code className="font-mono">{c.path}</code> ({c.change})
                </li>
              ))}
            </ul>
            <p className="mt-1 font-semibold">Ask Claude to explain it again to refresh it.</p>
          </div>
        </div>
      )}
      {scene.blocks.map((block, i) => {
        // Keyed by version so a new scene restarts its animations.
        const key = `${scene.version}-${i}`;
        if (block.type === 'arch') return <ArchScene key={key} block={block} onDrill={onDrill} />;
        if (block.type === 'flow') return <FlowScene key={key} block={block} onDrill={onDrill} />;
        if (block.type === 'data') return <DataScene key={key} block={block} onDrill={onDrill} />;
        if (block.type === 'state') return <StateScene key={key} block={block} onDrill={onDrill} />;
        return (
          <div key={key} className="prose-exl max-w-3xl">
            <Markdown>{block.text}</Markdown>
          </div>
        );
      })}
      <p className="flex items-center gap-2 pt-2 text-sm font-semibold text-muted-foreground">
        <InfoIcon size={16} />
        Generated {new Date(scene.savedAt).toLocaleString()} ·{' '}
        {onDrill ? 'Click a box to go deeper; groups zoom in.' : 'Offline copy: groups zoom in; ask Claude Code to go deeper.'}
      </p>
    </>
  );
}

function Empty() {
  return (
    <div className="animate-pop-in flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_3px_0_var(--primary-dark)]">
        <SparkIcon size={22} />
      </span>
      <p className="text-xl font-extrabold">Waiting for a scene</p>
      <p className="max-w-md text-base font-medium text-muted-foreground">
        In Claude Code, run <code className="rounded-lg bg-subtle px-1.5 py-0.5 font-mono text-sm text-foreground">/explicador:explain login</code>{' '}
        or ask for any explanation. Scenes appear here as soon as they are ready.
      </p>
    </div>
  );
}
