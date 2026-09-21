// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { KanbanBoardData, KanbanCard, KanbanColumn } from './types';

function loadColumns(el: HTMLElement): KanbanColumn[] {
  if (el.dataset.columns === undefined) {
    return [
      { id: 'todo', title: 'Offen', cards: [] },
      { id: 'doing', title: 'In Bearbeitung', cards: [] },
      { id: 'done', title: 'Erledigt', cards: [] },
    ];
  }
  let names: unknown;
  try {
    names = JSON.parse(el.dataset.columns);
  } catch {
    throw new Error('Kanban: data-columns muss eine JSON-Liste von Spaltennamen sein.');
  }
  if (!Array.isArray(names) || names.length === 0 ||
      !names.every((name): name is string => typeof name === 'string' && name.trim().length > 0)) {
    throw new Error('Kanban: data-columns benötigt mindestens einen nicht leeren Spaltennamen.');
  }
  const ids = new Set<string>();
  return names.map((name) => {
    const title = name.trim();
    const id = title.toLowerCase();
    if (ids.has(id)) throw new Error('Kanban: Spaltennamen müssen eindeutig sein.');
    ids.add(id);
    return { id, title, cards: [] };
  });
}

/** Content lives in light DOM; workflow and presentation belong to the library. */
export function loadSourceData(el: HTMLElement): KanbanBoardData {
  const ids = new Set<string>();
  const cards: KanbanCard[] = Array.from(
    el.querySelectorAll<HTMLElement>(':scope > article[data-card]'),
    (article) => {
      const id = article.dataset.card?.trim();
      if (!id || ids.has(id)) {
        throw new Error('Kanban: data-card muss pro Board eindeutig und nicht leer sein.');
      }
      ids.add(id);
      const title = article.querySelector('h3')?.textContent?.trim();
      if (!title) throw new Error(`Kanban: Aufgabe "${id}" benötigt eine h3-Überschrift.`);
      const link = article.querySelector<HTMLAnchorElement>('a[href]');
      return {
        id,
        title,
        description: Array.from(article.querySelectorAll('p'), (p) => p.textContent?.replace(/\s+/g, ' ').trim())
          .filter(Boolean).join('\n\n'),
        link: link?.href,
        linkLabel: link?.textContent?.trim(),
      };
    }
  );
  if (!cards.length && (el.dataset.content || el.dataset.url || el.querySelector('script[type="application/json"]'))) {
    throw new Error('Kanban: JSON-Inhalte bitte durch article[data-card] ersetzen.');
  }
  const columns = loadColumns(el);
  columns[0]!.cards = cards;
  return { columns };
}
