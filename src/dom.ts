// Copyright (c) 2026 Benjamin Benno Falkner
// SPDX-License-Identifier: MIT

type ElementProps = Record<string, string | ((event: Event) => void) | undefined>;

/** Tiny hyperscript-style element builder — keeps rendering code free of
 * manual innerHTML string concatenation (and the injection risk that comes
 * with it) without pulling in a templating dependency. */
export function h(tag: string, props?: ElementProps, children?: (Node | null | undefined)[]): HTMLElement {
  const el = document.createElement(tag);
  if (props) {
    for (const key in props) {
      const value = props[key];
      if (value === undefined) continue;
      if (key === 'class') el.className = value as string;
      else if (key === 'text') el.textContent = value as string;
      else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2), value as EventListener);
      } else {
        el.setAttribute(key, value as string);
      }
    }
  }
  (children ?? []).forEach((c) => c && el.appendChild(c));
  return el;
}

export function emit<T>(el: Element, name: string, detail: T): void {
  el.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true }));
}
