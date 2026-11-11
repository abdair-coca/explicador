// Side panel with the details of the selected box: what it does, its key code, "Go deeper",
// and the questions the user asked Claude about it. On small screens it is a bottom sheet;
// in exported files it is read-only.
import { Prose } from './Prose';
import type { Block, ChapterBlock, NodeKind, Question, Ref, SceneBlock, ScenePayload, StageKind, Tour } from '../../../server/src/scene.ts';
import { CodeCard } from './CodeCard';
import type { ExplainReply } from '../api';
import { ExplainButton } from './ExplainButton';
import { ArrowRightIcon, CloseIcon, CodeIcon, kindIcon } from './icons';
import { AskBox, QuestionThread, type AskHandler } from './Questions';
import { formatRef } from './scenes';
import type { Selected } from './selection';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

/** What the panel shows about a node, an entity, a state, a journey stage or a lesson chapter. */
interface Item {
  label: string;
  /** Picks the color of the icon chip (`kind-*` classes). */
  kind: NodeKind | StageKind | 'chapter';
  icon: string[];
  caption: string;
  desc?: string | undefined;
  about?: string | undefined;
  ref?: Ref | undefined;
}

/** Blocks whose items open the detail panel. */
export type ItemBlock = SceneBlock | ChapterBlock;

export function isItemBlock(block: Block | undefined): block is ItemBlock {
  return block !== undefined && block.type !== 'markdown' && ['arch', 'flow', 'data', 'state', 'journey', 'chapter'].includes(block.type);
}

export function findItem(block: ItemBlock, id: string): Item | undefined {
  switch (block.type) {
    case 'arch':
    case 'flow': {
      const node = block.nodes.find((n) => n.id === id);
      return node && { ...node, icon: kindIcon[node.kind], caption: node.kind };
    }
    case 'data': {
      const entity = block.entities.find((e) => e.id === id);
      return entity && { ...entity, kind: 'store', icon: kindIcon.entity, caption: 'entity' };
    }
    case 'state': {
      const status = block.states.find((s) => s.id === id);
      return status && { ...status, kind: 'module', icon: kindIcon.state, caption: 'state' };
    }
    case 'journey': {
      const stage = block.stages.find((s) => s.id === id);
      return (
        stage && {
          label: stage.label,
          kind: stage.kind,
          icon: kindIcon[stage.kind],
          caption: 'stage',
          desc: [stage.value, stage.op].filter(Boolean).join(' · ') || undefined,
          about: stage.narration,
          ref: stage.ref,
        }
      );
    }
    case 'chapter':
      return id === block.id ? { label: block.title, kind: 'chapter', icon: kindIcon.chapter, caption: 'chapter', desc: block.goal, ref: block.ref } : undefined;
  }
}

export function DetailPanel(props: {
  scene: ScenePayload;
  selected: Selected;
  onClose: () => void;
  /** Absent in exported files: there is no Claude to ask. */
  onDeeper?: (() => void) | undefined;
  /** Questions about the current scene; the panel shows those of its box. */
  questions?: Question[];
  /** Absent in exported files, like `onDeeper`. */
  onAsk?: AskHandler | undefined;
  onFollow?: ((question: string) => void) | undefined;
  /** Question to scroll to when the panel opens. */
  focus?: string | undefined;
  /** Opens lines in the code window; absent in exported files. */
  onOpenCode?: ((ref: Ref) => void) | undefined;
  onTour?: ((tour: Tour) => void) | undefined;
  /** Asks Claude for a tour of this box's code; absent in exported files. */
  onExplain?: (() => Promise<ExplainReply>) | undefined;
  /** Id of the latest tour, so a pending request stops waiting when it arrives. */
  tourId?: string | undefined;
}) {
  const block = props.scene.blocks.find((b): b is ItemBlock => isItemBlock(b) && b.id === props.selected.block);
  const item = block && findItem(block, props.selected.node);
  if (!block || !item) return null;
  const codes = block.type === 'chapter' ? [] : (block.codes ?? []).filter((c) => c.node === props.selected.node);
  const drill = block.type === 'chapter' ? undefined : block.drills.find((d) => d.node === props.selected.node)?.topic;
  const questions = (props.questions ?? []).filter((q) => q.block === props.selected.block && q.node === props.selected.node);

  return (
    <aside
      aria-label={`Details: ${item.label}`}
      className={cn(
        // Bottom sheet on small screens, a sticky card beside the scene on large ones.
        'animate-sheet-in fixed inset-x-0 bottom-0 z-30 max-h-[72vh] scroll-pb-28 overflow-y-auto rounded-t-3xl border-t-2 border-border bg-card p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]',
        'lg:animate-panel-in lg:sticky lg:inset-auto lg:top-20 lg:z-auto lg:max-h-[calc(100vh-6rem)] lg:rounded-2xl lg:border lg:border-border-soft lg:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
      )}
    >
      <div key={`${props.selected.block}:${props.selected.node}`} className="animate-fade-up space-y-5">
        <header className="flex items-start gap-3">
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full text-white', `kind-${item.kind}`)} style={{ background: 'var(--kind)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {item.icon.map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{item.caption}</p>
            <h2 className="text-xl font-black leading-tight tracking-tight">{item.label}</h2>
            {item.ref && <code className="mt-1 block break-all font-mono text-xs font-semibold text-muted-foreground">{formatRef(item.ref)}</code>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={props.onClose} aria-label="Close details">
            <CloseIcon size={16} />
          </Button>
        </header>

        {item.desc && <p className="text-base font-bold leading-snug">{item.desc}</p>}

        {item.about && (
          <section className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">What it does</h3>
            <div className="prose-exl prose-panel">
              <Prose>{item.about}</Prose>
            </div>
          </section>
        )}

        {codes.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Key code</h3>
            {codes.map((code) => (
              <CodeCard key={formatRef(code.ref)} code={code} onOpen={props.onOpenCode} />
            ))}
          </section>
        )}

        {!item.about && codes.length === 0 && (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
            No more detail for this box yet.{props.onDeeper ? ' Ask a question below, or go deeper and Claude explains it.' : ''}
          </p>
        )}

        {drill && (
          <p className="text-sm font-semibold text-muted-foreground">
            Deeper scene: <span className="font-extrabold text-foreground">{drill}</span>
          </p>
        )}

        {props.onExplain && item.ref && (
          <ExplainButton
            doneKey={props.tourId}
            ask={props.onExplain}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-dark bg-primary-light/60 px-5 text-sm font-bold transition-all duration-150 hover:bg-primary-light active:scale-[0.98] disabled:opacity-80"
          >
            Explain this code step by step
          </ExplainButton>
        )}

        {(props.onDeeper || (props.onOpenCode && item.ref)) && (
          <div className="flex gap-2.5">
            {props.onOpenCode && item.ref && (
              <Button variant="secondary" className="flex-1" onClick={() => props.onOpenCode?.(item.ref as Ref)}>
                <CodeIcon size={16} />
                View code
              </Button>
            )}
            {props.onDeeper && (
              <Button variant="primary" className="flex-1" onClick={props.onDeeper}>
                Go deeper
                <ArrowRightIcon size={16} />
              </Button>
            )}
          </div>
        )}

        {props.onAsk && (
          <>
            <QuestionThread questions={questions} onFollow={props.onFollow ?? (() => {})} onTour={props.onTour} onOpenCode={props.onOpenCode} focus={props.focus} />
            <AskBox label={item.label} onAsk={props.onAsk} showSuggestions={questions.length === 0} />
          </>
        )}
      </div>
    </aside>
  );
}
