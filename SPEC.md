# Cahier des charges — App de suivi muscu

Oct 24, 2026 · @Thibaut

## Vision

L'application remplace un coach de salle : elle dit quelle séance faire aujourd'hui, quelle charge mettre sur chaque machine, et ajuste la suite selon chaque série saisie. Elle reproduit le suivi fait en conversation avec Claude depuis le 15 octobre 2026.

- **Utilisateur cible** : pratiquant en salle (débutant à intermédiaire), objectif hypertrophie, qui veut un plan simple sans réfléchir entre deux séries.
- **Usage principal** : sur téléphone, à la salle, une main occupée. Chaque saisie doit tenir en 2 à 3 tapes.
- **Promesse** : « Ouvre l'appli, elle te dit quoi faire, tu notes tes reps, elle s'occupe du reste. »

## Fonctionnalités

L'appli tient en cinq écrans principaux : Aujourd'hui, Séance en cours, Catalogue, Historique, Planning.

| Fonction | Ce que fait l'utilisateur | Ce que fait l'appli |
| --- | --- | --- |
| Catalogue machines | Parcourt, cherche par nom ou muscle | Liste toutes les machines, avec fiche et schéma |
| Favoris | Met une étoile sur les machines de sa salle | Ne propose que les favoris dans les séances |
| Saisie d'une série | Tape charge, reps, difficulté | Enregistre, calcule le 1RM estimé |
| Difficulté de la série | Choisit Facile / Correct / Limite / Échec | Sert au calcul de la charge suivante |
| Proposition de charge | Accepte ou modifie | Propose la charge de la série ou de la séance suivante |
| **Mode « machine prise »** | Tape « occupée » sur un exercice | Propose une alternative, garde l'exercice en attente (détail ci-dessous) |
| Paliers de la machine | Renseigne les plaques dispo (ex. 52 → 59 kg), les poids d'appoint (1,25 / 2,5 kg) et la précision de saisie | Arrondit les propositions au palier réel, plaque + appoint compris ; une charge tapée est arrondie à 0,5 kg au plus fin |
| Machines d'assistance | Note l'aide (tractions, dips assistés) et son poids du corps | Compte à l'envers : charge réelle = poids − aide, moins d'aide = progression |
| Corriger une séance | Change de machine, ajoute / retire / réordonne exercices et séries, déplace des séries notées sur la mauvaise machine | Garde un historique juste pour chaque machine |
| Planning auto | Indique ses jours et créneaux libres | Génère la semaine selon le modèle choisi |
| Gêne / douleur | Signale « ça tire » + zone | Adapte la séance, affiche les signaux d'alerte |
| Récap et stats | Consulte | Récap de séance, page statistiques |
| Conseils technique | Ouvre la fiche | Consignes clés et erreurs fréquentes |

**Mode « machine prise »**, fonction phare

1. Un bouton « Occupée » sur chaque exercice de la séance, accessible d'une tape.
2. L'appli propose 2 ou 3 alternatives qui travaillent les mêmes muscles, parmi les favoris, avec la charge déjà calculée (ex. seated row pris → diverging seated row ou rear delt).
3. L'exercice occupé passe en file d'attente : l'appli le repropose après l'exercice suivant (« Le seated row est libre ? »).
4. Si l'exercice reste occupé jusqu'à la fin, il est reporté à la prochaine séance du même type, et le compteur de séries par muscle en tient compte.
5. **Salle bondée** : dès 2 machines occupées, l'appli propose de refaire la fin de séance avec haltères et poulies, mêmes muscles visés.
6. L'appli retient les machines souvent prises, et à terme les place plus tôt ou plus tard dans la séance.

**Saisie d'une série — règle d'ergonomie** : la charge et les reps sont pré-remplies avec la proposition. L'utilisateur ne corrige que ce qui change, puis choisit la difficulté en une tape. Les reps partielles se notent en demi-rep (ex. 8,5).

## Moteur de progression

La charge monte d'un palier quand les reps dépassent le haut de la fourchette ou que la série est jugée Facile ; elle ne monte jamais sur une série Limite ou Échec.

**Fourchettes de reps par type d'exercice**

| Type | Exemples | Fourchette | Repos |
| --- | --- | --- | --- |
| Composé lourd | DC, leg press, lat pulldown | 8–10 | 1 min 30 – 2 min |
| Composé machine | Seated row, shoulder press | 10–12 | 1 min 30 |
| Isolation | Pec fly, curl, lateral raise, pushdown | 12–15 | 1 min – 1 min 30 |

**Règles entre deux séries (même séance)**

1. Reps au-dessus de la fourchette, ou difficulté Facile → +1 palier.
2. Reps dans la fourchette, difficulté Correct ou Limite → même charge.
3. Reps sous le bas de la fourchette, ou Échec → −1 palier (ou arrêt de l'exercice si c'est la dernière série).
4. Une rep incomplète (amplitude non atteinte) ne compte pas.

**Règles entre deux séances (même exercice)**

1. Toutes les séries au haut de la fourchette → +1 palier à la séance suivante.
2. Charge montée en cours de séance et tenue → nouvelle charge de départ.
3. Échec répété 2 séances de suite → −1 palier et rappel technique.

**Cas particuliers**

- **Reprise après une pause** : charge de départ = 70 % de l'ancienne référence, pendant 2 semaines.
- **Première fois sur une machine** : série test légère, puis la règle 1 ou 3 s'applique.
- **Palier absent** (ex. 55 kg demandé, la machine passe de 52 à 59) : rester au palier bas et monter la fourchette de reps (12 → 15) avant de sauter.
- **Tempo lent** (descente 2–3 s) : la série est marquée, et exclue des comparaisons de 1RM.
- **Machine d'assistance** (tractions, dips) : les règles tournent sur la charge réelle (poids du corps − aide) puis redonnent l'aide à régler ; première fois : environ la moitié du poids du corps. Courbes et records sur la charge réelle.

**Force estimée** — chaque série calcule un 1RM estimé (formule d'Epley), utilisé pour les stats :

```latex
1RM = charge \times \left(1 + \frac{reps}{30}\right)
```

## Modèles d'entraînement

L'appli propose 7 modèles ; le questionnaire en recommande un selon le nombre de séances, et l'utilisateur peut en changer à tout moment.

| Modèle | Principe | Séances / semaine | Fréquence par muscle | Pour qui |
| --- | --- | --- | --- | --- |
| Full body | Tout le corps à chaque séance | 2–4 (souvent 3) | 2–3 fois | Débutant, peu de temps |
| Haut / Bas (Upper/Lower) | Haut du corps un jour, bas du corps le suivant | 4 | 2 fois | Intermédiaire, le plus polyvalent |
| Push / Pull / Legs | Poussée, tirage, jambes | 3 ou 6 | 1 ou 2 fois | Intermédiaire, 6 séances pour l'hypertrophie |
| PPLUL | PPL puis Haut / Bas, en hybride | 5 | 2 fois | Intermédiaire, 5 jours dispo |
| PHUL | Haut / Bas en 4 jours : 2 séances lourdes (force), 2 séances volume (hypertrophie) | 4 | 2 fois | Intermédiaire, force + muscle |
| Arnold split | Pecs + dos / épaules + bras / jambes, deux fois | 6 | 2 fois | Avancé, beaucoup de volume |
| Split par muscle (« bro split ») | Un groupe musculaire par jour | 5 | 1 fois | Proposé, mais signalé moins efficace |

**Séances types** : Push, Pull, Jambes, Full body débutant et Haut / Bas, prêtes à lancer. Ordre polyarticulaire lourd → polyarticulaire secondaire → isolation, jamais l'isolation d'un muscle avant son polyarticulaire ; chaque exercice dit pourquoi il est à cette place, avec les sources ([ACSM 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/), [Simão 2012](https://pubmed.ncbi.nlm.nih.gov/22292516/), [Nunes 2021](https://doi.org/10.1080/17461391.2020.1733672)).

**Règle d'affichage** : un modèle qui ne travaille chaque muscle qu'1 fois par semaine affiche une note, car la méta-analyse de Schoenfeld (2016) montre de meilleurs résultats à 2 fois par semaine, à volume égal.

Sources : [StrengthLog — comparatif des splits](https://www.strengthlog.com/best-workout-splits/), [Power Lifting Technique — PHUL](https://powerliftingtechnique.com/phul-workout-program-power-hypertrophy-upper-lower/).

## Option superset

Un superset enchaîne deux exercices sans repos ; une méta-analyse de 2025 (Sports Medicine, 19 études) le trouve aussi efficace que les séries classiques pour l'hypertrophie, en raccourcissant la séance.

**Ce que dit l'étude** : les supersets réduisent la durée des séances sans baisser le volume, la récupération perçue, ni les gains de force et de muscle. Les supersets agoniste-antagoniste (deux muscles opposés) permettent même de faire plus de reps. En revanche, deux exercices pour le même muscle diminuent la charge totale soulevée ([dépôt Leeds Beckett](https://eprints.leedsbeckett.ac.uk/id/eprint/11908)).

| Type | Exemple avec les machines | Proposé par l'appli |
| --- | --- | --- |
| Agoniste-antagoniste | Leg extension + leg curl ; curl + triceps pushdown | Par défaut |
| Haut / bas du corps | Pec fly + leg curl | Si machines proches |
| Même muscle | Pec fly + chest press | Non par défaut, signalé « réduit le volume » |

**Fonctionnement dans l'appli**

- Interrupteur « Supersets » dans les Réglages, et proposition automatique quand la durée moyenne d'une séance est de 30 ou 45 min.
- Les deux exercices s'affichent ensemble ; la saisie passe de l'un à l'autre, puis un minuteur de repos se lance après le second.
- Les composés lourds (DC, leg press) restent en séries classiques : l'appli ne les met jamais en superset.
- Pas de superset si une zone à ménager est concernée par les deux exercices.

## Planification automatique

L'appli choisit la séance du jour en suivant la rotation Push → Pull → Legs, à partir de la dernière séance faite, et non d'un calendrier fixe.

**Entrées de l'utilisateur**

- Jours et créneaux disponibles (ex. semaine après 21h, week-end le matin)
- Créneaux bloqués (cours, livraisons à vélo, sorties)
- Nombre de séances visé par semaine (4 à 6)

**Règles de génération**

1. Rotation PPL continue : si une séance est sautée, la suivante reste la même, rien n'est perdu.
2. Variantes A / B en alternance pour chaque type (Push A, Push B…), afin d'utiliser toutes les machines favorites.
3. Au moins 1 jour de repos complet par semaine.
4. Autres sports déclarés au questionnaire : leurs créneaux sont bloqués, et la séance qui sollicite les mêmes muscles n'est pas placée juste avant ou juste après (ex. pas de Legs après une sortie vélo).
5. Chaque muscle vise 2 passages par semaine et 10 à 20 séries par semaine ; l'appli affiche le compteur hebdo par muscle.
6. Chaque séance : 3 à 4 exercices composés puis 2 à 3 d'isolation, composés en premier.

**Exemple de semaine générée** (6 séances possibles)

| Lun | Mar | Mer | Jeu | Ven | Sam | Dim |
| --- | --- | --- | --- | --- | --- | --- |
| Push A | Pull A | Legs A | Push B | Pull B | Legs B | Repos |

## Conseils et alertes

Les conseils sont des règles écrites à l'avance, déclenchées par ce que l'utilisateur saisit — pas un diagnostic. L'appli ne remplace jamais un médecin ou un kiné et le dit.

| Déclencheur | Réponse de l'appli |
| --- | --- |
| Gêne signalée, zone « avant de l'épaule » | Retire les exercices de poussée restants, propose chaleur et repos, affiche les signaux d'alerte |
| Même gêne sur 2 séances de la semaine | Réduit à 1 exercice d'épaule par Push, conseille de consulter un kiné si ça persiste |
| Signaux d'alerte (douleur vive, articulaire, au repos, fourmillements) | Écran d'arrêt : stopper la séance, consulter ; douleur thoracique + essoufflement → appeler le 15 |
| Reps incomplètes saisies | Rappel d'amplitude et proposition de −1 palier |
| « Je ne sens pas le muscle » | Fiche consignes de l'exercice (ex. lat pulldown : épaules basses, coudes vers les hanches) |
| Séance courte en volume | Affiche les séries manquantes pour la semaine sur ce muscle |
| Courbatures signalées | Explique la différence courbature / douleur, garde le plan |

**Conseils de technique** : chaque fiche machine porte 3 à 4 consignes courtes, rédigées à partir de sources vérifiées (voir Sources).

## Questionnaire du premier lancement

Au premier lancement, 6 écrans d'une question chacune règlent tout le programme ; chaque réponse se modifie ensuite dans les Réglages.

1. **Ton objectif ?** Hypertrophie (prendre du muscle) · Entretien (garder sa forme) · Force
2. **Combien de séances par semaine ?** 2 à 6, curseur
3. **Ton niveau ?** Je débute · Je m'entraîne déjà · Je reprends après une pause (→ mode reprise)
4. **Quand es-tu disponible ?** Jours et créneaux sur une grille semaine, avec les créneaux bloqués
5. **Combien de temps dure une séance pour toi, en moyenne ?** 30 min · 45 min · 1 h · 1 h 30
6. **Tu pratiques un autre sport ?** Non · Oui → lequel (liste + champ libre) et combien de fois par semaine
7. **Une zone à ménager ?** Épaules · Genoux · Dos · Aucune (sert à filtrer et alléger certains exercices)

**Ce que les réponses règlent**

| Réponse | Paramètre réglé |
| --- | --- |
| 2–3 séances | Programme Full body (chaque muscle à chaque séance) |
| 4 séances | Haut / Bas du corps, 2 fois chacun |
| 5–6 séances | Push / Pull / Legs, variantes A et B |
| Hypertrophie | 10 à 20 séries par muscle et par semaine, fourchettes de la section Moteur de progression |
| Entretien | Volume réduit (choix de conception à valider, environ la moitié), mêmes fourchettes |
| Durée moyenne d'une séance | Nombre d'exercices et de séries par séance (3 exercices pour 30 min, 4 pour 45 min, 5–6 pour 1 h) |
| Autre sport | Créneaux bloqués dans le planning + exercices complémentaires mis en avant (tableau ci-dessous) |
| Zone à ménager | Exercices déconseillés masqués, alertes plus sensibles sur cette zone |

**Machines mises en avant selon l'autre sport** (règles de départ, à faire valider par un coach ou un préparateur physique)

| Sport déclaré | Ce que le sport travaille déjà | Machines proposées en priorité | Effet sur le planning |
| --- | --- | --- | --- |
| Vélo (dont livraison) | Quadriceps, cardio | Leg curl, back extension, hip abduction, tout le haut du corps | Pas de Legs le jour même ni le lendemain |
| Course à pied | Mollets, quadriceps | Leg curl, leg press, gainage | Legs loin des sorties longues |
| Football | Jambes, explosivité | Leg curl, adduction, gainage | Legs loin des matchs |
| Natation | Dos, épaules | Rear delt, seated row, jambes | Volume d'épaules réduit |
| Sports de combat | Épaules, gainage, cardio | Lat pulldown, seated row, jambes | Push loin des entraînements |
| Autre (champ libre) | À préciser par l'utilisateur | Programme standard | Créneaux bloqués seulement |

Une machine proposée en priorité apparaît en premier dans les séances et dans le catalogue, avec la mention « complète ton sport ».

Un bouton « Passer » mène directement au catalogue avec des valeurs par défaut : hypertrophie, 4 séances, séance de 1 h, pas d'autre sport.

## Mode reprise

L'utilisateur saisit ses anciennes performances et la durée de sa pause ; l'appli calcule une charge de départ réduite, puis affiche sa remontée vers 100 % exercice par exercice.

**Saisie**

- Durée de la pause : moins d'1 mois · 1 à 3 mois · plus de 3 mois
- Par exercice : ancienne charge × reps (ex. DC haltères 22 kg × 2 haltères), saisie libre ou depuis le catalogue
- Les anciennes perfs sont converties en 1RM estimé, pour comparer des séries aux reps différentes

**Charge de départ proposée** (choix de conception à valider ; le cas réel d'octobre 2026 utilisait 70 % après 6 mois)

| Pause | Départ | Volume les 2 premières semaines |
| --- | --- | --- |
| Moins d'1 mois | 90 % | Normal |
| 1 à 3 mois | 80 % | 3 séries par exercice |
| Plus de 3 mois | 70 % | 3 séries par exercice |

**Pendant la reprise**

- Le moteur de progression normal s'applique : la charge remonte dès que les séries sont faciles, sans attendre une date.
- Chaque exercice affiche une jauge « retour à l'ancien niveau » (ex. DC haltères : 18 / 22 kg = 82 %).
- Quand un exercice atteint 100 %, l'appli le signale et l'ancienne référence est remplacée par la nouvelle.
- Alertes plus sensibles les 2 premières semaines : une gêne signalée réduit tout de suite le volume de la zone concernée.

**Exemple réel** : leg press à 127 kg avant la pause → départ à 90 kg → 107 kg × 10 sept jours plus tard (84 %).

## Page statistiques

La page répond à deux questions, « est-ce que je progresse ? » et « est-ce que je suis régulier ? », avec des chiffres calculés à partir des séries saisies.

[embedded content: maquette de la page stats · 3 indicateurs, 2 graphiques]

Le calendrier reprend les vraies séances d'octobre 2026 ; la courbe est un exemple de forme.

| Indicateur | Calcul | Affichage |
| --- | --- | --- |
| Évolution de la force | 1RM estimé (Epley) de la meilleure série, par séance et par exercice | Courbe, filtre 1 mois / 3 mois / 1 an |
| Charge de travail | Somme charge × reps par séance | Courbe hebdomadaire |
| Séries par muscle | Séries de la semaine par muscle (composés comptés pour chaque muscle principal) | Barres, avec la zone 10–20 en fond |
| Régularité | Jours avec séance | Calendrier type « heatmap » |
| Semaines au rythme | Semaines où le nombre de séances visé est atteint, à la suite | Chiffre + record |
| Records | Meilleure charge et meilleur 1RM estimé par exercice | Liste, avec date |
| Retour à l'ancien niveau | Charge actuelle / ancienne référence (mode reprise) | Jauge par exercice |

Les séries d'échauffement et les séries en tempo lent sont exclues des courbes de force.

## Notifications de motivation

L'appli envoie au maximum 1 notification par jour, uniquement si l'utilisateur l'a accepté, et toujours en lien avec son propre planning ou ses propres résultats.

| Type | Déclencheur | Exemple de message |
| --- | --- | --- |
| Rappel de séance | Séance prévue dans le planning, 1 h avant le créneau | « Push A ce soir à 21h : DC à 18 kg au programme. » |
| Relance douce | Aucune séance depuis 3 jours de plus que le rythme visé | « Ça fait 4 jours. Une séance courte de 30 min, ça te dit ? » |
| Record battu | Nouveau record de charge ou de 1RM estimé | « Nouveau record au leg press : 107 kg × 10. » |
| Régularité | Semaine au rythme visé atteinte | « 3e semaine d'affilée au rythme. Continue. » |
| Retour au niveau | Un exercice atteint 100 % en mode reprise | « Tu as retrouvé ton niveau d'avant au DC haltères. » |
| Conseil | 1 fois par semaine au plus, fiche de la page « Bien débuter » | « Le savais-tu ? Machines et poids libres font autant grossir le muscle. » |

**Règles**

- **Permission demandée au bon moment** : après le questionnaire, avec une phrase qui explique à quoi servent les notifications, jamais au premier écran. Android (depuis la version 13) et iOS exigent une autorisation explicite.
- **Plafond** : 1 notification par jour, aucune pendant les heures de silence (par défaut 22h–8h, réglable) ni pendant les créneaux bloqués (cours, autre sport).
- **Ton** : encourageant, jamais culpabilisant ; pas de « tu as raté », pas de compte à rebours, pas de fausse urgence.
- **Réglages** : chaque type s'active ou se désactive séparément, plus un interrupteur général.
- **Pas de relance** si une gêne ou une douleur a été signalée récemment : le repos passe avant.
- **Technique** : notifications locales programmées sur le téléphone (plugin Local Notifications de Capacitor). Aucun serveur, aucune donnée envoyée.
- **Arrêt automatique** : si 5 notifications de relance de suite restent sans effet, l'appli propose de baisser leur fréquence.

## Page « Bien débuter »

Une page de fiches courtes, classées par thème, chacune avec sa source ; l'appli en pousse une au bon moment (ex. la fiche courbatures le lendemain d'une première séance).

| Thème | Fiche | Source |
| --- | --- | --- |
| Technique | La technique passe avant la charge : une rep incomplète ne compte pas | Expérience terrain, à relire par un coach |
| Technique | S'échauffer : 1 série légère de 12–15 reps sur le premier exercice | Idem |
| Technique | Développé couché : coudes à 45° du corps, omoplates serrées | [BarBend](https://barbend.com/?p=54412), [Eric Cressey](https://ericcressey.com/5-lose-fat-gain-muscle-get-strong-move-better-62/) |
| Effort | Finir ses séries avec 1 à 2 reps en réserve, sans aller à l'échec à chaque fois | À sourcer |
| Progression | Monter la charge quand le haut de la fourchette de reps est atteint | Section Moteur de progression |
| Programme | Chaque muscle 2 fois par semaine, 10 à 20 séries par semaine | [Schoenfeld 2016](https://pubmed.ncbi.nlm.nih.gov/27102172/), [synthèse SBS](https://www.strongerbyscience.com/?p=56687) |
| Programme | Machines ou poids libres : même hypertrophie, choisis ce que tu préfères | [Haugen 2023](https://oda.oslomet.no/oda-xmlui/handle/11250/3107243) |
| Nutrition | Viser environ 1,6 g de protéines par kg et par jour | [Morton 2018](https://openrepository.aut.ac.nz/items/8dea98a4-4e37-4c60-be43-4b6ece0bd9a5/full) |
| Nutrition | Le collagène ne remplace pas les protéines classiques pour le muscle | [Revue systématique (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8521576/) |
| Récupération | Courbature (diffuse, 2–3 jours) ou douleur (vive, articulaire) : savoir les distinguer | À sourcer |
| Récupération | Le sommeil et 1 jour de repos par semaine font partie du programme | À sourcer |
| Santé | Des genoux qui craquent sans douleur, c'est fréquent et en général bénin | [BJSM 2024](https://bjsm.bmj.com/content/59/2/126) |
| Motivation | Une photo par mois, même lumière, même angle : plus parlant que le miroir | — |
| Savoir-vivre | Essuyer la machine, ranger les poids, partager la machine entre les séries | — |

Les fiches marquées « À sourcer » doivent recevoir une source vérifiée avant la publication de l'appli.

## Fiches machines et schémas

Chaque fiche montre la machine, les muscles colorés sur une silhouette et 3 à 4 consignes ; la base de départ vient d'un jeu de données ouvert, pas d'une saisie à la main.

**Contenu d'une fiche**

- Nom (FR + nom anglais affiché sur la machine, ex. « Seated Row »), alias (« poulie haute » = triceps pushdown)
- Groupe PPL, type (composé / isolation), matériel (machine guidée, poulie, haltères, barre)
- Muscles principaux et secondaires
- Silhouette avant/arrière en SVG, muscles principaux en couleur pleine, secondaires en couleur claire
- Consignes de technique et réglages (hauteur du siège, poignée)
- Photo de la plaque de la machine, prise par l'utilisateur (optionnel)

**Sources de données possibles**

| Source | Contenu | Licence | Usage proposé |
| --- | --- | --- | --- |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | 800+ exercices en JSON : matériel, muscles principaux et secondaires, consignes, images | Domaine public (Unlicense) | Base de départ du catalogue |
| [wger](https://wger.de/api/v2/) | 800+ exercices, API REST, muscles, images, plusieurs langues | Code AGPL ; contenus CC-BY-SA, attribution obligatoire | Complément, noms traduits |

La silhouette musculaire se dessine une seule fois en SVG, chaque muscle étant un chemin nommé (`pectoraux`, `deltoide_avant`…). La fiche colore les chemins listés dans les muscles de l'exercice. Les images de free-exercise-db sont à vérifier une à une avant un usage commercial : une base de données libre ne garantit pas que toutes ses images le soient.

## Fonctionnalités complémentaires

Trente fonctions qui rendent l'appli plus pratique à la salle, toutes livrées dans la même version que le reste.

| Fonction | Description |
| --- | --- |
| Minuteur de repos | Se lance à la validation d'une série, durée selon le type d'exercice (section Moteur de progression), vibration à la fin, visible sur l'écran verrouillé : notification Android permanente pendant la séance (exercice, série, compte à rebours) et alerte à la fin du repos |
| Mises à jour | Chaque version publiée sur GitHub (APK signé) est proposée par l'appli au démarrage, installée par l'installateur d'Android après accord ; désactivable |
| Échauffement calculé | Propose 1 série d'approche à environ 50–60 % de la charge de travail, 12–15 reps, sur le premier exercice et sur les composés lourds |
| Calculateur de disques | Voir la section suivante |
| Sauvegarde et export | Export CSV et JSON de toutes les données, import pour changer de téléphone |
| Saisie vocale | « 16 kilos, 10 reps, limite » → série remplie, à confirmer d'une tape ; reconnaissance vocale du téléphone, hors ligne si possible |
| Détection de stagnation | Aucun progrès du 1RM estimé sur 3 séances d'un exercice → propose une variante ou une semaine allégée (seuils à valider) |
| Suivi du corps | Poids, mensurations (bras, tour de taille…), photo mensuelle stockée dans l'appli seulement, comparaison avant / après |
| Suivi des protéines | Cible quotidienne = poids × 1,6 g ; ajout rapide par aliment favori (ex. escalope de poulet 150 g) |
| Défis entre amis | Comparer la régularité (séances, semaines au rythme), charges masquées par défaut ; seule fonction qui demande un serveur et des comptes, désactivée tant que l'utilisateur ne l'active pas |
| Montre connectée | Valider une série et voir le minuteur depuis le poignet |

**Autres fonctions**

| Fonction | Description |
| --- | --- |
| Plusieurs salles | Chaque salle a ses machines, ses paliers et ses favoris ; on choisit la salle au début de la séance (ex. salle habituelle, salle en vacances) |
| Séance express | Version de 20–30 min de la séance du jour : composés gardés, isolation réduite ou passée en superset |
| Widget écran d'accueil | Affiche la séance du jour et l'heure prévue ; une tape ouvre directement la séance |
| Réglages de machine mémorisés | Hauteur du siège, dossier, poignée, notés une fois et rappelés à chaque séance |
| Badges | Première semaine complète, 10 séances, record battu, retour au niveau d'avant… ; jamais de badge perdu ni de message culpabilisant |
| Image récap à partager | Carte de fin de séance ou de mois (séances, records, régularité), charges masquables, partage par le menu du téléphone |
| Cycles d'entraînement | Blocs de 4 à 6 semaines qui font varier les fourchettes de reps et le volume ; durée et contenu à valider par un coach |
| Notes de séance | Champ libre par séance (« mal dormi », « salle bondée »), affiché dans l'historique et à côté des courbes |
| Partage avec un coach | Export lisible du programme et de l'historique (PDF ou lien), pour qu'un coach le valide ou le corrige |
| Version anglaise | Tous les textes passent déjà par des fichiers de traduction : ajout de l'anglais, langue du téléphone par défaut |
| Bêta-test | Voir la section Stratégie de tests de non-régression |

**Entraînement et données**

| Fonction | Description |
| --- | --- |
| Calculateur « combien pour X reps ? » | À partir du 1RM estimé (formule d'Epley inversée), propose la charge pour 8, 10 ou 12 reps, arrondie au palier de la machine |
| Échauffement articulaire guidé | 3 à 5 min de mobilité avant la séance, choisie selon les muscles du jour ; contenu à faire valider par un coach ou un kiné |
| Mode maison | Séance de remplacement avec haltères ou élastiques, mêmes muscles visés, matériel déclaré dans les Réglages |
| Graphique dans chaque fiche machine | Historique de l'utilisateur sur cet exercice (1RM estimé, meilleure série) directement dans la fiche |
| Sauvegarde chiffrée sur son propre cloud | Fichier de sauvegarde chiffré sur le téléphone puis envoyé vers le cloud choisi (ex. Google Drive) ; désactivé par défaut |
| Import depuis d'autres applis | Import CSV depuis d'autres applis de muscu, si leurs formats d'export le permettent ; correspondance des noms d'exercices à valider par l'utilisateur |
| Lecteurs d'écran | Compatibilité TalkBack et VoiceOver : chaque bouton a un libellé, chaque graphique une description textuelle (ex. « 1RM estimé au leg press : en hausse de 4 % sur 7 jours ») |

**Équilibre et variété**

| Fonction | Description |
| --- | --- |
| Équilibre poussée / tirage | Compare chaque semaine les séries de poussée (pecs, avant d'épaule, triceps) et de tirage (dos, arrière d'épaule, biceps) ; si la poussée domine nettement (seuil à valider), alerte et propose d'ajouter du tirage, en priorité quand une gêne d'épaule a été signalée |
| Rappel de changement de programme | Après plusieurs cycles sur le même modèle (nombre à valider), propose d'essayer un autre modèle ou d'autres variantes A / B ; jamais imposé |

**Vie privée** : photos, mensurations et poids restent sur le téléphone, exclus de toute synchronisation par défaut, et suppressibles en un geste.

## Calculateur de disques

L'utilisateur tape la charge totale visée ; l'appli dessine un banc vu de face, la barre et les disques à mettre de chaque côté, un disque par couleur.

[embedded content: calculateur de disques · exemple à 70 kg]

L'exemple reprend ton ancienne référence au développé couché : 70 kg.

**Calcul**

1. Charge par côté = (charge visée − poids de la barre) ÷ 2.
2. On place les disques du plus lourd au plus léger, selon ceux disponibles dans la salle.
3. Si la charge exacte est impossible, l'appli propose les 2 charges réalisables les plus proches (en dessous et au-dessus).

**Réglages**

- Poids de la barre : 20 kg par défaut, 15 ou 10 kg possibles, ou valeur libre
- Disques disponibles et nombre de paires (ex. 25, 20, 15, 10, 5, 2,5, 1,25 kg)
- Colliers de serrage comptés ou non

**Affichage**

- Disques dessinés en SVG, hauteur selon le poids, dans l'ordre réel de chargement (le plus lourd contre le collier)
- Couleurs : s'inspirer du code des disques de compétition (25 kg rouge, 20 kg bleu, 15 kg jaune, 10 kg vert), à vérifier avant d'être figé
- Le poids reste toujours écrit sous chaque disque, pour ne pas dépendre de la couleur seule
- Boutons − / + pour ajuster d'un palier et voir les disques changer en direct
- Accessible depuis la saisie d'une série sur un exercice à la barre

## Modèle de données

Huit tables forment le cœur ; la série est l'unité centrale, tout le reste se calcule à partir d'elle.

| Table | Champs principaux | Relations |
| --- | --- | --- |
| `exercice` | id, nom, nom\_machine, alias\[\], groupe\_ppl, type, materiel, fourchette\_min, fourchette\_max | → muscles (n-n) |
| `muscle` | id, nom, zone\_svg, groupe | ← exercice |
| `exercice_muscle` | exercice\_id, muscle\_id, role (principal / secondaire) | table de liaison |
| `machine_salle` | id, exercice\_id, paliers\_kg\[\], favori, photo\_plaque, reglages, reglage\_machine (poids d'appoint, précision, siège, cran) | → exercice |
| `seance` | id, date, type (Push A, Pull B…), statut, note | → series |
| `serie` | id, seance\_id, exercice\_id, charge\_kg, reps (décimal), difficulte, echauffement, tempo\_lent, reps\_completes, gene\_zone | → seance, exercice |
| `reference` | exercice\_id, charge\_avant\_pause, date | sert à la règle des 70 % |
| `disponibilite` | jour, debut, fin, type (libre / bloqué / jambes fatiguées) | entrée du planning |

**Tables ajoutées pour les fonctions complémentaires** : `salle` (id, nom) reliée à `machine_salle` (+ salle\_id, reglages\_siege) ; `note_seance` (seance\_id, texte) ; `badge` (code, date\_obtenue) ; `mesure_corps` (date, poids, mensurations, photo locale) ; `cycle` (debut, fin, type).

**Valeurs fixes** : `difficulte` ∈ {Facile, Correct, Limite, Échec} ; `groupe_ppl` ∈ {Push, Pull, Legs, Gainage}.

**Données calculées, jamais stockées** : 1RM estimé, séries par muscle et par semaine, prochaine charge proposée, prochaine séance.

## Ressources libres et page Crédits

L'appli n'utilise que des ressources sous licence libre, et une page Crédits liste chaque ressource, sa licence et chaque source scientifique citée dans l'appli.

**Ressources retenues**

| Ressource | Usage | Licence | Obligation |
| --- | --- | --- | --- |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Catalogue d'exercices, muscles, consignes | Domaine public (Unlicense) | Aucune ; crédit par courtoisie. Images à vérifier une à une |
| [wger](https://wger.de/api/v2/) | Données complémentaires, noms traduits | Contenus CC-BY-SA 4.0 | Auteur + licence + lien sur chaque fiche concernée ; un contenu modifié garde la même licence |
| [MuscleMapJS](https://github.com/abdofallah/MuscleMapJS) | Silhouettes musculaires SVG cliquables (avant / arrière) | MIT | Garder la notice de licence |
| [Lucide](https://lucide.dev/license) | Icônes de l'interface | ISC (quelques icônes MIT, issues de Feather) | Garder la notice de licence dans le code distribué |
| Ionic, Vue.js, Capacitor | Framework de l'appli | MIT | Garder la notice de licence |
| SQLite | Base de données locale | Domaine public | Aucune |
| Polices (ex. Google Fonts) | Typographie | En général SIL Open Font License, à vérifier par police | Joindre la licence |

**Règles de choix**

- Licences acceptées pour le code : MIT, ISC, BSD, Apache 2.0, domaine public. Pas de code AGPL ni GPL intégré à l'appli (l'API wger sert uniquement de source de données).
- Contenus (textes, images) : domaine public, CC0 ou CC-BY ; CC-BY-SA seulement pour les fiches wger, avec attribution.
- Toute image ajoutée a sa licence notée dans la base ; une image sans licence connue n'est pas publiée.

**Page Crédits dans l'appli**

1. **Bibliothèques** : liste générée automatiquement à la compilation depuis les licences des dépendances (outil de type license-checker), avec le texte complet de chaque licence.
2. **Données** : free-exercise-db, wger, avec les attributions demandées.
3. **Sources scientifiques** : chaque étude citée dans une fiche ou un conseil (auteurs, année, revue, lien), regroupées par thème.
4. **Lien depuis chaque conseil** : un conseil affiche sa source en bas de fiche et renvoie vers la page Crédits.

## Page « À propos » et transparence sur l'IA

L'appli dit clairement qu'elle a été conçue avec une IA, guidée par une personne qui apprend ; ce texte est visible depuis les Réglages et en bas de la page Crédits.

**Texte proposé** (à reformuler librement)

> Cette application a été entièrement réalisée avec l'aide d'une intelligence artificielle, et guidée par moi, Thibaut, étudiant développeur qui essaie d'apprendre du mieux qu'il peut.
>
> Je ne suis ni coach ni professionnel de santé, et je ne suis pas parfait : il peut rester des erreurs. Les conseils de l'appli s'appuient sur des études citées dans les Crédits, mais ils ne remplacent pas l'avis d'un coach, d'un médecin ou d'un kiné.
>
> À la base, je ne suis pas fan de l'IA. Mais ici, c'est pour la bonne cause, et je trouve que ça marche bien.
>
> Toute aide est bonne à prendre : une erreur repérée, une idée, un conseil, n'hésite pas à me le dire.

**Dans l'appli**

- Un bouton « Signaler une erreur ou proposer une idée » sous le texte (formulaire, adresse e-mail ou page de suivi du projet, au choix)
- Rappel court au premier lancement, après le questionnaire : « Appli conçue avec l'IA par un étudiant, en savoir plus »
- Mention dans la description sur les stores d'applications

## Choix techniques et plan

Recommandation : **Vue.js + Ionic + Capacitor, données en SQLite sur le téléphone**, pour réutiliser tes compétences Vue et fonctionner sans réseau à la salle.

| Option | Pour | Contre |
| --- | --- | --- |
| Ionic Vue + Capacitor + SQLite | Tu connais Vue ; une base pour Android et iOS ; hors ligne | Couche native à apprendre (Capacitor) |
| WinDev Mobile + HFSQL | Tu le pratiques déjà (Outil\_VTC) | Licence payante, communauté et librairies plus réduites |
| React Native / Expo | Très répandu, beaucoup de tutoriels | Nouveau langage d'interface à apprendre |

**Principe** : tout fonctionne hors ligne. La logique de progression et de planning est du code pur (fonctions testables), séparé de l'interface.

**Ordre de construction (une seule livraison, tout inclus)**

1. **Socle** : projet Ionic Vue, base SQLite et migrations, outils qualité (lint, tests, intégration continue).
2. **Domaine** : moteur de progression, planning et modèles d'entraînement, supersets, stats, en TypeScript pur, testés avec les cas réels de ce document.
3. **Catalogue** : import de free-exercise-db, fiches, silhouettes musculaires, favoris, paliers des machines.
4. **Séance** : saisie charge / reps / difficulté, mode « machine prise », minuteur, échauffement, calculateur de disques, saisie vocale.
5. **Parcours utilisateur** : questionnaire du premier lancement, mode reprise, planning, notifications.
6. **Suivi** : page statistiques, détection de stagnation, suivi du corps et des protéines.
7. **Pages de contenu** : « Bien débuter », Crédits, « À propos ».
8. **Connecté** : défis entre amis (serveur), montre connectée, conseils en langage naturel via une API d'IA en plus des règles fixes.
9. **Finition** : sauvegarde / export, accessibilité, tests de bout en bout sur tous les parcours, bêta-test auprès de quelques utilisateurs, puis publication.

Toutes les fonctions de ce document sortent dans la même version. L'ordre ci-dessus sert seulement à construire dans le bon sens : chaque étape s'appuie sur la précédente (la séance a besoin du moteur de progression, les stats ont besoin des séances), et l'appli n'est publiée qu'une fois l'étape 9 terminée.

**Qui fait quoi** : tout le code et toutes les corrections sont faits par Claude Code ; voir la section « Consignes pour Claude Code ».

## Bonnes pratiques de développement

La règle centrale : la logique métier (progression, planning, stats) est du TypeScript pur, testé, sans dépendance à l'interface ni à la base.

**Architecture en 3 couches**

| Couche | Contenu | Règle |
| --- | --- | --- |
| Domaine | Moteur de progression, planning, calculs de stats | Fonctions pures, aucune importation de Vue, Ionic ou SQLite |
| Données | Accès SQLite, migrations, import free-exercise-db | Passe par des interfaces (« repositories ») que le domaine utilise |
| Interface | Écrans Vue, composants, navigation | Ne contient aucune règle métier, appelle le domaine |

**Qualité du code**

- TypeScript en mode strict, aucun `any`
- ESLint + Prettier, lancés automatiquement avant chaque commit
- Noms en anglais dans le code, textes de l'interface dans des fichiers de traduction (français d'abord)
- Petits composants à une seule responsabilité

**Tests**

- Tests unitaires du domaine (Vitest), à écrire **avant** le code pour chaque règle ; les cas réels de la section Cas de test sont les premiers
- Tests des migrations SQLite sur une base vide et sur une base existante
- Tests de bout en bout des parcours clés : questionnaire, saisie d'une série, machine occupée

**Git et intégration continue**

- Une branche par fonctionnalité, fusion par pull request, jamais de commit direct sur `main`
- Messages au format Conventional Commits (`feat:`, `fix:`, `test:`…)
- GitHub Actions : lint + tests à chaque pull request ; une pull request rouge ne se fusionne pas

**Données et vie privée**

- Tout reste sur le téléphone par défaut ; aucune donnée envoyée sans action de l'utilisateur
- **Exception : la vérification des mises à jour** (appli Android). Au démarrage, au plus une fois par jour, l'appli interroge l'API GitHub Releases du projet (`https://api.github.com/repos/Happy4Game/Trainerr/releases/latest`) pour savoir si une nouvelle version existe. Aucune donnée de l'utilisateur n'est envoyée : seule la requête part, et GitHub voit l'adresse IP comme pour toute page web. Activée par défaut, désactivable dans Réglages → Mises à jour ; l'installation demande toujours l'accord de l'utilisateur.
- Les gênes et douleurs saisies relèvent des données de santé, une catégorie sensible au RGPD : stockage local, export et suppression complète en un bouton
- Migrations de base versionnées, jamais de modification manuelle du schéma

**Accessibilité et ergonomie**

- Grandes zones tactiles, utilisables avec une main, conformes aux tailles minimales recommandées par Apple et Google
- Contraste suffisant et thème sombre
- Aucune information portée par la couleur seule (difficulté = mot + couleur)

**Documentation**

- README : installation, lancement, tests
- Un fichier de décision court (« ADR ») pour chaque choix structurant, ex. Ionic plutôt que WinDev

## Internationalisation (i18n)

Aucun texte, nombre, date ni unité n'est écrit en dur dans le code : tout passe par les outils standards d'internationalisation, pour qu'ajouter une langue ne demande que des traductions.

**Normes et outils**

| Sujet | Règle | Norme ou outil |
| --- | --- | --- |
| Encodage | Tout en UTF-8 (fichiers, base, exports) | Unicode |
| Langues | Codes de langue standards : `fr-FR`, `en-US`… ; français par défaut, puis langue du téléphone | BCP 47 |
| Textes | Tous dans des fichiers de traduction par langue, avec des clés (`seance.serie.valider`) | vue-i18n (MIT) |
| Pluriels | Gérés par règles de langue, jamais par `if` dans le code (« 1 série », « 2 séries ») | ICU MessageFormat, règles CLDR |
| Phrases avec variables | Une phrase entière avec des emplacements nommés, jamais des morceaux collés | ICU MessageFormat |
| Nombres | Séparateur décimal selon la langue (8,5 reps en français, 8.5 en anglais) | API `Intl.NumberFormat` (ECMA-402) |
| Dates et heures | Stockées en UTC au format ISO 8601, affichées dans le fuseau et le format du téléphone (24 h en France) | ISO 8601, `Intl.DateTimeFormat` |
| Premier jour de la semaine | Selon la langue et la région (lundi en France) | Données CLDR |
| Unités | kg par défaut, lb en option ; conversion à l'affichage, stockage toujours en kg ; paliers convertis et arrondis | `Intl.NumberFormat` avec unités |
| Tri et recherche | Tri alphabétique et recherche insensibles aux accents (« epaule » trouve « Épaule ») | `Intl.Collator` |
| Mise en page | Les textes traduits peuvent être plus longs : pas de largeur fixe sur les boutons ; propriétés CSS logiques (`margin-inline-start`) pour être prêt pour les langues de droite à gauche | CSS Logical Properties |
| Contenus | Noms d'exercices, fiches « Bien débuter », notifications et page « À propos » traduits aussi, avec leurs sources | — |

**Contrôles automatiques** (intégrés à la stratégie de non-régression)

- Échec de l'intégration continue si une clé de traduction manque dans une langue ou n'est plus utilisée.
- Pseudo-langue de test (textes allongés et accentués, ex. « [Ŝéàñçé ēxprèss ~~] ») pour repérer les textes coupés et les chaînes oubliées en dur, avec captures d'écran comparées.
- Tests unitaires du formatage des nombres, dates et unités en `fr-FR` et `en-US`.

## Stratégie de tests de non-régression

Objectif : qu'une modification ne casse jamais une fonction qui marchait. Toute la suite de tests tourne automatiquement à chaque changement, et rien n'est fusionné si un seul test échoue.

**Les 6 niveaux de tests**

| Niveau | Ce qui est vérifié | Outil proposé | Quand il tourne |
| --- | --- | --- | --- |
| Tests unitaires du domaine | Chaque règle : progression, planning, supersets, stats, calculateur de disques | Vitest | À chaque commit et chaque pull request |
| Cas de référence (« golden tests ») | Les séances réelles d'octobre 2026 donnent toujours les mêmes propositions (section Cas de test) | Vitest, fichiers de données figés | À chaque pull request |
| Tests de propriétés | Des règles qui doivent toujours être vraies, testées sur des milliers de cas générés au hasard | fast-check | À chaque pull request |
| Tests de migration | Une base créée avec chaque ancienne version se met à jour sans perte de données | Vitest + bases SQLite d'exemple conservées | À chaque changement de schéma |
| Tests de bout en bout | Parcours complets : questionnaire, séance avec machine prise, mode reprise, export | Playwright | À chaque pull request |
| Régression visuelle | Les écrans clés n'ont pas changé d'aspect sans le vouloir (calculateur de disques, stats, fiches machines) | Captures d'écran Playwright comparées à des références | À chaque pull request |

**Exemples de propriétés à vérifier**

- Une charge proposée est toujours un palier qui existe sur la machine.
- Le calculateur de disques donne toujours un total égal à la charge demandée, ou propose les 2 charges réalisables les plus proches.
- La charge ne monte jamais après une série Limite ou Échec.
- Le planning ne place jamais de séance dans un créneau bloqué ni pendant les heures de silence.
- Un export suivi d'un import redonne exactement les mêmes données.

**Règles**

1. **Tout bug corrigé ajoute un test** qui reproduit le bug avant la correction ; ce test reste pour toujours.
2. **Seuil de couverture** : au moins 90 % des lignes du domaine couvertes (seuil de départ, à ajuster) ; l'intégration continue échoue en dessous.
3. **Références modifiées volontairement** : si un golden test ou une capture de référence doit changer, Claude Code l'explique dans la pull request et Thibaut valide.
4. **Tests instables interdits** : un test qui échoue au hasard est corrigé ou isolé le jour même, jamais ignoré.
5. **Tous les tests tournent hors ligne**, sans dépendre d'un service extérieur.
6. **Rapport lisible** : à chaque pull request, un résumé (tests passés, couverture, écrans modifiés) que Thibaut peut lire sans être développeur.

**Bêta-test avant publication** : quelques utilisateurs réels (5 à 10 personnes, à ajuster) utilisent l'appli pendant 2 à 4 semaines via les canaux de test des stores. Ils signalent les bugs depuis le bouton « Signaler une erreur » ; chaque bug confirmé devient un test de non-régression avant d'être corrigé.

Outils : Vitest (MIT), fast-check (MIT), Playwright (Apache 2.0), tous libres, conformément à la section Ressources libres.

## Consignes pour Claude Code

Claude Code écrit tout le code, le teste et le corrige lui-même ; Thibaut ne développe pas, il pilote : il valide, teste sur son téléphone et signale ce qui ne va pas.

**Répartition des rôles**

| Claude Code | Thibaut |
| --- | --- |
| Écrit tout le code, les tests et la documentation | Donne ce cahier des charges et répond aux questions |
| Lance les tests et corrige jusqu'à ce qu'ils passent | Teste l'appli sur son téléphone à la fin de chaque étape |
| Corrige les bugs signalés, avec un test qui reproduit le bug | Décrit les bugs : ce qu'il a fait, ce qu'il attendait, ce qui s'est passé (+ capture d'écran) |
| Propose les choix techniques et les explique simplement | Valide les choix qui changent l'appli (design, textes, règles) |
| Fait un commit par tâche terminée | Crée les comptes nécessaires (GitHub, stores) : Claude Code ne peut pas le faire à sa place |

**Règles de travail pour Claude Code**

1. Suivre l'ordre de construction de la section Choix techniques, étape par étape.
2. Avant chaque étape, résumer en quelques lignes ce qui va être fait ; à la fin, résumer ce qui a été fait et comment le tester sur le téléphone.
3. Écrire les tests avant le code pour toute règle métier, et ne jamais passer à l'étape suivante avec un test rouge.
4. Corriger soi-même les erreurs de compilation, de lint et de tests, sans demander à Thibaut de modifier du code.
5. Poser une question seulement quand le cahier des charges est ambigu ou contradictoire, et proposer une réponse par défaut.
6. Respecter les sections Bonnes pratiques et Ressources libres ; ne jamais ajouter une dépendance sans vérifier sa licence.
7. Tenir à jour un fichier `PROGRESS.md` : étapes faites, en cours, problèmes connus.

**Message à envoyer à Claude Code pour démarrer**

> Voici le cahier des charges de mon application (fichier SPEC.md). Je ne développe pas : c'est toi qui écris tout le code, les tests, et qui corriges les erreurs. Lis le document en entier, puis suis la section « Consignes pour Claude Code » et l'ordre de construction. Commence par les étapes 1 et 2. À la fin de chaque étape, dis-moi en quelques lignes ce que tu as fait et comment je peux le tester sur mon téléphone.

## Cas de test et sources

Ces cas viennent des séances réelles du 15 au 24 octobre 2026 ; le moteur de progression doit donner la même réponse.

| Situation saisie | Réponse attendue |
| --- | --- |
| Reprise, DC haltères, ancienne référence 22 kg | Proposer 16 kg (environ 70 %) |
| DC haltères 16 kg × 12, Correct | Série suivante : 18 kg |
| Leg press 107 kg × 10 sur 3 séries | Séance suivante : 110 kg |
| Pec fly 52 kg × 12, palier suivant 59 kg | Rester à 52 kg, viser 15 reps |
| Lat pulldown 45 kg × 8, reps incomplètes | Série suivante : 39 kg |
| Seated row 39 kg × 9, reps incomplètes | 32 kg, reps complètes |
| Leg extension 52 kg × 8, Limite | Même charge, viser 3 × 10 |
| Curl 9 kg × 10, tempo lent | Exclu de la comparaison du 1RM |
| Shoulder press, gêne avant de l'épaule | Retirer les exercices de poussée restants, alerte |
| Pec fly occupé | Proposer lateral raise, revenir au pec fly ensuite |

**Sources**

- [Schoenfeld et al. 2016 — fréquence et hypertrophie (PubMed)](https://pubmed.ncbi.nlm.nih.gov/27102172/) : chaque muscle au moins 2 fois par semaine
- [Schoenfeld et al. 2017 — volume et hypertrophie](https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324_Dose-response_relationship_between_weekly_resistance_training_volume_and_increases_in_muscle_mass_A_systematic_review_and_meta-analysis/links/59dc0269458515e9ab4527d6/Dose-response-relationship-between-weekly-resistance-training-volume-and-increases-in-muscle-mass-A-systematic-review-and-meta-analysis.pdf) et [synthèse Stronger By Science](https://www.strongerbyscience.com/?p=56687) : 10 à 20 séries par muscle et par semaine
- [Morton et al. 2018 — protéines (AUT)](https://openrepository.aut.ac.nz/items/8dea98a4-4e37-4c60-be43-4b6ece0bd9a5/full) : plateau vers 1,6 g/kg/jour
- [Haugen et al. 2023 — machines vs poids libres](https://oda.oslomet.no/oda-xmlui/handle/11250/3107243) : hypertrophie équivalente
- [BarBend](https://barbend.com/?p=54412) et [Eric Cressey](https://ericcressey.com/5-lose-fat-gain-muscle-get-strong-move-better-62/) : angle des coudes au développé couché
- [free-exercise-db](https://github.com/yuhonas/free-exercise-db) et [wger](https://wger.de/api/v2/) : bases d'exercices ouvertes

* [Zhang et al. 2025 — supersets vs séries classiques (Leeds Beckett)](https://eprints.leedsbeckett.ac.uk/id/eprint/11908) : même hypertrophie, séances plus courtes
* [StrengthLog — comparatif des splits](https://www.strengthlog.com/best-workout-splits/) et [Power Lifting Technique — PHUL](https://powerliftingtechnique.com/phul-workout-program-power-hypertrophy-upper-lower/) : modèles d'entraînement
* [MuscleMapJS](https://github.com/abdofallah/MuscleMapJS) et [Lucide](https://lucide.dev/license) : ressources graphiques libres
