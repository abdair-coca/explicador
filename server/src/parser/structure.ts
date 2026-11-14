// <structure> (F25): a tree, an organization chart or a file system, drawn as itself, that changes state by state. The
// parser plays the changes and keeps every state on the block, so a change that would break the structure (a member
// without its parent, a member under its own child) is an error the agent fixes, and the viewer only draws.
import type { Element } from './reader.ts';
import { blockHead, catalog, checkId, checkMath, checkText, childElements, limits, narrationOf, optionalText, readAttrs, readDesc, readEnum, readRef, type Report } from './common.ts';
import {
  structureDirections,
  structureSides,
  type StructureBlock,
  type StructureChange,
  type StructureMember,
  type StructurePlace,
  type StructureSide,
} from './types.ts';

const spec = (name: string) => catalog[name] ?? { attrs: {} };
const offsetOf = (element: Element, attr: string): number => element.attrs.get(attr)?.offset ?? element.offset;

function readSide(value: string | undefined, element: Element, report: Report): StructureSide | undefined {
  if (value === undefined) return undefined;
  if ((structureSides as readonly string[]).includes(value)) return value as StructureSide;
  report(offsetOf(element, 'side'), `Unknown side "${value}"; use ${structureSides.join(', ')}`);
  return undefined;
}

export function buildStructure(element: Element, ordinal: number, report: Report): StructureBlock {
  const { id, title, attrs: a } = blockHead(element, spec('structure'), ordinal, report);
  const direction = readEnum(a.direction, structureDirections, 'down', 'direction', element, report);
  const children = childElements(element, spec('structure'), report);

  const members: StructureMember[] = [];
  const declared = new Map<string, StructurePlace>();
  for (const child of children.filter((c) => c.name === 'member')) {
    const m = readAttrs(child, spec('member'), report);
    if (!child.selfClosing) report(child.offset, '<member> must be self-closing: <member id="n30" label="30" parent="n50" side="left" />');
    if (m.id === undefined || m.label === undefined) continue;
    checkId(m.id, child, report);
    if (declared.has(m.id)) {
      report(child.offset, `Duplicate member id "${m.id}"`);
      continue;
    }
    const side = readSide(m.side, child, report);
    if (side && m.parent === undefined) report(offsetOf(child, 'side'), `"side" places a child left or right of its parent: give "${m.id}" a "parent"`);
    members.push({ id: m.id, label: checkText(m.label, 'label', limits.labelLength, child, report), ...readDesc(m.desc, child, report), ...readRef(m.ref, child, report) });
    declared.set(m.id, { id: m.id, ...(m.parent !== undefined ? { parent: m.parent } : {}), ...(side ? { side } : {}) });
  }
  for (const child of children.filter((c) => c.name === 'member')) {
    const parent = child.attrs.get('parent')?.value;
    const self = child.attrs.get('id')?.value;
    if (parent === undefined) continue;
    if (parent === self) report(offsetOf(child, 'parent'), `"${self}" cannot be its own parent`);
    else if (!declared.has(parent)) report(offsetOf(child, 'parent'), `"parent" refers to unknown member "${parent}"`);
  }

  const known = (ids: string[], attr: string, child: Element): string[] => {
    const unknown = ids.filter((item) => !declared.has(item));
    if (unknown.length > 0) report(offsetOf(child, attr), `"${attr}" refers to unknown member${unknown.length > 1 ? 's' : ''} ${unknown.map((item) => `"${item}"`).join(', ')}`);
    return ids.filter((item) => declared.has(item));
  };
  const list = (value: string | undefined): string[] => (value ?? '').split(/\s+/).filter(Boolean);

  const changes: StructureChange[] = [];
  const changeElements = children.filter((c) => c.name === 'change');
  for (const child of changeElements) {
    const c = readAttrs(child, spec('change'), report);
    const narration = narrationOf(child, report);
    checkMath(narration, child.offset, report);
    const move: StructurePlace[] = [];
    for (const token of list(c.move)) {
      const match = /^([^>\s]+)>([^:>\s]*)(?::([^:>\s]+))?$/.exec(token);
      if (!match) {
        report(offsetOf(child, 'move'), `"${token}" is not a move: write "a>b" (a goes under b), "a>b:left" or "a>" (a becomes a root)`);
        continue;
      }
      const [, member = '', parent = '', sideText] = match;
      const side = sideText === undefined ? undefined : readSide(sideText, child, report);
      if (sideText !== undefined && !parent) report(offsetOf(child, 'move'), `"${token}": a root has no side`);
      if (known([member, ...(parent ? [parent] : [])], 'move', child).length !== (parent ? 2 : 1)) continue;
      move.push({ id: member, ...(parent ? { parent } : {}), ...(side && parent ? { side } : {}) });
    }
    if (c.label === undefined) continue;
    const ask = optionalText(c.ask, 'ask', limits.questionLength, child, report);
    const change = {
      label: checkText(c.label, 'label', limits.labelLength, child, report),
      narration,
      ...(ask ? { ask } : {}),
      add: known(list(c.add), 'add', child),
      remove: known(list(c.remove), 'remove', child),
      move,
      mark: known(list(c.mark), 'mark', child),
    };
    if (change.add.length + change.remove.length + change.move.length + change.mark.length === 0) {
      report(child.offset, `<change> "${change.label}" changes nothing: give it "add", "remove", "move" or "mark"`);
    }
    changes.push(change);
  }

  if (members.length === 0) report(element.offset, '<structure> needs at least one <member>');
  if (members.length > limits.structureMembers) report(element.offset, `<structure> has more than ${limits.structureMembers} members`);
  if (changes.length > limits.structureChanges) report(element.offset, `<structure> has more than ${limits.structureChanges} changes`);

  const states = playChanges(members, declared, changes, (index, message) => report(changeElements[index]?.offset ?? element.offset, message));
  return { type: 'structure', id, title, direction, members, changes, states, ...readRef(a.ref, element, report) };
}

/**
 * Every state of the structure: the start (when some member is there before any change, or when nothing changes), then
 * one state after each change. A broken change is reported at its tag (`index`, or -1 for the start).
 */
function playChanges(
  members: StructureMember[],
  declared: Map<string, StructurePlace>,
  changes: StructureChange[],
  report: (index: number, message: string) => void,
): StructureBlock['states'] {
  const order = members.map((member) => member.id);
  const later = new Set(changes.flatMap((change) => change.add));
  const present = new Map<string, StructurePlace>();
  for (const member of order) {
    const place = declared.get(member);
    if (place && !later.has(member)) present.set(member, place);
  }
  const snapshot = (): StructurePlace[] => order.flatMap((member) => (present.has(member) ? [present.get(member) as StructurePlace] : []));
  const where = (index: number): string => (index < 0 ? 'At the start' : `After change ${index + 1} "${changes[index]?.label}"`);
  const check = (index: number): void => {
    for (const place of present.values()) {
      if (place.parent !== undefined && !present.has(place.parent)) report(index, `${where(index)}, "${place.id}" is there but its parent "${place.parent}" is not: add the parent first, or move "${place.id}"`);
    }
    const sides = new Set<string>();
    for (const place of present.values()) {
      if (!place.side || place.parent === undefined) continue;
      const key = `${place.parent}:${place.side}`;
      if (sides.has(key)) report(index, `${where(index)}, "${place.parent}" has two children on its ${place.side}`);
      sides.add(key);
    }
  };

  const states: StructureBlock['states'] = [];
  if (present.size > 0 || changes.length === 0) {
    check(-1);
    states.push({ members: snapshot(), mark: [], added: [] });
  }
  changes.forEach((change, index) => {
    for (const member of change.remove) {
      if (!present.delete(member)) report(index, `<change> "${change.label}" removes "${member}", which is not there`);
    }
    for (const member of change.add) {
      const place = declared.get(member);
      if (present.has(member)) report(index, `<change> "${change.label}" adds "${member}", which is already there`);
      else if (place) present.set(member, place);
    }
    for (const place of change.move) {
      if (!present.has(place.id)) {
        report(index, `<change> "${change.label}" moves "${place.id}", which is not there`);
        continue;
      }
      if (place.parent !== undefined && (place.parent === place.id || descends(present, place.parent, place.id))) {
        report(index, `<change> "${change.label}" moves "${place.id}" under "${place.parent}", which is "${place.id}" itself or below it`);
        continue;
      }
      present.set(place.id, place);
    }
    for (const member of change.mark) {
      if (!present.has(member)) report(index, `<change> "${change.label}" marks "${member}", which is not there`);
    }
    check(index);
    states.push({ members: snapshot(), mark: change.mark.filter((member) => present.has(member)), added: change.add, change: index });
  });
  return states;
}

/** Whether `member` sits somewhere below `ancestor`. */
function descends(present: Map<string, StructurePlace>, member: string, ancestor: string): boolean {
  const seen = new Set<string>();
  for (let at = present.get(member)?.parent; at !== undefined && !seen.has(at); at = present.get(at)?.parent) {
    if (at === ancestor) return true;
    seen.add(at);
  }
  return false;
}
