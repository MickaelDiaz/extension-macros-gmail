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
// B. LOGIQUE D'INJECTION (Mise à jour pour état actif)
// ====================================================================

function injectMacros(macros) {
    const targetContainer = document.querySelector('.n3');

    if (!targetContainer) return;
    if (document.getElementById('macro-container-gmail')) return;

    // --- 💡 Ajout des styles pour l'état ACTIF permanent ---
    const styleId = 'macro-custom-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Feedback de Clic (1 sec) */
            .macro-active-feedback {
                background-color: #d2e3fc !important;
                border-left: 3px solid #1a73e8; 
                padding-left: 23px !important; 
                transition: background-color 0.1s, border-left 0.1s;
            }
            
            /* 💡 NOUVEAU: État Actif Permanent (mimique Gmail) */
            .macro-active-state {
                background-color: #e8f0fe !important; /* Fond bleu clair Gmail */
                font-weight: bold !important;
                color: #1967d2 !important; /* Texte bleu Gmail */
            }
        `;
        document.head.appendChild(style);
    }
    // --- Fin des styles ---

    const container = document.createElement('div');
    container.id = 'macro-container-gmail';
    // ... (Styles du conteneur inchangés) ...
    container.style.cssText = `
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #e0e0e0;
        display: block;
    `;

    // 3. Titre (Inchangé)
    const heading = document.createElement('div');
    heading.textContent = '🔍 Macros';
    //
    heading.className = 'n0'; // Utilise la classe de Gmail pour le thème
    heading.style.cssText = `
        padding: 4px 0px 4px 26px;
        font-size: 14px;
        font-weight: bold; 
        margin-bottom: 2px;
        text-transform: uppercase;
    `;
    //
    container.appendChild(heading);

    // 4. Liens de macro
    macros.forEach(macro => {
        const name = macro.name;
        const query = macro.query;
        if (!name || !query) return;

        const macroItem = document.createElement('div');
        macroItem.textContent = name;
        macroItem.title = query;

        // 💡 NOUVEAU: Ajoute un attribut 'data-query' pour l'identification
        macroItem.dataset.query = query;

        // ... (Styles et gestion du survol inchangés) ...
        // ... (Gestion du clic (Feedback) inchangée) ...

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
            border-left: 3px solid transparent; 
            padding-left: 26px; 
        `;

        macroItem.addEventListener('mouseover', () => {
            if (!macroItem.classList.contains('macro-active-state')) {
                macroItem.style.backgroundColor = hoverBG;
            }
        });
        macroItem.addEventListener('mouseout', () => {
            if (!macroItem.classList.contains('macro-active-state')) {
                macroItem.style.backgroundColor = defaultBG;
            }
        });

        macroItem.addEventListener('click', () => {
            // Feedback Visuel (1 sec)
            macroItem.classList.add('macro-active-feedback');
            setTimeout(() => {
                macroItem.classList.remove('macro-active-feedback');
            }, 1000);

            // Exécution
            const result = executerMacro(query);
            if (result.status === "error") {
                console.error(result.message);
            }
        });

        container.appendChild(macroItem);
    });

    targetContainer.appendChild(container);
    console.log("Menu des macros injecté/ré-injecté.");
}

// ====================================================================
// C. INITIALISATION (Mise à jour pour état actif)
// ====================================================================

// 💡 NOUVEAU: Fonction pour synchroniser l'URL avec le style
function updateActiveMacroHighlight() {
    let currentQuery = null;

    // 1. Vérifie si l'URL actuelle est une recherche
    if (window.location.hash.startsWith('#search/')) {
        // Extrait la requête de l'URL (ex: #search/label%3Afactures)
        currentQuery = decodeURIComponent(window.location.hash.substring(8)); // 8 = longueur de '#search/'
    }

    // 2. Réinitialise d'abord TOUTES les macros
    const allMacroItems = document.querySelectorAll('#macro-container-gmail [data-query]');
    allMacroItems.forEach(item => {
        item.classList.remove('macro-active-state');
        item.style.backgroundColor = 'transparent'; // Réinitialise le fond du survol
    });

    // 3. Applique l'état actif si une correspondance est trouvée
    if (currentQuery) {
        try {
            // CSS.escape est vital si la requête contient des guillemets ou des caractères spéciaux
            const activeElement = document.querySelector(
                `#macro-container-gmail [data-query="${CSS.escape(currentQuery)}"]`
            );
            if (activeElement) {
                activeElement.classList.add('macro-active-state');
            }
        } catch (e) {
            console.error("Erreur lors de la sélection de la macro active (probablement des caractères spéciaux):", e);
        }
    }
}


let savedMacros = [];

// 1. Récupérer les macros (Inchangé)
chrome.storage.sync.get({ macros: [] }, (data) => {
    if (data.macros.length > 0) {
        savedMacros = data.macros;
        savedMacros.sort((a, b) => (a.priority || 99) - (b.priority || 99));
        injectMacros(savedMacros);
    }
});

// 2. Écouter les changements de stockage (Inchangé)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.macros) {
        savedMacros = changes.macros.newValue || [];
        savedMacros.sort((a, b) => (a.priority || 99) - (b.priority || 99));

        const existingContainer = document.getElementById('macro-container-gmail');
        if (existingContainer) {
            existingContainer.remove();
        }

        injectMacros(savedMacros);
    }
});

// 3. L'OBSERVATEUR PERSISTANT (Mis à jour)
const observer = new MutationObserver((mutationsList, observer) => {
    savedMacros.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    injectMacros(savedMacros);

    // 💡 NOUVEAU: Mettre à jour le surlignage après chaque injection/re-rendu
    updateActiveMacroHighlight();
});

observer.observe(document.body, { childList: true, subtree: true });

// 💡 NOUVEAU: Écouter les changements d'URL (clics sur "Boîte de réception", etc.)
window.addEventListener('hashchange', updateActiveMacroHighlight);