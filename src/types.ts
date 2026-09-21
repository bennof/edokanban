// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  link?: string;
  linkLabel?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanBoardData {
  columns: KanbanColumn[];
}

/** One column of a saved state: which cards it holds, in order. */
export interface KanbanStateColumn {
  id: string;
  cardIds: string[];
}

/** A board's saved state: card placement/order only, never content. This one
 * object is what goes into localStorage (under 'kanban-state:<id>'), what
 * 'edokanban-changed' carries as its detail, and what restore() takes back —
 * so a server copy is just this JSON, timestamp included. */
export interface KanbanState {
  version: number;
  /** The board element's id ('' if it has none). */
  id: string;
  /** ISO 8601 time of the last change; decides which copy is newer. */
  updatedAt: string;
  columns: KanbanStateColumn[];
}
