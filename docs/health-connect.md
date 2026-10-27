# Pesées depuis Health Connect

Sur Android, **Historique → Corps → « Importer depuis Health Connect »** copie dans Trainerr les pesées que d'autres applis ont écrites dans [Health Connect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata) : balance connectée (Withings, Xiaomi, Renpho…), Samsung Health, Google Fit.

## Ce que fait l'appli

1. Elle vérifie que Health Connect est installé (Android 9 ou plus) et à jour.
2. Elle demande la permission de **lire le poids**, et seulement celle-là, plus l'accès à l'historique (sinon Health Connect limite la lecture aux 30 derniers jours).
3. Elle lit les pesées des 2 dernières années, garde **la dernière de chaque jour**, et n'ajoute rien sur un jour déjà pesé dans Trainerr.

Trainerr n'écrit rien dans Health Connect. Les pesées copiées restent sur le téléphone, comme les autres données du corps.

## Basic-Fit, JOY (L'Appart Fitness)

Ces applis ne publient ni API ni export, et n'écrivent pas le poids dans Health Connect d'après leurs fiches ([Basic-Fit sur Google Play](https://play.google.com/store/apps/details?id=com.basicfit.trainingApp), [JOY sur l'App Store](https://apps.apple.com/us/app/-/id1609220466) : JOY _lit_ le poids d'Apple Santé). Leurs pesées ne remontent donc pas ; celles d'une balance connectée, oui.

## Côté code

| Fichier                                                                       | Rôle                                                               |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `android/app/src/main/java/fr/trainerr/app/HealthWeightPlugin.kt`             | Disponibilité, permission, lecture paginée des `WeightRecord`      |
| `android/app/src/main/java/fr/trainerr/app/PermissionsRationaleActivity.java` | Texte de confidentialité affiché par l'écran de permission         |
| `android/app/src/main/AndroidManifest.xml`                                    | Permissions `READ_WEIGHT`, `READ_HEALTH_DATA_HISTORY`, `<queries>` |
| `src/ui/healthConnect.ts`, `src/domain/healthWeights.ts`                      | Appel du plugin, une pesée par jour, pas de doublon                |

Le plugin est en Kotlin parce que le client Health Connect (`androidx.health.connect:connect-client` 1.1.0, la dernière version stable) n'expose que des fonctions `suspend`. La version 1.1.0 demande Android 8 : le manifeste l'accepte avec `tools:overrideLibrary` et le plugin vérifie la version d'Android avant de l'appeler.

## Sources officielles

- Démarrer avec Health Connect (dépendance, manifeste, écran de confidentialité, `<queries>`) : https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started
- Lire des données (pagination, limite de 30 jours, `PERMISSION_READ_HEALTH_DATA_HISTORY`) : https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data
- Versions de la bibliothèque : https://developer.android.com/jetpack/androidx/releases/health-connect
- Type `WeightRecord` : https://developer.android.com/reference/androidx/health/connect/client/records/WeightRecord
