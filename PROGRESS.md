# Avancement

Suit l'ordre de construction de [SPEC.md](SPEC.md) (section « Choix techniques et plan »).

| Étape | Contenu                                                    | Statut      |
| ----- | ---------------------------------------------------------- | ----------- |
| 1     | Socle : projet, base SQLite, migrations, outils qualité    | ✅ Fait     |
| 2     | Domaine : progression, planning, modèles, supersets, stats | ✅ Fait     |
| 3     | Catalogue                                                  | ⏳ Suivante |
| 4     | Séance                                                     | ⏳          |
| 5     | Parcours utilisateur                                       | ⏳          |
| 6     | Suivi                                                      | ⏳          |
| 7     | Pages de contenu                                           | ⏳          |
| 8     | Connecté                                                   | ⏳          |
| 9     | Finition                                                   | ⏳          |

## Étape 1 — Socle

- Ionic 9 + Vue 3 + Capacitor 8, TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- 5 onglets (Aujourd'hui, Séance, Catalogue, Historique, Planning), textes en français et anglais via vue-i18n, thème sombre automatique.
- Base SQLite : schéma v1 (toutes les tables du modèle de données), migrations transactionnelles, base d'exemple figée.
- Qualité : ESLint (domaine isolé de Vue/Ionic/SQLite), Prettier, Vitest + couverture, Playwright, contrôle des traductions, hook avant commit, GitHub Actions.

## Étape 2 — Domaine

Tout est dans `src/domain/`, en TypeScript pur (ESLint interdit d'y importer Vue, Ionic ou SQLite).

| Module                           | Contenu                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `progression.ts`, `loadSteps.ts` | Règles entre deux séries et entre deux séances, palier absent, première fois sur une machine   |
| `oneRepMax.ts`                   | 1RM estimé (Epley), « combien pour X reps ? »                                                  |
| `comeback.ts`                    | Mode reprise : charge de départ (90 / 80 / 70 %), volume réduit 2 semaines, jauge de retour    |
| `trainingModels.ts`              | Les 7 modèles, recommandation selon le nombre de séances, note « 1 fois par semaine »          |
| `planning.ts`, `dates.ts`        | Rotation continue, semaine générée (créneaux, heures de silence, autres sports, jour de repos) |
| `sessionBuilder.ts`              | Choix des exercices parmi les favoris : composés d'abord, variantes A / B, zone à ménager      |
| `supersets.ts`                   | Agoniste-antagoniste par défaut, haut/bas si proches, jamais de composé lourd                  |
| `stats.ts`                       | Courbe de force, charge de travail, séries par muscle, régularité, records                     |
| `busyMachine.ts`                 | Mode « machine prise » : alternatives, file d'attente, report, salle bondée                    |
| `advice.ts`                      | Gêne, signaux d'alerte, courbatures                                                            |
| `plates.ts`                      | Calculateur de disques (recherche exhaustive, pas gloutonne)                                   |

Tests : 143 au total, dont les **10 cas réels d'octobre 2026** (`tests/fixtures/golden/october-2026.json`) et des tests de propriétés (fast-check) : charge toujours sur un palier existant, jamais de hausse après Limite/Échec, disques exacts ou 2 charges les plus proches, planning hors créneaux bloqués. Couverture du domaine : 99,5 % des lignes.

**Choix par défaut** (validés) : voir [ADR 0004](docs/adr/0004-regles-du-domaine.md). Les heures de silence ne s'appliquent qu'aux notifications (étape 5).

## Problèmes connus

- `npm audit` signale 3 failles « modérées » dans `uuid`, utilisé par l'outil iOS de `@capacitor/cli` (développement seulement, pas dans l'appli). Le correctif proposé rétrograde Capacitor : à revoir quand Capacitor publiera une mise à jour.
- sql.js est figé en 1.12.0 pour rester compatible avec jeep-sqlite (voir [ADR 0002](docs/adr/0002-sqlite-local.md)).
- Le paquet JavaScript principal fait 1,2 Mo (Ionic complet) : à découper à l'étape 9.
- Pas encore de projet Android (`npx cap add android`) : il faudra Android Studio et le SDK sur le poste.
- Le dépôt n'a pas encore de remote GitHub : les branches sont locales, les pull requests seront ouvertes quand le dépôt GitHub existera.
