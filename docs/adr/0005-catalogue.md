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

Dans le navigateur, la toute dernière écriture peut être perdue si la page est rechargée pendant l'enregistrement (voir ADR 0002 pour le correctif qui évite de perdre toute la base). L'écran affiche « Paliers enregistrés » une fois l'écriture terminée. Sur téléphone, la base SQLite native n'a pas ce problème.

## Illustrations (mise à jour du 2026-10-25)

- **Source principale : [Everkinetic](https://github.com/everkinetic/data)** (CC BY-SA 4.0), figé au commit `446bb9a`. Dessins au trait du départ et de l'arrivée du mouvement. `scripts/update-exercise-images.mjs` associe à la main chaque fiche du catalogue à un exercice Everkinetic qui montre le même geste (environ 210 associations, vérifiées dessin par dessin).
- Le dépôt Everkinetic range à part 99 images d'**origine inconnue** (`src/images-png-unknown`) : les 4 exercices concernés sont écartés. Les dessins vectoriels sont pris en priorité, sinon les images de l'ancien site everkinetic.com (même projet, même licence).
- **Modifications** (à signaler selon CC BY-SA) : redimensionnés à 480 px, passés en 8 niveaux de gris (≈ 10 Ko par image, 4,7 Mo en tout). Les images modifiées restent sous CC BY-SA 4.0.
- **Secours : wger.de**, pour les machines qu'Everkinetic ne dessine pas. Seuls les auteurs Everkinetic et wger.de sont retenus : les envois d'autres utilisateurs de wger contiennent parfois des visuels commerciaux (filigrane « © HOIST Fitness Systems »).
- Exclus : images générées par IA ; ExerciseDB (conditions payantes, code AGPL), MuscleWiki (droits réservés), Gymvisual (licence payante).
- La fiche alterne les deux dessins pour montrer le geste (bouton pause ; côte à côte si le téléphone demande moins d'animations) et affiche sous l'image : exercice illustré, auteur, licence, lien vers la source. La page Crédits liste les auteurs et signale les modifications.
- La démonstration animée maison (silhouette SVG) a été retirée à la demande de Thibaut, au profit de ces dessins.
- Sans illustration pour l'instant : élévations latérales machine, rowing divergent, face pull, reverse fly machine, gainage (planche), et les exercices peu courants. Ils gardent la silhouette des muscles et les consignes.

## Traduction des consignes (ajout du 2026-10-25)

- Les consignes de free-exercise-db (448 exercices, environ 63 000 mots) sont traduites en français dans `src/data/catalog/instructions-fr.json`, livré avec l'appli : rien n'est envoyé à un service de traduction, l'appli reste hors ligne.
- Traduction faite par une IA (Claude) pendant le développement, une phrase par étape, tutoiement, unités converties (pouces → cm, livres → kg). Un test vérifie que chaque exercice a sa traduction avec le même nombre d'étapes.
- La fiche l'annonce (« Traduction automatique de l'anglais : elle peut contenir des erreurs ») et propose « Voir le texte original ». Une traduction dont le nombre d'étapes ne correspond plus à la source (mise à jour de free-exercise-db) n'est pas affichée : la fiche retombe sur l'anglais.
- En anglais, les consignes écrites à la main en français affichent leur version anglaise, avec le français d'origine à la demande.
