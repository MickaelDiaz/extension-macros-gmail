// Attend que le contenu du popup.html soit chargé
document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('save-button');
  const nameInput = document.getElementById('macro-name');
  const queryInput = document.getElementById('macro-query');
  const macrosListDiv = document.getElementById('macros-list');
  const messageDiv = document.getElementById('status-message'); // Pour les messages de confirmation

  let editingMacroName = null; // Stocke le nom de la macro en cours d'édition (si applicable)

  // Charge les macros existantes au démarrage
  loadMacros();

  // Gère le clic sur "Enregistrer" ou "Mettre à jour"
  saveButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const query = queryInput.value.trim();

    if (name && query) {
      if (editingMacroName && editingMacroName !== name) {
        // Cas 1 : Changement de nom pendant l'édition
        // Nous supprimons l'ancienne clé avant d'en enregistrer une nouvelle
        deleteMacroKey(editingMacroName, () => {
          saveMacro(name, query, 'modifiée');
        });
      } else {
        // Cas 2 : Enregistrement initial ou modification de requête sans changer le nom
        const actionType = editingMacroName ? 'modifiée' : 'enregistrée';
        saveMacro(name, query, actionType);
      }

    } else {
      showMessage('Veuillez remplir le nom et la requête.', 'error');
    }
  });

  // Fonction utilitaire pour afficher un message
  function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = `status-message ${type}`;
    messageDiv.style.display = 'block';

    // Masque le message après 3 secondes
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 3000);
  }

  // Fonction pour sauvegarder/mettre à jour une macro
  function saveMacro(name, query, action) {
    chrome.storage.sync.get({ macros: {} }, (data) => {
      const macros = data.macros;
      macros[name] = query; // Ajoute ou met à jour la macro

      chrome.storage.sync.set({ macros: macros }, () => {
        console.log(`Macro ${action} !`);

        // Reset l'interface après la sauvegarde
        nameInput.value = '';
        queryInput.value = '';
        editingMacroName = null;
        saveButton.textContent = 'Enregistrer la Macro';

        showMessage(`Macro "${name}" ${action} avec succès.`, 'success');
        loadMacros(); // Recharge la liste
      });
    });
  }

  // Fonction pour charger une macro dans le formulaire pour l'édition
  function editMacro(name, query) {
    nameInput.value = name;
    queryInput.value = query;
    editingMacroName = name; // Définit la macro en cours d'édition
    saveButton.textContent = 'Mettre à jour la Macro';
    showMessage(`Modification de la macro "${name}".`, 'info');
  }


  // Fonction pour charger et afficher toutes les macros
  function loadMacros() {
    macrosListDiv.innerHTML = ''; // Vide la liste actuelle
    chrome.storage.sync.get({ macros: {} }, (data) => {
      const macros = data.macros;
      const keys = Object.keys(macros);

      if (keys.length === 0) {
        // Affiche un message si aucune macro n'est présente
        macrosListDiv.innerHTML = `<div class="macro-item no-macros-msg">Aucune macro enregistrée.</div>`;
        return;
      }

      for (const name in macros) {
        const query = macros[name];

        // Crée les éléments HTML pour chaque macro
        const itemDiv = document.createElement('div');
        itemDiv.className = 'macro-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'macro-name';
        nameSpan.textContent = name;
        nameSpan.title = `Cliquez pour lancer la recherche: ${query}`;

        // Ajoute le clic pour EXÉCUTER la macro
        nameSpan.addEventListener('click', () => {
          runMacro(query);
        });

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'macro-controls';

        // Bouton EDITER
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Modifier';
        editBtn.title = `Charger "${name}" pour édition`;
        editBtn.addEventListener('click', () => {
          editMacro(name, query);
        });

        // Bouton SUPPRIMER
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Supprimer';
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Êtes-vous sûr de vouloir supprimer la macro "${name}" ?`)) {
            deleteMacroKey(name, () => {
              showMessage(`Macro "${name}" supprimée.`, 'info');
            });
          }
        });

        controlsDiv.appendChild(editBtn);
        controlsDiv.appendChild(deleteBtn);

        itemDiv.appendChild(nameSpan);
        itemDiv.appendChild(controlsDiv);
        macrosListDiv.appendChild(itemDiv);
      }
    });
  }

  // Fonction pour supprimer une macro (supprime la clé et recharge la liste)
  function deleteMacroKey(name, callback = () => { }) {
    chrome.storage.sync.get({ macros: {} }, (data) => {
      const macros = data.macros;
      delete macros[name]; // Supprime la clé de l'objet
      chrome.storage.sync.set({ macros: macros }, () => {
        loadMacros(); // Recharge la liste
        callback();
      });
    });
  }

  // Fonction pour exécuter la recherche : Utilise le Script de Contenu pour agir DANS Gmail.
  function runMacro(query) {
    chrome.tabs.query({ active: true, currentWindow: true, url: "https://mail.google.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        const activeTabId = tabs[0].id;

        // Envoie un message au script de contenu pour LUI demander d'exécuter la recherche.
        // NOTE: content.js doit être listé dans 'content_scripts' dans manifest.json pour être actif.
        chrome.tabs.sendMessage(activeTabId, {
          action: "runMacro",
          query: query
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Erreur de communication : " + chrome.runtime.lastError.message);
            // Pas d'alerte ici pour éviter d'interrompre l'utilisateur
          } else if (response && response.status === "error") {
            console.error("Erreur d'exécution : " + response.message);
          }
          window.close(); // Ferme le popup après l'envoi de la commande
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

});