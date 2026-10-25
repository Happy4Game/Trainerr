# 0007 — Licence du projet : PolyForm Noncommercial

Date : 2026-10-25 · Statut : accepté

## Contexte

Le propriétaire veut un code ouvert, que chacun peut lire, modifier et forker, mais qu'aucun fork ne puisse commercialiser. Les licences libres au sens strict (MIT, GPL, AGPL…) autorisent toutes la vente : aucune ne répond au besoin.

## Décision

- Code de l'appli et du serveur sous **PolyForm Noncommercial 1.0.0** (`LICENSE.md`, texte officiel non modifié, précédé de la ligne `Required Notice`). Identifiant SPDX `PolyForm-Noncommercial-1.0.0` dans les `package.json`.
- Écartées : **AGPL-3.0** (libre, mais la vente reste permise) et **CC BY-NC-SA 4.0** (non commerciale, mais pensée pour les œuvres, pas pour le logiciel).
- Les contributions sont publiées sous la même licence, et l'auteur peut aussi les accorder sous d'autres conditions (CONTRIBUTING.md), pour garder la possibilité d'une licence commerciale.

## Conséquences

- Trainerr n'est pas « open source » au sens de l'OSI : à dire tel quel, sans employer ce terme.
- Les ressources tierces gardent leur licence : dessins Everkinetic et wger en CC BY-SA 4.0 (usage commercial permis pour ces images, l'attribution reste due), catalogue free-exercise-db dans le domaine public, bibliothèques en MIT, ISC, BSD ou Apache 2.0. Toutes sont compatibles avec une distribution non commerciale.
- La règle des dépendances ne change pas : pas de GPL ni d'AGPL dans l'appli.
