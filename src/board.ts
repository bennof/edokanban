// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { KanbanColumn, KanbanState } from './types';
import { h, emit } from './dom';
import { KANBAN_CSS } from './style';
import { loadSourceData } from './source';
import { createState, isNewer, mergeState, parseState, readLocalState, stateFromColumns, storageKey, writeLocalState } from './storage';
import { renderBoard } from './render';
import { attachDragAndDrop } from './dragdrop';

const initializing = new WeakSet<HTMLElement>();

/** Initializes (or re-initializes) one board element: loads its source data,
 * merges it with any locally persisted card order, and renders into a
 * shadow root so the widget's styling can't leak into or be broken by the
 * host page. Reuses an existing shadow root on re-init (refresh/reset) —
 * calling attachShadow() twice on the same element throws. */
export async function init(el: HTMLElement): Promise<void> {
  await build(el);
}

/** Does the work of init(); resolves to the columns now shown, or null if
 * the board was already initializing or failed to build. */
async function build(el: HTMLElement): Promise<KanbanColumn[] | null> {
  if (initializing.has(el)) return null;
  initializing.add(el);

  try {
    const data = loadSourceData(el);
    const key = storageKey(el);
    const stored = readLocalState(key);
    const columns = mergeState(data, stored);

    const root = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
    const boardEl = renderBoard(root, columns, () => reset(el));

    attachDragAndDrop(boardEl, root, (domColumns) => {
      // The DOM's order/assignment is the new state; the event detail is that
      // very object, the one saved locally.
      const state = createState(el.id, domColumns);
      writeLocalState(key, state);
      emit(el, 'edokanban-changed', state);
    });

    el.dataset.kanbanInitialized = 'true';
    el.classList.remove('kanban-pending');
    emit(el, 'edokanban-ready', { columns });
    return columns;
  } catch (err) {
    console.error(err);
    delete el.dataset.kanbanInitialized;
    el.classList.remove('kanban-pending');
    const root = el.shadowRoot ?? el;
    if (el.shadowRoot) {
      root.replaceChildren(document.createElement('slot'));
    } else {
      el.querySelector(':scope > .kanban-error')?.remove();
    }
    if (el.shadowRoot) root.appendChild(h('style', { text: KANBAN_CSS }));
    root.appendChild(
      h('div', {
        class: 'kanban-error',
        text: `Kanban-Board konnte nicht geladen werden: ${err instanceof Error ? err.message : String(err)}`,
      })
    );
    emit(el, 'edokanban-error', { error: err });
    return null;
  } finally {
    initializing.delete(el);
  }
}

/** Reloads from the source, keeping the locally persisted card order. */
export async function refresh(el: HTMLElement): Promise<void> {
  await init(el);
}

/** Clears the locally persisted card order and re-renders straight from the
 * source. Emits 'edokanban-changed' with the fresh initial state, so a
 * server copy can be reset too. */
export async function reset(el: HTMLElement): Promise<void> {
  try {
    localStorage.removeItem(storageKey(el));
  } catch (error) {
    console.warn('Kanban: lokaler Status konnte nicht gelöscht werden.', error);
  }
  const columns = await build(el);
  if (columns) emit(el, 'edokanban-changed', stateFromColumns(columns, el.id));
}

/** Loads a saved state into the board — the counterpart to saving it
 * elsewhere via 'edokanban-changed'. Takes the object that event delivered
 * (e.g. fetched back from a server). Applied only if it is newer than the
 * state saved locally (by updatedAt) or nothing is saved yet; `force` applies
 * it regardless. Stores it locally with its own timestamp, re-renders, and
 * resolves to whether it was applied. Does not emit 'edokanban-changed' —
 * the data came from outside, echoing it back would only loop. Rejects if
 * `data` isn't a valid state. */
export async function restore(el: HTMLElement, data: unknown, force = false): Promise<boolean> {
  const incoming = parseState(data);
  const key = storageKey(el);
  const local = readLocalState(key);
  if (!force && local && !isNewer(incoming.updatedAt, local.updatedAt)) return false;

  const state: KanbanState = { ...incoming, id: el.id, updatedAt: incoming.updatedAt || new Date().toISOString() };
  if (!writeLocalState(key, state)) return false;
  await build(el);
  return true;
}

export function initAll(selector = '[data-type="kanban"]', root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (!el.dataset.kanbanInitialized) void init(el);
  });
}
