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

## Ce qui reste à améliorer (pas corrigé)

- **Beaucoup de choses au-dessus de l'exercice pendant le repos** : « Précédent : … ← Revenir · +1 série », le minuteur, la dernière série. Sur un petit écran, les boutons de ressenti passent sous le pli et il faut faire défiler pour la série suivante. Piste : replier « Précédent » dans le programme de la séance.
- **Une machine utilisée via une séance type n'est pas ajoutée à « Mes machines »** : la séance du jour suivante ne la proposera pas d'elle-même. Piste : proposer « Ajouter ces machines à mes machines » sur le récap de fin.
- **Recherche dans le sélecteur de machine** : il faut taper le nom. Pour « Mauvaise machine ? », les machines du même mouvement pourraient être proposées en premier, comme dans « Changer de machine ».
- **Notification de séance et mise à jour** : vérifiées à la compilation de l'APK (debug et release signé) et par les tests web, mais pas encore sur un vrai téléphone : à tester sur Android 13+ (permission des notifications, compte à rebours écran verrouillé, alerte de fin de repos, installation d'une mise à jour).
