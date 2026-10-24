# Avancement

Suit l'ordre de construction de [SPEC.md](SPEC.md) (section « Choix techniques et plan »).

| Étape | Contenu                                                    | Statut      |
| ----- | ---------------------------------------------------------- | ----------- |
| 1     | Socle : projet, base SQLite, migrations, outils qualité    | ✅ Fait     |
| 2     | Domaine : progression, planning, modèles, supersets, stats | 🔄 En cours |
| 3     | Catalogue                                                  | ⏳          |
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

## Problèmes connus

- `npm audit` signale 3 failles « modérées » dans `uuid`, utilisé par l'outil iOS de `@capacitor/cli` (développement seulement, pas dans l'appli). Le correctif proposé rétrograde Capacitor : à revoir quand Capacitor publiera une mise à jour.
- sql.js est figé en 1.12.0 pour rester compatible avec jeep-sqlite (voir [ADR 0002](docs/adr/0002-sqlite-local.md)).
- Le paquet JavaScript principal fait 1,2 Mo (Ionic complet) : à découper à l'étape 9.
- Pas encore de projet Android (`npx cap add android`) : il faudra Android Studio et le SDK sur le poste.
- Le dépôt n'a pas encore de remote GitHub : les branches sont locales, les pull requests seront ouvertes quand le dépôt GitHub existera.
