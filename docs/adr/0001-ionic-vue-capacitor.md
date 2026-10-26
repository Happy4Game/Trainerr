# 0001 — Ionic Vue + Capacitor plutôt que WinDev Mobile ou React Native

Date : 2026-10-24 · Statut : accepté

## Contexte

L'appli doit tourner sur Android et iOS, hors ligne, avec une interface utilisable d'une main. Thibaut connaît Vue.js et WinDev.

## Décision

Ionic 9 (composants mobiles) + Vue 3 + Capacitor 8 (accès natif), en TypeScript strict.

## Raisons

- Une seule base de code pour Android, iOS et le navigateur : on peut tester sur le téléphone via le Wi-Fi sans rien installer.
- Vue est déjà connu de Thibaut : il peut lire le code s'il le souhaite.
- Tout est sous licence MIT, contrairement à WinDev Mobile (licence payante).
- React Native demanderait d'apprendre un autre langage d'interface.

## Conséquences

- La compilation Android demande Android Studio et le SDK Android (pas encore installés sur le poste).
- Le build iOS demande un Mac.
