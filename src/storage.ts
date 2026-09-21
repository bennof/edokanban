// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { KanbanBoardData, KanbanCard, KanbanColumn, KanbanState, KanbanStateColumn } from './types';

const STORAGE_PREFIX = 'kanban-state:';

function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function storageKey(el: HTMLElement): string {
  if (el.id) return STORAGE_PREFIX + el.id;
  const seed = JSON.stringify(Array.from(
    el.querySelectorAll<HTMLElement>(':scope > article[data-card]'),
    (article) => article.dataset.card
  ));
  return STORAGE_PREFIX + hashString(seed);
}

export function readLocalState(key: string): KanbanState | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as KanbanState) : null;
  } catch (e) {
    console.warn('Kanban: lokaler Status konnte nicht gelesen werden.', e);
    return null;
  }
}

/** Returns whether the state was actually saved. */
export function writeLocalState(key: string, state: KanbanState): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('Kanban: lokaler Status konnte nicht gespeichert werden.', e);
    return false;
  }
}

type ColumnLike = { id: string; cards: { id: string }[] };

/** A fresh state for the board `id`, stamped with the current time. */
export function createState(id: string, columns: KanbanStateColumn[]): KanbanState {
  return { version: 1, id, updatedAt: new Date().toISOString(), columns };
}

export function stateFromColumns(columns: ColumnLike[], id = ''): KanbanState {
  return createState(id, columns.map((c) => ({ id: c.id, cardIds: c.cards.map((card) => card.id) })));
}

/** Validates a state coming from outside (e.g. a server copy of what
 * 'edokanban-changed' delivered) and reduces it to the known fields. A
 * missing or unreadable updatedAt becomes '' — "unknown", treated as oldest. */
export function parseState(raw: unknown): KanbanState {
  const s = raw as Partial<KanbanState> | null;
  const valid = !!s && typeof s === 'object' && Array.isArray(s.columns) &&
    s.columns.every((c) => !!c && typeof c.id === 'string' && Array.isArray(c.cardIds) &&
      c.cardIds.every((cid) => typeof cid === 'string'));
  if (!valid) {
    throw new Error('Kanban: state must look like { columns: [{ id, cardIds: [...] }], updatedAt } — as delivered by edokanban-changed.');
  }
  return {
    version: 1,
    id: typeof s.id === 'string' ? s.id : '',
    updatedAt: typeof s.updatedAt === 'string' && !Number.isNaN(Date.parse(s.updatedAt)) ? s.updatedAt : '',
    columns: s.columns!.map((c) => ({ id: c.id, cardIds: c.cardIds.slice() })),
  };
}

/** Whether `incoming` is strictly newer than `local`. Unknown timestamps
 * count as oldest, so equal or missing ones never overwrite. */
export function isNewer(incoming: string, local: string | undefined): boolean {
  const time = (t: string | undefined): number => Date.parse(t ?? '') || 0;
  return time(incoming) > time(local);
}

/** Merges source data (truth for content) with locally stored state (truth
 * for card position/order). Cards removed from the source disappear; cards
 * newly added to the source are appended to their original column. */
export function mergeState(data: KanbanBoardData, state: KanbanState | null): KanbanColumn[] {
  const cardIndex = new Map<string, KanbanCard>();
  data.columns.forEach((col) => col.cards.forEach((card) => cardIndex.set(card.id, card)));

  if (!state || !Array.isArray(state.columns)) {
    return data.columns.map((col) => ({ id: col.id, title: col.title, cards: col.cards.slice() }));
  }

  const placed = new Set<string>();
  // Configuration owns column order; storage owns only card placement/order.
  const result: KanbanColumn[] = data.columns.map((col) => ({ ...col, cards: [] }));
  result.forEach((col) => {
    const stored = state.columns.find((candidate) => candidate?.id === col.id);
    if (!Array.isArray(stored?.cardIds)) return;
    stored.cardIds.forEach((cid) => {
      const card = cardIndex.get(cid);
      if (card && !placed.has(cid)) {
        col.cards.push(card);
        placed.add(cid);
      }
    });
  });

  // new cards (not yet placed) get appended to their original column
  data.columns.forEach((col) => {
    col.cards.forEach((card) => {
      if (!placed.has(card.id)) {
        const target = result.find((r) => r.id === col.id) ?? result[0];
        if (target) {
          target.cards.push(card);
          placed.add(card.id);
        }
      }
    });
  });

  return result;
}
