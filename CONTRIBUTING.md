# Contribuer à Trainerr

Merci de vouloir améliorer Trainerr ! Ce guide explique comment installer le projet, les quelques règles qui le gardent fiable, et le déroulé d'une contribution.

> **En bref** : une branche par sujet, les tests d'abord, `npm run check` et `npm run test:e2e` au vert, des commits au format Conventional Commits, une pull request relue.

## Sommaire

1. [Installer le projet](#1-installer-le-projet)
2. [Trouver quoi faire](#2-trouver-quoi-faire)
3. [Le déroulé d'une contribution](#3-le-déroulé-dune-contribution)
4. [Les règles du code](#4-les-règles-du-code)
5. [Les tests](#5-les-tests)
6. [Textes et traductions](#6-textes-et-traductions)
7. [Base de données](#7-base-de-données)
8. [Accessibilité et ergonomie](#8-accessibilité-et-ergonomie)
9. [Licences, images et données personnelles](#9-licences-images-et-données-personnelles)
10. [Avant d'ouvrir la pull request](#10-avant-douvrir-la-pull-request)

## 1. Installer le projet

Prérequis : [Node.js](https://nodejs.org) 24 ou plus récent, Git.

```sh
git clone <adresse du dépôt>
cd trainerr
npm install        # installe aussi les hooks Git et le moteur SQLite du navigateur
npm run dev        # http://localhost:5173, et une adresse réseau pour le téléphone
```

Pour les tests de bout en bout : `npx playwright install chromium`, ou un Chromium déjà installé via `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`.

Pour Android, voir [docs/android.md](docs/android.md).

## 2. Trouver quoi faire

- Les fonctionnalités prévues et leur état sont dans [PROGRESS.md](PROGRESS.md) ; le besoin complet dans [SPEC.md](SPEC.md).
- Un bug ? Ouvre une issue avec : ce que tu as fait, ce que tu attendais, ce qui s'est passé, et si possible une capture.
- Une grosse évolution (nouvel écran, nouvelle dépendance, changement de base) ? Ouvre d'abord une issue pour en discuter : ça évite de travailler pour rien.

## 3. Le déroulé d'une contribution

1. **Une branche par sujet**, jamais de commit direct sur `main` :

   ```sh
   git switch -c feat/recherche-par-zone
   ```

2. **Les tests d'abord** : écris le test qui décrit le comportement voulu, vérifie qu'il échoue, puis écris le code (voir [Les tests](#5-les-tests)).
3. **Des commits petits et clairs**, au format [Conventional Commits](https://www.conventionalcommits.org/fr/) :

   ```text
   feat(session): ajouter une série depuis l'écran de repos
   fix(catalog): la charge notée s'affiche aussi après un redémarrage
   test(domain): cas d'une série en échec suivie d'une série facile
   docs: expliquer la construction de l'APK
   ```

   Types usuels : `feat`, `fix`, `test`, `docs`, `refactor`, `chore`. Le sujet entre parenthèses est la zone touchée (`session`, `catalog`, `stats`, `domain`, `data`…).

4. **Une pull request** vers `main`, avec ce qui change, pourquoi, et des captures pour tout changement visible. La CI (lint, types, traductions, tests, build, tests de bout en bout) doit être verte : une pull request rouge ne se fusionne pas.

Le hook Git lance déjà le lint, les types, les traductions et les tests unitaires à chaque commit ; s'il échoue, corrige plutôt que de le contourner.

## 4. Les règles du code

- **TypeScript strict**, partout. Pas de `any` ni de `as never` pour faire taire le compilateur.
- **`src/domain/` reste pur** : règles métier en TypeScript simple, sans Vue, Ionic, Capacitor ni SQLite (ESLint le vérifie). Toute règle qui décide quelque chose (charge, ordre, conseil) vit là et a ses tests.
- **Les écrans n'ont pas de règle métier** : `src/views/` et `src/ui/` affichent et appellent le domaine ou les dépôts de `src/data/`.
- **Lis le code autour avant d'écrire** : suis les noms, le style et la densité de commentaires existants. Les commentaires disent _pourquoi_, pas _quoi_.
- **Nouvelle dépendance** : seulement si elle apporte vraiment quelque chose, avec une licence acceptée (voir plus bas), et une version figée.
- **Choix structurant** (nouvelle bibliothèque, format de données, architecture) : ajoute une courte décision dans [docs/adr/](docs/adr/).

## 5. Les tests

| Ce que tu modifies            | Test attendu                                                     |
| ----------------------------- | ---------------------------------------------------------------- |
| Une règle de `src/domain/`    | Test unitaire dans `tests/domain/`, cas limites compris          |
| Un dépôt ou une migration     | Test dans `tests/data/` sur une vraie base SQLite en mémoire     |
| Un parcours visible à l'écran | Test de bout en bout dans `e2e/`, comme le ferait un utilisateur |
| Le serveur                    | Test dans `server/tests/`                                        |

- **Couverture** : au moins 90 % des lignes du domaine (`npm run test:coverage`).
- **Aucun test instable** : un test de bout en bout doit passer à chaque fois. Lance-le plusieurs fois avant de pousser :

  ```sh
  npm run test:e2e -- --repeat-each=2
  ```

  Attends un état visible (`expect(...).toBeVisible()`, `expect.poll`) plutôt qu'un délai fixe, et cible les éléments par leur rôle et leur nom accessible (`getByRole('button', { name: '…' })`), comme un lecteur d'écran.

- Les cas réels (séances d'octobre 2026) servent de références dans `tests/fixtures/` : ne les modifie que si la règle métier change volontairement.

## 6. Textes et traductions

- **Aucun texte écrit en dur** : tout passe par `t('…')` et les fichiers `src/i18n/locales/fr-FR.json` et `en-US.json`. Ajoute chaque clé **dans les deux langues**.
- Nombres, dates et unités passent par les outils de formatage (`n()`, `Intl`, `useUnits()` pour kg / lb).
- Les pluriels s'écrivent `"{count} série | {count} séries"` et suivent les règles de chaque langue.
- `npm run check:i18n` vérifie que les deux langues ont les mêmes clés et qu'aucune clé n'est inutilisée. Détails dans [docs/i18n.md](docs/i18n.md).
- Ton : tutoiement, phrases courtes et concrètes, jamais culpabilisantes.

## 7. Base de données

- Le schéma ne change **que par une nouvelle migration** dans `src/data/sqlite/migrations.ts` (version suivante), jamais en modifiant une migration existante.
- Ajoute la base d'exemple de la nouvelle version dans `tests/fixtures/db/` et un test qui migre une base existante sans perte de données.
- Les écritures passent par les dépôts de `src/data/repositories/`.

## 8. Accessibilité et ergonomie

L'appli s'utilise à la salle, d'une main, entre deux séries :

- **Zones tactiles d'au moins 48 px**, actions principales en gros boutons.
- **Jamais la couleur seule** : un état s'écrit aussi en mots (Facile, Correct…).
- **Un nom accessible pour chaque bouton-icône** (`aria-label`, ou un texte masqué visuellement dans les fenêtres Ionic, qui ne transmettent pas toujours `aria-label`).
- **Thème clair et sombre** : utilise les variables de couleur du thème (`--ion-color-primary`, `--ion-card-background`…), jamais une couleur en dur, et vérifie les deux thèmes.
- **Vérifie à 360 px de large** : rien ne doit déborder ni passer sous le pli sans raison.

## 9. Licences, images et données personnelles

- **Code embarqué** : uniquement MIT, ISC, BSD, Apache 2.0 ou domaine public. Pas de GPL ni d'AGPL dans l'appli. Le build échoue si une dépendance sort de cette liste, et la page Crédits est générée automatiquement.
- **Images** : jamais d'image sans licence connue, ni d'image générée par IA. Chaque image a son auteur et sa licence notés (voir `scripts/update-exercise-images.mjs`) ; une image CC BY-SA modifiée reste sous CC BY-SA et ses modifications sont signalées.
- **Données personnelles et de santé** (séances, gênes, mensurations) : elles restent sur le téléphone. Rien n'est envoyé sans une action explicite de l'utilisateur, et l'export comme la suppression complète doivent continuer à fonctionner.

## 10. Avant d'ouvrir la pull request

- [ ] Les tests du comportement ajouté ou corrigé existent et passent.
- [ ] `npm run check` est vert.
- [ ] `npm run test:e2e -- --repeat-each=2` est vert.
- [ ] Les textes sont traduits en français et en anglais.
- [ ] L'écran est vérifié en clair, en sombre et à 360 px de large.
- [ ] Aucune nouvelle dépendance ou image sans licence acceptée.
- [ ] [PROGRESS.md](PROGRESS.md) est à jour si une fonctionnalité change, et un ADR est ajouté si un choix est structurant.

Merci ! 💪
