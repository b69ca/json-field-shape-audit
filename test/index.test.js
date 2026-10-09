import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { analyze } from '../src/index.js';
const cli = (input, args = []) => spawnSync(process.execPath, ['src/cli.js', ...args], { input, encoding: 'utf8' });
test('finds mixed types, nullability, and missing fields separately', () => {
  const r = analyze([{ id: 1, note: null }, { id: '1', note: 'ok', extra: true }]);
  assert.equal(r.findingCount, 3);
  assert.deepEqual(r.fields.find(f => f.path === '/id').findings, ['mixed-types']);
  assert.deepEqual(r.fields.find(f => f.path === '/note').findings, ['nullable-field']);
  assert.equal(r.fields.find(f => f.path === '/extra').missingRecords, 1);
});
test('array observations do not inflate record presence', () => {
  const r = analyze([{ items: [{ id: 1 }, { id: '2' }] }, { items: [] }]);
  const f = r.fields.find(f => f.path === '/items/*/id');
  assert.equal(f.observations, 2); assert.equal(f.recordsPresent, 1); assert.equal(f.missingRecords, 1);
});
test('escapes pointer keys and supports path selection', () => {
  const r = analyze([{ 'a/b~c': 1, other: 1 }, { 'a/b~c': 'x' }], { paths: ['/a~1b~0c'] });
  assert.equal(r.fieldCount, 1); assert.equal(r.findingCount, 1);
});
test('consistent and null-only fields are clean; values are omitted', () => {
  const r = analyze([{ a: 'secret-value', b: null }, { a: 'different', b: null }]);
  assert.equal(r.findingCount, 0); assert.equal(JSON.stringify(r).includes('secret-value'), false);
});
test('detects containers changing type and rejects non-object records', () => {
  assert.deepEqual(analyze([{ a: [] }, { a: {} }]).fields[0].findings, ['mixed-types']);
  for (const rows of [[], [null], [[]], [1]]) assert.throws(() => analyze(rows));
});
test('CLI supports stdin, JSON, path selection, and all exit codes', () => {
  assert.equal(cli('{"a":1}\n{"a":2}\n', ['--fail']).status, 0);
  const result = cli('{"a":1}\n\n{"a":"x"}\n', ['--json', '--fail', '--path', '/a']);
  assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).findingCount, 1);
  const malformed = cli('{"a":1}\n\ninvalid\n');
  assert.equal(malformed.status, 2); assert.match(malformed.stderr, /line 3/);
  assert.equal(cli('', ['--path']).status, 2); assert.equal(cli('', ['--wat']).status, 2);
  assert.equal(cli('', ['missing.jsonl']).status, 2); assert.equal(cli('', ['--help']).status, 0);
});
