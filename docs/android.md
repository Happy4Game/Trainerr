# Trainerr sur Android

Trainerr est une appli web (Ionic + Vue) emballée pour Android par [Capacitor](https://capacitorjs.com). Le projet Android natif est dans `android/`.

## Récupérer l'APK sans rien installer

À chaque push sur `main` et à chaque pull request, GitHub Actions construit un APK de test (workflow **Android APK**). Ouvre l'exécution dans l'onglet **Actions** du dépôt, puis télécharge l'artefact `trainerr-debug-apk`.

## Construire l'APK soi-même

### Prérequis

| Outil                                 | Version    | Où le trouver                                                                              |
| ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| Node.js                               | 24 ou plus | [nodejs.org](https://nodejs.org)                                                           |
| JDK                                   | 21         | [Adoptium Temurin](https://adoptium.net) (ou celui fourni avec Android Studio)             |
| SDK Android (plateforme, build-tools) | 36         | [Android Studio](https://developer.android.com/studio), ou les outils en ligne de commande |

Avec les seuls outils en ligne de commande, une fois `cmdline-tools` dézippés dans `~/Android/Sdk/cmdline-tools/latest` :

```sh
export JAVA_HOME=~/.local/jdk-21          # dossier du JDK 21
export ANDROID_HOME=~/Android/Sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

sdkmanager --licenses                       # lire et accepter la licence du SDK Android
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Construire

```sh
npm run android:export   # APK copié dans exports/trainerr-<version>-debug.apk
# ou
npm run android:apk      # APK laissé dans android/app/build/outputs/apk/debug/
```

La commande compile l'appli web, la copie dans le projet Android (`cap sync`) puis construit l'APK de debug :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Installer sur un téléphone

1. Sur le téléphone : **Paramètres → À propos → Numéro de build**, toucher 7 fois pour activer les options développeur, puis activer **Débogage USB**.
2. Brancher le téléphone en USB et accepter l'ordinateur.
3. Installer :

   ```sh
   ~/Android/Sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

Sans câble : envoie le fichier `app-debug.apk` sur le téléphone (mail, cloud…), ouvre-le et autorise l'installation depuis cette source.

> L'APK de debug sert aux tests. Il est signé avec une clé de debug générée automatiquement : il n'est pas destiné au Play Store.

## Développer avec le téléphone

- `npm run android:sync` après chaque changement du code web, puis relancer l'appli.
- `npx cap open android` ouvre le projet dans Android Studio (logs, débogueur, émulateur).
- Pour inspecter l'appli : sur l'ordinateur, Chrome → `chrome://inspect`, téléphone branché.

## Version de production (Play Store)

Elle demande une **clé de signature** qui t'appartient et ne doit jamais être perdue ni publiée (sans elle, plus de mise à jour possible sur le Play Store) :

1. Créer la clé, une seule fois, et la garder hors du dépôt :

   ```sh
   keytool -genkey -v -keystore ~/trainerr-release.jks -alias trainerr \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Construire un bundle signé depuis Android Studio (**Build → Generate Signed App Bundle**), ou configurer `signingConfigs` dans `android/app/build.gradle` en lisant le mot de passe dans des variables d'environnement.
3. Avant la publication : icône et écran de démarrage de l'appli, numéro de version (`versionCode`, `versionName`), fiche Play Store et politique de confidentialité.

## Bon à savoir

- **Permissions** : Internet (serveur optionnel des défis et conseils), notifications et alarmes exactes (rappels de séance). Le module SQLite déclare aussi la biométrie, utilisée seulement si on chiffre la base.
- **Données** : la base SQLite native reste dans le stockage privé de l'appli. Une désinstallation l'efface : pense à l'export ou à la sauvegarde chiffrée (Réglages → Mes données).
- **Serveur optionnel** : depuis l'appli Android, l'origine est `https://localhost` ; elle fait partie des origines autorisées par défaut du serveur ([server/README.md](../server/README.md)), qui doit être en HTTPS.
