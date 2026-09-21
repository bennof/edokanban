// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

/** Default column accents for the first five columns, overridable through
 * --kanban-color-1 … --kanban-color-5. Must stay in sync with theme.css. */
const DEFAULT_COLUMN_COLORS = ['#94a3b8', '#f59e0b', '#3b82f6', '#22c55e', '#a855f7'];

/** Value for a column's --col-accent by position (0-based). Columns beyond
 * the five defaults get no accent unless the host page defines the matching
 * token itself (--kanban-color-6, --kanban-color-7, …). */
export function columnAccent(index: number): string {
  return `var(--kanban-color-${index + 1}, ${DEFAULT_COLUMN_COLORS[index] ?? 'transparent'})`;
}

/** Injected as a <style> element into each board's shadow root — see
 * src/render.ts. Structural rules only: every colour and shadow is a
 * var(--kanban-*, fallback) reference and no token is declared here. The
 * token values live in the host page's stylesheet (see examples/theme.css
 * for the full list); custom properties pierce the shadow boundary, so a
 * plain stylesheet is all it takes to theme the widget. The fallbacks below
 * are the default look and must stay in sync with theme.css. */
export const KANBAN_CSS = `
  *, *::before, *::after { box-sizing:border-box; }
  .kanban-root { display:block; font-family: var(--kanban-font, system-ui, -apple-system, sans-serif); }
  .kanban-footer { display:flex; justify-content:flex-end; padding-top:0; }
  .kanban-reset { display:inline-flex; align-items:center; gap:0.2rem; padding:0.1rem 0.25rem; border:0; border-radius:6px; background:transparent; color:var(--kanban-text-muted, #8a8f98); font:inherit; font-size:0.7rem; cursor:pointer; }
  .kanban-reset:hover { color:var(--kanban-accent, #2563eb); }
  .kanban-reset:focus-visible { outline:2px solid var(--kanban-accent, #2563eb); outline-offset:2px; }
  .kanban-reset-icon { display:inline-block; font-size:0.95rem; line-height:1; transition:transform 0.25s ease; }
  .kanban-reset:hover .kanban-reset-icon { transform:rotate(90deg); }
  @media (prefers-reduced-motion: reduce) { .kanban-reset-icon { transition:none; } .kanban-reset:hover .kanban-reset-icon { transform:none; } }
  .kanban-board { display:grid; grid-template-columns:repeat(var(--kanban-columns, 3), minmax(var(--kanban-column-min-width, 160px), 1fr)); gap:1rem; overflow-x:auto; padding:0.5rem 0 0.15rem; -webkit-overflow-scrolling:touch; width:100%; max-width:100%; margin-inline:auto; }
  .kanban-col { background: var(--kanban-col-bg, #f4f5f7); border-radius:10px; min-width:0; display:flex; flex-direction:column; max-height:78vh; }
  .kanban-col-header { font-weight:600; padding:0.75rem 0.9rem 0.35rem; font-size:0.9rem; color:var(--kanban-text, #1a1a1a); display:flex; justify-content:space-between; align-items:center; border-top:3px solid var(--col-accent, transparent); border-radius:10px 10px 0 0; }
  .kanban-col-count { color:var(--kanban-text-muted, #8a8f98); font-weight:400; font-size:0.8rem; }
  .kanban-col-body { flex:1; overflow-y:auto; padding:0.4rem 0.6rem 0.75rem; min-height:48px; }
  .kanban-card { background: var(--kanban-card-bg, #fff); border-radius:8px; box-shadow:var(--kanban-shadow, 0 1px 2px rgba(0,0,0,.12)); padding:0.6rem 0.7rem; margin-bottom:0.5rem; cursor:grab; touch-action:none; user-select:none; -webkit-user-select:none; border:1px solid var(--kanban-card-border, rgba(0,0,0,.04)); }
  .kanban-card:focus-visible { outline:2px solid var(--kanban-accent, #2563eb); outline-offset:1px; }
  .kanban-card:active { cursor:grabbing; }
  .kanban-card.kanban-hidden { display:none; }
  .kanban-card-title { margin:0; font-size:0.88rem; font-weight:600; color:var(--kanban-text, #1a1a1a); margin-bottom:0.35rem; }
  .kanban-card-actions { display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; }
  .kanban-card-info-btn { display:inline-flex; align-items:center; justify-content:center; gap:0.3rem; width:auto; height:1.4rem; padding:0 0.5rem; border-radius:999px; border:1px solid var(--kanban-border, #d5d8dd); background:var(--kanban-btn-bg, #fff); color:var(--kanban-text-secondary, #5b5f66); font-size:0.74rem; font-weight:600; cursor:pointer; line-height:1; }
  .kanban-card-info-btn:hover, .kanban-card-info-btn:focus-visible { background:var(--kanban-btn-hover-bg, #f0f1f3); }
  .kanban-card-info-btn[aria-expanded="true"] { background: var(--kanban-accent, #2563eb); border-color: var(--kanban-accent, #2563eb); color:var(--kanban-accent-contrast, #fff); }
  .kanban-card-desc { white-space:pre-line; font-size:0.8rem; color:var(--kanban-text-secondary, #5b5f66); margin-top:0.5rem; padding-top:0.45rem; border-top:1px dashed var(--kanban-border, #d5d8dd); line-height:1.4; display:none; }
  .kanban-card-desc.kanban-open { display:block; }
  .kanban-card-link { font-size:0.78rem; color: var(--kanban-accent, #2563eb); text-decoration:none; font-weight:500; }
  .kanban-card-link:hover, .kanban-card-link:focus-visible { text-decoration:underline; }
  .kanban-dropghost { border:2px dashed var(--kanban-border, #d5d8dd); border-radius:8px; margin-bottom:0.5rem; background:var(--kanban-ghost-bg, rgba(148,163,184,.10)); box-sizing:border-box; }
  .kanban-drag-clone { position:fixed; top:0; left:0; pointer-events:none; z-index:9999; opacity:0.92; box-shadow:var(--kanban-drag-shadow, 0 8px 20px rgba(0,0,0,.25)); transform-origin:top left; }
  .kanban-col.kanban-drop-target { outline:2px solid var(--kanban-accent, #2563eb); outline-offset:-2px; }
  .kanban-empty { color:var(--kanban-text-muted, #8a8f98); font-size:0.85rem; padding:0.5rem; }
  .kanban-error { color:var(--kanban-error, #b42318); font-size:0.85rem; padding:0.5rem; }
`;
