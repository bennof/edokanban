// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

export type { KanbanBoardData, KanbanCard, KanbanColumn, KanbanState, KanbanStateColumn } from './types';
export { init, initAll, refresh, reset, restore } from './board';

import { initAll } from './board';

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }
}
