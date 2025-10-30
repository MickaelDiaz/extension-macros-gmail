// popup.js - Version avec Migration de Données, Édition et Suppression

document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('save-button');
  const nameInput = document.getElementById('macro-name');
  const queryInput = document.getElementById('macro-query');
  const macrosListDiv = document.getElementById('macros-list');

  // Assurez-vous que l'élément de message existe (ajoutez-le dans popup.html si ce n'est pas fait)
  const messageDiv = document.getElementById('status-message') || document.createElement('div');
  if (!document.getElementById('status-message')) {
    messageDiv.id = 'status-message';
    document.getElementById('new-macro-section').prepend(messageDiv);
  }

  let editingMacroKey = null;

  // Lance le processus de chargement/migration
  loadAndMigrateMacros();

  // Gestion des événements (Sauvegarde)
  saveButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const query = queryInput.value.trim();

    // La priorité par défaut est 1 (pour maintenir le format tableau d'objets)
    const priority = 1;

    if (name && query) {
      saveMacro({ name, query, priority });
    } else {
      showMessage('Veuillez remplir le nom et la requête.', 'error');
    }
  });

  // --- Fonctions de Migration et de Chargement ---

  function loadAndMigrateMacros() {
    // Initialise les macros comme un tableau vide par défaut
    chrome.storage.sync.get({ macros: [] }, (data) => {
      let macros = data.macros;
      let needsSave = false;

      // 🚨 LOGIQUE CRITIQUE DE MIGRATION 🚨
      // Si le format est un objet (votre ancien format) et non un tableau, on migre !
      if (macros && typeof macros === 'object' && !Array.isArray(macros)) {
        const migratedMacros = [];
        let defaultPriority = 1;

        console.warn("Migration des données de macros : Ancien format objet détecté. Conversion en tableau.");

        for (const name in macros) {
          if (macros.hasOwnProperty(name)) {
            migratedMacros.push({
              name: name,
              query: macros[name],
              priority: defaultPriority++, // Ajout d'une priorité par défaut
            });
          }
        }
        macros = migratedMacros;
        needsSave = true; // On doit sauvegarder ce nouveau format
      }

      // Tri par la priorité (même si la priorité est 1 pour l'instant, c'est pour le futur)
      macros.sort((a, b) => a.priority - b.priority);

      // Si la migration a eu lieu, on sauvegarde immédiatement pour fixer le format
      if (needsSave) {
        chrome.storage.sync.set({ macros: macros }, () => {
          console.log("Migration des données terminée et format corrigé.");
          loadMacrosDisplay(macros);
        });
      } else {
        loadMacrosDisplay(macros);
      }
    });
  }

  // Affiche les macros
  function loadMacrosDisplay(macros) {
    macrosListDiv.innerHTML = '';

    if (macros.length === 0) {
      macrosListDiv.innerHTML = `<div class="macro-item no-macros-msg" style="justify-content: center; color: #777;">Aucune macro enregistrée.</div>`;
      return;
    }

    macros.forEach(macro => {
      // S'assurer que le nom et la requête existent (sécurité après migration)
      const name = macro.name || 'Nom Inconnu';
      const query = macro.query || '';

      const itemDiv = document.createElement('div');
      itemDiv.className = 'macro-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'macro-name';

      // 💡 CORRECTION : Utilise la propriété '.name' pour l'affichage
      // Vous pouvez aussi ajouter la priorité si vous le souhaitez :
      // nameSpan.textContent = `[${macro.priority}] ${name}`;

      nameSpan.textContent = name;

      nameSpan.title = `Cliquez pour lancer la recherche: ${query}`;

      nameSpan.addEventListener('click', () => { runMacro(query); });

      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'macro-controls';

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Modifier';
      editBtn.addEventListener('click', () => { editMacro(macro); });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Supprimer';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer la macro "${name}" ?`)) {
          deleteMacro(name);
        }
      });

      controlsDiv.appendChild(editBtn);
      controlsDiv.appendChild(deleteBtn);
      itemDiv.appendChild(nameSpan);
      itemDiv.appendChild(controlsDiv);
      macrosListDiv.appendChild(itemDiv);
    });
  }

  // --- Fonctions de CRUD (Création, Lecture, Mise à jour, Suppression) ---

  function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = `status-message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 3000);
  }

  function saveMacro(newMacro) {
    chrome.storage.sync.get({ macros: [] }, (data) => {
      let macros = data.macros;

      // Mise à jour (si on édite, on supprime l'ancienne version par nom)
      if (editingMacroKey) {
        macros = macros.filter(m => m.name !== editingMacroKey.name);
      } else {
        // Création (si le nom existe déjà, on le remplace)
        macros = macros.filter(m => m.name !== newMacro.name);
      }

      macros.push(newMacro);
      macros.sort((a, b) => a.priority - b.priority);

      chrome.storage.sync.set({ macros: macros }, () => {
        showMessage(`Macro "${newMacro.name}" enregistrée/modifiée.`, 'success');

        nameInput.value = '';
        queryInput.value = '';
        editingMacroKey = null;
        saveButton.textContent = 'Enregistrer la Macro';

        loadAndMigrateMacros();
      });
    });
  }

  function editMacro(macro) {
    nameInput.value = macro.name;
    queryInput.value = macro.query;
    editingMacroKey = macro;
    saveButton.textContent = 'Mettre à jour la Macro';
    showMessage(`Modification de la macro "${macro.name}".`, 'info');
  }

  function deleteMacro(name) {
    chrome.storage.sync.get({ macros: [] }, (data) => {
      let macros = data.macros;
      macros = macros.filter(m => m.name !== name);

      chrome.storage.sync.set({ macros: macros }, () => {
        showMessage(`Macro "${name}" supprimée.`, 'info');
        loadAndMigrateMacros();
      });
    });
  }

  function runMacro(query) {
    chrome.tabs.query({ active: true, currentWindow: true, url: "https://mail.google.com/*" }, (tabs) => {
      if (tabs.length > 0) {
        const activeTabId = tabs[0].id;
        chrome.tabs.sendMessage(activeTabId, { action: "runMacro", query: query }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Erreur de communication : " + chrome.runtime.lastError.message);
          } else if (response && response.status === "error") {
            console.error("Erreur d'exécution : " + response.message);
          }
          window.close();
        });
      } else {
        const encodedQuery = encodeURIComponent(query);
        const newUrl = `https://mail.google.com/mail/u/0/#search/${encodedQuery}`;
        chrome.tabs.create({ url: newUrl });
        window.close();
      }
    });
  }

});