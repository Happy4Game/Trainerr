# Retour utilisateur : une séance Pull jouée de bout en bout

_26 octobre 2026. Séance jouée dans le navigateur (Playwright, Chromium), écran de téléphone de 360 × 760 px en mode tactile, appli construite comme en production (`vite build`). Les taps sont comptés par le script, sans les saisies au clavier ni le défilement._

## Le scénario

Un pratiquant de 78 kg, qui ne fait pas encore de tractions sans aide, va à la salle pour une séance de tirage :

1. Il met une étoile aux **tractions assistées** et note son poids dans **Réglages → Mon profil**.
2. Il lance la séance type **Pull** depuis **Séance → Séances types**.
3. Tractions assistées, 4 séries ; il rallonge un repos de 30 s, en passe un autre.
4. Il croit être sur le **rowing barre** et y note 2 séries, alors qu'il était sur le **tirage horizontal assis** (la barre était prise). Il corrige.
5. Il finit la séance.

## Nombre de taps

| Étape                                            | Taps          | Remarque                                                                 |
| ------------------------------------------------ | ------------- | ------------------------------------------------------------------------ |
| Étoile + poids du corps                          | 2             | + la saisie du poids                                                     |
| Ouvrir les séances types, lancer Pull            | 2             | après la correction, le lien est sous « Commencer la séance »            |
| Une série                                        | **1**         | charge et reps déjà remplies, un appui sur le ressenti enregistre        |
| Repos : +30 s ou Passer                          | 1             | facultatif, le repos se termine seul                                     |
| Changer de machine entre deux exercices          | 1             | « Je suis sur la machine »                                               |
| Corriger 2 séries notées sur la mauvaise machine | 2 (avant : 3) | + taper le nom de la bonne machine                                       |
| Séance Pull complète (16 séries, 5 machines)     | ≈ 21          | 16 séries + 4 changements de machine + « Terminer », repos laissés finir |

## Ce qui marche bien

- **Une série = un tap** : charge et reps pré-remplies, quatre gros boutons de ressenti (64 px de haut, mot + couleur + aide « 1 ou 2 en réserve »). Utilisable d'une main avec le pouce.
- **Le conseil est lisible d'un coup d'œil** : « ↑ Baisse l'aide : 35 kg × 6 », avec la raison (« La série précédente était facile ») et un liseré vert quand on progresse.
- **Tractions assistées comptées à l'envers** : « Aide » à la place de « Charge », la charge réelle écrite dessous (« Charge réelle : 43 kg (78 kg de poids du corps − 35 kg d'aide) »), et le bouton − s'appelle « Moins d'aide (plus dur) ». On comprend sans explication.
- **Le minuteur de repos** est en haut, gros (2:30 lu de loin), avec −15 s / +30 s / Passer et la durée propre à l'exercice (2 min 30 pour les tractions, 2 min pour le rowing).
- **Le changement de machine est clair** : écran « Machine suivante » avec le dessin, puis « Exercice 2 sur 5 » et la barre de progression.
- **Les séances types expliquent l'ordre** : chaque exercice a sa ligne « Polyarticulaire lourd · Le plus exigeant du tirage… », et l'encart « Pourquoi cet ordre ? » cite ses sources sans jargon.
- **La correction garde un historique juste** : après le déplacement, les 2 séries apparaissent sur le tirage horizontal assis, et le rowing barre revient dans les exercices à faire.

## Ce qui n'allait pas, et ce qui a été corrigé

| #   | Problème constaté                                                                                                                                            | Gravité | Correction                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Après « Mauvaise machine ? », l'appli restait sur le rowing barre alors que j'étais sur le tirage horizontal : la 3e série serait partie au mauvais endroit. | **Bug** | La bonne machine devient l'exercice en cours (« Série 3 sur 3 »). Test ajouté.                                                          |
| 2   | En lançant une séance type, l'écran restait défilé en bas : le minuteur et le haut de la série étaient hors de l'écran.                                      | Fort    | L'écran remonte en haut au lancement de la séance.                                                                                      |
| 3   | Première fois aux tractions assistées : 75 kg d'aide proposés pour 78 kg, soit 3 kg de charge réelle. Absurde.                                               | Fort    | Paliers d'aide par défaut de 5 à 60 kg, et première série à environ la moitié du poids du corps (40 kg d'aide pour 78 kg). Test ajouté. |
| 4   | « Mauvaise machine ? » était au bas de la fenêtre « Corriger la série », sous le pli : 3 taps et un défilement.                                              | Moyen   | Raccourci « Mauvaise machine ? » à côté de « Corriger », sous la dernière série : 2 taps.                                               |
| 5   | Dans les listes (programme, séries de la séance), « Tractions assistées — 75 kg » laissait croire à 75 kg soulevés.                                          | Moyen   | Écrit « aide 75 kg » partout pour les machines d'assistance.                                                                            |
| 6   | Les séances types n'étaient accessibles qu'en bas de l'onglet Séance, après tout le reste.                                                                   | Moyen   | Lien « Ou une séance type : Push, Pull, Jambes… » juste sous les boutons de lancement.                                                  |

Pendant le développement, la même démarche avait déjà trouvé un bug : fermer la fenêtre de choix de machine en même temps que celle de correction laissait l'écran de séance bloqué pour le lecteur d'écran et les taps. Corrigé avant la livraison, avec un test.

## Pistes de la première séance, traitées ensuite

- **Écran de repos allégé** : pendant le repos, le minuteur et la série suivante viennent d'abord ; « Corriger », « Mauvaise machine ? », « ← Revenir » et « +1 série » sont repliés sous une ligne « ✓ Dernière série … · Corriger, revenir… ».
- **Machines d'une séance type** : le récap de fin liste les machines utilisées qui ne sont pas dans « Mes machines », avec « Ajouter ces N machines à mes machines » (1 tap).
- **Choix de la bonne machine** : « Mauvaise machine ? » et « Un autre exercice… » proposent en tête les machines du même mouvement, marquées « Même mouvement » ; plus besoin de taper le nom (2 taps au total).

# Deuxième séance test : un débutant et un pratiquant avancé

_26 octobre 2026, même méthode (360 × 760 px, tactile, build de production)._

## Les deux profils

- **Débutant, 75 kg estimés, aucune donnée** : il répond au questionnaire (« Prendre du muscle », 3 séances, « Je débute », 1 h, pas d'autre sport, aucune zone), puis fait la séance **Full body débutant** sans rien régler.
- **Avancé** : il passe le questionnaire, fait **Push** (développé couché tapé à 100 kg, développé incliné pris donc remplacé, saisie rapide entre les séries, repos passés), puis **Jambes** (squat tapé à 140 kg).

## Nombre de taps

| Parcours                                          | Taps       | Remarque                                                         |
| ------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| Questionnaire complet                             | 14         | une question par écran, « Suivant » à chaque fois                |
| Débutant : de l'onglet Séance au premier exercice | 3 → **1**  | encart « Tu débutes ? » ajouté en tête                           |
| Débutant : Full body (15 séries, 5 machines)      | 35         | 15 séries + 4 « Je suis sur la machine » + 15 repos passés + fin |
| Avancé : charge de travail tapée la première fois | 1 + saisie | toucher la charge, taper 100, Entrée                             |
| Avancé : machine prise puis reprise               | 3          | « Machine occupée », « Je prends celle-ci », « Oui, j'y vais »   |
| Avancé : Push complet (16 séries, repos passés)   | 47         | dont 2 charges tapées et l'ajout des machines en fin de séance   |

## Ce qui marche bien

- **Une main suffit** : toutes les actions de la série sont des boutons de 48 à 64 px ; seul le premier passage sur une machine demande le clavier (avancé).
- **Lisibilité en salle** : charge et reps en gros chiffres, conseil en une ligne en gras, minuteur lisible de loin, écran « Machine suivante » avec le dessin.
- **Avancé** : après une série à 100 kg × 7 « Correct », l'appli propose « ↗ Vise une rep de plus : 100 kg × 8 » ; après « Limite », elle garde la charge. La machine prise revient d'elle-même après l'exercice suivant (« … est libre ? »).
- **Débutant** : il n'a rien à comprendre pour commencer ; la fourchette, la charge et le repos sont réglés par la séance type.

## Problèmes trouvés, et corrigés

| #   | Problème constaté                                                                                                                                                                                                    | Gravité  | Correction                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | Première fois sur une machine sans charge notée : la série test était au plus petit palier (presse 5 kg, tirage 5 kg, haltères 2 kg). Absurde pour tous, et dangereux de faire croire à un débutant qu'il progresse. | **Fort** | Série test calculée sur le poids du corps (presse 45 kg, développé machine 20 kg, tirage 30 kg pour 75 kg ; haltères au tiers). Parts à valider par un coach. Tests ajoutés. |
| 8   | Planche et exercices au poids du corps : « 5 kg × 30 » proposé d'office (le palier 0 était perdu).                                                                                                                   | **Bug**  | Pas de lest par défaut ; affichage « Lest : Aucun », « poids du corps × 30 s ».                                                                                              |
| 9   | Un échauffement était conseillé avant la série test, déjà légère.                                                                                                                                                    | Moyen    | Pas d'échauffement avant une série test.                                                                                                                                     |
| 10  | Après « Je débute », l'onglet Séance proposait une pré-séance avec squat et développé couché à la barre ; la séance débutant était à 2 écrans.                                                                       | Fort     | Encart « Tu débutes ? Commence ici » en tête pendant les 3 premières séances : Full body débutant en 1 tap.                                                                  |
| 11  | « Extension lombaire · 0 kg » dans les listes.                                                                                                                                                                       | Faible   | « poids du corps » à la place de « 0 kg ».                                                                                                                                   |

## Ce qui reste à améliorer (pas corrigé)

- **Avancé, première séance** : chaque nouvel exercice demande de taper sa charge de travail. Piste : à la fin du questionnaire « Je m'entraîne déjà », proposer de noter ses charges habituelles (l'import CSV et « Ma charge » sur la fiche existent, mais ne sont pas proposés à ce moment).
- **Série test du débutant** : après « Correct » sur la série test, la charge reste la même ; il faut dire « Facile » pour monter. Le texte d'aide le dit, mais une question explicite (« C'était trop léger ? ») serait plus claire.
- **Questionnaire** : 14 taps ; « Suivant » pourrait être implicite quand une seule réponse est possible. ✅ Fait le 27 oct. 2026 (avec les deux pistes ci-dessus).
- **Notification de séance et mise à jour** : vérifiées à la compilation de l'APK (debug et release signé) et par les tests web, pas encore sur un vrai téléphone (Android 13+ : permission, compte à rebours écran verrouillé, alerte de fin de repos, installation d'une mise à jour).
