# Avancement

Suit l'ordre de construction de [SPEC.md](SPEC.md) (section « Choix techniques et plan »).

| Étape | Contenu                                                    | Statut                          |
| ----- | ---------------------------------------------------------- | ------------------------------- |
| 1     | Socle : projet, base SQLite, migrations, outils qualité    | ✅ Fait                         |
| 2     | Domaine : progression, planning, modèles, supersets, stats | ✅ Fait                         |
| 3     | Catalogue                                                  | ✅ Fait                         |
| 4     | Séance                                                     | ✅ Fait                         |
| 5     | Parcours utilisateur                                       | ✅ Fait                         |
| 6     | Suivi                                                      | ✅ Fait (sauf photo du corps)   |
| 7     | Pages de contenu                                           | ✅ Fait (contact à choisir)     |
| 8     | Connecté                                                   | ⏸️ En attente de décisions      |
| 9     | Finition                                                   | 🔄 En partie (sauvegarde faite) |

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

## Étape 3 — Catalogue

- 482 exercices : 480 de free-exercise-db (domaine public) + 2 machines de ta salle absentes de la source.
- ~30 machines courantes avec nom français, nom affiché sur la machine, alias et 3 consignes (à relire par un coach).
- Écran **Catalogue** : recherche sans accents (nom, alias, muscle), filtres Tout / Mes machines / Poussée / Tirage / Jambes / Gainage, étoile des favoris.
- **Fiche machine** : silhouette face/dos avec muscles principaux et secondaires, type et fourchette de reps, consignes, paliers de charge (ajout, suppression, génération « de 25 à 86 tous les 7 »), réglages de la machine.
- Base : migration v2, import du catalogue seulement quand il change, favoris et paliers conservés.
- Détails et choix : [ADR 0005](docs/adr/0005-catalogue.md).

Illustrations des mouvements : 209 fiches, dessins Everkinetic (CC BY-SA 4.0), wger.de en secours ; départ et arrivée en alternance. La démo animée maison est retirée. Sans dessin : élévations latérales machine, rowing divergent, face pull, reverse fly machine, planche (ADR 0005).

## Étape 4 — Séance

- Séance du jour construite depuis les favoris et la rotation ; charge et reps pré-remplies (historique, reprise ou série test) ; **une tape sur la difficulté enregistre la série**.
- Minuteur de repos (heure de fin absolue, vibration), échauffement conseillé, annulation de la dernière série, passer un exercice.
- **Machine occupée** : alternatives avec leur charge, la machine est reproposée après l'exercice suivant, reportée à la prochaine séance du même type si elle reste prise, salle bondée → haltères et poulies.
- Calculateur de disques (dessin SVG, − / +), saisie vocale (« 16 kilos, 10 reps, limite »), reprise de la séance après fermeture de l'appli.
- Migration v3 (plan de séance), récap de fin de séance.
- Notes de séance (« mal dormi », « salle bondée »), affichées dans l'historique.
- Bouton **« Ça tire »** : zone + signaux d'alerte ; avant de l'épaule → exercices de poussée restants retirés ; signaux d'alerte → arrêt de la séance ; douleur thoracique + essoufflement → appeler le 15 ; même gêne 2 fois dans la semaine → conseil kiné.

## Étape 5 — Parcours utilisateur

- Questionnaire du premier lancement (7 questions + notifications), bouton « Passer » avec les valeurs par défaut.
- Écran **Planning** : semaine générée, grille de disponibilités, modèle et nombre de séances, note « 1 fois par semaine ».
- Écran **Aujourd'hui** : séance du jour, compteur de la semaine, régularité, accès aux réglages.
- **Mode reprise** : anciennes charges sur chaque fiche, départ réduit (90 / 80 / 70 %), jauge de retour à l'ancien niveau.
- **Notifications locales** : rappel 1 h avant, relance douce, 1 par jour au plus, jamais en heures de silence ni en créneau bloqué (plugin Local Notifications, aucun serveur).
- Les réglages (disponibilités, autre sport, reprise, notifications) sont stockés en JSON dans `app_meta` plutôt que dans la table `availability` : plus simple tant qu'il n'y a qu'une salle (à revoir avec « Plusieurs salles »).

## Étape 6 — Suivi

- Onglet **Historique** : Séances, Stats, Corps.
- Stats : courbe du 1RM estimé par exercice, séries par muscle avec la zone 10–20, équilibre poussée / tirage, calendrier de régularité (8 semaines), charge de travail par semaine, records. Graphiques en SVG avec description textuelle.
- Détection de stagnation (3 séances sans progrès), suivi du poids et des mensurations, cible de protéines (1,6 g/kg).

## Étape 7 — Pages de contenu

- Réglages (roue dentée sur Aujourd'hui) : Bien débuter, À propos, Crédits, supersets, refaire le questionnaire, notifications type par type, **Mes données**.
- Bien débuter : 14 fiches avec leur source ; les 3 fiches « À sourcer » sont marquées comme telles.
- Crédits : données, auteurs des images, sources scientifiques, et les 104 bibliothèques embarquées avec le texte de leur licence (générés au build ; le build échoue sur une licence hors de la liste du cahier des charges).
- À propos : le texte du cahier des charges. **Le bouton « Signaler une erreur » attend ton choix** (formulaire, e-mail ou page du projet).

## Étape 8 — Connecté (sans la montre)

- Serveur optionnel `server/` (Node 24, SQLite) : comptes sans e-mail, groupes avec code à 6 caractères, classement à la régularité, records partagés seulement si l'utilisateur l'accepte, suppression du compte. Voir [server/README.md](server/README.md) et [ADR 0006](docs/adr/0006-serveur-optionnel.md).
- Page **Défis entre amis** (Réglages) ; synchronisation en arrière-plan à la fin de chaque séance.
- Carte **Conseil du coach IA** sur Aujourd'hui : accord explicite et retirable, texte exact visible avant l'envoi, question facultative, mention « conseil généré par une IA », limite quotidienne. Claude Opus 5.5 côté serveur, la clé de l'API ne quitte pas le serveur.
- Montre connectée : reportée (demande de Thibaut).
- **À décider** : où héberger le serveur, et qui paie la clé de l'API Claude.

## Étape 9 — Finition (en partie)

- Fait : export JSON et CSV, import, suppression complète avec confirmation ; tests de bout en bout des parcours principaux (11).
- Reste : enregistrement des fichiers avec les plugins Capacitor sur téléphone (export par le menu Partager), projet Android, accessibilité (relecture TalkBack), régression visuelle, pseudo-langue de test, bêta-test.

## Reste à faire (fonctions du cahier des charges)

- Fonctions complémentaires : widget, montre.
- Notifications : record battu, régularité, retour au niveau, conseil de la semaine (types prévus dans les réglages, pas encore déclenchés).

## Problèmes connus

- `npm audit` signale 3 failles « modérées » dans `uuid`, utilisé par l'outil iOS de `@capacitor/cli` (développement seulement, pas dans l'appli). Le correctif proposé rétrograde Capacitor : à revoir quand Capacitor publiera une mise à jour.
- sql.js est figé en 1.12.0 pour rester compatible avec jeep-sqlite (voir [ADR 0002](docs/adr/0002-sqlite-local.md)).
- Exercices hors des ~30 machines courantes : nom et instructions en anglais.
- Photo de la plaque de la machine et photo mensuelle du corps : pas encore faites, elles demandent le plugin appareil photo.
- Les exports se téléchargent dans le navigateur ; sur téléphone il faudra les plugins Filesystem / Share.
- Dans le navigateur seulement, une écriture interrompue par un rechargement immédiat peut être perdue (voir ADR 0005).
- Pas encore de projet Android (`npx cap add android`) : il faudra Android Studio et le SDK sur le poste.
- Le dépôt n'a pas encore de remote GitHub : les branches sont locales, les pull requests seront ouvertes quand le dépôt GitHub existera.
