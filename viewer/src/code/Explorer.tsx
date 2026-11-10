// The explorer of the code window: the project's files as a tree. The open file is revealed and highlighted.
import { useEffect, useMemo, useState } from 'react';
import { ChevronRightIcon, FileIcon, FolderIcon } from '../components/icons';
import { cn } from '@/lib/utils';
import { buildTree, folderChain, type TreeNode } from './tree';

export function Explorer(props: { files: string[] | undefined; truncated: boolean; active: string | undefined; onOpen: (path: string) => void }) {
  const { files, active } = props;
  const tree = useMemo(() => (files ? buildTree(files) : []), [files]);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(active ? folderChain(active) : []));

  // A file opened from somewhere else (a box, a tour step) unfolds the folders that hold it.
  useEffect(() => {
    if (!active) return;
    setOpen((current) => {
      const chain = folderChain(active);
      return chain.every((folder) => current.has(folder)) ? current : new Set([...current, ...chain]);
    });
  }, [active]);

  const toggle = (path: string): void =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  const rows = (nodes: TreeNode[], depth: number): React.ReactNode =>
    nodes.map((node) => {
      const indent = { paddingLeft: `${10 + depth * 14}px` };
      if (node.type === 'folder') {
        const expanded = open.has(node.path);
        return (
          <li key={node.path}>
            <button
              type="button"
              style={indent}
              aria-expanded={expanded}
              onClick={() => toggle(node.path)}
              className="flex w-full items-center gap-1.5 py-[3px] pr-2 text-left text-[13px] font-bold text-[#e6eaf0] hover:bg-white/10"
            >
              <ChevronRightIcon size={13} className={cn('shrink-0 text-[#a3acb9] transition-transform duration-150', expanded && 'rotate-90')} />
              <FolderIcon size={14} className="shrink-0 text-primary" />
              <span className="truncate">{node.name}</span>
            </button>
            {expanded && <ul>{rows(node.children, depth + 1)}</ul>}
          </li>
        );
      }
      const current = node.path === active;
      return (
        <li key={node.path}>
          <button
            type="button"
            style={{ paddingLeft: `${10 + depth * 14 + 19}px` }}
            aria-current={current ? 'true' : undefined}
            title={node.path}
            onClick={() => props.onOpen(node.path)}
            className={cn(
              'flex w-full items-center gap-1.5 py-[3px] pr-2 text-left text-[13px] font-semibold hover:bg-white/10',
              current ? 'bg-primary/20 text-white shadow-[inset_3px_0_0_var(--primary)]' : 'text-[#c9d1dc]',
            )}
          >
            <FileIcon size={14} className="shrink-0 text-[#8b95a5]" />
            <span className="truncate">{node.name}</span>
          </button>
        </li>
      );
    });

  return (
    <nav aria-label="Project files" className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#161628]">
      <h3 className="px-3 pb-1.5 pt-2.5 text-[11px] font-extrabold uppercase tracking-wider text-[#8b95a5]">Explorer</h3>
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        {!files ? (
          <p className="px-3 text-xs font-semibold text-[#8b95a5]">Loading files…</p>
        ) : tree.length === 0 ? (
          <p className="px-3 text-xs font-semibold text-[#8b95a5]">No files to show.</p>
        ) : (
          <ul>{rows(tree, 0)}</ul>
        )}
        {props.truncated && <p className="px-3 pt-2 text-xs font-semibold text-[#8b95a5]">Only the first files are listed.</p>}
      </div>
    </nav>
  );
}
