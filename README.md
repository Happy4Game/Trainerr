# Trainerr

Coach de muscu de poche : l'appli dit quelle séance faire, quelle charge mettre sur chaque machine, et ajuste la suite selon chaque série saisie. Tout fonctionne hors ligne, les données restent sur le téléphone.

- Cahier des charges : [SPEC.md](SPEC.md)
- Avancement : [PROGRESS.md](PROGRESS.md)
- Décisions techniques : [docs/adr/](docs/adr/)

## Installation

Prérequis : Node.js 24 ou plus récent.

```sh
npm install
```

## Lancer l'appli

```sh
npm run dev
```

Vite affiche deux adresses :

- `Local` (http://localhost:5173) pour l'ordinateur ;
- `Network` (par exemple http://192.168.1.20:5173) pour le **téléphone**, connecté au même Wi-Fi que l'ordinateur. Ouvre cette adresse dans Chrome ou Safari sur le téléphone.

## Tests

| Commande                | Ce qu'elle vérifie                                                 |
| ----------------------- | ------------------------------------------------------------------ |
| `npm test`              | Tests unitaires (règles métier, migrations de la base)             |
| `npm run test:coverage` | Pareil, avec la couverture (seuil : 90 % des lignes du domaine)    |
| `npm run test:e2e`      | Parcours dans un vrai navigateur (Playwright)                      |
| `npm run lint`          | Style et erreurs courantes (ESLint, Prettier)                      |
| `npm run typecheck`     | Types TypeScript                                                   |
| `npm run check:i18n`    | Traductions : mêmes clés dans chaque langue, aucune clé inutilisée |
| `npm run check`         | Tout ce qui précède sauf les tests de bout en bout                 |

Pour les tests de bout en bout en local, Playwright peut utiliser un navigateur Chromium déjà installé : `CHROMIUM_PATH=/usr/bin/brave npm run test:e2e`. Sinon, `npx playwright install chromium` télécharge le sien.

Un hook Git (Husky) lance le lint, les types, les traductions et les tests avant chaque commit.

## Organisation du code

| Dossier                 | Contenu                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/domain/`           | Règles métier en TypeScript pur : progression, planning, stats… Aucune dépendance à Vue, Ionic ou SQLite (vérifié par ESLint). |
| `src/data/`             | Accès à la base SQLite et migrations du schéma.                                                                                |
| `src/views/`, `src/ui/` | Écrans et composants Vue / Ionic, sans règle métier.                                                                           |
| `src/i18n/`             | Textes de l'interface, un fichier par langue (français d'abord).                                                               |
| `tests/`                | Tests unitaires (Vitest), dont les cas réels d'octobre 2026.                                                                   |
| `e2e/`                  | Tests de bout en bout (Playwright).                                                                                            |
