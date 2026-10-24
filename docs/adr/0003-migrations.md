# 0003 — Migrations de schéma versionnées

Date : 2026-10-24 · Statut : accepté

## Décision

- Le schéma est décrit par une liste de migrations numérotées 1, 2, 3… (`src/data/sqlite/migrations.ts`).
- Une migration publiée n'est **jamais modifiée** : tout changement de schéma est une nouvelle migration.
- La version courante est stockée dans la table `schema_version`, et non dans `PRAGMA user_version`, que le plugin Capacitor SQLite utilise pour son propre mécanisme de mise à jour.
- Chaque migration s'exécute dans une transaction avec l'écriture de sa version : en cas d'erreur, la base reste à la version précédente, intacte.
- Une base plus récente que l'appli est refusée, avec un message demandant de mettre l'appli à jour.

## Tests

- Base vide → schéma complet.
- Pour chaque version N, `tests/fixtures/db/vN.sql` est une base d'exemple **figée**, remplie avec des séances réelles. Le test vérifie que la migration jusqu'à la dernière version conserve toutes ses données.
- À chaque nouvelle migration, ajouter le fichier `vN.sql` correspondant.

## Écarts avec le cahier des charges

- Noms de tables et de colonnes en anglais (règle « noms en anglais dans le code ») : `seance` → `session`, `serie` → `set_log` (`set` est un mot réservé SQL), `machine_salle` → `gym_machine`, `reference` → `reference_load`, `disponibilite` → `availability`.
- La table `note_seance` n'est pas créée : la colonne `session.note` couvre déjà le besoin.
