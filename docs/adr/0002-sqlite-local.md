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

## Correctif de jeep-sqlite (2026-10-25)

Dans le navigateur, jeep-sqlite enregistrait la base en deux temps : suppression de l'ancienne copie dans IndexedDB, puis écriture de la nouvelle. Un rechargement de la page entre les deux faisait **perdre toute la base** (constaté par un test de bout en bout, environ 1 fois sur 5). Le fichier `patches/jeep-sqlite+2.8.0.patch` (appliqué par `patch-package` à chaque `npm install`) supprime l'étape de suppression : `setItem` remplace la valeur de façon atomique. Au pire, la toute dernière écriture est perdue, jamais la base. Sur téléphone, la base SQLite native n'utilise pas ce code. À signaler en amont (projet jeep-sqlite) et à retirer quand une version corrigée sortira.

En complément, l'écran de séance n'affiche un changement du plan qu'une fois celui-ci enregistré.
