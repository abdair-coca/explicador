import assert from 'node:assert/strict';
import { readFileSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { grepImports, resolveImport } from '../src/index/imports.ts';
import { describeIndex, ensureIndex } from '../src/index/index.ts';
import { tempProject, writeFiles } from './helpers.ts';

describe('grepImports', () => {
  it('finds JavaScript and TypeScript imports', () => {
    const source = [
      "import express from 'express';",
      "import { a, b } from './a.js';",
      "export * from \"./b\";",
      "import './side-effect.css';",
      "const c = require('../c');",
      "const d = await import('./d.ts');",
      "// import nothing",
    ].join('\n');
    assert.deepEqual(grepImports('src/x.ts', source), [
      'express',
      './a.js',
      './b',
      './side-effect.css',
      '../c',
      './d.ts',
    ]);
  });

  it('finds imports in other languages', () => {
    assert.deepEqual(grepImports('app/x.py', 'import os\nfrom .auth import login\nfrom db.users import find\n'), [
      'os',
      '.auth',
      'db.users',
    ]);
    assert.deepEqual(
      grepImports('main.go', 'package main\n\nimport (\n\t"fmt"\n\tauth "example.com/app/auth"\n)\n\nvar x = []string{\n\t"not-an-import",\n}\n'),
      ['fmt', 'example.com/app/auth'],
    );
    assert.deepEqual(grepImports('lib.rs', 'use crate::auth::login;\nmod db;\n'), ['crate::auth::login', 'db']);
    assert.deepEqual(grepImports('A.java', 'import java.util.List;\nimport static a.b.C.d;\n'), ['java.util.List', 'a.b.C.d']);
    assert.deepEqual(grepImports('a.c', '#include <stdio.h>\n#include "auth.h"\n'), ['stdio.h', 'auth.h']);
    assert.deepEqual(grepImports('a.rb', "require 'json'\nrequire_relative 'auth'\n"), ['json', 'auth']);
  });

  it('ignores files without known import syntax', () => {
    assert.deepEqual(grepImports('README.md', 'import x from "y"'), []);
  });
});

describe('resolveImport', () => {
  const root = tempProject({
    'src/api/routes.js': '',
    'src/auth/service.ts': '',
    'src/db/index.js': '',
    'app/auth/login.py': '',
  });

  it('maps relative specifiers to project files', () => {
    assert.equal(resolveImport(root, 'src/api/routes.js', '../auth/service.js'), 'src/auth/service.ts');
    assert.equal(resolveImport(root, 'src/api/routes.js', '../db'), 'src/db/index.js');
    assert.equal(resolveImport(root, 'app/auth/__init__.py', '.login'), 'app/auth/login.py');
  });

  it('leaves packages and unknown or outside paths unresolved', () => {
    assert.equal(resolveImport(root, 'src/api/routes.js', 'express'), undefined);
    assert.equal(resolveImport(root, 'src/api/routes.js', './missing'), undefined);
    assert.equal(resolveImport(root, 'src/a.js', '../../outside'), undefined);
  });
});

describe('ensureIndex', () => {
  it('writes the tree and the import graph, skipping dependencies, dot folders and .gitignore names', () => {
    const root = tempProject({
      '.gitignore': 'secrets.env\n*.log\n',
      'src/index.js': "import { login } from './auth.js';\n",
      'src/auth.js': "import bcrypt from 'bcrypt';\n",
      'node_modules/bcrypt/index.js': '',
      '.git/HEAD': '',
      'debug.log': '',
      'secrets.env': '',
      'README.md': '# app\n',
    });
    const result = ensureIndex(root);
    assert.equal(result.status, 'created');
    assert.equal(result.tree, 'README.md\nsrc/auth.js\nsrc/index.js');
    assert.equal(result.imports, 'src/auth.js -> bcrypt\nsrc/index.js -> src/auth.js');
    assert.equal(readFileSync(join(root, '.explicador/index/tree.txt'), 'utf8'), `${result.tree}\n`);
    assert.equal(readFileSync(join(root, '.explicador/index/imports.txt'), 'utf8'), `${result.imports}\n`);
    assert.match(describeIndex(result), /Index created: 3 files, 3 new or changed, 0 removed/);
  });

  it('only re-reads new, changed or removed files', () => {
    const root = tempProject({ 'a.js': "import './b.js';\n", 'b.js': '' });
    assert.equal(ensureIndex(root).status, 'created');
    assert.equal(ensureIndex(root).status, 'unchanged');

    writeFiles(root, { 'b.js': "import './c.js';\n", 'c.js': '' });
    utimesSync(join(root, 'b.js'), new Date(), new Date(Date.now() + 5000));
    const updated = ensureIndex(root);
    assert.equal(updated.status, 'updated');
    assert.equal(updated.changed, 2);
    assert.equal(updated.imports, 'a.js -> b.js\nb.js -> c.js');

    rmSync(join(root, 'c.js'));
    const removed = ensureIndex(root);
    assert.equal(removed.removed, 1);
    assert.equal(removed.imports, 'a.js -> b.js\nb.js -> ./c.js');
  });
});
