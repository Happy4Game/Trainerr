<div align="center">

# 🏋️ Trainerr

**Ton coach de muscu de poche.**
L'appli te dit quelle séance faire, quelle charge mettre sur chaque machine,
et ajuste la suite à chaque série. Tout reste sur ton téléphone.

[Fonctionnalités](#-fonctionnalités) ·
[Installer](#-installer-et-lancer) ·
[Contribuer](CONTRIBUTING.md) ·
[Sources et crédits](#-sources-et-crédits)

<br>

<img src="docs/screenshots/1-today.png" width="160" alt="Écran Aujourd'hui : la prochaine séance et la semaine en un coup d'œil">
<img src="docs/screenshots/2-set.png" width="160" alt="Une série en cours : conseil de charge, charge et reps pré-remplies, ressenti">
<img src="docs/screenshots/3-next.png" width="160" alt="Changement de machine : exercice terminé, machine suivante">
<img src="docs/screenshots/4-catalog.png" width="160" alt="Catalogue : recherche en touchant une zone du corps">
<img src="docs/screenshots/5-stats.png" width="160" alt="Statistiques : synthèse, évolution de la force">
<img src="docs/screenshots/6-summary.png" width="160" alt="Fin de séance : bravo, séries, charge soulevée, badges">

</div>

---

## ✨ Fonctionnalités

### À la salle

- **Une séance prête chaque jour** selon ton objectif, ton rythme et tes machines favorites. Pas assez de favoris ? L'appli propose une **pré-séance** avec des machines courantes.
- **Le bon poids à chaque série** : « La dernière fois : 20 kg × 10 » puis un conseil clair (monte la charge, vise une rep de plus, garde, allège) et sa raison. Les paliers réels de chaque machine sont respectés.
- **Saisie en deux gestes** : charge et reps déjà remplies, un appui sur le ressenti (Facile, Correct, Limite, Échec) enregistre et lance le repos.
- **Rien n'est figé** : corriger une série validée trop vite, revenir à l'exercice précédent, ajouter une série ou un exercice, changer l'ordre, séparer un superset.
- **Machine occupée** : alternatives avec aperçu (dessin, muscles, charge), la machine est reproposée plus tard.
- **Changement de machine visible** : « ✓ Terminé · Machine suivante » avec le dessin du mouvement.
- **Supersets en option**, séance express, séance à la maison, **séances personnalisées**.

### Pour progresser

- **Catalogue de 480 exercices** avec dessins du mouvement, muscles travaillés, consignes en français, **recherche par zone du corps** et ta charge sur chaque machine.
- **Statistiques** : régularité, évolution de la force (1RM estimé), séries par muscle, records.
- **Historique modifiable**, suivi du corps, badges, récap du mois à partager.
- **Défis entre amis** et **conseils d'un coach IA**, optionnels, via un petit serveur ([server/](server/README.md)).

### Pour tous

- **Hors ligne d'abord** : base SQLite sur le téléphone, aucune donnée envoyée sans action de ta part (RGPD).
- **Français et anglais**, kilos ou livres, thème clair et sombre, grandes zones tactiles.
- Export, import (Strong, Hevy), sauvegarde chiffrée et suppression complète en un bouton.

## 🚀 Installer et lancer

Prérequis : [Node.js](https://nodejs.org) 24 ou plus récent.

```sh
npm install
npm run dev
```

Vite affiche deux adresses :

- **Local** (`http://localhost:5173`) pour l'ordinateur ;
- **Network** (par exemple `http://192.168.1.20:5173`) pour le **téléphone**, connecté au même Wi-Fi. Ouvre-la dans Chrome ou Safari.

### Sur Android

Voir [docs/android.md](docs/android.md) pour construire l'APK et l'installer sur un téléphone.

## 🧪 Tests et qualité

| Commande                | Ce qu'elle vérifie                                                 |
| ----------------------- | ------------------------------------------------------------------ |
| `npm test`              | Tests unitaires : règles métier, migrations de la base, serveur    |
| `npm run test:coverage` | Pareil, avec la couverture (seuil : 90 % des lignes du domaine)    |
| `npm run test:e2e`      | Parcours complets dans un vrai navigateur (Playwright)             |
| `npm run lint`          | Style et erreurs courantes (ESLint, Prettier)                      |
| `npm run typecheck`     | Types TypeScript                                                   |
| `npm run check:i18n`    | Traductions : mêmes clés dans chaque langue, aucune clé inutilisée |
| `npm run check`         | Tout ce qui précède sauf les tests de bout en bout                 |

Playwright peut utiliser un Chromium déjà installé : `CHROMIUM_PATH=/usr/bin/brave npm run test:e2e`. Sinon, `npx playwright install chromium` télécharge le sien.

Un hook Git (Husky) lance le lint, les types, les traductions et les tests avant chaque commit, et la CI GitHub Actions refait tout, tests de bout en bout compris, à chaque pull request.

## 🧱 Comment c'est construit

[Ionic](https://ionicframework.com) + [Vue 3](https://vuejs.org) + [Capacitor](https://capacitorjs.com), TypeScript strict, SQLite sur le téléphone.

| Dossier                 | Contenu                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/domain/`           | Règles métier en TypeScript pur : progression, planning, stats… Aucune dépendance à Vue, Ionic, SQLite. |
| `src/data/`             | Base SQLite, migrations, catalogue, traductions des consignes.                                          |
| `src/views/`, `src/ui/` | Écrans et composants Vue / Ionic, sans règle métier.                                                    |
| `src/i18n/`             | Textes de l'interface, un fichier par langue.                                                           |
| `server/`               | Serveur optionnel (défis entre amis, conseils IA).                                                      |
| `tests/`, `e2e/`        | Tests unitaires (Vitest) et de bout en bout (Playwright).                                               |
| `docs/adr/`             | Les décisions techniques et leurs raisons.                                                              |

Pour aller plus loin : le cahier des charges [SPEC.md](SPEC.md), l'avancement [PROGRESS.md](PROGRESS.md) et les [décisions techniques](docs/adr/).

## 📚 Sources et crédits

Tout ce que l'appli embarque a une licence connue ; la page **Crédits** de l'appli liste chaque ressource, chaque auteur et le texte de chaque licence.

| Ressource                                                       | Usage                                     | Licence                                 |
| --------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Catalogue : exercices, muscles, consignes | Domaine public (Unlicense)              |
| [Everkinetic](https://github.com/everkinetic/data)              | Dessins du mouvement (départ et arrivée)  | CC BY-SA 4.0                            |
| [wger](https://wger.de)                                         | Quelques dessins complémentaires          | CC BY-SA (auteur noté sur chaque fiche) |
| [MuscleMapJS](https://github.com/abdofallah/MuscleMapJS)        | Silhouettes des muscles                   | MIT                                     |
| [Lucide](https://lucide.dev)                                    | Icônes                                    | ISC                                     |
| Ionic, Vue, Capacitor et les autres bibliothèques               | Code de l'appli                           | MIT, ISC, BSD, Apache 2.0               |

Les règles d'entraînement (fourchettes de reps, volume par muscle, progression, repos) s'appuient sur des publications citées dans l'appli (onglet **Bien débuter**) et dans [SPEC.md](SPEC.md). Les consignes traduites sont une traduction automatique, signalée comme telle sur chaque fiche, avec le texte original à la demande.

Les captures d'écran ci-dessus contiennent des dessins Everkinetic (CC BY-SA 4.0).

## 🤝 Contribuer

Les contributions sont les bienvenues : lis [CONTRIBUTING.md](CONTRIBUTING.md) pour l'installation, les règles de code, les tests attendus et le déroulé d'une pull request.
