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

Illustrations des mouvements : 209 fiches, dessins Everkinetic (CC BY-SA 4.0), wger.de en secours ; départ et arrivée en alternance. La démo animée maison est retirée. Le catalogue affiche d'abord mes machines, puis les machines populaires, avec une vignette du dessin ; les exercices illustrés passent avant les autres. Sans dessin : élévations latérales machine, rowing divergent, face pull, reverse fly machine, planche (ADR 0005).

## Étape 4 — Séance

- Séance du jour construite depuis les favoris et la rotation ; charge et reps pré-remplies (historique, reprise ou série test) ; **une tape sur la difficulté enregistre la série**.
- Minuteur de repos (heure de fin absolue, vibration), échauffement conseillé, annulation de la dernière série, passer un exercice.
- **Machine occupée** : alternatives avec leur charge, la machine est reproposée après l'exercice suivant, reportée à la prochaine séance du même type si elle reste prise, salle bondée → haltères et poulies.
- Calculateur de disques (dessin SVG, − / +), saisie vocale (« 16 kilos, 10 reps, limite »), reprise de la séance après fermeture de l'appli.
- Migration v3 (plan de séance), récap de fin de séance.
- Notes de séance (« mal dormi », « salle bondée »), affichées dans l'historique.
- Historique lisible : séances groupées par mois (avec leur nombre), une carte par séance (date, nom, exercices · séries · charge soulevée), une ligne par exercice avec ses séries en pastilles « 90 kg × 12 ».
- Bouton **« Ça tire »** : zone + signaux d'alerte ; avant de l'épaule → exercices de poussée restants retirés ; signaux d'alerte → arrêt de la séance ; douleur thoracique + essoufflement → appeler le 15 ; même gêne 2 fois dans la semaine → conseil kiné.

## Étape 5 — Parcours utilisateur

- Questionnaire du premier lancement (7 questions + notifications), bouton « Passer » avec les valeurs par défaut.
- Écran **Planning** : prochaine séance en tête (avec la semaine suivante si celle-ci est finie), progression de la semaine, frise des jours (faite, aujourd'hui, à venir, repos), grille de disponibilités, modèle et nombre de séances, note « 1 fois par semaine ».
- Séance ratée : le créneau passé est marqué « Séance non faite », la séance due passe au créneau suivant (rien n'est perdu, la semaine ne bouge plus quand une séance est faite) ; « Et si je la rate ? » montre le décalage. Ordre des séances : choisir la prochaine (cycle déjà commencé), aussi dans le questionnaire du début ; les rappels suivent le même planning.
- Import des charges déjà soulevées (CSV `exercise,load_kg,reps,date`, une ligne par machine) : elles deviennent « Ma charge » et le point de départ. Après un import de séances, choix de la séance par laquelle continuer. Formats dans docs/import.md.
- Écran **Aujourd'hui** : séance du jour, compteur de la semaine, régularité, accès aux réglages.
- **Mode reprise** : anciennes charges sur chaque fiche, départ réduit (90 / 80 / 70 %), jauge de retour à l'ancien niveau.
- **Notifications locales** : rappel 1 h avant, relance douce, 1 par jour au plus, jamais en heures de silence ni en créneau bloqué (plugin Local Notifications, aucun serveur).
- Les réglages (disponibilités, autre sport, reprise, notifications) sont stockés en JSON dans `app_meta` plutôt que dans la table `availability` : plus simple tant qu'il n'y a qu'une salle (à revoir avec « Plusieurs salles »).

- **Pré-séance** : avec trop peu de machines en favori, l'écran Séance propose une séance complétée avec des machines populaires (dessinées d'abord), à lancer telle quelle ou à ajouter à mes machines en un geste.

- Pendant la séance, la machine du moment montre son dessin ; un geste ouvre sa fiche dans l'onglet Séance, et « Revenir à la séance » ramène à la série en cours (bandeau visible sur toutes les fiches tant qu'une séance est en cours).

- « ← Revenir à : … » rouvre l'exercice précédent (passé trop vite ou terminé), les séries déjà faites sont gardées.

- Séries en plus : « +1 série » pendant l'exercice, ou « +1 série sur : … » juste après la dernière série (le repos continue), jusqu'à 10 séries.

- « + Ajouter un exercice » pendant la séance (sélecteur avec recherche, mes machines et machines populaires en premier) : l'exercice passe en premier.

- Consignes traduites en français pour tous les exercices (traduction automatique livrée avec l'appli, mentionnée sur la fiche, texte original à la demande).

- Écran de série simplifié : « La dernière fois : … », conseil en clair (monte la charge, vise une rep de plus, garde, allège) avec sa raison, puis deux étapes numérotées (① ta série, déjà remplie ; ② ton ressenti, qui enregistre). Les options rares sont rangées dans « Préciser la série ».

- Fiche machine : « Ma charge sur cette machine » est visible sur toutes les fiches (elle n'apparaissait qu'en mode reprise). La première séance part de cette charge au lieu d'une série test ; en mode reprise, elle devient « Avant ma pause ».

- Changement de machine visible : « Exercice 2 sur 5 » avec la liste des machines (faites, en cours, à venir), et entre deux exercices un écran « ✓ … terminé · Machine suivante » (dessin, séries, charge, « Je suis sur la machine »). Pas d'interruption au milieu d'un superset ; l'écran remonte en haut à chaque nouvel exercice.
- Supersets visibles : dès l'interrupteur activé, les paires apparaissent groupées dans la liste de la séance (ou un message dit qu'aucune paire n'est possible et pourquoi) ; pendant la séance, « Superset 1/2 · puis … sans repos » / « 2/2 · repos après cette série ».

- « Machine occupée » : chaque machine proposée a un aperçu (dessin, muscles, charge prévue, « Voir le mouvement ») et un bouton « Je prends celle-ci ».

- Catalogue : la charge soulevée sur chaque machine (dernière séance, ou notée à la main si plus récente) s'affiche sous son nom ; un appui l'ouvre pour la noter ou la corriger, et elle sert de point de départ à la séance suivante.

- Séries validées corrigeables pendant la séance : « Dernière série : … · Corriger » sous le repos, et chaque série enregistrée s'ouvre pour corriger charge / reps / ressenti ou la supprimer (l'exercice se rouvre s'il manque alors des séries).

- Design : thème indigo clair / sombre, fond teinté et cartes blanches, boutons en casse normale ; progression de séance sur une ligne ; plans de séance avec dessins ; écran Aujourd'hui « en un coup d'œil » ; fin de séance avec tuiles (séries, charge soulevée, records) ; textes d'aide de la série seulement pendant les deux premières séances.

- Séances personnalisées : « Mes séances » dans l'onglet Séance ; créer, nommer, choisir et réordonner les exercices, commencer, modifier, supprimer. Elles gardent conseils de charge, transitions et historique (nom affiché partout).

- « Tout voir » ouvre le programme de la séance : chaque machine avec dessin, état, séries faites / prévues, charge, et « Maintenant » / « Rouvrir » pour changer l'ordre. Ligne compacte « Précédent : … · ← Revenir · +1 série ».

- Recherche par zone du corps dans le catalogue : silhouette face / dos, toucher une zone filtre les exercices qui la travaillent (combinable avec la recherche et les onglets), utilisable au clavier.

- Supersets optionnels : interrupteur « Enchaîner en supersets » avant de commencer (par défaut selon le réglage, plus jamais imposés, y compris en séance express) et bouton « Séparer » pendant la séance.

- Onglet Stats : tuiles de synthèse (séances sur 30 jours, semaines au rythme, records, charge par semaine), régularité avec jours de la semaine, records les plus récents en premier avec la charge en évidence, partage du récap déplacé en bas.
  Logo : haltère Lucide (ISC) sur indigo, `npm run icons` génère icônes Android, splash et favicon.
- Android : projet Capacitor dans `android/`, APK de debug avec `npm run android:apk` et construit par la CI (artefact `trainerr-debug-apk`) ; guide dans [docs/android.md](docs/android.md). Version Play Store : clé de signature et icône à fournir.
- Documentation : README avec captures, CONTRIBUTING (déroulé, règles, tests, licences, accessibilité). Licence PolyForm Noncommercial 1.0.0 (ADR 0007).

- Finitions : barre d'onglets avec pastille sur l'onglet actif et point vert « séance en cours » ; repos avec anneau et −15 s / +30 s ; petite vibration et animation à chaque série enregistrée ; écrans vides illustrés avec une action (historique, stats, mes machines).

## Étape 6 — Suivi

- Onglet **Historique** : Séances, Stats, Corps.
- Stats : courbe du 1RM estimé par exercice, séries par muscle avec la zone 10–20, équilibre poussée / tirage, calendrier de régularité (8 semaines), charge de travail par semaine, records. Graphiques en SVG avec description textuelle.
- Détection de stagnation (3 séances sans progrès), suivi du poids et des mensurations, cible de protéines (1,6 g/kg).

- **Historique modifiable** : toucher une séance ouvre « Modifier la séance » : date, charge / reps / ressenti de chaque série, série ou exercice oublié, note, suppression de la séance (avec confirmation). Les badges déjà gagnés ne sont pas recalculés.

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

## Séance améliorée (branche `feat/seance-amelioree`, 26 oct. 2026)

- **Charge précise sur machine** : poids d'appoint (1,25 / 2,5 kg ou autre) combinés aux plaques, « Plaque 45 kg + appoint 2,5 kg » ; charge tapée à la main en touchant la valeur, arrondie à la précision de la machine (0,5 kg au plus fin) ; siège et cran notés sur la fiche et rappelés à chaque série. Migration v5 (`machine_setup`).
- **Tractions et dips assistés** : la charge notée est l'aide, charge réelle = poids du corps − aide ; moins d'aide = progression (en vert), courbes et records sur la charge réelle (poids du jour de chaque séance). Poids du corps dans Réglages → Mon profil.
- **Séances types** : Push, Pull, Jambes, Full body débutant, Haut / Bas ; ordre polyarticulaire lourd → secondaire → isolation, « pourquoi à cette place » pour chaque exercice, encart sourcé (ACSM 2009, Simão 2012, Nunes 2021). Alerte d'ordre dans les séances personnalisées.
- **Plus de choix en séance** : changer de machine (même mouvement), −1 / +1 série, exercice plus tôt / plus tard / retiré, et « Mauvaise machine ? » pour déplacer des séries vers la bonne machine (pendant la séance et dans l'historique).
- **Notification de séance (Android)** : exercice, série et compte à rebours du repos écran verrouillé (petit plugin natif), alerte de fin de repos, interrupteur dans les Réglages.
- **Mises à jour** : workflow « Publier l'APK » (APK signé + `latest.json` en GitHub Release à chaque push sur `main`), vérification au démarrage et dans Réglages → Mises à jour, installation par l'installateur d'Android. Mise en place : [docs/mises-a-jour.md](docs/mises-a-jour.md).
- **Séances test** jouées de bout en bout (Pull avec tractions assistées ; débutant en Full body ; avancé en Push puis Jambes) : [docs/retour-utilisateur.md](docs/retour-utilisateur.md), 11 points corrigés. Ensuite : écran de repos allégé, machines utilisées ajoutées à « Mes machines » en un tap, même mouvement en tête du choix de machine, série test réaliste (sur le poids du corps), exercices au poids du corps sans lest d'office, encart « Tu débutes ? » vers Full body débutant.
- **Vérification des mises à jour** : activée par défaut, exception écrite dans SPEC.md (vie privée).

**À faire par Thibaut** : créer la clé de signature et les 4 secrets GitHub (docs/mises-a-jour.md), pousser le dépôt, puis tester sur le téléphone la notification de séance et une mise à jour.

## Appli agréable à chaque étape (PR #2, 27 oct. 2026)

User stories du pratiquant : [docs/user-stories.md](docs/user-stories.md).

- **Aujourd'hui** : aperçu complet de la séance (séries × charge par exercice, durée estimée, badge « +2,5 kg » quand la charge monte), exercices cochés pendant la séance, « Commencer » lance directement.
- **Menu de séance** : carte de la séance du jour, tuiles Express / séances types / maison / créer, « Mes séances ».
- **Séances types** : « Copier et modifier » (séries, reps, repos par exercice).
- **Pas en forme aujourd'hui** : une série de moins, pas de hausse de charge (autorégulation, Greig et al. 2020, Sports Medicine).
- **Charges habituelles** : pour qui s'entraîne déjà, « Noter ma charge » sur les machines jamais faites, au lieu d'une série test.
- **Pendant la séance** : temps écoulé, disques par côté sous la charge de la barre, objectif de double progression, ressentis explicites sur la série test.
- **Récap** : volume gagné depuis la dernière séance du même type, durée, « Partager ma séance » en image.
- **Historique** : trophée sur les exercices où un record a été battu. **Stats** : l'exercice le plus travaillé sélectionné et visible.
- **Exports Android** : menu Partager natif (plugin `FileShare` + FileProvider).
- **Réglages** : l'entraînement en premier, les infos à la fin.

## Séance faite sans l'appli (27 oct. 2026)

- **Historique** : « Ajouter une séance faite sans l'appli » (téléphone oublié, autre salle). On choisit la date (pas dans le futur) et le type de séance ; la séance est créée terminée, puis on la remplit dans l'éditeur de l'historique.
- Si une séance du même type existe déjà, elle est préremplie avec ses exercices, charges et reps : il ne reste qu'à corriger ce qui a changé.
- Elle compte partout comme une autre : historique trié par date, stats, records, et le cycle passe à la séance suivante.
- Une séance ajoutée puis laissée vide n'est pas gardée.

## Retours de Thibaut en salle (27 oct. 2026)

- **Programme de la séance** : « + Ajouter un exercice » en haut de la liste. L'exercice s'ajoute à la fin, avec le nombre de séries habituel ; l'exercice en cours n'est pas interrompu, on peut ensuite le remonter ou le faire maintenant.
- **Charge plafonnée** : « + » continue au-delà du dernier palier connu (même écart). Charges par défaut relevées : 100 kg de lest au poids du corps, 400 kg sur machine (presse à disques), 80 kg en haltères.
- **Catalogue, recherche par muscle** : toucher un muscle repasse sur « Tout » (pas bloqué sur l'onglet Jambes) ; refermer la silhouette oublie le muscle choisi.

## Reste à faire (fonctions du cahier des charges)

- Fonctions complémentaires : widget, montre.
- Notifications : record battu, régularité, retour au niveau, conseil de la semaine (types prévus dans les réglages, pas encore déclenchés).

## Problèmes connus

- Dans la fenêtre du sélecteur d'exercice, Ionic n'applique pas le libellé d'accessibilité au champ de recherche (lu « search text », le texte indicatif reste lu) : à reprendre avec la passe accessibilité.

- `npm audit` signale 3 failles « modérées » dans `uuid`, utilisé par l'outil iOS de `@capacitor/cli` (développement seulement, pas dans l'appli). Le correctif proposé rétrograde Capacitor : à revoir quand Capacitor publiera une mise à jour.
- sql.js est figé en 1.12.0 pour rester compatible avec jeep-sqlite (voir [ADR 0002](docs/adr/0002-sqlite-local.md)).
- Photo de la plaque de la machine et photo mensuelle du corps : pas encore faites, elles demandent le plugin appareil photo.
- Dans le navigateur seulement, une écriture interrompue par un rechargement immédiat peut être perdue (voir ADR 0005).
- Le remote GitHub est configuré (`origin` → github.com/Happy4Game/Trainerr) mais rien n'est encore poussé : il manque l'authentification GitHub sur l'ordinateur.
- Notification de séance et mises à jour : compilées (APK debug et release signé vérifiés), pas encore essayées sur un vrai téléphone.
- Pistes du retour utilisateur non traitées : proposer de noter ses charges habituelles après « Je m'entraîne déjà », question explicite après la série test, questionnaire plus court.
- Clé de signature créée hors du dépôt (`~/trainerr-release.jks`, mot de passe dans `~/.trainerr-release-secrets`) ; reste à installer `gh`, se connecter, pousser et créer les 4 secrets.
