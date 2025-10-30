// ====================================================================
// A. LOGIQUE D'EXÉCUTION DE LA MACRO (Inchangée)
// ====================================================================

function executerMacro(query) {
    let searchInput = null;
    let searchButton = null;
    const searchForm = document.querySelector('form[role="search"]');

    if (searchForm) {
        searchInput = searchForm.querySelector('input[aria-label="Rechercher dans les messages"]');
        searchButton = searchForm.querySelector('button[aria-label="Rechercher dans les messages"]');
    } else {
        console.warn("Formulaire de recherche (role='search') non trouvé. Tentative de secours.");
        searchInput = document.querySelector('input[aria-label="Rechercher dans les messages"]');
        searchButton = document.querySelector('button[aria-label="Rechercher dans les messages"]');
    }

    if (searchInput && searchButton) {
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchButton.click();
        return { status: "success", message: "Macro exécutée et validée." };
    } else {
        if (!searchInput) console.error("ERREUR MACRO : Champ de saisie 'searchInput' INTROUVABLE.");
        if (!searchButton) console.error("ERREUR MACRO : Bouton de recherche 'searchButton' INTROUVABLE.");
        return { status: "error", message: "Champ ou bouton de recherche Gmail introuvable." };
    }
}

// Écoute les messages venant du popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "runMacro") {
        const result = executerMacro(request.query);
        sendResponse(result);
        return true;
    }
});


// ====================================================================
// B. LOGIQUE D'INJECTION (MODIFIÉE POUR VÉRIFICATION)
// ====================================================================

function injectMacros(macros) {
    // 1. Cible d'injection stable
    const targetContainer = document.querySelector('.n3');

    // SI la cible n'existe pas ENCORE, ne rien faire. L'observer rappellera cette fonction.
    if (!targetContainer) {
        return;
    }

    // SI le menu est DÉJÀ là, ne rien faire.
    if (document.getElementById('macro-container-gmail')) {
        return;
    }

    // 2. Conteneur principal
    const container = document.createElement('div');
    container.id = 'macro-container-gmail';
    container.style.cssText = `
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #e0e0e0;
        display: block;
    `;

    // 3. Titre
    const heading = document.createElement('div');
    heading.textContent = '🔍 Macros';
    heading.className = 'n0'; // Utilise la classe de Gmail pour le thème
    heading.style.cssText = `
        padding: 4px 0px 4px 26px;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 2px;
        text-transform: uppercase;
    `;
    container.appendChild(heading);

    // 4. Liens de macro
    for (const name in macros) {
        const query = macros[name];
        const macroItem = document.createElement('div');
        macroItem.textContent = name;
        macroItem.title = query;
        const defaultBG = 'transparent';
        const hoverBG = '#f1f3f4';
        macroItem.style.cssText = `
            padding: 4px 0px 4px 26px;
            cursor: pointer;
            border-radius: 0 16px 16px 0;
            font-size: 14px;
            font-weight: normal;
            margin-right: 16px;
            background-color: ${defaultBG};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        macroItem.addEventListener('mouseover', () => { macroItem.style.backgroundColor = hoverBG; });
        macroItem.addEventListener('mouseout', () => { macroItem.style.backgroundColor = defaultBG; });
        macroItem.addEventListener('click', () => {
            const result = executerMacro(query);
            if (result.status === "error") {
                console.error(result.message);
            }
        });
        container.appendChild(macroItem);
    }

    // Injection à la fin du conteneur de navigation
    targetContainer.appendChild(container);
    console.log("Menu des macros injecté/ré-injecté.");
}

// ====================================================================
// C. INITIALISATION (CORRECTION MAJEURE POUR LA PERSISTANCE)
// ====================================================================

let savedMacros = {}; // Stocke les macros localement

// 1. Récupérer les macros une première fois
chrome.storage.sync.get({ macros: {} }, (data) => {
    if (Object.keys(data.macros).length > 0) {
        savedMacros = data.macros;
        // Tenter une injection immédiate (au cas où la page est déjà chargée)
        injectMacros(savedMacros);
    }
});

// 2. Écouter les changements de stockage (si l'utilisateur ajoute/supprime une macro)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.macros) {
        // Mettre à jour les macros en mémoire
        savedMacros = changes.macros.newValue || {};

        // Supprimer l'ancienne liste pour forcer la ré-injection
        const existingContainer = document.getElementById('macro-container-gmail');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Tenter de ré-injecter immédiatement avec les nouvelles données
        injectMacros(savedMacros);
    }
});

// 3. ✨ L'OBSERVATEUR PERSISTANT ✨
// C'est lui qui gère la disparition/ré-apparition
const observer = new MutationObserver((mutationsList, observer) => {
    // À CHAQUE modification du DOM (navigation, etc.),
    // on vérifie si l'injection est nécessaire.
    // La fonction injectMacros() contient la logique pour ne pas
    // injecter si c'est déjà fait.
    injectMacros(savedMacros);
});

// Lance l'observation sur TOUTE la page, et ne s'arrête JAMAIS.
observer.observe(document.body, { childList: true, subtree: true });