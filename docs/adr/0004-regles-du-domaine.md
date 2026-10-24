# 0004 — Règles du domaine : choix faits là où le cahier des charges laisse une marge

Date : 2026-10-24 · Statut : **à valider par Thibaut**

Chaque point ci-dessous est un réglage par défaut. Il se change facilement (une constante ou une ligne), et les tests disent tout de suite ce qui bouge.

## Moteur de progression (`src/domain/progression.ts`, `loadSteps.ts`)

1. **Leg extension en 8–10 reps.** Le cas réel « 52 kg × 8, Limite → même charge, viser 10 » n'est possible qu'avec une fourchette 8–10. Avec la fourchette d'isolation (12–15), 8 reps feraient baisser la charge. La fourchette se règle donc par exercice (`fourchette_min/max` du modèle de données), et le leg extension est en 8–10.
2. **« Palier absent » = saut de plus de 10 % ET de plus de 2,5 kg.** Le pec fly de 52 → 59 kg (+7 kg, +13 %) en est un ; les haltères de 16 → 18 kg (+2 kg) non, conformément aux cas réels. Dans ce cas, la fourchette est allongée de **3 reps** avant de sauter (12–15 → jusqu'à 18). Conséquence : sur les machines à plaques de ~7 kg de la salle, la charge monte après 3 reps de plus que le haut de la fourchette.
3. **Reps visées** : après une montée, le bas de la fourchette ; sinon, le haut.
4. **Baisse sur la dernière série** = « arrête l'exercice » (action `stop`). Même chose quand il n'existe pas de palier plus léger.
5. **Série « Facile »** : monte toujours d'un palier, même si le palier suivant est « absent ».
6. **Échec répété** (règle entre séances n° 3) : au moins une série en Échec, incomplète ou sous la fourchette, deux séances de suite.

## Séances et modèles (`sessionBuilder.ts`, `trainingModels.ts`)

7. **Nombre d'exercices** : 3 (30 min), 4 (45 min), 5 (1 h), 6 (1 h 30, non précisé dans le cahier des charges).
8. **Séries par exercice** : 3 (hypertrophie et force), 2 en entretien (« environ la moitié »).
9. **5 séances par semaine → PPL A/B**, comme le dit le tableau du questionnaire (le tableau des modèles cite aussi PPLUL pour 5 jours, proposé en changement manuel).
10. **Note « 1 fois par semaine »** affichée quand le muscle le moins travaillé l'est moins de 1,5 fois par semaine (bro split, PPL à 3 séances).

## Planning (`planning.ts`)

11. **Les heures de silence (22h–8h) s'appliquent aussi aux séances**, comme l'exige la propriété de test du cahier des charges. Conséquence : une séance de 1 h à 21h tient (21h–22h), mais une séance de 1 h 30 à 21h n'est pas placée. À revoir si Thibaut veut pouvoir s'entraîner après 22h.
12. **Autres sports** : vélo → pas de Legs le jour même ni le lendemain ; course et football → pas de Legs la veille, le jour même, le lendemain ; sports de combat → pas de Push la veille, le jour même, le lendemain ; natation → aucune contrainte de planning (volume d'épaules réduit, à faire à l'étape 5).
13. **Répartition** : moins de séances que de jours libres → jours espacés (4 séances sur 7 jours → lun, mar, jeu, sam). Si une séance est interdite un jour (sport), la suivante de la rotation prend sa place.

## Reprise, stats, alertes

14. **Jauge « retour à l'ancien niveau »** = charge actuelle ÷ ancienne charge (18 / 22 = 82 %), atteinte à 100 %.
15. **Records** : une série incomplète ou d'échauffement n'est jamais un record.
16. **Gêne « avant de l'épaule »** : retire tous les exercices de poussée restants (règle du cahier des charges). Autres zones : retire les exercices qui sollicitent les muscles de la zone (genou → quadriceps, ischios).
