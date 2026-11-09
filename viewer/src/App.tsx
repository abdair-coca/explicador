import Markdown from 'react-markdown';
import type { ScenePayload } from '../../server/src/scene.ts';
import { useScene, type Connection } from './api';
import { ArchScene, FlowScene } from './components/scenes';
import { Badge } from './components/ui/badge';
import { cn } from '@/lib/utils';

const connectionText: Record<Connection, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  lost: 'Disconnected: is Claude Code still running?',
  forbidden: 'Open the link Claude gave you (this one has no valid token)',
};

export function App() {
  const { scene, connection } = useScene();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-3">
          <span className="font-semibold tracking-tight">Explicador</span>
          {scene && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{scene.topic}</span>
              <Badge variant={scene.status === 'fresh' ? 'success' : 'warning'}>
                {scene.status === 'fresh' ? 'Up to date' : 'Stale'}
              </Badge>
            </>
          )}
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                connection === 'live' ? 'bg-emerald-500' : connection === 'connecting' ? 'bg-amber-400' : 'bg-red-500',
              )}
            />
            {connectionText[connection]}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {scene ? <Scene scene={scene} /> : <Empty />}
      </main>
    </div>
  );
}

function Scene({ scene }: { scene: ScenePayload }) {
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
        if (block.type === 'arch') return <ArchScene key={key} block={block} />;
        if (block.type === 'flow') return <FlowScene key={key} block={block} />;
        return (
          <div key={key} className="prose-exl max-w-3xl">
            <Markdown>{block.text}</Markdown>
          </div>
        );
      })}
      <p className="pt-2 text-xs text-muted-foreground">Generated {new Date(scene.savedAt).toLocaleString()}</p>
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
