// Attend que le contenu du popup.html soit chargé
document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('save-button');
  const nameInput = document.getElementById('macro-name');
  const queryInput = document.getElementById('macro-query');
  const macrosListDiv = document.getElementById('macros-list');

  // Charge les macros existantes au démarrage
  loadMacros();

  // Gère le clic sur "Enregistrer"
  saveButton.addEventListener('click', () => {
    const name = nameInput.value;
    const query = queryInput.value;

    if (name && query) {
      saveMacro(name, query);
      nameInput.value = '';
      queryInput.value = '';
    } else {
      alert('Veuillez remplir le nom et la requête.');
    }
  });

  // Fonction pour sauvegarder une macro (Aucun changement nécessaire ici)
  function saveMacro(name, query) {
    // Récupère les macros existantes, ou un objet vide
    chrome.storage.sync.get({ macros: {} }, (data) => {
      const macros = data.macros;
      macros[name] = query; // Ajoute ou met à jour la macro
      // Sauvegarde le nouvel objet de macros
      chrome.storage.sync.set({ macros: macros }, () => {
        console.log('Macro enregistrée !');
        loadMacros(); // Recharge la liste
      });
    });
  }

  // Fonction pour charger et afficher toutes les macros (Aucun changement nécessaire ici)
  function loadMacros() {
    macrosListDiv.innerHTML = ''; // Vide la liste actuelle
    chrome.storage.sync.get({ macros: {} }, (data) => {
      const macros = data.macros;

      for (const name in macros) {
        const query = macros[name];

        // Crée les éléments HTML pour chaque macro
        const itemDiv = document.createElement('div');
        itemDiv.className = 'macro-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'macro-name';
        nameSpan.textContent = name;
        // Ajoute le clic pour EXÉCUTER la macro
        nameSpan.addEventListener('click', () => {
          runMacro(query);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'X';
        // Ajoute le clic pour SUPPRIMER la macro
        deleteBtn.addEventListener('click', () => {
          deleteMacro(name);
        });

        itemDiv.appendChild(nameSpan);
        itemDiv.appendChild(deleteBtn);
        macrosListDiv.appendChild(itemDiv);
      }
    });
  }

  // Fonction pour exécuter la recherche : Utilise le Script de Contenu pour agir DANS Gmail.
  function runMacro(query) {
    // 1. Cherche l'onglet Gmail actuellement ACTIF dans la fenêtre.
    chrome.tabs.query({ active: true, currentWindow: true, url: "https://mail.google.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        const activeTabId = tabs[0].id;

        // 2. Injecte le script de contenu ('content.js') dans l'onglet Gmail.
        // Ceci est la clé pour que le code puisse manipuler la page.
        chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          files: ['content.js']
        }, () => {
          // 3. Envoie un message au script de contenu pour LUI demander d'exécuter la recherche.
          chrome.tabs.sendMessage(activeTabId, {
            action: "runMacro",
            query: query
          }, (response) => {
            // Gère les erreurs ou la confirmation après l'exécution.
            if (chrome.runtime.lastError) {
              console.error("Erreur de communication : " + chrome.runtime.lastError.message);
              alert("Erreur: Assurez-vous d'être sur une page Gmail.");
            } else if (response && response.status === "error") {
              console.error("Erreur d'exécution : " + response.message);
              alert("Erreur: " + response.message);
            } else {
              console.log(response ? response.message : "Commande envoyée.");
            }
            window.close(); // Ferme le popup après l'envoi de la commande
          });
        });

      } else {
        // Cas de secours (si l'utilisateur n'est pas sur Gmail) : ouvre un nouvel onglet.
        const encodedQuery = encodeURIComponent(query);
        const newUrl = `https://mail.google.com/mail/u/0/#search/${encodedQuery}`;
        chrome.tabs.create({ url: newUrl });
        window.close(); // Ferme le popup
      }
    });
  }

  // Fonction pour supprimer une macro (Aucun changement nécessaire ici)
  function deleteMacro(name) {
    chrome.storage.sync.get({ macros: {} }, (data) => {
      const macros = data.macros;
      delete macros[name]; // Supprime la clé de l'objet
      chrome.storage.sync.set({ macros: macros }, () => {
        console.log('Macro supprimée !');
        loadMacros(); // Recharge la liste
      });
    });
  }
});