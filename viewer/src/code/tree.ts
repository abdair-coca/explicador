// The explorer's tree, built from the flat list of project paths the server sends.

export interface TreeFile {
  type: 'file';
  name: string;
  path: string;
}

export interface TreeFolder {
  type: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeFolder;

/** Folders first, then files, each sorted by name. */
export function buildTree(paths: readonly string[]): TreeNode[] {
  const root: TreeFolder = { type: 'folder', name: '', path: '', children: [] };
  const folders = new Map<string, TreeFolder>([['', root]]);
  for (const path of paths) {
    const parts = path.split('/');
    let parent = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const folderPath = parts.slice(0, i + 1).join('/');
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = { type: 'folder', name: parts[i] ?? '', path: folderPath, children: [] };
        folders.set(folderPath, folder);
        parent.children.push(folder);
      }
      parent = folder;
    }
    parent.children.push({ type: 'file', name: parts.at(-1) ?? path, path });
  }
  sortFolder(root);
  return root.children;
}

function sortFolder(folder: TreeFolder): void {
  folder.children.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, 'en') : a.type === 'folder' ? -1 : 1));
  for (const child of folder.children) if (child.type === 'folder') sortFolder(child);
}

/** The folders that hold a file, outermost first: `src/auth/a.js` gives `src`, `src/auth`. */
export function folderChain(path: string): string[] {
  const parts = path.split('/').slice(0, -1);
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}
