# Mises à jour automatiques de l'appli Android

À chaque push sur `main`, GitHub construit un APK **signé**, le publie comme [GitHub Release](https://docs.github.com/fr/repositories/releasing-projects-on-github/about-releases) (APK + `latest.json`), et l'appli installée sur le téléphone le propose au démarrage.

```text
push sur main ──► workflow « Publier l'APK » ──► Release v1.0.<n> (trainerr-1.0.<n>.apk, latest.json)
                                                        │
appli au démarrage (1 fois par jour) ──► API GitHub « latest » ──► versionCode plus grand ? ──► « Télécharger et installer »
```

## Ce qu'il faut faire une seule fois

### 1. Créer la clé de signature (le « keystore »)

Android n'accepte une mise à jour que si elle est signée **avec la même clé** que l'appli déjà installée ([documentation Android sur la signature](https://developer.android.com/studio/publish/app-signing?hl=fr)). Cette clé t'appartient : si tu la perds, plus aucune mise à jour n'est possible sans désinstaller l'appli ; si quelqu'un la récupère, il peut publier une fausse mise à jour.

Sur ton ordinateur, hors du dossier du projet (le JDK fournit `keytool`) :

```sh
keytool -genkeypair -v -keystore ~/trainerr-release.jks -alias trainerr \
  -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` demande un mot de passe pour le fichier et un pour la clé (le même convient). Garde le fichier `trainerr-release.jks` et les mots de passe dans un endroit sûr (gestionnaire de mots de passe + une copie de sauvegarde). **Ne le mets jamais dans le dépôt** : le `.gitignore` refuse déjà les fichiers `*.jks` et `*.keystore`.

### 2. Créer les 4 secrets GitHub

Dans le dépôt GitHub : **Settings → Secrets and variables → Actions → New repository secret** ([documentation GitHub sur les secrets](https://docs.github.com/fr/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)). Un secret est chiffré par GitHub, n'est jamais affiché dans les journaux, et n'est pas donné aux workflows lancés depuis un fork.

| Secret              | Contenu                                            | Pourquoi                                                                                                     |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `KEYSTORE_BASE64`   | Le fichier `trainerr-release.jks` encodé en base64 | Un secret ne contient que du texte : le fichier y est mis sous forme de texte, puis recréé le temps du build |
| `KEYSTORE_PASSWORD` | Mot de passe du fichier                            | Pour ouvrir le keystore                                                                                      |
| `KEY_ALIAS`         | `trainerr` (l'alias choisi à l'étape 1)            | Le keystore peut contenir plusieurs clés : celle-ci signe l'APK                                              |
| `KEY_PASSWORD`      | Mot de passe de la clé                             | Pour utiliser la clé                                                                                         |

Pour obtenir le texte de `KEYSTORE_BASE64` :

```sh
base64 -w 0 ~/trainerr-release.jks      # Linux ; sur macOS : base64 -i ~/trainerr-release.jks
```

Copie toute la ligne affichée dans le secret.

Tant que ces secrets n'existent pas, le workflow s'arrête avec un avertissement et ne publie rien : `main` reste vert.

### 3. Passer une fois de l'APK de debug à l'APK signé

L'APK de test (artefact `trainerr-debug-apk`, ou `npm run android:apk`) est signé avec une clé de debug différente : Android refusera de le remplacer par l'APK signé. La première fois seulement :

1. Dans l'appli : **Réglages → Mes données → Exporter** (sauvegarde de toutes tes séances).
2. Désinstalle l'appli, installe `trainerr-1.0.<n>.apk` depuis la page **Releases** du dépôt.
3. **Réglages → Mes données → Importer** la sauvegarde.

Ensuite, les mises à jour se font depuis l'appli.

## Le workflow (`.github/workflows/release.yml`)

1. Vérifie que les 4 secrets existent.
2. Recrée le keystore dans le dossier temporaire du runner (jamais dans le dépôt), l'efface à la fin.
3. `npm ci`, `npm run build`, `npx cap sync android`, puis `./gradlew assembleRelease` avec JDK 21 (celui demandé par Capacitor 8).
4. `versionCode` = numéro d'exécution du workflow (`github.run_number`), `versionName` = `1.0.<n>` : chaque release est plus récente que la précédente ([versionCode sur developer.android.com](https://developer.android.com/studio/publish/versioning?hl=fr)).
5. Crée la release `v1.0.<n>` avec l'outil `gh` fourni par GitHub, et y joint l'APK et `latest.json` :

   ```json
   {
     "version": "1.0.42",
     "versionCode": 42,
     "url": "https://github.com/Happy4Game/Trainerr/releases/download/v1.0.42/trainerr-1.0.42.apk"
   }
   ```

La signature est configurée dans `android/app/build.gradle` (`signingConfigs`), qui lit les variables d'environnement `TRAINERR_KEYSTORE`, `TRAINERR_KEYSTORE_PASSWORD`, `TRAINERR_KEY_ALIAS`, `TRAINERR_KEY_PASSWORD`, `TRAINERR_VERSION_CODE`, `TRAINERR_VERSION_NAME`. Sans elles (build local), l'APK de release n'est pas signé et la version reste 1.

Documentation : [GitHub Actions](https://docs.github.com/fr/actions), [jeton `GITHUB_TOKEN` et permissions](https://docs.github.com/fr/actions/security-for-github-actions/security-guides/automatic-token-authentication), [`gh release create`](https://cli.github.com/manual/gh_release_create).

## Dans l'appli

- **Au démarrage**, au plus une fois par jour, l'appli interroge `https://api.github.com/repos/Happy4Game/Trainerr/releases/latest`. Le `versionCode` est lu dans le tag (`v1.0.42` → 42) et comparé à celui de l'appli installée. Seule cette requête part du téléphone (comme toute requête web, GitHub voit l'adresse IP) ; aucune donnée d'entraînement n'est envoyée. Interrupteur : **Réglages → Mises à jour → Chercher les mises à jour au démarrage**, activé par défaut. C'est la seule requête que l'appli fait sans action de l'utilisateur : l'exception est écrite dans le cahier des charges (SPEC.md, « Données et vie privée »).
- **Réglages → Mises à jour → Vérifier** fait la même chose à la demande.
- **Télécharger et installer** : le petit plugin natif `AppUpdaterPlugin` télécharge l'APK dans le cache de l'appli (seulement depuis `https://github.com/Happy4Game/Trainerr/releases/download/`), puis l'ouvre avec l'installateur d'Android via un `FileProvider` et une intention `ACTION_VIEW`. Android affiche son propre écran de confirmation : rien ne s'installe sans ton accord.
- La première fois, Android demande d'autoriser Trainerr à **installer des applis inconnues** : c'est la permission `REQUEST_INSTALL_PACKAGES` ([documentation Android](https://developer.android.com/reference/android/Manifest.permission#REQUEST_INSTALL_PACKAGES), [installation de paquets](https://developer.android.com/reference/android/content/pm/PackageInstaller)). Le bouton **Autoriser** ouvre le bon écran des paramètres.

## Bon à savoir

- Le dépôt doit être **public** pour que l'appli lise les releases sans compte. Pour un dépôt privé, il faudrait un jeton dans l'appli : à éviter.
- Le Play Store interdit à une appli de s'installer elle-même des APK. Ce mécanisme sert à la distribution directe (toi et tes bêta-testeurs) ; une version Play Store le retirerait.
- Sans réseau à la salle, rien ne change : la vérification attend le prochain lancement.
