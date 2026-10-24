# 0005 — Catalogue des machines

Date : 2026-10-24 · Statut : accepté

## Sources

- **Exercices** : [free-exercise-db](https://github.com/yuhonas/free-exercise-db), domaine public (Unlicense), figé au commit `f00c92c`. `scripts/update-free-exercise-db.mjs` garde les exercices de musculation avec du matériel de salle (480) et écrit `src/data/catalog/free-exercise-db.json`, versionné dans le dépôt : l'appli et les tests fonctionnent hors ligne.
- **Images** : non reprises. Leur licence doit être vérifiée une à une (SPEC.md).
- **Silhouettes** : tracés SVG de [MuscleMapJS](https://github.com/abdofallah/MuscleMapJS) (MIT, commit `04a9862`), dérivés de [MuscleMap](https://github.com/melihcolpan/MuscleMap) de Melih Çolpan (MIT). Notices dans `src/ui/muscleMap/LICENSE-MuscleMap.md`. `scripts/update-muscle-map.mjs` lit les fichiers comme du texte, sans exécuter de code téléchargé.
- **wger** : pas utilisé pour l'instant (CC-BY-SA, attribution fiche par fiche).

## Conversion

- Le groupe Push / Pull / Legs / Gainage vient du **muscle principal**, pas du champ `force` de la source, parfois faux (le Butterfly y est en « pull »).
- Le muscle « shoulders » de la source est réparti selon le nom de l'exercice : arrière (rear, reverse fly, face pull, bent-over), côté (lateral, upright), sinon avant (ou arrière pour un tirage).
- Type : isolation selon la source ; composé avec barre ou haltères → composé lourd ; autre composé → composé machine.
- `src/data/catalog/curated.ts` ajoute, pour ~30 machines courantes : nom français, nom affiché sur la machine, alias (« poulie haute »), corrections, et 3 consignes courtes. Deux machines absentes de la source y sont créées : tirage horizontal divergent, élévations latérales machine.
- Les consignes sont adaptées de free-exercise-db ou des sources du cahier des charges, et **à relire par un coach** (mention affichée sur chaque fiche).
- Les autres exercices gardent leur nom et leurs instructions en anglais.

## Stockage

- Migration v2 : colonnes de contenu sur `exercise`, table `app_meta`.
- Le catalogue est importé au démarrage seulement quand sa version change (`CATALOG_VERSION` = commit de la source + `CURATED_VERSION`). Le fichier de 480 exercices est chargé à part, uniquement dans ce cas.
- Favoris, paliers et réglages sont dans `gym_machine` (salle par défaut) et ne sont jamais touchés par une mise à jour du catalogue.
- Toutes les opérations sur la base passent par une file (une à la fois) : le plugin ne gère pas les transactions qui se chevauchent.

## Limite connue

Dans le navigateur, une écriture interrompue par un rechargement immédiat de la page peut être perdue (la base est copiée dans IndexedDB après chaque écriture). L'écran affiche « Paliers enregistrés » une fois l'écriture terminée. Sur téléphone, la base SQLite native n'a pas ce problème.
