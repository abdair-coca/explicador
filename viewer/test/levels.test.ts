import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ArchBlock } from '../../server/src/scene.ts';
import { archLevel, groupPath } from '../src/layout/levels.ts';

const block: ArchBlock = {
  type: 'arch',
  id: 'a',
  title: 'Shop',
  nodes: [
    { id: 'form', label: 'Form', kind: 'ui' },
    { id: 'routes', label: 'Routes', kind: 'service', group: 'auth' },
    { id: 'service', label: 'Service', kind: 'module', group: 'core' },
    { id: 'hash', label: 'Hash', kind: 'function', group: 'core' },
    { id: 'db', label: 'DB', kind: 'store' },
  ],
  groups: [
    { id: 'auth', label: 'Auth', kind: 'service' },
    { id: 'core', label: 'Core', kind: 'module', parent: 'auth' },
  ],
  edges: [
    { from: 'form', to: 'routes', label: 'POST' },
    { from: 'routes', to: 'service' },
    { from: 'service', to: 'hash' },
    { from: 'service', to: 'db', label: 'find' },
    { from: 'hash', to: 'db', label: 'other' },
  ],
  drills: [{ node: 'form', topic: 'login form' }],
};

describe('archLevel', () => {
  it('collapses groups at the top and merges their edges', () => {
    const level = archLevel(block);
    assert.deepEqual(
      level.nodes.map((n) => [n.id, n.role, n.members ?? null, n.drill ?? null]),
      [
        ['form', 'node', null, 'login form'],
        ['db', 'node', null, null],
        ['auth', 'group', 3, null],
      ],
    );
    assert.deepEqual(level.edges, [
      { id: 'form->auth', from: 'form', to: 'auth', label: 'POST' },
      { id: 'auth->db', from: 'auth', to: 'db' },
    ]);
  });

  it('shows the inside of a group with outside endpoints as context', () => {
    const level = archLevel(block, 'auth');
    assert.deepEqual(
      level.nodes.map((n) => [n.id, n.role]),
      [
        ['routes', 'node'],
        ['core', 'group'],
        ['ctx:form', 'context'],
        ['ctx:db', 'context'],
      ],
    );
    assert.deepEqual(
      level.edges.map((e) => e.id),
      ['ctx:form->routes', 'routes->core', 'core->ctx:db'],
    );
  });

  it('opens nested groups and reports their path', () => {
    const level = archLevel(block, 'core');
    assert.deepEqual(
      level.nodes.map((n) => n.id),
      ['service', 'hash', 'ctx:routes', 'ctx:db'],
    );
    assert.deepEqual(groupPath(block, 'core'), ['auth', 'core']);
  });
});

describe('dataView and stateView', () => {
  it('turns entities into field tables and relations into cardinality edges', async () => {
    const { dataView } = await import('../src/layout/levels.ts');
    const level = dataView({
      type: 'data',
      id: 'd',
      title: 'D',
      entities: [
        { id: 'u', label: 'User', fields: [{ name: 'id', key: 'pk' }] },
        { id: 's', label: 'Session', fields: [] },
      ],
      relations: [
        { from: 'u', to: 's', card: '1-n', label: 'logs in' },
        { from: 's', to: 'u', card: 'n-1' },
      ],
      drills: [{ node: 's', topic: 'sessions' }],
    });
    assert.deepEqual(
      level.nodes.map((n) => [n.id, n.shape, n.fields?.length, n.drill ?? null]),
      [
        ['u', 'entity', 1, null],
        ['s', 'entity', 0, 'sessions'],
      ],
    );
    assert.deepEqual(
      level.edges.map((e) => e.label),
      ['logs in (1 : n)', 'n : 1'],
    );
  });

  it('adds a start dot before the initial state and marks final states', async () => {
    const { stateView, START_ID } = await import('../src/layout/levels.ts');
    const level = stateView({
      type: 'state',
      id: 's',
      title: 'S',
      states: [
        { id: 'a', label: 'A', role: 'initial' },
        { id: 'z', label: 'Z', role: 'final' },
      ],
      transitions: [{ from: 'a', to: 'z', event: 'go' }],
      walk: [],
      drills: [],
    });
    assert.deepEqual(
      level.nodes.map((n) => [n.id, n.shape, n.role ?? null, n.final ?? false]),
      [
        [START_ID, 'start', 'context', false],
        ['a', 'state', null, false],
        ['z', 'state', null, true],
      ],
    );
    assert.deepEqual(
      level.edges.map((e) => [e.id, e.from, e.to, e.label ?? null]),
      [
        ['start', START_ID, 'a', null],
        ['t0', 'a', 'z', 'go'],
      ],
    );
  });
});
