# Importer des données dans Trainerr

**Réglages → Mes données → Importer** accepte un fichier CSV. L'appli reconnaît le format à sa première ligne, puis montre à quel exercice du catalogue correspond chaque nom : vérifie avant de valider.

Séparateur : virgule ou point-virgule. Décimales : point ou virgule (`52.5` ou `"52,5"`). Dates : `AAAA-MM-JJ`.

## Mes charges sur chaque machine

Les charges que tu soulèves déjà, sans séance complète. Elles deviennent « Ma charge » sur la fiche et dans le catalogue, et servent de point de départ la première fois que tu fais l'exercice dans l'appli.

```csv
exercise,load_kg,reps,date
Presse à cuisses,107,10,2026-10-24
Écarté à la machine,52,12,
Tirage vertical,45,8,2026-10-20
```

| Colonne    | Obligatoire | Contenu                                              |
| ---------- | ----------- | ---------------------------------------------------- |
| `exercise` | oui         | Nom de l'exercice, de préférence celui du catalogue  |
| `load_kg`  | oui         | Charge en kg (haltères : le poids d'un seul haltère) |
| `reps`     | oui         | Nombre de reps faites à cette charge                 |
| `date`     | non         | Quand ; vide = aujourd'hui                           |

Une ligne par machine ; si une machine revient plusieurs fois, la dernière ligne compte.

## Mes pesées

Ton poids du corps noté ailleurs : balance connectée, tableur, autre appli. Les pesées s'ajoutent dans **Historique → Corps** et dans la courbe des **Stats**.

```csv
date,weight_kg
2026-10-20,78.9
2026-10-24,78.4
```

| Colonne     | Contenu                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `date`      | Jour de la pesée : `2026-10-24` (une heure après est ignorée) ou `24/10/2026`                                  |
| `weight_kg` | Poids. La colonne peut aussi s'appeler `poids`, `weight` ou `Weight (kg)` ; en livres si son nom contient `lb` |

Les autres colonnes sont ignorées : l'export d'une balance (masse grasse, IMC…) s'importe tel quel tant qu'il a une date et un poids. Une pesée par jour (la dernière du fichier compte), et un jour déjà pesé dans l'appli garde sa pesée.

## Séances passées

Une ligne par série. C'est aussi le format de l'export CSV de l'appli.

```csv
date,template,exercise_id,exercise,load_kg,reps,warmup
2026-10-15,Push A,,Développé couché haltères,16,12,0
2026-10-15,Push A,,Développé couché haltères,18,10,0
2026-10-17,Legs A,,Presse à cuisses,90,12,0
```

| Colonne       | Contenu                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| `date`        | Jour de la séance                                                                |
| `template`    | Nom de la séance ; les séries d'un même jour et d'un même nom forment une séance |
| `exercise_id` | Peut rester vide                                                                 |
| `exercise`    | Nom de l'exercice                                                                |
| `load_kg`     | Charge en kg                                                                     |
| `reps`        | Reps                                                                             |
| `warmup`      | `1` pour une série d'échauffement, `0` sinon                                     |

Après l'import, l'appli demande par quelle séance continuer : les séances importées ne suivent pas forcément son programme. Le choix se change ensuite dans **Planning → Ordre des séances**.

Les exports de **Strong** et **Hevy** s'importent tels quels.
