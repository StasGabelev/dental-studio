// ============================================================
// DENTAL STUDIO ADMIN PANEL — JavaScript Logic + Supabase
// ============================================================

// --- Supabase Client ---
let sb = null; // will be initialized after connection

function getSupabaseConfig() {
    try {
        const c = localStorage.getItem('ds_supabase');
        return c ? JSON.parse(c) : null;
    } catch(e) { return null; }
}

function initSupabase() {
    const config = getSupabaseConfig();
    if (config && config.url && config.key) {
        sb = supabase.createClient(config.url, config.key);
        return true;
    }
    return false;
}

// Try to init on load
initSupabase();

// --- State ---
let currentUser = null;
let currentSection = 'dashboard';
let currentPage = 'home';
let priceItems = [];
let doctors = [];

// --- Model options per provider ---
const MODEL_OPTIONS = {
    openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o-mini (дешево, швидко)' },
        { value: 'gpt-4o', label: 'GPT-4o (потужний)' },
        { value: 'gpt-4.1', label: 'GPT-4.1 (новітній)' },
        { value: 'gpt-4.1-mini', label: 'GPT-4.1-mini' },
        { value: 'o4-mini', label: 'o4-mini (reasoning)' },
    ],
    anthropic: [
        { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (рекомендовано)' },
        { value: 'claude-opus-4-20250514', label: 'Claude Opus 4 (найпотужніший)' },
        { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (швидкий)' },
    ],
    google: [
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (швидкий)' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
    deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
    ],
    openrouter: [
        { value: 'auto', label: 'Auto (OpenRouter обере найкращу)' },
        { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
        { value: 'openai/gpt-4o', label: 'GPT-4o' },
        { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
    custom: [
        { value: 'custom', label: 'Custom Model ID' },
    ]
};

// --- Page content schema ---
const PAGE_SCHEMA = {
    "home": [
        {
            "key": "hero-video",
            "label": "\u0413\u043E\u043B\u043E\u0432\u043D\u0435 \u0432\u0456\u0434\u0435\u043E",
            "type": "video"
        },
        {
            "key": "interior-video",
            "label": "\u0412\u0456\u0434\u0435\u043E \u0456\u043D\u0442\u0435\u0440'\u0454\u0440\u0443",
            "type": "video"
        },
        {
            "key": "hero-title",
            "label": "\u0413\u043E\u043B\u043E\u0432\u043D\u0438\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
            "type": "textarea"
        },
        {
            "key": "hero-subtitle",
            "label": "\u041F\u0456\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
            "type": "textarea"
        },
        {
            "key": "btn-book",
            "label": "\u041A\u043D\u043E\u043F\u043A\u0430: \u0417\u0430\u043F\u0438\u0441\u0430\u0442\u0438\u0441\u044F",
            "type": "text"
        },
        {
            "key": "feat-aesthetic",
            "label": "\u0411\u043B\u043E\u043A: \u0415\u0441\u0442\u0435\u0442\u0438\u0447\u043D\u0430 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0456\u044F",
            "type": "text"
        },
        {
            "key": "feat-therapy",
            "label": "\u0411\u043B\u043E\u043A: \u041B\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F \u0437\u0443\u0431\u0456\u0432",
            "type": "text"
        },
        {
            "key": "feat-surgery",
            "label": "\u0411\u043B\u043E\u043A: \u0425\u0456\u0440\u0443\u0440\u0433\u0456\u044F",
            "type": "text"
        },
        {
            "key": "feat-ortho",
            "label": "\u0411\u043B\u043E\u043A: \u041E\u0440\u0442\u043E\u0434\u043E\u043D\u0442\u0456\u044F",
            "type": "text"
        },
        {
            "key": "about-p1",
            "label": "\u041F\u0440\u043E \u043D\u0430\u0441: \u0410\u0431\u0437\u0430\u0446 1",
            "type": "textarea"
        },
        {
            "key": "about-p2",
            "label": "\u041F\u0440\u043E \u043D\u0430\u0441: \u0410\u0431\u0437\u0430\u0446 2",
            "type": "textarea"
        },
        {
            "key": "about-more",
            "label": "\u041A\u043D\u043E\u043F\u043A\u0430: \u0414\u0456\u0437\u043D\u0430\u0442\u0438\u0441\u044F \u0431\u0456\u043B\u044C\u0448\u0435",
            "type": "text"
        },
        {
            "key": "about-services",
            "label": "\u041A\u043D\u043E\u043F\u043A\u0430: \u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438 \u043F\u043E\u0441\u043B\u0443\u0433\u0438",
            "type": "text"
        },
        {
            "key": "works-title",
            "label": "\u041D\u0430\u0448\u0456 \u0440\u043E\u0431\u043E\u0442\u0438: \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
            "type": "text"
        },
        {
            "key": "works-btn",
            "label": "\u041A\u043D\u043E\u043F\u043A\u0430: \u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438 \u0432\u0441\u0456 \u0440\u043E\u0431\u043E\u0442\u0438",
            "type": "text"
        },
        {
            "key": "contact-choice-title",
            "label": "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u0438: \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
            "type": "text"
        },
        {
            "key": "contact-choice-subtitle",
            "label": "\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u0438: \u041F\u0456\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
            "type": "textarea"
        },
        {
            "key": "btn-online-booking",
            "label": "\u041A\u043D\u043E\u043F\u043A\u0430: \u041E\u043D\u043B\u0430\u0439\u043D \u0437\u0430\u043F\u0438\u0441",
            "type": "text"
        },
        {
            "key": "btn-contact-hub",
            "label": "\u041A\u043D\u043E\u043F\u043A\u0430: \u041C\u0435\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0438",
            "type": "text"
        },
        {
            "key": "map-title",
            "label": "\u041A\u0430\u0440\u0442\u0430: \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
            "type": "text"
        },
        {
            "key": "map-open-btn",
            "label": "\u041A\u043D\u043E\u043F\u043A\u0430: \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043A\u0430\u0440\u0442\u0443",
            "type": "text"
        },
        {
            "key": "map-hours-label",
            "label": "\u0413\u0440\u0430\u0444\u0456\u043A: \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
            "type": "text"
        },
        {
            "key": "footer-hours",
            "label": "\u0413\u0440\u0430\u0444\u0456\u043A: \u0420\u043E\u0431\u043E\u0447\u0456 \u0433\u043E\u0434\u0438\u043D\u0438",
            "type": "text"
        }
    ],
    "about": [
        {
            "key": "about-page-title",
            "label": "About Page Title",
            "type": "text"
        },
        {
            "key": "about-section-tag",
            "label": "About Section Tag",
            "type": "text"
        },
        {
            "key": "hero-title",
            "label": "Hero Title",
            "type": "text"
        },
        {
            "key": "about-p1",
            "label": "About P1",
            "type": "textarea"
        },
        {
            "key": "nav-works",
            "label": "Nav Works",
            "type": "text"
        },
        {
            "key": "nav-services",
            "label": "Nav Services",
            "type": "text"
        },
        {
            "key": "about-team-title",
            "label": "About Team Title",
            "type": "text"
        },
        {
            "key": "team-savchuk-name",
            "label": "Team Savchuk Name",
            "type": "text"
        },
        {
            "key": "team-savchuk-role",
            "label": "Team Savchuk Role",
            "type": "text"
        },
        {
            "key": "team-anatoliy-name",
            "label": "Team Anatoliy Name",
            "type": "text"
        },
        {
            "key": "team-anatoliy-role",
            "label": "Team Anatoliy Role",
            "type": "text"
        },
        {
            "key": "team-mariya-name",
            "label": "Team Mariya Name",
            "type": "text"
        },
        {
            "key": "team-mariya-role",
            "label": "Team Mariya Role",
            "type": "text"
        }
    ],
    "services": [
        {
            "key": "feat-aesthetic",
            "label": "Feat Aesthetic",
            "type": "text"
        },
        {
            "key": "btn-book",
            "label": "Btn Book",
            "type": "text"
        },
        {
            "key": "feat-therapy",
            "label": "Feat Therapy",
            "type": "text"
        },
        {
            "key": "feat-surgery",
            "label": "Feat Surgery",
            "type": "text"
        },
        {
            "key": "feat-ortho",
            "label": "Feat Ortho",
            "type": "text"
        },
        {
            "key": "svc-consult-title",
            "label": "Svc Consult Title",
            "type": "text"
        },
        {
            "key": "svc-consult-desc",
            "label": "Svc Consult Desc",
            "type": "textarea"
        },
        {
            "key": "price-consult-general",
            "label": "Price Consult General",
            "type": "text"
        },
        {
            "key": "btn-book-short",
            "label": "Btn Book Short",
            "type": "text"
        },
        {
            "key": "price-consult-modjaw",
            "label": "Price Consult Modjaw",
            "type": "text"
        },
        {
            "key": "price-consult-checkup",
            "label": "Price Consult Checkup",
            "type": "text"
        },
        {
            "key": "svc-composite-veneer-title",
            "label": "Svc Composite Veneer Title",
            "type": "text"
        },
        {
            "key": "svc-composite-veneer-desc",
            "label": "Svc Composite Veneer Desc",
            "type": "textarea"
        },
        {
            "key": "price-frontal-restoration",
            "label": "Price Frontal Restoration",
            "type": "text"
        },
        {
            "key": "price-art-restoration",
            "label": "Price Art Restoration",
            "type": "text"
        },
        {
            "key": "svc-ceramic-restoration-title",
            "label": "Svc Ceramic Restoration Title",
            "type": "textarea"
        },
        {
            "key": "svc-ceramic-restoration-desc",
            "label": "Svc Ceramic Restoration Desc",
            "type": "textarea"
        },
        {
            "key": "price-veneer-digital",
            "label": "Price Veneer Digital",
            "type": "text"
        },
        {
            "key": "price-veneer-layering",
            "label": "Price Veneer Layering",
            "type": "text"
        },
        {
            "key": "price-veneer-handmade",
            "label": "Price Veneer Handmade",
            "type": "text"
        },
        {
            "key": "price-veneer-rework",
            "label": "Price Veneer Rework",
            "type": "text"
        },
        {
            "key": "price-veneer-single",
            "label": "Price Veneer Single",
            "type": "text"
        },
        {
            "key": "price-crown-digital",
            "label": "Price Crown Digital",
            "type": "text"
        },
        {
            "key": "price-crown-layering",
            "label": "Price Crown Layering",
            "type": "textarea"
        },
        {
            "key": "price-crown-handmade",
            "label": "Price Crown Handmade",
            "type": "textarea"
        },
        {
            "key": "svc-endo-title",
            "label": "Svc Endo Title",
            "type": "text"
        },
        {
            "key": "svc-endo-desc",
            "label": "Svc Endo Desc",
            "type": "textarea"
        },
        {
            "key": "price-endo-incisor",
            "label": "Price Endo Incisor",
            "type": "text"
        },
        {
            "key": "price-endo-premolar",
            "label": "Price Endo Premolar",
            "type": "text"
        },
        {
            "key": "price-endo-molar",
            "label": "Price Endo Molar",
            "type": "text"
        },
        {
            "key": "svc-caries-title",
            "label": "Svc Caries Title",
            "type": "text"
        },
        {
            "key": "svc-caries-desc",
            "label": "Svc Caries Desc",
            "type": "textarea"
        },
        {
            "key": "price-caries-2",
            "label": "Price Caries 2",
            "type": "text"
        },
        {
            "key": "price-caries-3",
            "label": "Price Caries 3",
            "type": "text"
        },
        {
            "key": "svc-periodontal-title",
            "label": "Svc Periodontal Title",
            "type": "text"
        },
        {
            "key": "svc-periodontal-desc",
            "label": "Svc Periodontal Desc",
            "type": "textarea"
        },
        {
            "key": "price-periodont-1",
            "label": "Price Periodont 1",
            "type": "text"
        },
        {
            "key": "price-periodont-2",
            "label": "Price Periodont 2",
            "type": "text"
        },
        {
            "key": "price-periodont-3",
            "label": "Price Periodont 3",
            "type": "text"
        },
        {
            "key": "svc-hygiene-title",
            "label": "Svc Hygiene Title",
            "type": "text"
        },
        {
            "key": "svc-hygiene-desc",
            "label": "Svc Hygiene Desc",
            "type": "textarea"
        },
        {
            "key": "price-hygiene",
            "label": "Price Hygiene",
            "type": "text"
        },
        {
            "key": "price-hygiene-smoker",
            "label": "Price Hygiene Smoker",
            "type": "text"
        },
        {
            "key": "svc-whitening-title",
            "label": "Svc Whitening Title",
            "type": "text"
        },
        {
            "key": "svc-whitening-desc",
            "label": "Svc Whitening Desc",
            "type": "textarea"
        },
        {
            "key": "price-whitening",
            "label": "Price Whitening",
            "type": "text"
        },
        {
            "key": "svc-implant-title",
            "label": "Svc Implant Title",
            "type": "text"
        },
        {
            "key": "svc-implant-desc",
            "label": "Svc Implant Desc",
            "type": "textarea"
        },
        {
            "key": "price-implant-neodent",
            "label": "Price Implant Neodent",
            "type": "text"
        },
        {
            "key": "price-implant-sla",
            "label": "Price Implant Sla",
            "type": "text"
        },
        {
            "key": "price-implant-slactive",
            "label": "Price Implant Slactive",
            "type": "text"
        },
        {
            "key": "price-crown-monolit",
            "label": "Price Crown Monolit",
            "type": "text"
        },
        {
            "key": "price-crown-aesthetic",
            "label": "Price Crown Aesthetic",
            "type": "textarea"
        },
        {
            "key": "svc-extraction-title",
            "label": "Svc Extraction Title",
            "type": "text"
        },
        {
            "key": "svc-extraction-desc",
            "label": "Svc Extraction Desc",
            "type": "textarea"
        },
        {
            "key": "price-extraction",
            "label": "Price Extraction",
            "type": "text"
        },
        {
            "key": "price-extraction-atypical-1",
            "label": "Price Extraction Atypical 1",
            "type": "text"
        },
        {
            "key": "price-extraction-atypical-2",
            "label": "Price Extraction Atypical 2",
            "type": "text"
        },
        {
            "key": "price-sedation",
            "label": "Price Sedation",
            "type": "text"
        },
        {
            "key": "svc-gum-surgery-title",
            "label": "Svc Gum Surgery Title",
            "type": "textarea"
        },
        {
            "key": "svc-gum-surgery-desc",
            "label": "Svc Gum Surgery Desc",
            "type": "textarea"
        },
        {
            "key": "price-gum-smile",
            "label": "Price Gum Smile",
            "type": "text"
        },
        {
            "key": "price-recession",
            "label": "Price Recession",
            "type": "text"
        },
        {
            "key": "price-gum-extension",
            "label": "Price Gum Extension",
            "type": "text"
        },
        {
            "key": "svc-braces-title",
            "label": "Svc Braces Title",
            "type": "text"
        },
        {
            "key": "svc-braces-desc",
            "label": "Svc Braces Desc",
            "type": "textarea"
        },
        {
            "key": "price-braces-metal",
            "label": "Price Braces Metal",
            "type": "text"
        },
        {
            "key": "price-braces-ceramic",
            "label": "Price Braces Ceramic",
            "type": "text"
        },
        {
            "key": "price-braces-self-metal",
            "label": "Price Braces Self Metal",
            "type": "text"
        },
        {
            "key": "price-ortho-visit",
            "label": "Price Ortho Visit",
            "type": "text"
        },
        {
            "key": "price-braces-self-ceramic",
            "label": "Price Braces Self Ceramic",
            "type": "text"
        },
        {
            "key": "svc-aligners-title",
            "label": "Svc Aligners Title",
            "type": "text"
        },
        {
            "key": "svc-aligners-desc",
            "label": "Svc Aligners Desc",
            "type": "textarea"
        },
        {
            "key": "price-aligners",
            "label": "Price Aligners",
            "type": "text"
        },
        {
            "key": "form-name-placeholder",
            "label": "Form Name Placeholder",
            "type": "text"
        },
        {
            "key": "form-comment-placeholder",
            "label": "Form Comment Placeholder",
            "type": "text"
        },
        {
            "key": "form-phone-placeholder",
            "label": "Form Phone Placeholder",
            "type": "text"
        },
        {
            "key": "form-privacy",
            "label": "Form Privacy",
            "type": "textarea"
        },
        {
            "key": "form-btn",
            "label": "Form Btn",
            "type": "text"
        }
    ],
    "cases": [
        {
            "key": "cases-page-title",
            "label": "Cases Page Title",
            "type": "text"
        },
        {
            "key": "cases-hero-title",
            "label": "Cases Hero Title",
            "type": "text"
        },
        {
            "key": "filter-all",
            "label": "Filter All",
            "type": "text"
        },
        {
            "key": "filter-veneers",
            "label": "Filter Veneers",
            "type": "text"
        },
        {
            "key": "filter-composite",
            "label": "Filter Composite",
            "type": "text"
        },
        {
            "key": "filter-restoration",
            "label": "Filter Restoration",
            "type": "text"
        },
        {
            "key": "filter-implants",
            "label": "Filter Implants",
            "type": "text"
        },
        {
            "key": "filter-ortho",
            "label": "Filter Ortho",
            "type": "text"
        },
        {
            "key": "filter-whitening",
            "label": "Filter Whitening",
            "type": "text"
        }
    ],
    "contact": [
        {
            "key": "contacts-page-title",
            "label": "Contacts Page Title",
            "type": "text"
        },
        {
            "key": "form-title",
            "label": "Form Title",
            "type": "text"
        },
        {
            "key": "form-subtitle",
            "label": "Form Subtitle",
            "type": "textarea"
        },
        {
            "key": "form-phone-label",
            "label": "Form Phone Label",
            "type": "text"
        },
        {
            "key": "form-name-placeholder",
            "label": "Form Name Placeholder",
            "type": "text"
        },
        {
            "key": "form-comment-placeholder",
            "label": "Form Comment Placeholder",
            "type": "text"
        },
        {
            "key": "form-phone-placeholder",
            "label": "Form Phone Placeholder",
            "type": "text"
        },
        {
            "key": "form-privacy",
            "label": "Form Privacy",
            "type": "textarea"
        },
        {
            "key": "form-btn",
            "label": "Form Btn",
            "type": "text"
        },
        {
            "key": "footer-find-us",
            "label": "Footer Find Us",
            "type": "text"
        },
        {
            "key": "map-address",
            "label": "Map Address",
            "type": "text"
        },
        {
            "key": "footer-map-btn",
            "label": "Footer Map Btn",
            "type": "text"
        },
        {
            "key": "footer-hours-title",
            "label": "Footer Hours Title",
            "type": "text"
        },
        {
            "key": "footer-hours-days",
            "label": "Footer Hours Days",
            "type": "text"
        }
    ],
    "footer": [
        {
            "key": "footer-find-us",
            "label": "Footer Find Us",
            "type": "text"
        },
        {
            "key": "footer-location",
            "label": "Footer Location",
            "type": "text"
        },
        {
            "key": "footer-address-street",
            "label": "Footer Address Street",
            "type": "text"
        },
        {
            "key": "footer-map-btn",
            "label": "Footer Map Btn",
            "type": "text"
        },
        {
            "key": "footer-tagline",
            "label": "Footer Tagline",
            "type": "text"
        },
        {
            "key": "footer-hours-title",
            "label": "Footer Hours Title",
            "type": "text"
        },
        {
            "key": "footer-hours-days",
            "label": "Footer Hours Days",
            "type": "text"
        },
        {
            "key": "footer-copyright",
            "label": "Footer Copyright",
            "type": "text"
        },
        {
            "key": "btn-book",
            "label": "Btn Book",
            "type": "text"
        }
    ]
};



// ============================================================
// AUTH (Supabase Auth with localStorage fallback)
// ============================================================

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');

    btn.disabled = true;
    btn.textContent = 'Завантаження...';
    errorEl.style.display = 'none';

    // Try Supabase Auth first
    if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
            // If user doesn't exist yet, try sign up (first admin)
            if (error.message.includes('Invalid login')) {
                errorEl.textContent = 'Невірний email або пароль';
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Увійти';
                return;
            }
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Увійти';
            return;
        }
        currentUser = data.user;
        document.getElementById('userEmail').textContent = email;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'flex';
        loadDashboardData();
        return;
    }

    // Fallback: demo mode without Supabase
    setTimeout(() => {
        if (email && password.length >= 4) {
            currentUser = { email };
            document.getElementById('userEmail').textContent = email;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'flex';
            localStorage.setItem('ds_admin_email', email);
            loadDashboardData();
        } else {
            errorEl.textContent = 'Невірний email або пароль';
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Увійти';
        }
    }, 600);
}

async function handleLogout() {
    if (sb) await sb.auth.signOut();
    currentUser = null;
    localStorage.removeItem('ds_admin_email');
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginPassword').value = '';
}

// Auto-login
(async function checkAutoLogin() {
    if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            currentUser = session.user;
            document.getElementById('userEmail').textContent = session.user.email;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'flex';
            loadDashboardData();
            return;
        }
    }
    // Fallback
    const saved = localStorage.getItem('ds_admin_email');
    if (saved) {
        currentUser = { email: saved };
        document.getElementById('userEmail').textContent = saved;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'flex';
        loadDashboardData();
    }
})();


// ============================================================
// SUPABASE SETUP
// ============================================================

function connectSupabase() {
    const url = document.getElementById('sbUrl').value.trim();
    const key = document.getElementById('sbAnonKey').value.trim();
    const status = document.getElementById('sbStatus');

    if (!url || !key) {
        status.innerHTML = '<span style="color:var(--danger);">❌ Введіть URL та Anon Key</span>';
        return;
    }

    localStorage.setItem('ds_supabase', JSON.stringify({ url, key }));
    sb = supabase.createClient(url, key);
    status.innerHTML = '<span style="color:var(--success);">✅ Підключено! Тепер перевірте з\'єднання.</span>';
    showToast('✅ Supabase підключено');
}

async function testSupabase() {
    const status = document.getElementById('sbStatus');
    if (!sb) {
        status.innerHTML = '<span style="color:var(--danger);">❌ Спочатку підключіть Supabase</span>';
        return;
    }

    status.innerHTML = '<span style="color:var(--text-muted);">⏳ Перевірка...</span>';

    try {
        const { data, error } = await sb.from('price_list').select('id').limit(1);
        if (error) {
            if (error.message.includes('relation') || error.code === '42P01') {
                status.innerHTML = '<span style="color:#f39c12;">⚠️ З\'єднання ОК, але таблиці не створені. Виконайте SQL з файлу supabase-setup.sql</span>';
            } else {
                status.innerHTML = `<span style="color:var(--danger);">❌ Помилка: ${error.message}</span>`;
            }
        } else {
            status.innerHTML = '<span style="color:var(--success);">✅ З\'єднання успішне! Таблиці знайдені.</span>';

            // Load data from Supabase into local state
            await loadAllFromSupabase();
            showToast('✅ Дані завантажені з Supabase');
        }
    } catch(e) {
        status.innerHTML = `<span style="color:var(--danger);">❌ Помилка мережі: ${e.message}</span>`;
    }
}

// Load Supabase config into form on setup page open
function loadSetupForm() {
    const config = getSupabaseConfig();
    if (config) {
        document.getElementById('sbUrl').value = config.url || '';
        document.getElementById('sbAnonKey').value = config.key || '';
    }
}


// ============================================================
// NAVIGATION
// ============================================================

const SECTION_TITLES = {
    'dashboard': 'Дашборд',
    'pages': 'Редагування сторінок',
    'prices': 'Прайс-лист',
    'doctors': 'Лікарі',
    'cases': 'Кейси',
    'ai-settings': 'Налаштування ІІ',
    'chat-logs': 'Чат-логи',
    'setup': 'Supabase',
};

function switchSection(sectionId, navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('sec-' + sectionId);
    if (target) target.classList.add('active');

    document.getElementById('sectionTitle').textContent = SECTION_TITLES[sectionId] || sectionId;
    currentSection = sectionId;

    if (sectionId === 'pages') loadPageEditor(currentPage);
    if (sectionId === 'prices') loadPriceList();
    if (sectionId === 'doctors') loadDoctors();
    if (sectionId === 'ai-settings') loadAISettings();
    if (sectionId === 'chat-logs') loadChatLogs();
    if (sectionId === 'setup') loadSetupForm();
}


// ============================================================
// LOAD ALL DATA FROM SUPABASE
// ============================================================

async function loadAllFromSupabase() {
    if (!sb) return;

    // Load prices
    const { data: prices } = await sb.from('price_list')
        .select('*').order('sort_order');
    if (prices) {
        priceItems = prices.map(p => ({
            id: p.id,
            category: p.category,
            name: p.service_name_uk,
            price: p.price_display || '',
        }));
    }

    // Load doctors
    const { data: docs } = await sb.from('doctors')
        .select('*').order('sort_order');
    if (docs) {
        doctors = docs.map(d => ({
            id: d.id,
            name: d.name_uk,
            spec: d.specialization_uk || '',
            photo: d.photo_url || '',
        }));
    }
}


// ============================================================
// PAGE EDITOR
// ============================================================

function selectPage(pageSlug, tabEl) {
    document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');
    currentPage = pageSlug;
    loadPageEditor(pageSlug);
}

async function loadPageEditor(pageSlug) {
    const area = document.getElementById('pageEditorArea');
    const schema = PAGE_SCHEMA[pageSlug];
    if (!schema) {
        area.innerHTML = '<p class="editor-placeholder">Схема сторінки не знайдена</p>';
        return;
    }

    // Load existing content from Supabase
    let existing = {};
    if (sb) {
        const { data } = await sb.from('site_content')
            .select('section_key, value_uk, media_url, content_type')
            .eq('page_slug', pageSlug)
            .order('updated_at', { ascending: true });
        if (data) {
            data.forEach(row => {
                existing[row.section_key] = row.media_url || row.value_uk || '';
            });
        }
    }

    const PAGE_DEFAULTS = {
        "home": {
            "hero-video": "assets/dental-hero.mp4",
            "interior-video": "assets/dental2.mp4",
            "hero-title": "\u0406\u041D\u041D\u041E\u0412\u0410\u0426\u0406\u0407.<br>\u0415\u0421\u0422\u0415\u0422\u0418\u041A\u0410.<br>\u041A\u041E\u041C\u0424\u041E\u0420\u0422",
            "hero-subtitle": "\u0412\u0456\u0434 \u0456\u0434\u0435\u0430\u043B\u044C\u043D\u043E\u0457 \u0433\u0456\u0433\u0456\u0454\u043D\u0438 \u0434\u043E \u0456\u043C\u043F\u043B\u0430\u043D\u0442\u0456\u0432 '\u043F\u0456\u0434 \u043A\u043B\u044E\u0447'.",
            "btn-book": "\u0417\u0410\u041F\u0418\u0421\u0410\u0422\u0418\u0421\u042F \u041D\u0410 \u041A\u041E\u041D\u0421\u0423\u041B\u042C\u0422\u0410\u0426\u0406\u042E",
            "feat-aesthetic": "\u0415\u0441\u0442\u0435\u0442\u0438\u0447\u043D\u0430 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0456\u044F",
            "feat-therapy": "\u041B\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F \u0437\u0443\u0431\u0456\u0432",
            "feat-surgery": "\u0425\u0456\u0440\u0443\u0440\u0433\u0456\u044F",
            "feat-ortho": "\u041E\u0440\u0442\u043E\u0434\u043E\u043D\u0442\u0456\u044F",
            "about-p1": "Dental Studio \u2014 \u0446\u0435 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0456\u0447\u043D\u0430 \u043A\u043B\u0456\u043D\u0456\u043A\u0430 \u0432 \u0427\u0435\u0440\u043D\u0456\u0433\u043E\u0432\u0456, \u0449\u043E \u043E\u0431'\u0454\u0434\u043D\u0430\u043B\u0430 \u043E\u0434\u043D\u043E\u0434\u0443\u043C\u0446\u0456\u0432, \u0434\u043B\u044F \u044F\u043A\u0438\u0445 \u043A\u0440\u0430\u0441\u0430 \u0442\u0430 \u0435\u0441\u0442\u0435\u0442\u0438\u043A\u0430 \u0432\u0430\u0448\u043E\u0457 \u043F\u043E\u0441\u043C\u0456\u0448\u043A\u0438 \u2014 \u0441\u0435\u043D\u0441 \u043F\u0440\u043E\u0444\u0435\u0441\u0456\u0439\u043D\u043E\u0433\u043E \u0436\u0438\u0442\u0442\u044F.",
            "about-p2": "\u041C\u0438 \u043D\u0430\u0434\u0430\u0454\u043C\u043E \u0448\u0438\u0440\u043E\u043A\u0438\u0439 \u0441\u043F\u0435\u043A\u0442\u0440 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0456\u0447\u043D\u0438\u0445 \u043F\u043E\u0441\u043B\u0443\u0433 \u043D\u0430\u0439\u0432\u0438\u0449\u043E\u0433\u043E \u0440\u0456\u0432\u043D\u044F, \u0432 \u043E\u0441\u043D\u043E\u0432\u0456 \u044F\u043A\u043E\u0433\u043E \u0446\u0438\u0444\u0440\u043E\u0432\u0430 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0456\u044F \u0442\u0430 \u0447\u0430\u0441\u0442\u044C \u0434\u0443\u0448\u0456 \u043A\u043E\u0436\u043D\u043E\u0433\u043E \u0437 \u043D\u0430\u0448\u0438\u0445 \u043B\u0456\u043A\u0430\u0440\u0456\u0432, \u0449\u043E \u0437\u0430\u0434\u0430\u044E\u0442\u044C \u0442\u0435\u043D\u0434\u0435\u043D\u0446\u0456\u0457 \u0432 \u0441\u0443\u0447\u0430\u0441\u043D\u0456\u0439 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0456\u0456\u0457.",
            "about-more": "\u0414\u0406\u0417\u041D\u0410\u0422\u0418\u0421\u042F \u0411\u0406\u041B\u042C\u0428\u0415",
            "about-services": "\u041F\u0415\u0420\u0415\u0413\u041B\u042F\u041D\u0423\u0422\u0418 \u041D\u0410\u0428\u0406 \u041F\u041E\u0421\u041B\u0423\u0413\u0418",
            "works-title": "\u041D\u0410\u0428\u0406 \u0420\u041E\u0411\u041E\u0422\u0418",
            "works-btn": "\u041F\u0415\u0420\u0415\u0413\u041B\u042F\u041D\u0423\u0422\u0418 \u0412\u0421\u0406 \u0420\u041E\u0411\u041E\u0422\u0418",
            "contact-choice-title": "\u0417\u0410\u041F\u0418\u0421\u0410\u0422\u0418\u0421\u042F \u041D\u0410 \u041A\u041E\u041D\u0421\u0423\u041B\u042C\u0422\u0410\u0426\u0406\u042E",
            "contact-choice-subtitle": "\u0412\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u043E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\u0438\u0441 \u0434\u043B\u044F \u043C\u0438\u0442\u0442\u0454\u0432\u043E\u0433\u043E \u0431\u0440\u043E\u043D\u044E\u0432\u0430\u043D\u043D\u044F \u0447\u0430\u0441\u0443,<br>\u0430\u0431\u043E \u043D\u0430\u043F\u0438\u0448\u0456\u0442\u044C \u043D\u0430\u043C \u0443 \u043C\u0435\u0441\u0435\u043D\u0434\u0436\u0435\u0440 \u0434\u043B\u044F \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0456\u0457.",
            "btn-online-booking": "\u041E\u041D\u041B\u0410\u0419\u041D \u0417\u0410\u041F\u0418\u0421",
            "btn-contact-hub": "\u0417\u0412'\u042F\u0417\u0410\u0422\u0418\u0421\u042F \u0417 \u041D\u0410\u041C\u0418",
            "map-title": "\u0414\u0415 \u041D\u0410\u0421 \u0417\u041D\u0410\u0419\u0422\u0418",
            "map-open-btn": "\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043A\u0430\u0440\u0442\u0443",
            "map-hours-label": "\u0413\u0420\u0410\u0424\u0406\u041A \u0420\u041E\u0411\u041E\u0422\u0418",
            "footer-hours": "\u041F\u043D \u2014 \u041F\u0442, 10:00 \u2014 18:00"
        }
    };

    let html = '';
    schema.forEach(field => {
        let val = existing[field.key] !== undefined ? existing[field.key] : '';
        if (!val && PAGE_DEFAULTS[pageSlug] && PAGE_DEFAULTS[pageSlug][field.key]) {
            val = PAGE_DEFAULTS[pageSlug][field.key];
        }
        html += `<div class="editor-field">`;
        html += `<div class="editor-field-label">${field.label}</div>`;

        if (field.type === 'text') {
            html += `<input type="text" data-key="${field.key}" placeholder="${field.label}" value="${escapeAttr(val)}">`;
        } else if (field.type === 'textarea') {
            html += `<textarea data-key="${field.key}" rows="3" placeholder="${field.label}">${escapeHtml(val)}</textarea>`;
        } else if (field.type === 'image') {
            html += `<div class="media-upload-box" onclick="triggerMediaUpload('${field.key}', 'image')" id="media-${field.key}">
                ${val ? `<img src="${val}" style="max-width:100%;max-height:200px;border-radius:4px;">` : ''}
                <div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>
            </div>`;
        } else if (field.type === 'video') {
            const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;
            html += `<div class="media-upload-box" onclick="triggerMediaUpload('${field.key}', 'video')" id="media-${field.key}">
                ${val ? `<video src="${videoSrc}" style="max-width:100%;max-height:200px;" controls></video>` : ''}
                <div class="media-upload-hint">🎥 Натисніть щоб завантажити відео</div>
            </div>`;
        }

        html += `</div>`;
    });

    html += `<div style="margin-top:25px;"><button class="btn-primary" onclick="savePageContent('${pageSlug}')">💾 Зберегти зміни</button></div>`;
    area.innerHTML = html;
}

async function savePageContent(pageSlug) {
    const fields = document.querySelectorAll('#pageEditorArea [data-key]');
    const updates = [];

    fields.forEach(f => {
        updates.push({
            page_slug: pageSlug,
            section_key: f.dataset.key,
            content_type: 'text',
            value_uk: f.value,
            media_url: null,
            updated_at: new Date().toISOString(),
        });
    });

    if (sb) {
        try {
            // Bulk upsert for all text fields on the page at once
            const { error } = await sb.from('site_content').upsert(updates, {
                onConflict: 'page_slug,section_key'
            });
            
            if (error) throw error;
            
            showToast('✅ Зміни збережено');
            
            // Refresh editor with a small delay to ensure DB consistency
            setTimeout(() => loadPageEditor(pageSlug), 500);
        } catch (err) {
            console.error('Save error:', err);
            showToast(`❌ Помилка: ${err.message || 'невідома помилка'}`);
        }
    }
}

async function triggerMediaUpload(key, type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast(`📤 Завантажується "${file.name}"...`);

        if (sb) {
            // Upload to Supabase Storage
            const filePath = `pages/${currentPage}/${key}_${Date.now()}_${file.name}`;
            const { data, error } = await sb.storage
                .from('clinic-media')
                .upload(filePath, file, { upsert: true });

            if (error) {
                showToast(`❌ Помилка: ${error.message}`);
                return;
            }

            // Get public URL
            const { data: urlData } = sb.storage
                .from('clinic-media')
                .getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl;

            // Save URL to site_content
            await sb.from('site_content').upsert({
                page_slug: currentPage,
                section_key: key,
                content_type: type,
                media_url: publicUrl,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'page_slug,section_key' });

            // Update preview
            const box = document.getElementById(`media-${key}`);
            if (box) {
                if (type === 'image') {
                    box.innerHTML = `<img src="${publicUrl}" style="max-width:100%;max-height:200px;border-radius:4px;"><div class="media-upload-hint">📷 Натисніть щоб замінити</div>`;
                } else {
                    box.innerHTML = `<video src="${publicUrl}" style="max-width:100%;max-height:200px;" controls></video><div class="media-upload-hint">🎥 Натисніть щоб замінити</div>`;
                }
            }

            showToast('✅ Файл завантажено');
        } else {
            showToast(`⚠️ Підключіть Supabase для збереження файлів`);
        }
    };
    input.click();
}


// ============================================================
// PRICE LIST
// ============================================================

async function loadPriceList() {
    // Refresh from Supabase if connected
    if (sb) {
        const { data } = await sb.from('price_list')
            .select('*').eq('is_active', true).order('sort_order');
        if (data) {
            priceItems = data.map(p => ({
                id: p.id,
                category: p.category,
                name: p.service_name_uk,
                price: p.price_display || '',
                sort_order: p.sort_order || 0,
            }));
        }
    }

    // Fallback defaults if empty
    if (priceItems.length === 0 && !sb) {
        priceItems = [
            { id: 'l1', category: 'Терапія', name: 'Консультація лікаря', price: '500 грн' },
            { id: 'l2', category: 'Терапія', name: 'Пломбування зуба', price: 'від 1200 грн' },
            { id: 'l3', category: 'Хірургія', name: 'Видалення зуба', price: 'від 800 грн' },
            { id: 'l4', category: 'Хірургія', name: 'Імплантація', price: 'від 15000 грн' },
            { id: 'l5', category: 'Естетика', name: 'Професійне відбілювання', price: 'від 4500 грн' },
            { id: 'l6', category: 'Ортодонтія', name: 'Брекет-система', price: 'від 25000 грн' },
        ];
    }

    renderPriceList();
}

function renderPriceList() {
    const area = document.getElementById('priceListArea');
    if (priceItems.length === 0) {
        area.innerHTML = '<p class="editor-placeholder">Прайс-лист порожній</p>';
        return;
    }

    let html = '';
    priceItems.forEach((item, i) => {
        html += `<div class="price-row" data-id="${item.id}">
            <input type="text" value="${escapeAttr(item.name)}" placeholder="Назва послуги" onchange="priceItems[${i}].name=this.value">
            <input type="text" value="${escapeAttr(item.category)}" placeholder="Категорія" onchange="priceItems[${i}].category=this.value">
            <input type="text" value="${escapeAttr(item.price)}" placeholder="Ціна" onchange="priceItems[${i}].price=this.value">
            <button class="price-delete" onclick="deletePrice(${i})" title="Видалити">✕</button>
        </div>`;
    });

    html += `<div style="margin-top:15px;"><button class="btn-primary" onclick="savePriceList()">💾 Зберегти прайс</button></div>`;
    area.innerHTML = html;
}

function addPriceItem() {
    priceItems.push({ id: 'new_' + Date.now(), category: '', name: '', price: '' });
    renderPriceList();
}

async function deletePrice(index) {
    const item = priceItems[index];
    if (sb && item.id && !String(item.id).startsWith('new_') && !String(item.id).startsWith('l')) {
        await sb.from('price_list').delete().eq('id', item.id);
    }
    priceItems.splice(index, 1);
    renderPriceList();
    showToast('🗑️ Послугу видалено');
}

async function savePriceList() {
    if (sb) {
        for (let i = 0; i < priceItems.length; i++) {
            const item = priceItems[i];
            const row = {
                category: item.category,
                service_name_uk: item.name,
                price_display: item.price,
                sort_order: i + 1,
                is_active: true,
            };

            if (item.id && !String(item.id).startsWith('new_') && !String(item.id).startsWith('l')) {
                // Update existing
                await sb.from('price_list').update(row).eq('id', item.id);
            } else {
                // Insert new
                const { data } = await sb.from('price_list').insert(row).select('id').single();
                if (data) priceItems[i].id = data.id;
            }
        }
    }
    showToast('✅ Прайс-лист збережено');
}


// ============================================================
// DOCTORS
// ============================================================

async function loadDoctors() {
    if (sb) {
        const { data } = await sb.from('doctors')
            .select('*').eq('is_active', true).order('sort_order');
        if (data) {
            doctors = data.map(d => ({
                id: d.id,
                name: d.name_uk,
                spec: d.specialization_uk || '',
                photo: d.photo_url || '',
            }));
        }
    }

    if (doctors.length === 0 && !sb) {
        doctors = [
            { id: 'l1', name: 'Др. Іванов А.В.', spec: 'Терапевт', photo: '' },
            { id: 'l2', name: 'Др. Петрова О.М.', spec: 'Хірург-імплантолог', photo: '' },
        ];
    }

    renderDoctors();
}

function renderDoctors() {
    const area = document.getElementById('doctorsArea');
    if (doctors.length === 0) {
        area.innerHTML = '<p class="editor-placeholder">Лікарі не додані</p>';
        return;
    }

    let html = '';
    doctors.forEach((doc, i) => {
        html += `<div class="doctor-card-admin">
            <div class="doctor-photo-admin" style="display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:40px;cursor:pointer;" onclick="uploadDoctorPhoto(${i})">
                ${doc.photo ? `<img src="${doc.photo}" style="width:100%;height:100%;object-fit:cover;">` : '📷'}
            </div>
            <div class="doctor-card-body">
                <input type="text" value="${escapeAttr(doc.name)}" placeholder="ПІБ лікаря" onchange="doctors[${i}].name=this.value">
                <input type="text" value="${escapeAttr(doc.spec)}" placeholder="Спеціалізація" onchange="doctors[${i}].spec=this.value">
            </div>
            <div class="doctor-card-actions">
                <button class="btn-outline" style="flex:1;" onclick="saveDoctor(${i})">💾 Зберегти</button>
                <button class="btn-danger" onclick="deleteDoctor(${i})">🗑️</button>
            </div>
        </div>`;
    });

    area.innerHTML = html;
}

function addDoctor() {
    doctors.push({ id: 'new_' + Date.now(), name: '', spec: '', photo: '' });
    renderDoctors();
}

async function deleteDoctor(index) {
    const doc = doctors[index];
    if (sb && doc.id && !String(doc.id).startsWith('new_') && !String(doc.id).startsWith('l')) {
        await sb.from('doctors').update({ is_active: false }).eq('id', doc.id);
    }
    doctors.splice(index, 1);
    renderDoctors();
    showToast('🗑️ Лікаря видалено');
}

async function saveDoctor(index) {
    const doc = doctors[index];
    if (sb) {
        const row = {
            name_uk: doc.name,
            specialization_uk: doc.spec,
            photo_url: doc.photo,
            sort_order: index + 1,
            is_active: true,
        };
        if (doc.id && !String(doc.id).startsWith('new_') && !String(doc.id).startsWith('l')) {
            await sb.from('doctors').update(row).eq('id', doc.id);
        } else {
            const { data } = await sb.from('doctors').insert(row).select('id').single();
            if (data) doctors[index].id = data.id;
        }
    }
    showToast('✅ Лікаря збережено');
}

async function uploadDoctorPhoto(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (sb) {
            const filePath = `doctors/doc_${index}_${Date.now()}_${file.name}`;
            const { error } = await sb.storage
                .from('clinic-media')
                .upload(filePath, file, { upsert: true });
            if (error) {
                showToast(`❌ ${error.message}`);
                return;
            }
            const { data: urlData } = sb.storage.from('clinic-media').getPublicUrl(filePath);
            doctors[index].photo = urlData.publicUrl;
        } else {
            // Local preview fallback
            const reader = new FileReader();
            reader.onload = (ev) => { doctors[index].photo = ev.target.result; renderDoctors(); };
            reader.readAsDataURL(file);
        }

        renderDoctors();
        showToast('📤 Фото завантажено');
    };
    input.click();
}


// ============================================================
// AI SETTINGS
// ============================================================

function onProviderChange() {
    const provider = document.getElementById('aiProvider').value;
    const modelSelect = document.getElementById('aiModel');
    const customUrlGroup = document.getElementById('customUrlGroup');

    const options = MODEL_OPTIONS[provider] || [];
    modelSelect.innerHTML = '';
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        modelSelect.appendChild(o);
    });

    customUrlGroup.style.display = provider === 'custom' ? 'block' : 'none';

    const keyInput = document.getElementById('aiApiKey');
    const placeholders = {
        openai: 'sk-...', anthropic: 'sk-ant-...', google: 'AIza...',
        deepseek: 'sk-...', openrouter: 'sk-or-...', custom: 'your-api-key',
    };
    keyInput.placeholder = placeholders[provider] || 'API Key';
}

function toggleKeyVisibility() {
    const input = document.getElementById('aiApiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function loadAISettings() {
    // Try Supabase first
    if (sb) {
        const { data } = await sb.from('ai_settings').select('*').limit(1).single();
        if (data) {
            document.getElementById('aiProvider').value = data.provider || 'openai';
            onProviderChange();
            document.getElementById('aiApiKey').value = data.api_key || '';
            document.getElementById('aiModel').value = data.model || '';
            document.getElementById('aiSystemPrompt').value = data.system_prompt || '';
            if (data.custom_url) document.getElementById('aiCustomUrl').value = data.custom_url;
            return;
        }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('ds_ai_settings');
    if (saved) {
        try {
            const s = JSON.parse(saved);
            document.getElementById('aiProvider').value = s.provider || 'openai';
            onProviderChange();
            document.getElementById('aiApiKey').value = s.apiKey || '';
            document.getElementById('aiModel').value = s.model || '';
            document.getElementById('aiSystemPrompt').value = s.systemPrompt || '';
            if (s.customUrl) document.getElementById('aiCustomUrl').value = s.customUrl;
        } catch(e) {}
    }
}

async function saveAISettings() {
    const settings = {
        provider: document.getElementById('aiProvider').value,
        apiKey: document.getElementById('aiApiKey').value,
        model: document.getElementById('aiModel').value,
        systemPrompt: document.getElementById('aiSystemPrompt').value,
        customUrl: document.getElementById('aiCustomUrl').value,
    };

    // Always save to localStorage (for chat widget to use)
    localStorage.setItem('ds_ai_settings', JSON.stringify(settings));

    // Also save to Supabase
    if (sb) {
        const { data: existing } = await sb.from('ai_settings').select('id').limit(1).single();
        const row = {
            provider: settings.provider,
            api_key: settings.apiKey,
            model: settings.model,
            system_prompt: settings.systemPrompt,
            custom_url: settings.customUrl,
            updated_at: new Date().toISOString(),
        };
        if (existing) {
            await sb.from('ai_settings').update(row).eq('id', existing.id);
        } else {
            await sb.from('ai_settings').insert(row);
        }
    }

    showToast('✅ Налаштування ІІ збережено');
}

async function handleKBUpload(event) {
    const files = event.target.files;
    const list = document.getElementById('kbFilesList');

    for (const file of Array.from(files)) {
        // Show in UI
        const item = document.createElement('div');
        item.className = 'kb-file-item';
        item.innerHTML = `
            <span class="kb-file-name">📄 ${file.name} <small style="color:var(--text-dim);">(${(file.size / 1024).toFixed(1)} KB)</small></span>
            <button class="btn-danger" onclick="this.parentElement.remove()">✕</button>
        `;
        list.appendChild(item);

        // Upload to Supabase Storage
        if (sb) {
            const filePath = `knowledge-base/${Date.now()}_${file.name}`;
            await sb.storage.from('clinic-media').upload(filePath, file);
        }
    }

    showToast(`📎 ${files.length} файл(ів) додано до бази знань`);
}


// ============================================================
// CHAT LOGS
// ============================================================

async function loadChatLogs() {
    const area = document.getElementById('chatLogsArea');

    if (!sb) {
        area.innerHTML = '<p class="editor-placeholder">Підключіть Supabase для перегляду чат-логів</p>';
        return;
    }

    area.innerHTML = '<p class="editor-placeholder">Завантаження...</p>';

    // Get unique sessions, latest first
    const { data, error } = await sb.from('chat_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error || !data || data.length === 0) {
        area.innerHTML = '<p class="editor-placeholder">Чат-логи поки відсутні</p>';
        return;
    }

    // Group by session
    const sessions = {};
    data.forEach(msg => {
        if (!sessions[msg.session_id]) sessions[msg.session_id] = [];
        sessions[msg.session_id].push(msg);
    });

    let html = '';
    Object.entries(sessions).forEach(([sid, msgs]) => {
        msgs.reverse(); // oldest first within session
        const firstTime = new Date(msgs[0].created_at).toLocaleString('uk-UA');
        html += `<div class="chat-log-item">
            <div class="chat-log-header">
                <span>Сесія: ${sid.slice(0, 8)}...</span>
                <span>${firstTime}</span>
            </div>
            <div class="chat-log-messages">`;

        msgs.forEach(m => {
            html += `<div class="chat-log-msg ${m.role}">${escapeHtml(m.message)}</div>`;
        });

        html += `</div></div>`;
    });

    area.innerHTML = html;
}


// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboardData() {
    document.getElementById('statServices').textContent = priceItems.length || '—';
    document.getElementById('statDoctors').textContent = doctors.length || '—';

    if (sb) {
        // Load fresh data
        await loadAllFromSupabase();
        document.getElementById('statServices').textContent = priceItems.length;
        document.getElementById('statDoctors').textContent = doctors.length;

        // Count today's chats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await sb.from('chat_logs')
            .select('session_id', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        document.getElementById('statChats').textContent = count || 0;
    } else {
        document.getElementById('statChats').textContent = '0';
    }
}


// ============================================================
// UTILS
// ============================================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

