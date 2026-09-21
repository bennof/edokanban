// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

import { h } from './dom';

const DRAG_THRESHOLD = 6; // px before a tap becomes a drag

interface DragState {
  pointerId: number;
  card: HTMLElement;
  startX: number;
  startY: number;
  moved: boolean;
  clone: HTMLElement | null;
  ghost: HTMLElement | null;
  offsetX: number;
  offsetY: number;
}

/** Wires up drag & drop for one board via the Pointer Events API — a single
 * code path for mouse, touch, and pen. Calls onChange with the DOM's
 * current column/card order after every completed drag. */
export function attachDragAndDrop(
  boardEl: HTMLElement,
  root: ShadowRoot,
  onChange: (columns: { id: string; cardIds: string[] }[]) => void
): void {
  let dragState: DragState | null = null;

  function findInsertionTarget(colBody: Element, y: number, ignoreEl: Element | null): Element | null {
    const cards = Array.from(colBody.children).filter(
      (c) => c !== ignoreEl && c.classList.contains('kanban-card') && !c.classList.contains('kanban-hidden')
    );
    for (const c of cards) {
      const rect = c.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) return c;
    }
    return null;
  }

  function updateCounts(): void {
    boardEl.querySelectorAll<HTMLElement>('.kanban-col').forEach((colEl) => {
      const body = colEl.querySelector('.kanban-col-body');
      const count = body?.querySelectorAll('.kanban-card:not(.kanban-hidden)').length ?? 0;
      const countEl = colEl.querySelector('.kanban-col-count');
      if (countEl) countEl.textContent = String(count);
    });
  }

  function currentColumnsFromDom(): { id: string; cardIds: string[] }[] {
    return Array.from(boardEl.querySelectorAll<HTMLElement>('.kanban-col')).map((colEl) => ({
      id: colEl.dataset.colId ?? '',
      cardIds: Array.from(colEl.querySelectorAll<HTMLElement>('.kanban-card')).map((c) => c.dataset.cardId ?? ''),
    }));
  }

  boardEl.addEventListener('pointerdown', (e) => {
    const card = (e.target as Element).closest?.('.kanban-card') as HTMLElement | null;
    if (!card) return;
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;

    dragState = {
      pointerId: e.pointerId,
      card,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      clone: null,
      ghost: null,
      offsetX: 0,
      offsetY: 0,
    };
  });

  boardEl.addEventListener('pointermove', (e) => {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (!dragState.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      // drag begins now
      dragState.moved = true;
      const rect = dragState.card.getBoundingClientRect();
      dragState.offsetX = dragState.startX - rect.left;
      dragState.offsetY = dragState.startY - rect.top;

      dragState.ghost = h('div', { class: 'kanban-dropghost' });
      dragState.ghost.style.height = `${rect.height}px`;
      dragState.card.parentNode?.insertBefore(dragState.ghost, dragState.card);

      const clone = dragState.card.cloneNode(true) as HTMLElement;
      clone.classList.add('kanban-drag-clone');
      clone.style.width = `${rect.width}px`;
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      root.appendChild(clone);
      dragState.clone = clone;

      dragState.card.classList.add('kanban-hidden');
      try {
        dragState.card.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }

    if (dragState.clone) {
      dragState.clone.style.left = `${e.clientX - dragState.offsetX}px`;
      dragState.clone.style.top = `${e.clientY - dragState.offsetY}px`;
    }

    const target = root.elementFromPoint(e.clientX, e.clientY);
    const colBody = target?.closest('.kanban-col-body') ?? null;

    boardEl.querySelectorAll('.kanban-col.kanban-drop-target').forEach((c) => c.classList.remove('kanban-drop-target'));

    if (colBody && dragState.ghost) {
      colBody.closest('.kanban-col')?.classList.add('kanban-drop-target');
      const before = findInsertionTarget(colBody, e.clientY, dragState.ghost);
      if (before) colBody.insertBefore(dragState.ghost, before);
      else colBody.appendChild(dragState.ghost);
    }
  });

  function endDrag(e: PointerEvent): void {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    const wasMoved = dragState.moved;

    if (wasMoved) {
      if (dragState.ghost?.parentNode) {
        dragState.ghost.parentNode.insertBefore(dragState.card, dragState.ghost);
        dragState.ghost.remove();
      }
      dragState.card.classList.remove('kanban-hidden');
      dragState.clone?.remove();
      boardEl.querySelectorAll('.kanban-col.kanban-drop-target').forEach((c) => c.classList.remove('kanban-drop-target'));
      updateCounts();
      onChange(currentColumnsFromDom());
    }

    try {
      dragState.card.releasePointerCapture(dragState.pointerId);
    } catch {
      /* noop */
    }
    dragState = null;
  }

  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);
}
