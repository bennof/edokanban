# edokanban

An embeddable Kanban board widget. Tasks are plain semantic HTML; a small script turns them into a board with columns and drag & drop, and remembers where you left each card. No framework, no build step for the page that uses it.

- **Content stays HTML.** Each task is an `<article>` in your page. The board is built from it in a shadow root and never touches your original markup — without JavaScript the plain task list is still there.
- **Mouse, touch and pen** through one code path (Pointer Events).
- **Progress is saved locally** (`localStorage`): only card IDs, columns and order — never content.
- **Themeable with CSS custom properties.** The widget's own styles are structural; every color is a `--kanban-*` token you can override from an ordinary stylesheet.
- **Small.** One ~14 kB script (minified), one tiny stylesheet, no dependencies.

Demos: [`examples/demo.html`](examples/demo.html) (English) and [`examples/demo_de.html`](examples/demo_de.html) (Deutsch) — a board that explains how to use itself. They load the files in `dist/`, so run `npm run build` first (or `npm run dev`, see [Development](#development)).

## Quick start

```html
<link rel="stylesheet" href="edokanban.css">
<link rel="stylesheet" href="theme.css"> <!-- optional: your --kanban-* values -->

<section id="my-board" class="kanban kanban-pending" data-type="kanban"
         data-columns='["To do", "Doing", "Done"]'>
  <article data-card="task-1">
    <h3>Write the report</h3>
    <p>Outline first, then the draft.</p>
    <a href="https://example.org/notes">Notes ↗</a>
  </article>
  <article data-card="task-2">
    <h3>Review the figures</h3>
  </article>
</section>

<script src="edokanban.global.js"></script>
```

> **Give every board a unique, stable `id`.** It is the reference under which the board's progress is stored in the browser (`localStorage` key `kanban-state:<id>`) — see [Saved progress](#saved-progress).

The script initializes every `[data-type="kanban"]` on the page automatically, even if it is loaded after `DOMContentLoaded`.

Load `edokanban.css` **before** the board markup. It hides `.kanban-pending` until the board is built, so the plain task list doesn't flash first (only when scripting is enabled — without JavaScript the list stays visible).

## Markup

| Element / attribute | Meaning |
| --- | --- |
| `section[data-type="kanban"]` | The board. Its `id` is the **reference for the local store** (`kanban-state:<id>`): keep it unique on your site and don't change it, or the saved progress is lost. |
| `data-columns='["A", "B"]'` | Optional. Column names, in order. Names must be non-empty and unique (case-insensitive). Without it, three default columns are used (currently the German *Offen*, *In Bearbeitung*, *Erledigt*). |
| `article[data-card="id"]` | One task, as a direct child of the board. The ID must be unique within the board and non-empty. |
| `h3` | The card title. Required. |
| `p` | Paragraphs become the description, shown with the card's *ⓘ Info* button. |
| `a[href]` | The first link becomes the card's link, keeping its link text. |

Notes:

- New cards start in the first column. Cards removed from the markup disappear from the saved state; new ones are appended to the first column.
- Column IDs are derived from the trimmed, lower-cased names. Reordering columns keeps cards where they are; renaming a column counts as removing and adding one.
- **Links:** a link to a place on the *same page* (`href="#section"`) scrolls there — it does not open a new tab or reload. Every other link opens in a new tab. With a card focused, <kbd>Enter</kbd> follows its link.
- Only text content is used; arbitrary HTML from the articles is not copied into the board.

If the configuration is invalid (for example a duplicate column name), the board is not built: the original task list stays visible together with an error message.

## Theming

The widget renders in a shadow root, but custom properties pass through it. Set the tokens on `:root` (or on any ancestor of the board):

```css
:root {
  --kanban-accent: #7c3aed;
  --kanban-col-bg: #f5f3ff;
  --kanban-color-1: #a78bfa;
}
```

Every token has a built-in fallback, so a theme file is optional. [`examples/theme.css`](examples/theme.css) lists all of them with their defaults, plus a dark variant, and is the reference.

| Token | Used for |
| --- | --- |
| `--kanban-font` | Font family |
| `--kanban-accent`, `--kanban-accent-contrast` | Focus rings, links, drop target, expanded info button and the text on it |
| `--kanban-col-bg`, `--kanban-card-bg`, `--kanban-card-border` | Column and card surfaces |
| `--kanban-btn-bg`, `--kanban-btn-hover-bg` | Info button |
| `--kanban-ghost-bg` | Placeholder shown while dragging |
| `--kanban-color-1` … `--kanban-color-5` | Accent line of the 1st … 5th column |
| `--kanban-text`, `--kanban-text-secondary`, `--kanban-text-muted` | Titles / descriptions / counters and hints |
| `--kanban-border`, `--kanban-error` | Lines, error message |
| `--kanban-shadow`, `--kanban-drag-shadow` | Card and dragged-card shadows |
| `--kanban-column-min-width` | Minimum column width before the board scrolls sideways (default `160px`) |

**Column colors.** Five are predefined, which is plenty for most boards. A sixth column or more has no accent line until you define it yourself, e.g. `--kanban-color-6: #14b8a6;`.

**Width.** The board fills its parent; CSS Grid divides that width evenly across the columns. If the columns would get narrower than `--kanban-column-min-width`, the board scrolls horizontally.

## JavaScript API

The global is `EdoKanban` (IIFE build); the ESM build exports the same functions.

```js
EdoKanban.initAll();               // find and initialize boards that aren't yet (e.g. after injecting markup)
await EdoKanban.init(element);     // initialize one board
await EdoKanban.refresh(element);  // re-read the HTML, keep saved progress
await EdoKanban.reset(element);    // delete saved progress, start over
await EdoKanban.restore(element, state, force = false); // load a saved state back in (see below)
```

Events bubble up from the board element:

| Event | `detail` |
| --- | --- |
| `edokanban-ready` | `{ columns }` — after the board is built |
| `edokanban-changed` | The board's saved state — see below |
| `edokanban-error` | `{ error }` |

### `edokanban-changed` and `restore()`

`edokanban-changed` fires whenever the card placement changes (after every completed drag, and after a reset), so your page can save it somewhere — a server, another tab, … The widget itself never talks to a backend. `restore()` is the counterpart: it loads such a saved state back into the board.

The event's `detail` **is the state**: the very same object that is written to `localStorage`, timestamp included.

```json
{
  "version": 1,
  "id": "my-board",
  "updatedAt": "2026-09-21T18:53:45.970Z",
  "columns": [
    { "id": "to do", "cardIds": ["task-2"] },
    { "id": "doing", "cardIds": ["task-1"] },
    { "id": "done",  "cardIds": [] }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `version` | Format version, currently `1` |
| `id` | The board element's `id` (`''` if it has none) |
| `updatedAt` | ISO 8601 time of the change. Set on every change, both in the event and in `localStorage`; it decides which copy is newer |
| `columns` | Per column: its ID and its cards' IDs, in order. No content — that always comes from the page |

```js
const board = document.getElementById('my-board');

// save: every change goes to your server
board.addEventListener('edokanban-changed', (e) => {
  fetch('/api/boards/' + e.detail.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(e.detail),
  });
});

// load: put the server's copy back into the board
const saved = await (await fetch('/api/boards/my-board')).json();
const applied = await EdoKanban.restore(board, saved);
```

`restore(element, state, force = false)`:

- Takes the object the event delivered — anything else (missing `columns`, wrong types) rejects with an error.
- Applies it only if it is **newer** than what is saved locally (by `updatedAt`), or if nothing is saved locally yet. An equal or older copy is ignored, so a stale server copy can't overwrite fresher local progress. With `force = true` it is applied regardless.
- Stores it locally (keeping its `updatedAt`), re-renders the board, and resolves to `true`; if it was not applied it resolves to `false`.
- Does **not** fire `edokanban-changed`: the data came from outside, so sending it back would only cause a loop.
- Cards in the state that no longer exist on the page are dropped; new cards on the page that the state doesn't mention go to the first column.

## Saved progress

**The board's `id` is the reference for the local store.** Progress is saved in `localStorage` under the key `kanban-state:<board id>`, and the same key is used to load it again. What follows from that:

- Two boards with the same `id` on the same site (origin) share — and overwrite — each other's progress, even on different pages. Make ids unique per site.
- Changing a board's `id` starts it from scratch; the old entry is left behind in `localStorage`.
- Without an `id`, the key is derived from the card IDs instead, and changes whenever cards are added or removed. Always set an `id`.
- Inside a board, the card IDs (`data-card`) and the column names identify what is stored; see [Markup](#markup).

The stored value is the state described [above](#edokanban-changed-and-restore): card IDs per column, in order, with the board `id` and an `updatedAt` timestamp — never content, which is always read fresh from the page.

The built-in *Reset* button (below the board; its label follows the page's `lang`) does the same as `EdoKanban.reset()`.

## Browser behavior and limitations

- Dragging uses Pointer Events with `touch-action: none` on cards, so mouse, touch and pen behave the same. Because of that, swiping *on a card* drags it instead of scrolling; to scroll the page or a wide board on a touch screen, swipe on a column header or in the gaps.
- **Moving cards is pointer-only, by design** — there is no keyboard alternative for drag & drop. Cards are focusable and <kbd>Enter</kbd> follows a card's link.
- Dragging does not auto-scroll a board that is wider than the screen: a card dropped outside a column lands where its placeholder last was (its original spot if it never left it). On small screens you can move a card into the neighboring column; further columns are reached step by step.
- Not implemented: multi-select, moving whole columns. There is no built-in server sync; use [`edokanban-changed` and `restore()`](#edokanban-changed-and-restore).

## Development

```
npm install
npm run dev        # watch + local server: http://127.0.0.1:8082/examples/demo.html
npm run build      # dist/edokanban.{esm.js,global.js,css} + type declarations
npm run typecheck
npm test
```

Sources are in [`src/`](src/): `source.ts` reads the markup, `storage.ts` merges it with saved state, `render.ts` and `style.ts` build the shadow DOM, `dragdrop.ts` handles dragging, `board.ts` ties it together.

## License

Copyright © 2026 Benjamin Benno Falkner. Released under the [MIT License](LICENSE); every source file carries an `SPDX-License-Identifier: MIT` header, and the built files in `dist/` a copyright banner.

## AI assistance

This project was developed with the help of AI. Parts of the code, tests and documentation were written with Claude (Anthropic) via Claude Code and with Codex (OpenAI), under the direction of the author, who is responsible for the result.
