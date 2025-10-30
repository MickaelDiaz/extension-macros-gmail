// Ce script est maintenant responsable de DEUX choses:
// 1. Écouter les messages pour exécuter la recherche.
// 2. Initialiser et afficher les boutons de macro dans l'interface Gmail.

// ====================================================================
// A. LOGIQUE D'EXÉCUTION DE LA MACRO (Inchangée)
// ====================================================================

function executerMacro(query) {
    let searchInput = null;
    let searchButton = null;

    // 1. Chercher le formulaire de recherche principal pour être plus précis
    const searchForm = document.querySelector('form[role="search"]');

    if (searchForm) {
        // 2. CHERCHER L'INPUT avec le bon aria-label
        searchInput = searchForm.querySelector('input[aria-label="Rechercher dans les messages"]');

        // 3. CHERCHER LE BOUTON avec le bon aria-label
        searchButton = searchForm.querySelector('button[aria-label="Rechercher dans les messages"]');
    } else {
        // (Plan B si le formulaire n'est pas trouvé)
        console.warn("Formulaire de recherche (role='search') non trouvé. Tentative de secours.");
        searchInput = document.querySelector('input[aria-label="Rechercher dans les messages"]');
        searchButton = document.querySelector('button[aria-label="Rechercher dans les messages"]');
    }

    // 4. Vérification
    if (searchInput && searchButton) {
        // 1. Met à jour la valeur du champ de recherche
        searchInput.value = query;

        // 2. Simule l'événement 'input'. 
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        // 3. Clique sur le bouton de recherche pour VALIDER
        searchButton.click();

        return { status: "success", message: "Macro exécutée et validée." };
    } else {
        // Erreur de débogage
        if (!searchInput) console.error("ERREUR MACRO : Champ de saisie 'searchInput' INTROUVABLE.");
        if (!searchButton) console.error("ERREUR MACRO : Bouton de recherche 'searchButton' INTROUVABLE.");

        return { status: "error", message: "Champ ou bouton de recherche Gmail introuvable. Les sélecteurs sont peut-être obsolètes." };
    }
}

// Écoute les messages venant d'autres parties de l'extension (Inchangé)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "runMacro") {
        const result = executerMacro(request.query);
        sendResponse(result);
        return true;
    }
});


// ====================================================================
// B. LOGIQUE D'INJECTION (✨ MODIFIÉE POUR LES THÈMES ET L'ALIGNEMENT)
// ====================================================================

function injectMacros(macros) {
    // 1. Emplacement (Inchangé)
    const targetElement = document.querySelector('div.TK');

    if (!targetElement) {
        console.warn("Conteneur d'injection Gmail (div.TK) non trouvé.");
        return;
    }

    if (document.getElementById('macro-container-gmail')) {
        return; // Déjà injecté
    }

    // 2. Conteneur principal (Inchangé)
    const container = document.createElement('div');
    container.id = 'macro-container-gmail';
    container.style.cssText = `
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #e0e0e0; /* Joli séparateur */
        display: block; /* Affichage en liste */
    `;

    // 3. Titre (✨ MODIFIÉ)
    const heading = document.createElement('div');
    heading.textContent = '🔍 Macros';
    // On applique la classe 'n0' de Gmail : gère alignement ET couleur du thème
    heading.className = 'n0';
    heading.style.cssText = `
        padding: 4px 0px 4px 26px; /* Alignement d'origine */
        font-size: 14px;
        font-weight: bold; /* Gardé de votre code */
        /* SUPPRIMÉ: color: ... (géré par 'n0') */
        /* SUPPRIMÉ: padding-left: ... (géré par 'n0') */
        margin-bottom: 2px;
        text-transform: uppercase;
    `;
    container.appendChild(heading);


    // 4. Liens de macro (✨ MODIFIÉ)
    for (const name in macros) {
        const query = macros[name];

        const macroItem = document.createElement('div');
        macroItem.textContent = name;
        macroItem.title = query;

        const defaultBG = 'transparent';
        const hoverBG = '#f1f3f4'; // Couleur de survol de Gmail

        macroItem.style.cssText = `
            padding: 4px 0px 4px 26px; /* Alignement d'origine */
            cursor: pointer;
            border-radius: 0 16px 16px 0; 
            font-size: 14px;
            font-weight: normal; /* ✨ MODIFIÉ: Mis en gras comme demandé */
            margin-right: 16px; 
            background-color: ${defaultBG};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        // Gérer le survol (hover)
        macroItem.addEventListener('mouseover', () => {
            macroItem.style.backgroundColor = hoverBG;
        });
        macroItem.addEventListener('mouseout', () => {
            macroItem.style.backgroundColor = defaultBG;
        });

        // Gérer le clic
        macroItem.addEventListener('click', () => {
            const result = executerMacro(query);
            if (result.status === "error") {
                console.error(result.message);
                alert("Erreur: Impossible de lancer la macro. Veuillez rafraîchir la page.");
            }
        });

        container.appendChild(macroItem);
    }

    targetElement.prepend(container);
}

// ====================================================================
// C. INITIALISATION (Inchangé)
// ====================================================================

// Fonction d'initialisation pour récupérer les données et injecter
function init() {
    // Récupérer la liste des macros depuis le stockage
    chrome.storage.sync.get({ macros: {} }, (data) => {
        if (Object.keys(data.macros).length > 0) {
            injectMacros(data.macros);
        }
    });
}

// Exécuter l'initialisation après un petit délai pour s'assurer que Gmail est chargé
setTimeout(init, 3000);

// Écouter les changements de stockage pour mettre à jour les boutons (Inchangé)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.macros) {
        // Recharger les macros
        const existingContainer = document.getElementById('macro-container-gmail');
        if (existingContainer) {
            existingContainer.remove();
        }
        setTimeout(init, 1000); // Ré-injecter après un court délai
    }
});