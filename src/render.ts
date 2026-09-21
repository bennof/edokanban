// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import type { KanbanCard, KanbanColumn } from './types';
import { h } from './dom';
import { KANBAN_CSS, columnAccent } from './style';

let cardUid = 0;

/** The #fragment of a link that points into the page the board sits on, else
 * null. Such links must scroll within the page — not open a new tab. */
function samePageHash(href: string): string | null {
  try {
    const target = new URL(href, location.href);
    const here = new URL(location.href);
    const samePage = target.origin === here.origin && target.pathname === here.pathname && target.search === here.search;
    return samePage && target.hash.length > 1 ? target.hash : null;
  } catch {
    return null;
  }
}

function renderCard(card: KanbanCard): HTMLElement {
  const children: HTMLElement[] = [h('h3', { class: 'kanban-card-title', text: card.title || '(ohne Titel)' })];
  const actions: HTMLElement[] = [];
  let descPanel: HTMLElement | null = null;

  if (card.description) {
    const panelId = `kanban-info-${cardUid++}`;
    descPanel = h('div', { class: 'kanban-card-desc', id: panelId, text: card.description });
    const panel = descPanel;

    const infoBtn = h('button', {
      type: 'button',
      class: 'kanban-card-info-btn',
      'aria-expanded': 'false',
      'aria-controls': panelId,
      text: 'ⓘ Info',
    });
    infoBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    infoBtn.addEventListener('click', () => {
      const open = panel.classList.toggle('kanban-open');
      infoBtn.setAttribute('aria-expanded', String(open));
    });
    actions.push(infoBtn);
  }

  const hash = card.link ? samePageHash(card.link) : null;
  if (card.link) {
    const a = h('a', {
      class: 'kanban-card-link',
      href: hash ?? card.link,
      target: hash ? undefined : '_blank',
      rel: hash ? undefined : 'noopener',
      text: card.linkLabel || 'Material ↗',
    });
    // Prevents a click on the link from also starting a drag.
    a.addEventListener('pointerdown', (e) => e.stopPropagation());
    actions.push(a);
  }

  if (actions.length) children.push(h('div', { class: 'kanban-card-actions' }, actions));
  if (descPanel) children.push(descPanel);

  const el = h('article', { class: 'kanban-card', 'data-card-id': card.id, tabindex: '0', role: 'listitem' }, children);

  // Only react when the card itself (not a nested button/link) has focus, so
  // their own keyboard handling doesn't also fire.
  el.addEventListener('keydown', (e) => {
    if (e.target !== el) return;
    if ((e.key === 'Enter' || e.key === ' ') && card.link) {
      e.preventDefault();
      if (hash) location.hash = hash;
      else window.open(card.link, '_blank', 'noopener');
    }
  });

  return el;
}

function renderColumn(col: KanbanColumn, index: number): HTMLElement {
  const header = h('div', { class: 'kanban-col-header' }, [
    h('span', { text: col.title || col.id }),
    h('span', { class: 'kanban-col-count', text: String(col.cards.length) }),
  ]);
  const body = h('div', { class: 'kanban-col-body', 'data-col-id': col.id, role: 'list' });
  col.cards.forEach((card) => body.appendChild(renderCard(card)));

  return h('div', { class: 'kanban-col', 'data-col-id': col.id, style: `--col-accent:${columnAccent(index)}` }, [
    header,
    body,
  ]);
}

/** (Re-)renders the full board into root, returning the board element that
 * drag & drop attaches to. */
export function renderBoard(root: ShadowRoot, columns: KanbanColumn[], onReset: () => Promise<void>): HTMLElement {
  root.innerHTML = '';
  const style = h('style', { text: KANBAN_CSS });
  const board = h('div', { class: 'kanban-board' });
  board.style.setProperty('--kanban-columns', String(columns.length));
  columns.forEach((col, index) => board.appendChild(renderColumn(col, index)));
  const lang = root.host.closest('[lang]')?.getAttribute('lang')?.trim() ?? '';
  const resetLabel = /^de(?:-|$)/i.test(lang) ? 'Zurücksetzen' : 'Reset';
  const resetButton = h('button', {
    type: 'button',
    class: 'kanban-reset',
    title: resetLabel,
  }, [
    h('span', { class: 'kanban-reset-icon', 'aria-hidden': 'true', text: '↻' }),
    h('span', { text: resetLabel }),
  ]) as HTMLButtonElement;
  resetButton.addEventListener('click', async () => {
    resetButton.disabled = true;
    try {
      await onReset();
      // Reset rebuilds the shadow tree; keep keyboard focus on the new button.
      root.querySelector<HTMLButtonElement>('.kanban-reset')?.focus({ preventScroll: true });
    } finally {
      resetButton.disabled = false;
    }
  });
  const footer = h('div', { class: 'kanban-footer' }, [resetButton]);
  const wrapper = h('div', { class: 'kanban-root' }, [board, footer]);
  root.appendChild(style);
  root.appendChild(wrapper);
  return board;
}
