// Zoom levels of an <arch>: what is visible at the top or inside one <group>.
// Pure functions so they can be tested without a browser.
import type { ArchBlock, Drill, SceneNode } from '../../../server/src/scene.ts';

export interface ViewNode extends SceneNode {
  /** `group`: a collapsed <group> (zooms in). `context`: a node outside the open group, shown faded. */
  role?: 'node' | 'group' | 'context';
  /** Nodes inside a collapsed group, at any depth. */
  members?: number;
  /** Topic of the deeper scene when the node has a <drill>. */
  drill?: string;
}

export interface ViewEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface Level {
  nodes: ViewNode[];
  edges: ViewEdge[];
}

const CONTEXT = 'ctx:';

export function withDrills(nodes: SceneNode[], drills: Drill[]): ViewNode[] {
  return nodes.map((node) => {
    const drill = drills.find((d) => d.node === node.id);
    return drill ? { ...node, drill: drill.topic } : node;
  });
}

/** Ids of the groups from the top down to `groupId` (inclusive). */
export function groupPath(block: ArchBlock, groupId: string): string[] {
  const path: string[] = [];
  let current: string | undefined = groupId;
  while (current) {
    path.unshift(current);
    current = block.groups.find((g) => g.id === current)?.parent;
  }
  return path;
}

export function archLevel(block: ArchBlock, groupId?: string): Level {
  const parentOf = new Map<string, string | undefined>();
  for (const node of block.nodes) parentOf.set(node.id, node.group);
  for (const group of block.groups) parentOf.set(group.id, group.parent);

  /** The item visible at this level that contains `id`, or undefined when `id` is outside the open group. */
  const representative = (id: string): string | undefined => {
    let current: string | undefined = id;
    while (current !== undefined) {
      const parent = parentOf.get(current);
      if (parent === groupId) return current;
      current = parent;
    }
    return undefined;
  };
  const countMembers = (id: string): number =>
    block.nodes.filter((node) => {
      let parent = node.group;
      while (parent) {
        if (parent === id) return true;
        parent = parentOf.get(parent);
      }
      return false;
    }).length;

  const nodes: ViewNode[] = [
    ...block.groups
      .filter((g) => g.parent === groupId)
      .map((g): ViewNode => ({ id: g.id, label: g.label, kind: g.kind, role: 'group', members: countMembers(g.id) })),
    ...withDrills(block.nodes, block.drills)
      .filter((n) => n.group === groupId)
      .map((n): ViewNode => ({ ...n, role: 'node' })),
  ];
  // Keep the document order of nodes and groups as they were declared.
  const order = [...block.nodes.map((n) => n.id), ...block.groups.map((g) => g.id)];
  nodes.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const labels = new Map<string, Set<string | undefined>>();
  const edges = new Map<string, ViewEdge>();
  const contexts = new Map<string, ViewNode>();
  for (const edge of block.edges) {
    let from = representative(edge.from);
    let to = representative(edge.to);
    if (from === undefined && to === undefined) continue;
    if (from === undefined) from = context(edge.from);
    if (to === undefined) to = context(edge.to);
    if (from === to) continue;
    const id = `${from}->${to}`;
    if (!labels.has(id)) labels.set(id, new Set());
    labels.get(id)?.add(edge.label);
    edges.set(id, { id, from, to });
  }
  for (const [id, edge] of edges) {
    const set = labels.get(id);
    const only = set && set.size === 1 ? [...set][0] : undefined;
    if (only) edge.label = only;
  }
  return { nodes: [...nodes, ...contexts.values()], edges: [...edges.values()] };

  function context(id: string): string {
    const source = block.nodes.find((n) => n.id === id) ?? block.groups.find((g) => g.id === id);
    const key = `${CONTEXT}${id}`;
    if (source && !contexts.has(key)) {
      contexts.set(key, { id: key, label: source.label, kind: source.kind, role: 'context' });
    }
    return key;
  }
}
