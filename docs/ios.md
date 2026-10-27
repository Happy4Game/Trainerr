# Trainerr sur iOS

Le projet iOS natif est dans `ios/`, créé par [Capacitor](https://capacitorjs.com/docs/ios) comme `android/`. Il se construit **sans compte Apple Developer payant** : l'appli n'est pas publiée sur l'App Store, elle sert aux tests.

## Récupérer une version sans rien installer

À chaque push sur `main` et à chaque pull request, le workflow **iOS** (`.github/workflows/ios.yml`) compile l'appli sur un Mac de GitHub Actions et dépose deux artefacts dans l'onglet **Actions** :

| Artefact                    | Contenu                                     | Pour quoi faire                                                            |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| `trainerr-ios-simulator`    | `App.app` zippé, compilé pour le simulateur | L'ouvrir dans le simulateur d'iPhone d'Xcode, sur un Mac                   |
| `trainerr-ios-unsigned-ipa` | `trainerr-unsigned.ipa`, **non signé**      | Le signer soi-même avant de l'installer sur un vrai iPhone (voir plus bas) |

Le workflow tourne sur un runner `macos-26` : les runners standard de GitHub sont **gratuits pour un dépôt public** ([facturation de GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). `macos-26` fournit Xcode 26 ([images des runners](https://github.com/actions/runner-images)), le minimum demandé par Capacitor 8 ([prérequis Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup#ios-requirements)).

Pourquoi « non signé » ? Un iPhone n'installe qu'une appli signée par un certificat Apple. Le CI n'a pas de certificat (pas de compte payant), donc il compile avec `CODE_SIGNING_ALLOWED=NO` et la signature se fait ensuite, sur l'appareil de celui qui installe.

## Lancer dans le simulateur (Mac)

1. Installe **Xcode 26** ou plus récent depuis l'App Store.
2. Dézippe `trainerr-simulator.zip`, puis :

   ```sh
   open -a Simulator                       # démarre un iPhone virtuel
   xcrun simctl install booted App.app     # installe Trainerr dessus
   xcrun simctl launch booted fr.trainerr.app
   ```

## Installer sur ton iPhone sans payer

Avec un **compte Apple gratuit**, Xcode signe l'appli avec une « Personal Team ». Apple le permet, avec des limites : 3 appareils, 3 applis par appareil, et le profil **expire au bout de 7 jours** ; il faut alors réinstaller ([comparaison des comptes Apple](https://developer.apple.com/support/compare-memberships/)).

Sur un Mac :

1. `npm install`, puis `npm run ios:sync` (compile l'appli web et la copie dans `ios/`).
2. `npx cap open ios` ouvre le projet dans Xcode.
3. **Xcode → Settings → Accounts** : ajoute ton compte Apple.
4. Cible **App → Signing & Capabilities** : coche **Automatically manage signing**, choisis ta **Personal Team** (change le Bundle Identifier si Xcode dit qu'il est pris, par exemple `fr.trainerr.app.tonnom`).
5. Branche l'iPhone, choisis-le en haut d'Xcode et lance (▶). Guide Apple : [Running your app in Simulator or on a device](https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device).
6. Sur l'iPhone, active le **mode développeur** ([Enabling Developer Mode on a device](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)) et fais confiance au développeur dans **Réglages → Général → VPN et gestion de l'appareil**.

Sans Mac, des outils tiers (non fournis par Apple) savent signer le `.ipa` non signé avec un compte Apple gratuit, avec la même limite de 7 jours. Ils ne sont pas testés ici.

## Ce qui diffère d'Android

- **Pas de mise à jour intégrée** : elle télécharge un APK, ce qui n'existe pas sur iOS (`src/ui/updates.ts` ne l'active que sur Android).
- **Notification de séance** (minuteur visible écran verrouillé, alerte de fin de repos) et **menu Partager natif** : codés en Java pour Android seulement. Sur iOS, le minuteur reste dans l'appli et l'export passe par le partage du navigateur intégré (`navigator.share`).
- La base SQLite et les rappels passent par des plugins Capacitor qui gèrent aussi iOS.

## Commandes

```sh
npm run ios:sync   # compile l'appli web et met à jour ios/
npx cap open ios   # ouvre Xcode (Mac seulement)
npm run icons      # régénère aussi l'icône et l'écran de démarrage iOS
```

Les dépendances natives passent par **Swift Package Manager**, le choix par défaut depuis Capacitor 8 : pas de CocoaPods à installer ([Capacitor et SPM](https://capacitorjs.com/docs/ios/spm)).
