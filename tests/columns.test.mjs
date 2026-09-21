// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

async function importSource(name) {
  const { outputFiles } = await build({
    entryPoints: [new URL(`../src/${name}.ts`, import.meta.url).pathname],
    bundle: true, write: false, platform: 'node', format: 'esm',
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}
const { loadSourceData } = await importSource('source');
const { mergeState, stateFromColumns, parseState, isNewer } = await importSource('storage');
const article = {
  dataset: { card: 'a1' },
  querySelector: (selector) => selector === 'h3' ? { textContent: 'Aufgabe' } : null,
  querySelectorAll: () => [],
};
function source(columns) {
  return loadSourceData({
    dataset: columns === undefined ? {} : { columns },
    querySelectorAll: () => [article],
  });
}

test('custom columns use configured names/order and put new tasks first', () => {
  const data = source('[" ToDo ", "Doing", "Check", "Done"]');
  assert.deepEqual(data.columns.map(c => c.title), ['ToDo', 'Doing', 'Check', 'Done']);
  assert.deepEqual(data.columns.map(c => c.id), ['todo', 'doing', 'check', 'done']);
  assert.deepEqual(data.columns.map(c => c.cards.length), [1, 0, 0, 0]);
  assert.deepEqual(source().columns.map(c => c.id), ['todo', 'doing', 'done']);
});

test('invalid column configurations fail instead of losing tasks', () => {
  for (const raw of ['', 'bad', '{}', '[]', '[1]', '[""]', '[" "]', '["Todo", " todo "]']) {
    assert.throws(() => source(raw), /Kanban:/);
  }
});

test('stored placement survives added/reordered columns; removed columns return tasks to first', () => {
  const original = source();
  original.columns[2].cards = original.columns[0].cards.splice(0);
  const stored = stateFromColumns(original.columns);
  const current = source('["ToDo", "Doing", "Check", "Done"]');
  const merged = mergeState(current, stored);
  assert.deepEqual(merged.map(c => c.id), ['todo', 'doing', 'check', 'done']);
  assert.equal(merged[3].cards[0].id, 'a1');
  const reordered = mergeState(source('["Done", "Check", "ToDo"]'), stored);
  assert.deepEqual(reordered.map(c => c.id), ['done', 'check', 'todo']);
  assert.equal(reordered[0].cards[0].id, 'a1');
  const removed = mergeState(source('["Eingang", "Prüfung"]'), stored);
  assert.deepEqual(removed.map(c => c.cards.length), [1, 0]);
});

test('state carries board id and a timestamp; parseState round-trips it', () => {
  const state = stateFromColumns(source().columns, 'board-x');
  assert.equal(state.id, 'board-x');
  assert.ok(!Number.isNaN(Date.parse(state.updatedAt)));
  assert.deepEqual(parseState(JSON.parse(JSON.stringify(state))), state);
});

test('parseState rejects malformed states and blanks unusable timestamps', () => {
  for (const bad of [null, 'x', {}, { columns: 'a' }, { columns: [{ id: 1, cardIds: [] }] }, { columns: [{ id: 'a', cardIds: [1] }] }]) {
    assert.throws(() => parseState(bad), /Kanban: state/);
  }
  assert.equal(parseState({ columns: [], updatedAt: 'not a date' }).updatedAt, '');
  assert.equal(parseState({ columns: [] }).id, '');
});

test('isNewer is strict and treats unknown timestamps as oldest', () => {
  assert.equal(isNewer('2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z'), true);
  assert.equal(isNewer('2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z'), false);
  assert.equal(isNewer('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'), false);
  assert.equal(isNewer('', '2026-01-01T00:00:00Z'), false);
  assert.equal(isNewer('2026-01-01T00:00:00Z', undefined), true);
});
