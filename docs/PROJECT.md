# Crispi POS — Documentation du Projet

## Vue d'ensemble

**Crispi POS** est un systeme de caisse (Point of Sale) pour le restaurant **Crispi**, developpe en tant que Progressive Web App (PWA). L'application fonctionne en ligne et hors-ligne, avec synchronisation automatique via Supabase.

- **Langue de l'interface** : Francais
- **Devise** : Dirham Marocain (DH)
- **Police** : Inter (Google Fonts)
- **Theme** : Dark mode (#1a1a2e fond, #e2b714 accent dore)

---

## Architecture Technique

### Stack

| Composant       | Technologie                         |
|-----------------|-------------------------------------|
| Frontend        | HTML / CSS / JavaScript vanilla     |
| Stockage local  | localStorage                        |
| Backend / BDD   | Supabase (PostgreSQL)               |
| Mode hors-ligne | Service Worker + cache (v22)        |
| Installation    | PWA (manifest.json, standalone)     |

### Structure des fichiers

```
CRISPY/
├── index.html              # Interface principale du POS
├── log.html                # Page historique des commandes
├── admin.html              # Panneau d'administration (Mohamed Base)
├── manifest.json           # Configuration PWA
├── sw.js                   # Service Worker (cache + offline)
├── css/
│   ├── styles.css          # Styles principaux
│   ├── admin.css           # Styles admin
│   └── log.css             # Styles historique
├── js/
│   ├── supabase-config.js  # Configuration Supabase (URL + clé)
│   ├── data.js             # Catalogue produits par défaut
│   ├── storage.js          # Couche de persistance (localStorage + Supabase + file d'attente offline)
│   ├── products.js         # Affichage et gestion du catalogue produits
│   ├── orders.js           # Ticket de commande (ajout, suppression, validation)
│   ├── tables.js           # Gestion des tables (ouverture, ajout, cuisine, paiement)
│   ├── calculator.js       # Calculatrice intégrée
│   ├── product-manager.js  # Gestionnaire de produits (CRUD)
│   ├── app.js              # Initialisation de l'application
│   ├── log.js              # Logique de la page historique
│   └── admin.js            # Logique du panneau admin
├── img/
│   ├── icon.svg            # Icône de l'application
│   └── products/           # Images des produits (JPEG/JPG)
└── docs/
    └── PROJECT.md          # Ce fichier
```

---

## Modules Principaux

### 1. Catalogue Produits (`data.js`, `products.js`)

4 categories de produits :

| Catégorie           | Nombre de produits | Fourchette de prix |
|---------------------|--------------------|--------------------|
| Chawarma            | 10                 | 15 — 45 DH        |
| Poulet Croustillant | 10                 | 13 — 45 DH        |
| Petit Déjeuner      | 9                  | 10 — 30 DH        |
| Boissons            | 8                  | 5 — 14 DH         |

- Chaque produit a un ID, nom, prix, catégorie, image et position d'affichage
- Les produits sont seedés dans localStorage au premier lancement (versionnés via `MENU_VERSION`)
- Les produits personnalisés (ajoutés manuellement) sont conservés lors des mises à jour du menu

### 2. Gestion des Commandes (`orders.js`)

- **Ajout/suppression** d'articles au ticket
- **Type de commande** : Sur place / A emporter
- **Sélection de serveur** : boutons serveur
- **Sélection de table** : numéros 1 à 30
- **Notes par article** : notes rapides spécifiques par catégorie
- **Validation** : génère un reçu imprimable
- **Annulation** : vide le ticket en cours

### 3. Gestion des Tables (`tables.js`)

- Grille de 30 tables sur l'écran d'accueil
- **Ouvrir une table** : assigner des articles et un serveur
- **Tables occupées** : vue paginée (6 par page) avec cartes cliquables (header seul par défaut, tap pour voir les détails)
- **Bouton Cuisine** : imprime un ticket cuisine avec les articles
- **Bouton Cuisine (Nouveau)** : envoie uniquement les nouveaux articles non encore envoyés en cuisine
- **Paiement** : ferme la table et génère un reçu (caisse uniquement)
- Badge indicateur du nombre de tables occupées

### 4. Chiffre d'Affaires

- Affiché en permanence dans la barre supérieure
- **Calcul** : basé sur les commandes réelles (incluant les commandes supprimées en soft-delete)
- **Réinitialisation automatique** : chaque jour à 7h du matin
- **Résumé journalier** : modal avec détails au clic sur le chiffre d'affaires
- **Rapport imprimable** : disponible dans le panneau admin

### 5. Stockage et Synchronisation (`storage.js`)

- **Double persistance** : localStorage (principal) + Supabase (cloud)
- **Mode hors-ligne** : file d'attente des opérations, synchronisation automatique au retour en ligne
- **Auto-sync** : synchronisation périodique avec Supabase
- **Indicateur de statut** : pastille verte (en ligne) / rouge (hors-ligne)

### 6. Service Worker (`sw.js`)

- Cache des assets statiques (HTML, CSS, JS, images)
- Stratégie **network-first** : tente le réseau, retombe sur le cache
- Version actuelle du cache : `crispi-pos-v22`

### 7. Panneau Admin (`admin.html`, `admin.js`)

- **Accès protégé** par code PIN (défaut : `6543`)
- **Nom** : Mohamed Base
- Interface numpad pour la saisie du code
- **Fonctionnalités** :
  - Visualisation et filtrage de l'historique des commandes
  - Suppression de commandes (soft-delete)
  - Changement du mot de passe admin
  - Rapport journalier imprimable

### 8. Historique des Commandes (`log.html`, `log.js`)

- Liste de toutes les commandes passées
- Affichage du chiffre d'affaires total
- Accessible depuis la barre supérieure (icône horloge)

### 9. Calculatrice (`calculator.js`)

- Calculatrice intégrée accessible depuis la barre supérieure
- Utile pour les calculs rapides (rendu monnaie, etc.)

### 10. Gestionnaire de Produits (`product-manager.js`)

- Interface pour ajouter, modifier et supprimer des produits du catalogue
- Permet de personnaliser le menu au-delà des produits par défaut

---

## Fonctionnalités Clés

- **PWA installable** : fonctionne comme une app native sur mobile et desktop
- **Mode hors-ligne complet** : toutes les fonctionnalités disponibles sans connexion
- **Impression** : tickets de commande (caisse), tickets cuisine, rapports journaliers
- **Système de tables** : gestion complète des tables de restaurant
- **Soft-delete** : les commandes supprimées restent comptées dans le chiffre d'affaires pour garantir l'exactitude des totaux
- **Multi-serveur** : sélection du serveur par commande

---

## Backend Supabase

- **URL** : `ekjzfihrfhpzjynpytga.supabase.co`
- **Synchronisation** : automatique et bidirectionnelle
- **Offline queue** : les opérations effectuées hors-ligne sont mises en file d'attente et exécutées au retour de la connexion

---

## Historique des Versions (commits principaux)

| Date       | Description                                                          |
|------------|----------------------------------------------------------------------|
| Initial    | Crispi POS — commit initial                                         |
|            | Ajout catégories Omelette + Ftour, mise à jour prix                 |
|            | Panneau admin (Mohamed Base), système double imprimante             |
|            | Notes rapides par catégorie                                         |
|            | Images produits pour tous les articles                              |
|            | Sélecteur de table (1-30), serveurs, réinitialisation du CA         |
|            | Toggle Sur place / A emporter, reçus en gras                        |
|            | Rapport journalier auto-reset à 7h + rapport imprimable en admin    |
|            | Système de gestion de tables avec onglets, ajout d'articles, paiement |
|            | Écran d'accueil avec grille tables, reçu caisse uniquement          |
|            | Pagination tables occupées (6 par page)                             |
|            | Cartes tables cliquables (header seul par défaut)                   |
|            | Bouton Cuisine (Nouveau) pour nouveaux articles uniquement          |
|            | Fix précision du CA : calcul depuis les commandes réelles           |
|            | Soft-delete conserve le total CA exact                              |
