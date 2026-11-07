/**
 * Text folding shared by the catalog cards (build time) and the toolbar (in the browser):
 * lower case, no accents, hyphens as spaces — so "funzioni", "Funzióni" and "unit circle"
 * match "Funzioni goniometriche" and the tag `unit-circle`. Kept free of imports so the
 * client script stays tiny.
 */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
