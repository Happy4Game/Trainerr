# 0002 — SQLite sur le téléphone, sql.js dans le navigateur et les tests

Date : 2026-10-24 · Statut : accepté

## Décision

- Sur téléphone : plugin `@capacitor-community/sqlite` (SQLite natif).
- Dans le navigateur : le même plugin s'appuie sur `jeep-sqlite`, qui utilise `sql.js` (SQLite compilé en WebAssembly) et sauvegarde la base dans IndexedDB.
- Dans les tests : `sql.js` directement, en mémoire.
- Le code n'accède à la base que via l'interface `SqlDatabase` (`src/data/sqlite/database.ts`), avec deux implémentations interchangeables.

## Point d'attention : version de sql.js

`jeep-sqlite` 2.8.0 embarque le code JavaScript de sql.js, mais charge le fichier `sql-wasm.wasm` copié dans `public/assets`. Les deux doivent venir de la même version. Avec sql.js 1.13 ou plus récent, le navigateur échoue au démarrage (`LinkError: function import requires a callable`). **sql.js est donc figé en 1.12.0**, la dernière version compatible (vérifié le 2026-10-24). Le test de bout en bout `e2e/startup.spec.ts` détecte une régression.

## Conséquences

- Mettre à jour `jeep-sqlite` ou `sql.js` uniquement ensemble, puis relancer `npm run test:e2e`.
