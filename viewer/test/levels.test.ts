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
