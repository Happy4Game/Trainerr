# Serveur Trainerr (optionnel)

L'appli fonctionne entièrement sans ce serveur. Il sert seulement à deux fonctions qu'on active à la main dans l'appli :

- **Défis entre amis** : groupes rejoints avec un code de 6 caractères, classement à la régularité de la semaine ;
- **Conseil du coach IA** : un résumé de la semaine est envoyé à Claude (Anthropic), après l'accord explicite de l'utilisateur.

## Ce que le serveur stocke

| Donnée                                    | Quand                                                       |
| ----------------------------------------- | ----------------------------------------------------------- |
| Pseudo et empreinte SHA-256 du jeton      | à la création du compte (pas d'e-mail, pas de mot de passe) |
| Groupes (nom, code) et appartenances      | à la création d'un groupe ou en rejoignant avec un code     |
| Séances de la semaine, semaines au rythme | après chaque séance et à l'ouverture de la page Défis       |
| Records (nom de l'exercice, charge)       | seulement si l'utilisateur active « Partager mes records »  |
| Nombre de conseils demandés par jour      | à chaque demande de conseil (pour la limite quotidienne)    |

Le résumé envoyé pour un conseil n'est **pas enregistré** : il est transmis à l'API Claude puis oublié. « Supprimer mon compte » efface le compte, ses statistiques, ses appartenances et les groupes devenus vides.

## Lancer

Node.js 24 ou plus (il exécute le TypeScript directement et fournit `node:sqlite`).

```sh
cd server
npm ci
ANTHROPIC_API_KEY=sk-ant-... npm start
```

## Variables d'environnement

| Variable             | Défaut                                                          | Rôle                                                   |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| `PORT`               | `8787`                                                          | port HTTP                                              |
| `DATABASE_PATH`      | `./trainerr.sqlite`                                             | fichier SQLite                                         |
| `ALLOWED_ORIGINS`    | `capacitor://localhost,https://localhost,http://localhost:5173` | origines autorisées (CORS), séparées par des virgules  |
| `ANTHROPIC_API_KEY`  | aucun                                                           | clé de l'API Claude, utile seulement pour les conseils |
| `ADVICE_DAILY_LIMIT` | `10`                                                            | conseils par compte et par jour                        |

Sans `ANTHROPIC_API_KEY`, les défis fonctionnent et les conseils répondent « coach indisponible ».

## Déploiement

- Mettre le serveur derrière **HTTPS**, par exemple avec un proxy inverse comme Caddy. L'appli Android refuse le HTTP en clair.
- Sauvegarder le fichier SQLite : c'est la seule donnée du serveur.
- Le coût de l'IA dépend du nombre de conseils. `ADVICE_DAILY_LIMIT` le plafonne par compte.
- Hébergement en UE recommandé (RGPD). Les gênes signalées peuvent figurer dans le résumé envoyé à Anthropic : l'appli le dit avant l'accord et montre le texte exact.

## Tests

Depuis la racine du projet : `npm test` lance aussi `server/tests`. L'API Claude y est remplacée par une fausse.
