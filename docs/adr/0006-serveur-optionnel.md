# 0006 — Serveur optionnel : défis et conseil IA

Date : 2026-10-25 · Statut : accepté

## Contexte

L'étape 8 du cahier des charges demande des défis entre amis et des conseils en langage naturel. L'appli reste hors ligne d'abord, et les données de santé restent sur le téléphone (RGPD).

## Décision

- Un **petit serveur Node** (`server/`) : `node:http` et `node:sqlite`, aucune autre dépendance que le SDK Anthropic. L'URL du serveur se règle dans l'appli. Sans serveur, rien ne change.
- **Compte sans e-mail** : un pseudo et un jeton aléatoire gardé dans les réglages de l'appli. Le serveur n'en garde que l'empreinte SHA-256.
- **Défis à la régularité**, pas aux charges : nombre de séances de la semaine et semaines d'affilée au rythme. Les records ne sont partagés que si l'utilisateur coche « Partager mes records » (désactivé par défaut).
- **Synchronisation** à la fin de chaque séance, en arrière-plan. Une erreur réseau est ignorée, la prochaine synchronisation rattrape.
- **Conseil IA** : la clé de l'API reste sur le serveur. L'appli envoie un résumé texte des 7 derniers jours (exercices, charges, gênes ; ni nom ni mensurations), uniquement après un accord explicite, retirable, et l'utilisateur peut lire le texte exact avant d'accepter. Le serveur ne stocke pas ce résumé.
- **Modèle** : `claude-opus-5-5`, effort `medium` (réponses courtes), avec le repli côté serveur (`fallbacks: 'default'`). Un refus devient un message clair au lieu d'une réponse vide. La consigne système interdit de proposer d'autres charges : les règles de l'appli décident des charges, l'IA ne fait que commenter.
- **Limite** de conseils par compte et par jour, pour maîtriser le coût.

## Conséquences

- Il faut héberger le serveur (HTTPS) et payer l'API Claude pour les conseils : décision laissée au propriétaire du projet.
- Le droit à l'effacement est un bouton dans l'appli (`DELETE /v1/accounts/me`).
- Un jeton perdu (téléphone réinitialisé) veut dire un nouveau compte. C'est acceptable vu le peu de données en jeu.
