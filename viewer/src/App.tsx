import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Ref, ScenePayload, Tour } from '../../server/src/scene.ts';
import { sceneLanguage, setLanguage, t } from './i18n';
import { staggerIn } from './animation/reveal';
import { boxWithin, zoomIn, zoomOut, type Box } from './animation/zoom';
import { Backdrop } from './theme/Backdrop';
import { lookSeed, sceneTheme } from './theme/themes';
import { exportUrl, post, staticScene, useScene, type AskReply, type ClickReply, type Connection, type ExplainReply } from './api';
import { CodeDock } from './code/CodeDock';
import { readPref, useMedia, usePresence, writePref } from './code/hooks';
import { codeReducer, initialCode } from './code/state';
import { Lesson } from './lesson/Lesson';
import { planLesson } from './lesson/chapters';
import { BlockView } from './components/BlockView';
import { DetailPanel, findItem, isItemBlock } from './components/DetailPanel';
import { AlertIcon, CloseIcon, DownloadIcon, InfoIcon, PresentIcon, SparkIcon } from './components/icons';
import { type DrillHandler } from './components/scenes';
import { SelectionContext, type Selected, type Selection } from './components/selection';
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
  const { scene, questions, tour, connection } = useScene();
  // The viewer speaks the scene's language (F31); set while rendering, so every component below reads it.
  const lang = useMemo(() => (scene ? sceneLanguage(scene.blocks) : 'en'), [scene]);
  setLanguage(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const [notice, setNotice] = useState<Notice>();
  const [transition, setTransition] = useState<Transition>();
  const [presenting, setPresenting] = useState(false);
  const [selected, setSelected] = useState<Selected>();
  /** Question the panel scrolls to when it opens from the "Claude answered" notice. */
  const [focus, setFocus] = useState<string>();
  const main = useRef<HTMLElement>(null);
  const [code, dispatch] = useReducer(codeReducer, initialCode);
  /** Clicking a box opens the code window on it, until the user closes the window. */
  const [autoCode, setAutoCode] = useState(() => readPref('code-auto', true));
  const wide = useMedia('(min-width: 1024px)');
  const latest = useRef({ scene, autoCode, wide, touring: code.tour !== undefined, codeOpen: code.open });
  latest.current = { scene, autoCode, wide, touring: code.tour !== undefined, codeOpen: code.open };
  // The code window stays mounted while it sinks away.
  const dock = usePresence(code.open && !offline, 220);
  const shown = useRef<{ version: number; key: string } | undefined>(undefined);
  /** The clicked box, so "Go deeper" can zoom out of it. */
  const anchor = useRef<Element | null>(null);

  const asked = useMemo(() => {
    const boxes = new Map<string, boolean>();
    for (const q of questions) boxes.set(`${q.block}:${q.node}`, (boxes.get(`${q.block}:${q.node}`) ?? false) || !q.answer);
    return boxes;
  }, [questions]);

  // An answer that arrives while its box is closed is announced, with a way to open it.
  const waiting = useRef(new Set<string>());
  const open = useRef(selected);
  open.current = selected;
  useEffect(() => {
    for (const q of questions) {
      if (!q.answer) waiting.current.add(q.id);
      else if (waiting.current.delete(q.id) && !(open.current?.block === q.block && open.current.node === q.node)) {
        setNotice({
          tone: 'info',
          text: (
            <>
              Claude answered “{q.text}”.{' '}
              <button
                type="button"
                className="font-extrabold text-link hover:underline"
                onClick={() => {
                  anchor.current = document.querySelector(`[data-node-id="${CSS.escape(q.node)}"]`);
                  setSelected({ block: q.block, node: q.node });
                  setFocus(q.id);
                  setNotice(undefined);
                }}
              >
                Show the answer
              </button>
            </>
          ),
        });
      }
    }
  }, [questions]);

  const selection = useMemo<Selection>(
    () => ({
      asked,
      selected,
      select: (block, node, element) => {
        anchor.current = element;
        setFocus(undefined);
        // Clicking the open box again closes its details.
        const closing = open.current?.block === block && open.current.node === node;
        setSelected(closing ? undefined : { block, node });
        // Beside its details, show the box's code. Small screens keep the sheet for the details; a tour keeps its own lines.
        const { scene: current, autoCode: auto, wide: roomy, touring } = latest.current;
        if (closing || offline || !auto || !roomy || touring) return;
        // A chapter's code is in the lesson already ("Your cells"): asking about it keeps the lesson in view.
        const found = current?.blocks.find((b) => isItemBlock(b) && b.id === block);
        const ref = found && isItemBlock(found) && found.type !== 'chapter' ? findItem(found, node)?.ref : undefined;
        if (ref) dispatch({ type: 'show', ref });
      },
      ...(offline
        ? {}
        : {
            startTour: (walk: Tour) => dispatch({ type: 'tour', tour: walk }),
            openCode: (ref: Ref) => openCode(ref),
            // A playing flow takes the open code window along with it; a tour keeps its own lines.
            followStep: (ref: Ref | undefined) => {
              const { codeOpen, touring } = latest.current;
              if (ref && codeOpen && !touring) dispatch({ type: 'show', ref });
            },
          }),
    }),
    [selected, asked],
  );

  // A tour Claude started in the chat plays in the code window.
  const lastTour = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!tour || tour.id === lastTour.current) return;
    lastTour.current = tour.id;
    dispatch({ type: 'tour', tour });
  }, [tour]);

  /** The user asked for code (View code, a code card): the window opens and clicks on boxes keep showing code. */
  const openCode = (ref: Ref): void => {
    setAutoCode(true);
    writePref('code-auto', true);
    dispatch({ type: 'show', ref });
  };
  const startTour = (walk: Tour): void => dispatch({ type: 'tour', tour: walk });
  const closeCode = (): void => {
    dispatch({ type: 'close' });
    setAutoCode(false);
    writePref('code-auto', false);
  };

  // Esc closes the code window first, then the details (presentation mode has its own keys).
  useEffect(() => {
    if ((!selected && !code.open) || presenting) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      if (latest.current.codeOpen) closeCode();
      else setSelected(undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, code.open, presenting]);

  // When a new scene arrives, zoom if it answers the user's last click or breadcrumb; otherwise its blocks pop in.
  useLayoutEffect(() => {
    if (!scene || scene.version === shown.current?.version) return;
    if (scene.key !== shown.current?.key) setSelected(undefined);
    shown.current = { version: scene.version, key: scene.key };
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

  /** Opens the scene Claude drew for an answer, zooming in from the box the question was about. */
  const follow = (question: string): void => {
    if (!scene) return;
    const box = main.current && anchor.current?.isConnected ? boxWithin(anchor.current, main.current) : undefined;
    setTransition({ direction: 'in', fromKey: scene.key, box });
    post<{ status: string }>('follow', { question }).then(
      (reply) => {
        if (reply.status === 'opened') return;
        setTransition(undefined);
        setNotice({ tone: 'warning', text: 'That scene is no longer cached; ask Claude to draw it again.' });
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
    // overflow-x-clip, not hidden: hidden makes this a scroll container and the sticky detail panel stops following the page.
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-10 border-b border-border-soft bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
          <span className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="h-3.5 w-3.5 rounded-full bg-primary shadow-[0_2px_0_var(--primary-dark)]" aria-hidden="true" />
            Explicador
          </span>
          {scene && (
            <nav aria-label="Scenes" className="order-last flex w-full min-w-0 flex-wrap items-center gap-x-2 text-sm sm:order-none sm:w-auto">
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
              <span className="min-w-0 break-all font-extrabold" aria-current="page">
                {scene.topic}
              </span>
              <Badge variant={scene.status === 'fresh' ? 'success' : 'stale'}>{scene.status === 'fresh' ? t('Up to date') : t('Stale')}</Badge>
            </nav>
          )}
          {scene && (
            <span className="ml-auto flex items-center gap-2">
              {/* Icons only on phones, so the bar stays two lines tall. */}
              <Button variant="primary" size="sm" onClick={() => setPresenting(true)} aria-label={t('Present')}>
                <PresentIcon size={16} />
                <span className="hidden sm:inline">{t('Present')}</span>
              </Button>
              {!offline && (
                <a
                  href={exportUrl}
                  download={`${scene.key}.html`}
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                  title="Download this scene as one HTML file that works offline"
                  aria-label={t('Export')}
                >
                  <DownloadIcon size={16} />
                  <span className="hidden sm:inline">{t('Export')}</span>
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
            <span className="sr-only sm:not-sr-only">{connectionText[connection]}</span>
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
      <SelectionContext.Provider value={selection}>
        <div
          className={cn(
            'mx-auto px-6 py-8',
            scene && selected ? 'max-w-[1720px] lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6' : 'max-w-7xl',
          )}
        >
          <div className="min-w-0">
            <main ref={main} className="relative isolate space-y-7">
              {scene && <Backdrop theme={sceneTheme(scene.blocks, lookSeed(scene))} seed={lookSeed(scene)} variant="page" className="absolute right-0 top-0 -z-10 hidden w-[min(40%,520px)] lg:block" />}
              {scene ? <Scene scene={scene} /> : <Empty />}
            </main>
          </div>
          {scene && selected && (
            <DetailPanel
              scene={scene}
              selected={selected}
              onClose={() => setSelected(undefined)}
              onDeeper={offline ? undefined : () => drill(selected.block, selected.node, anchor.current ?? main.current ?? document.body)}
              questions={questions}
              onAsk={offline ? undefined : (text) => post<AskReply>('ask', { block: selected.block, node: selected.node, question: text })}
              onFollow={follow}
              focus={focus}
              onOpenCode={offline ? undefined : openCode}
              onTour={offline ? undefined : startTour}
              onExplain={offline ? undefined : () => post<ExplainReply>('explain', { block: selected.block, node: selected.node })}
              tourId={tour?.id}
            />
          )}
        </div>
        {dock.mounted && (
          <CodeDock
            state={code}
            dispatch={dispatch}
            onClose={closeCode}
            closing={dock.closing}
            panelOpen={Boolean(scene && selected)}
            keysOff={presenting}
            onExplain={(ref) => post<ExplainReply>('explain', { path: ref.path, ...(ref.start !== undefined ? { start: ref.start } : {}), ...(ref.end !== undefined ? { end: ref.end } : {}) })}
          />
        )}
      </SelectionContext.Provider>
      {scene && presenting && <Presenter key={scene.version} scene={scene} onExit={() => setPresenting(false)} />}
    </div>
  );
}

function Scene({ scene }: { scene: ScenePayload }) {
  const plan = useMemo(() => planLesson(scene.blocks), [scene.blocks]);
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
      {plan ? (
        <Lesson scene={scene} plan={plan} />
      ) : (
        scene.blocks.map((block, i) => (
          // Keyed by version so a new scene restarts its animations.
          <BlockView key={`${scene.version}-${i}`} block={block} />
        ))
      )}
      <p className="flex items-center gap-2 pt-2 text-sm font-semibold text-muted-foreground">
        <InfoIcon size={16} />
        Generated {new Date(scene.savedAt).toLocaleString()} ·{' '}
        {offline ? 'Offline copy: click a box for its details; groups zoom in.' : 'Click a box for its details, to ask Claude about it and to go deeper; groups zoom in.'}
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
