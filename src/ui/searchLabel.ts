import type { Directive } from 'vue';

/**
 * Ionic 9 names the inner field of `ion-searchbar` "search text" and its clear
 * button "reset", whatever the page says: screen readers then read English.
 * `v-search-label="{ field, clear }"` puts our own words on both.
 */
export interface SearchLabels {
  readonly field: string;
  readonly clear: string;
}

async function apply(el: HTMLIonSearchbarElement, labels: SearchLabels): Promise<void> {
  const input = await el.getInputElement();
  input.setAttribute('aria-label', labels.field);
  el.querySelector('.searchbar-clear-button')?.setAttribute('aria-label', labels.clear);
}

export const vSearchLabel: Directive<HTMLIonSearchbarElement, SearchLabels> = {
  mounted: (el, { value }) => void apply(el, value),
  updated: (el, { value }) => void apply(el, value),
};
