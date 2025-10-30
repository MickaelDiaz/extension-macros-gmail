# 🚀 Macros de Recherche Gmail

Ce projet est une extension Chrome minimaliste créée pour une seule chose : vous faire gagner du temps sur Gmail.

Plutôt que de mémoriser et de taper des opérateurs de recherche avancée, ce script vous permet de les sauvegarder en tant que "macros" accessibles directement depuis la barre de navigation de gauche.

## Le problème

L'interface de recherche de Gmail est puissante, mais son utilisation répétée pour les mêmes filtres est fastidieuse.

## La solution

Ce script injecte un nouveau bloc dans la barre latérale de Gmail, contenant une liste de boutons. Chaque bouton est lié à une requête de recherche que vous avez prédéfinie.

* Cliquez sur "Factures 🧾" -> La barre de recherche exécute `label:factures is:unread`.
* Cliquez sur "À suivre 📌" -> La barre de recherche exécute `label:a-suivre from:me`.

### Comment ça marche ?

1.  **Injection de l'interface :** Le script attend que l'interface de Gmail soit chargée, puis il cible le conteneur `div.TK`.
2.  **Ajout du menu :** Il crée un nouveau conteneur (`#macro-container-gmail`) et y ajoute un titre et des liens pour chaque macro sauvegardée.
3.  **Gestion des clics :** Un écouteur d'événement sur chaque lien déclenche la fonction `executerMacro`.
4.  **Exécution de la recherche :** La fonction `executerMacro` trouve programmatiquement la barre de recherche (`input[aria-label="Rechercher dans les messages"]`) et le bouton de recherche, les remplit, simule une saisie et clique sur "Rechercher" pour vous.

##  🛠️ Installation & Utilisation
Cette extension n'est pas (encore) disponible sur le Chrome Web Store. Elle doit être installée manuellement en mode développeur.

### Étape 1 : Installation de l'Extension
Suivez les étapes ci-dessous pour installer Gmail Search Macro Injector sur votre navigateur. La procédure est presque identique pour Chrome et Edge.

Téléchargez les fichiers : Assurez-vous d'avoir le dossier de l'extension (contenant le manifest.json, les scripts, etc.) téléchargé sur votre ordinateur.

Ouvrez la page des extensions :
Dans Google Chrome, tapez chrome://extensions dans la barre d'adresse.
Dans Microsoft Edge, tapez edge://extensions dans la barre d'adresse.

Activez le Mode Développeur : En haut à droite de la page, activez le bouton/interrupteur "Mode développeur" (Developer mode).
Chargez l'extension : Cliquez sur le bouton "Charger l'extension non empaquetée" (Load unpacked).
Sélectionnez le dossier : Naviguez jusqu'au dossier que vous avez téléchargé et sélectionnez-le.

L'extension est maintenant installée et active !

### Étape 2 : Création et Utilisation des Macros
Avant d'utiliser les macros, vous devez les créer et les enregistrer.

Ouvrez le panneau de l'extension :
Cliquez sur l'icône de l'extension "Macros de Recherche Gmail" dans la barre d'outils de votre navigateur (en haut à droite).
Si l'icône n'est pas visible, cliquez d'abord sur l'icône de la pièce de puzzle (Gestionnaire d'extensions) et épinglez l'extension pour un accès facile.

Créez votre première macro :
Le popup de l'extension s'ouvre. Il contient deux champs :
- Nom de la Macro : Le texte qui apparaîtra sur le bouton dans Gmail (ex: Factures 🧾).
- Requête de Recherche : L'opérateur de recherche avancé à exécuter (ex: label:factures is:unread).

Remplissez les champs et cliquez sur le bouton "Ajouter" (ou similaire).

Enregistrez et répétez : Répétez cette étape pour toutes les macros que vous souhaitez utiliser. Les macros sont automatiquement sauvegardées dans votre navigateur.
