// ============================================================
// DENTAL STUDIO ADMIN PANEL — JavaScript Logic + Supabase
// ============================================================

// --- Supabase Client ---
let sb = null; 

// Global Error Handler for debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global JS Error:', msg, lineNo);
    if (typeof showToast === 'function') {
        showToast(`❌ JS Error: ${msg} (line ${lineNo})`);
    }
};

function getSupabaseConfig() {
    try {
        const c = localStorage.getItem('ds_supabase');
        return c ? JSON.parse(c) : null;
    } catch(e) { return null; }
}

function initSupabase() {

    const config = getSupabaseConfig();
    const defaultUrl = 'https://ckldvntrsiacbjpiydmn.supabase.co';
    const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGR2bnRyc2lhY2JqcGl5ZG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzMzMTUsImV4cCI6MjA5MTY0OTMxNX0.6zxRqTheJDt2BTb1hbAxQHCLZI8wT5xPus2Ad97AuMg';

    const url = (config && config.url) ? config.url : defaultUrl;
    const key = (config && config.key) ? config.key : defaultKey;

    if (url && key) {
        sb = supabase.createClient(url, key);
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
        { "key": "about-page-title", "label": "SEO Title сторінки", "type": "text" },
        { "key": "about-section-tag", "label": "Тег розділу (мала позначка)", "type": "text" },
        { "key": "about-p1", "label": "Головний заголовок (під 'Про клініку')", "type": "text" },
        { "key": "about-p2", "label": "Опис клініки (текстовий блок)", "type": "textarea" },
        { "key": "about-hero-img", "label": "Фото: Головне (Hero)", "type": "image" },
        { "key": "about-secondary-img", "label": "Фото: Поруч з текстом", "type": "image" },
        { "key": "nav-works", "label": "Кнопка: Наші роботи", "type": "text" },
        { "key": "nav-services", "label": "Кнопка: Послуги", "type": "text" },
        { "key": "about-team-title", "label": "Заголовок команди (Лікарі налаштовуються у розділі 'Лікарі')", "type": "text" }
    ],
        "services": [
        { "label": "ЕСТЕТИЧНА СТОМАТОЛОГІЯ", "type": "heading" },
        { "key": "feat-aesthetic", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-consult-title", "label": "Консультація", "type": "text" },
        { "key": "svc-consult-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "price-consult-general", "label": "Назва: Загальна консультація", "type": "text" },
        { "key": "price-consult-general-val", "label": "💰 Ціна: Загальна консультація", "type": "text" },
        { "key": "price-consult-checkup", "label": "Назва: Стоматологічний CHECK-UP", "type": "text" },
        { "key": "price-consult-checkup-val", "label": "💰 Ціна: Стоматологічний CHECK-UP", "type": "text" },


        { "key": "svc-composite-veneer-title", "label": "Композитні вініри — Заголовок", "type": "text" },
        { "key": "svc-composite-veneer-desc", "label": "Композитні вініри — Опис", "type": "textarea" },
        { "key": "price-frontal-restoration", "label": "Назва: Реставрація фронтального зуба", "type": "text" },
        { "key": "price-frontal-restoration-val", "label": "💰 Ціна: Реставрація фронт. зуба", "type": "text" },
        { "key": "price-art-restoration", "label": "Назва: Художня реставрація", "type": "text" },
        { "key": "price-art-restoration-val", "label": "💰 Ціна: Художня реставрація", "type": "text" },

        { "key": "svc-ceramic-restoration-title", "label": "Керамічні реставрації — Заголовок", "type": "textarea" },
        { "key": "svc-ceramic-restoration-desc", "label": "Керамічні реставрації — Опис", "type": "textarea" },
        { "key": "price-veneer-digital", "label": "Назва: Вінір (digital)", "type": "text" },
        { "key": "price-veneer-digital-val", "label": "💰 Ціна: Вінір (digital)", "type": "text" },
        { "key": "price-veneer-layering", "label": "Назва: Вінір (digital + нашарування)", "type": "text" },
        { "key": "price-veneer-layering-val", "label": "💰 Ціна: Вінір (digital + нашарування)", "type": "text" },
        { "key": "price-veneer-handmade", "label": "Назва: Вінір (hand made)", "type": "text" },
        { "key": "price-veneer-handmade-val", "label": "💰 Ціна: Вінір (hand made)", "type": "text" },
        { "key": "price-veneer-rework", "label": "Назва: Переробка вініра", "type": "text" },
        { "key": "price-veneer-rework-val", "label": "💰 Ціна: Переробка вініра", "type": "text" },
        { "key": "price-veneer-single", "label": "Назва: Вінір одиночний", "type": "text" },
        { "key": "price-veneer-single-val", "label": "💰 Ціна: Вінір одиночний", "type": "text" },
        { "key": "price-crown-digital", "label": "Назва: Коронка (digital)", "type": "text" },
        { "key": "price-crown-digital-val", "label": "💰 Ціна: Коронка (digital)", "type": "text" },
        { "key": "price-crown-layering", "label": "Назва: Коронка (digital + нашарування)", "type": "textarea" },
        { "key": "price-crown-layering-val", "label": "💰 Ціна: Коронка (digital + нашарування)", "type": "text" },
        { "key": "price-crown-handmade", "label": "Назва: Коронка (hand made)", "type": "textarea" },
        { "key": "price-crown-handmade-val", "label": "💰 Ціна: Коронка (hand made)", "type": "text" },

        { "label": "ЛІКУВАННЯ ЗУБІВ", "type": "heading" },
        { "key": "feat-therapy", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-endo-title", "label": "Ендодонтія", "type": "text" },
        { "key": "svc-endo-desc", "label": "Ендодонтія — Опис", "type": "textarea" },
        { "key": "price-endo-incisor", "label": "Назва: Лікування кореневих каналів (різці, ікла)", "type": "text" },
        { "key": "price-endo-incisor-val", "label": "💰 Ціна: Канали (різці, ікла)", "type": "text" },
        { "key": "price-endo-premolar", "label": "Назва: Лікування кореневих каналів (премоляри)", "type": "text" },
        { "key": "price-endo-premolar-val", "label": "💰 Ціна: Канали (премоляри)", "type": "text" },
        { "key": "price-endo-molar", "label": "Назва: Лікування кореневих каналів (моляри)", "type": "text" },
        { "key": "price-endo-molar-val", "label": "💰 Ціна: Канали (моляри)", "type": "text" },

        { "key": "svc-caries-title", "label": "Лікування карієсу", "type": "text" },
        { "key": "svc-caries-desc", "label": "Лікування карієсу — Опис", "type": "textarea" },
        { "key": "price-caries-1", "label": "Назва: Лікування карієсу - І рівень складності", "type": "text" },
        { "key": "price-caries-1-val", "label": "💰 Ціна: Карієс І рівень", "type": "text" },
        { "key": "price-caries-2", "label": "Назва: Лікування карієсу - ІI рівень складності", "type": "text" },
        { "key": "price-caries-2-val", "label": "💰 Ціна: Карієс ІI рівень", "type": "text" },
        { "key": "price-caries-3", "label": "Назва: Лікування карієсу - ІII рівень складності", "type": "text" },
        { "key": "price-caries-3-val", "label": "💰 Ціна: Карієс ІII рівень", "type": "text" },

        { "key": "svc-periodontal-title", "label": "Пародонтологічне лікування", "type": "text" },
        { "key": "svc-periodontal-desc", "label": "Пародонтологічне лікування — Опис", "type": "textarea" },
        { "key": "price-periodont-1", "label": "Назва: Лікування пародонтиту - І ступінь", "type": "text" },
        { "key": "price-periodont-1-val", "label": "💰 Ціна: Пародонтит І ступінь", "type": "text" },
        { "key": "price-periodont-2", "label": "Назва: Лікування пародонтиту - ІІ ступінь", "type": "text" },
        { "key": "price-periodont-2-val", "label": "💰 Ціна: Пародонтит ІІ ступінь", "type": "text" },
        { "key": "price-periodont-3", "label": "Назва: Лікування пародонтиту - ІІI ступінь", "type": "text" },
        { "key": "price-periodont-3-val", "label": "💰 Ціна: Пародонтит ІІI ступінь", "type": "text" },

        { "key": "svc-hygiene-title", "label": "Професійна гігієна зубів", "type": "text" },
        { "key": "svc-hygiene-desc", "label": "Професійна гігієна зубів — Опис", "type": "textarea" },
        { "key": "price-hygiene", "label": "Назва: Професійна гігієна", "type": "text" },
        { "key": "price-hygiene-val", "label": "💰 Ціна: Професійна гігієна", "type": "text" },
        { "key": "price-hygiene-smoker", "label": "Назва: Професійна гігієна (наліт курця)", "type": "text" },
        { "key": "price-hygiene-smoker-val", "label": "💰 Ціна: Професійна гігієна (наліт курця)", "type": "text" },

        { "key": "svc-whitening-title", "label": "Відбілювання зубів", "type": "text" },
        { "key": "svc-whitening-desc", "label": "Відбілювання зубів — Опис", "type": "textarea" },
        { "key": "price-whitening", "label": "Назва: Відбілювання", "type": "text" },
        { "key": "price-whitening-val", "label": "💰 Ціна: Відбілювання", "type": "text" },


        { "label": "ХІРУРГІЯ", "type": "heading" },
        { "key": "feat-surgery", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-implant-title", "label": "Імплантація — Заголовок", "type": "text" },
        { "key": "svc-implant-desc", "label": "Імплантація — Опис", "type": "textarea" },
        { "key": "price-implant-neodent", "label": "Назва: Імплант NEODENT", "type": "text" },
        { "key": "price-implant-neodent-val", "label": "💰 Ціна: Імплант NEODENT", "type": "text" },
        { "key": "price-implant-sla", "label": "Назва: Імплант STRAUMANN SLA", "type": "text" },
        { "key": "price-implant-sla-val", "label": "💰 Ціна: Імплант STRAUMANN SLA", "type": "text" },
        { "key": "price-implant-slactive", "label": "Назва: Імплант STRAUMANN SLACTIVE", "type": "text" },
        { "key": "price-implant-slactive-val", "label": "💰 Ціна: Імплант STRAUMANN SLACTIVE", "type": "text" },
        { "key": "price-crown-monolit", "label": "Назва: Коронка (monolit)", "type": "text" },
        { "key": "price-crown-monolit-val", "label": "💰 Ціна: Коронка (monolit)", "type": "text" },
        { "key": "price-crown-aesthetic", "label": "Назва: Коронка (ceramic + абатмент)", "type": "textarea" },
        { "key": "price-crown-aesthetic-val", "label": "💰 Ціна: Коронка (ceramic + абатмент)", "type": "text" },

        { "key": "svc-extraction-title", "label": "Видалення зубів — Заголовок", "type": "text" },
        { "key": "svc-extraction-desc", "label": "Видалення зубів — Опис", "type": "textarea" },
        { "key": "price-extraction", "label": "Назва: Видалення зуба", "type": "text" },
        { "key": "price-extraction-val", "label": "💰 Ціна: Видалення зуба", "type": "text" },
        { "key": "price-extraction-atypical-1", "label": "Назва: Атипове видалення (просте)", "type": "text" },
        { "key": "price-extraction-atypical-1-val", "label": "💰 Ціна: Атипове видалення (просте)", "type": "text" },
        { "key": "price-extraction-atypical-2", "label": "Назва: Атипове видалення (складне)", "type": "text" },
        { "key": "price-extraction-atypical-2-val", "label": "💰 Ціна: Атипове видалення (складне)", "type": "text" },
        { "key": "price-sedation", "label": "Назва: Седація (1 година)", "type": "text" },
        { "key": "price-sedation-val", "label": "💰 Ціна: Седація (1 година)", "type": "text" },

        { "key": "svc-gum-surgery-title", "label": "Хірургія ясен — Заголовок", "type": "textarea" },
        { "key": "svc-gum-surgery-desc", "label": "Хірургія ясен — Опис", "type": "textarea" },
        { "key": "price-gum-smile", "label": "Назва: Усунення ясеневої посмішки", "type": "text" },
        { "key": "price-gum-smile-val", "label": "💰 Ціна: Усунення ясенної посмішки", "type": "text" },
        { "key": "price-recession", "label": "Назва: Закриття рецесій", "type": "text" },
        { "key": "price-recession-val", "label": "💰 Ціна: Закриття рецесій", "type": "text" },
        { "key": "price-gum-extension", "label": "Назва: Видовження ясен", "type": "text" },
        { "key": "price-gum-extension-val", "label": "💰 Ціна: Видовження ясен", "type": "text" },

        { "label": "ОРТОДОНТІЯ", "type": "heading" },
        { "key": "feat-ortho", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-braces-title", "label": "Брекети — Заголовок", "type": "text" },
        { "key": "svc-braces-desc", "label": "Брекети — Опис", "type": "textarea" },
        { "key": "price-braces-metal", "label": "Назва: Брекети (метал)", "type": "text" },
        { "key": "price-braces-metal-val", "label": "💰 Ціна: Брекети (метал)", "type": "text" },
        { "key": "price-braces-ceramic", "label": "Назва: Брекети (кераміка)", "type": "text" },
        { "key": "price-braces-ceramic-val", "label": "💰 Ціна: Брекети (кераміка)", "type": "text" },
        { "key": "price-braces-self-metal", "label": "Назва: Самолігуючі (метал)", "type": "text" },
        { "key": "price-braces-self-metal-val", "label": "💰 Ціна: Самолігуючі (метал)", "type": "text" },
        { "key": "price-braces-self-ceramic", "label": "Назва: Самолігуючі (кераміка)", "type": "text" },
        { "key": "price-braces-self-ceramic-val", "label": "💰 Ціна: Самолігуючі (кераміка)", "type": "text" },
        { "key": "price-ortho-visit", "label": "Назва: Контрольний візит ортодонта", "type": "text" },
        { "key": "price-ortho-visit-val", "label": "💰 Ціна: Контрольний візит ортодонта", "type": "text" },

        { "key": "svc-aligners-title", "label": "Елайнери — Заголовок", "type": "text" },
        { "key": "svc-aligners-desc", "label": "Елайнери — Опис", "type": "textarea" },
        { "key": "price-aligners", "label": "Назва: Лікування елайнерами", "type": "text" },
        { "key": "price-aligners-val", "label": "💰 Ціна: Лікування елайнерами", "type": "text" },

        { "label": "КНОПКИ ТА ФОРМА ЗАПИСУ", "type": "heading" },
        { "key": "btn-book", "label": "Кнопка: Записатися (Hero)", "type": "text" },
        { "key": "btn-book-short", "label": "Кнопка: Записатися (Списки цін)", "type": "text" },
        { "key": "form-name-placeholder", "label": "Форма: Плейсхолдер імені", "type": "text" },
        { "key": "form-comment-placeholder", "label": "Форма: Плейсхолдер коментаря", "type": "text" },
        { "key": "form-phone-placeholder", "label": "Форма: Плейсхолдер телефону", "type": "text" },
        { "key": "form-privacy", "label": "Форма: Текст приватності", "type": "textarea" },
        { "key": "form-btn", "label": "Форма: Кнопка відправки", "type": "text" }
    ],
    "cases": [
        {
            "key": "cases-page-title",
            "label": "SEO Title сторінки",
            "type": "text"
        },
        {
            "key": "cases-hero-title",
            "label": "Головний заголовок",
            "type": "text"
        },
        {
            "key": "filter-all",
            "label": "Фільтр: Всі роботи",
            "type": "text"
        },
        {
            "key": "filter-veneers",
            "label": "Фільтр: Керамічні вініри",
            "type": "text"
        },
        {
            "key": "filter-composite",
            "label": "Фільтр: Композитні вініри",
            "type": "text"
        },
        {
            "key": "filter-restoration",
            "label": "Фільтр: Композитні реставрації",
            "type": "text"
        },
        {
            "key": "filter-implants",
            "label": "Фільтр: Імплантація",
            "type": "text"
        },
        {
            "key": "filter-ortho",
            "label": "Фільтр: Ортодонтія",
            "type": "text"
        },
        {
            "key": "filter-whitening",
            "label": "Фільтр: Відбілювання зубів",
            "type": "text"
        }
    ],
    "contact": [
        {
            "key": "contacts-page-title",
            "label": "SEO Title сторінки",
            "type": "text"
        },
        {
            "key": "form-title",
            "label": "Форма: Заголовок",
            "type": "text"
        },
        {
            "key": "form-subtitle",
            "label": "Форма: Підзаголовок",
            "type": "textarea"
        },
        {
            "key": "form-phone-label",
            "label": "Форма: Телефон-лейбл",
            "type": "text"
        },
        {
            "key": "form-name-placeholder",
            "label": "Форма: Плейсхолдер імені",
            "type": "text"
        },
        {
            "key": "form-comment-placeholder",
            "label": "Форма: Плейсхолдер коментаря",
            "type": "text"
        },
        {
            "key": "form-phone-placeholder",
            "label": "Форма: Плейсхолдер телефону",
            "type": "text"
        },
        {
            "key": "form-privacy",
            "label": "Форма: Текст приватності",
            "type": "textarea"
        },
        {
            "key": "form-btn",
            "label": "Форма: Кнопка",
            "type": "text"
        },
        {
            "key": "footer-find-us",
            "label": "Де нас знайти",
            "type": "text"
        },
        {
            "key": "map-address",
            "label": "Адреса клініки",
            "type": "text"
        },
        {
            "key": "footer-map-btn",
            "label": "Кнопка: Карта",
            "type": "text"
        },
        {
            "key": "footer-hours-title",
            "label": "Графік: Заголовок",
            "type": "text"
        },
        {
            "key": "footer-hours-days",
            "label": "Графік: Години роботи",
            "type": "text"
        }
    ],
    "footer": [
        {
            "key": "footer-find-us",
            "label": "Де нас знайти",
            "type": "text"
        },
        {
            "key": "footer-location",
            "label": "Місто",
            "type": "text"
        },
        {
            "key": "footer-address-street",
            "label": "Вулиця та номер",
            "type": "text"
        },
        {
            "key": "footer-map-btn",
            "label": "Кнопка: Карта",
            "type": "text"
        },
        {
            "key": "footer-tagline",
            "label": "Слоган (з емодзі)",
            "type": "text"
        },
        {
            "key": "footer-hours-title",
            "label": "Графік: Заголовок",
            "type": "text"
        },
        {
            "key": "footer-hours-days",
            "label": "Графік: Години роботи",
            "type": "text"
        },
        {
            "key": "footer-copyright",
            "label": "Копірайт",
            "type": "text"
        },
        {
            "key": "btn-book",
            "label": "Кнопка: Записатися",
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

    try {
        console.log('Attempting login with Supabase...');
        if (!sb) {
            console.warn('Supabase not initialized, attempting re-init...');
            initSupabase();
        }

        if (sb) {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) {
                console.error('Auth error:', error.message);
                errorEl.textContent = 'Помилка: Невірний email або пароль.';
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Увійти';
                return;
            }
            console.log('Login successful!');
            currentUser = data.user;
            document.getElementById('userEmail').textContent = email;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'flex';
            loadDashboardData();
            return;
        } else {
            throw new Error('Supabase client failed to initialize');
        }
    } catch (err) {
        console.error('Login crash:', err);
        errorEl.textContent = 'Помилка мережі або з\'єднання: ' + err.message;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Увійти';
    }
}





async function handleLogout() {
    if (sb) await sb.auth.signOut();
    currentUser = null;
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
    if (sectionId === 'portfolio') loadCases();
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
            "hero-video": "https://storage.googleapis.com/tokar_clinic_site/video/home-cover/web.mp4",
            "interior-video": "assets/dental2.mp4",
            "hero-title": "ІННОВАЦІЇ.\nЕСТЕТИКА.\nКОМФОРТ🤍",
            "hero-subtitle": "Від ідеальної гігієни до імплантів 'під ключ'.",
            "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
            "feat-aesthetic": "Естетична стоматологія",
            "feat-therapy": "Лікування зубів",
            "feat-surgery": "Хірургія",
            "feat-ortho": "Ортодонтія",
            "about-p1": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",
            "about-p2": "Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та частина душі кожного з наших лікарів, що задають тенденції в сучасній стоматології.",
            "about-more": "ДІЗНАТИСЯ БІЛЬШЕ",
            "about-services": "ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ",
            "works-title": "НАШІ РОБОТИ",
            "works-btn": "ПЕРЕГЛЯНУТИ ВСІ РОБОТИ",
            "contact-choice-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
            "contact-choice-subtitle": "Виберіть онлайн-запис для миттєвого бронювання часу,<br>або напишіть нам у месенджер для консультації.",
            "btn-online-booking": "ОНЛАЙН ЗАПИС",
            "btn-contact-hub": "ЗВ'ЯЗАТИСЯ З НАМИ",
            "map-title": "ДЕ НАС ЗНАЙТИ",
            "map-open-btn": "Відкрити карту",
            "map-hours-label": "ГРАФІК РОБОТИ",
            "footer-hours": "Пн — Пт, 10:00 — 18:00"
        },
        "about": {
            "about-page-title": "Про клініку — Dental Studio",
            "about-section-tag": "ПРО КЛІНІКУ",
            "about-p1": "Ми доповнюємо вашу красу",
            "about-p2": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя. Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів, що задають тенденції в сучасній стоматології.",
            "nav-works": "НАШІ РОБОТИ",
            "nav-services": "ПОСЛУГИ",
            "about-team-title": "НАША КОМАНДА",
            "about-hero-img": "assets/dental-2.png",
            "about-secondary-img": "assets/dental-2.png"
        },
        "cases": {
            "cases-page-title": "Наші роботи — Dental Studio",
            "cases-hero-title": "НАШІ РОБОТИ",
            "filter-all": "Всі роботи",
            "filter-veneers": "Керамічні вініри",
            "filter-composite": "Композитні вініри",
            "filter-restoration": "Композитні реставрації",
            "filter-implants": "Імплантація",
            "filter-ortho": "Ортодонтія",
            "filter-whitening": "Відбілювання зубів"
        },
        "services": {
            "feat-aesthetic": "Естетична стоматологія",
            "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
            "feat-therapy": "Лікування зубів",
            "feat-surgery": "Хірургія",
            "feat-ortho": "Ортодонтія",
            "svc-consult-title": "Консультація",
            "svc-consult-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу.",
            "price-consult-general": "Загальна консультація",
            "btn-book-short": "Записатися",
            "form-name-placeholder": "Прізвище та ім'я",
            "form-comment-placeholder": "Коментар",
            "form-phone-placeholder": "Номер телефону",
            "form-privacy": "Погоджуюся на обробку персональних даних та з умовами політики конфіденційності",
            "form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
        ,
            "price-consult-general-val": "2000 ₴",
            "price-consult-modjaw-val": "400 €",
            "price-consult-checkup-val": "4900 ₴",
            "price-frontal-restoration-val": "230 €",
            "price-art-restoration-val": "350 €",
            "price-veneer-digital-val": "600 €",
            "price-veneer-layering-val": "750 €",
            "price-veneer-handmade-val": "850 €",
            "price-veneer-rework-val": "1200 €",
            "price-veneer-single-val": "1500 €",
            "price-crown-digital-val": "680 €",
            "price-crown-layering-val": "850 €",
            "price-crown-handmade-val": "950 €",
            "price-endo-incisor-val": "285 €",
            "price-endo-premolar-val": "320 €",
            "price-endo-molar-val": "440 €",
            "price-caries-2-val": "150 €",
            "price-caries-3-val": "170 €",
            "price-periodont-1-val": "140 €",
            "price-periodont-2-val": "280 €",
            "price-periodont-3-val": "400 €",
            "price-hygiene-val": "100 €",
            "price-hygiene-smoker-val": "140 €",
            "price-whitening-val": "150 €",
            "price-implant-neodent-val": "550 €",
            "price-implant-sla-val": "780 €",
            "price-implant-slactive-val": "980 €",
            "price-crown-monolit-val": "650 €",
            "price-crown-aesthetic-val": "850 €",
            "price-extraction-val": "100 €",
            "price-extraction-atypical-1-val": "150 €",
            "price-extraction-atypical-2-val": "220 €",
            "price-sedation-val": "140 €",
            "price-gum-smile-val": "1950 €",
            "price-recession-val": "290 €",
            "price-gum-extension-val": "160 €",
            "price-braces-metal-val": "2600 €",
            "price-braces-ceramic-val": "3100 €",
            "price-braces-self-metal-val": "3900 €",
            "price-braces-self-ceramic-val": "4640 €",
            "price-ortho-visit-val": "65 €",
            "price-aligners-val": "3900 €",
        },
        "contact": {
            "contacts-page-title": "Контакти — Dental Studio",
            "form-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
            "form-subtitle": "Залишіть заявку й адміністратор зв'яжеться з Вами, або зателефонуйте нам особисто",
            "form-phone-label": "Зв'язатися з нами для консультації:",
            "form-name-placeholder": "Прізвище та ім'я",
            "form-comment-placeholder": "Коментар",
            "form-phone-placeholder": "Номер телефону",
            "form-privacy": "Погоджуюся на обробку персональних даних та з умовами політики конфіденційності",
            "form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
            "footer-find-us": "ДЕ НАС ЗНАЙТИ",
            "map-address": "ВУЛИЦЯ НЕЗАЛЕЖНОСТІ, 21, ЧЕРНІГІВ, УКРАЇНА",
            "footer-map-btn": "ЗНАЙТИ НАС НА КАРТІ",
            "footer-hours-title": "ГРАФІК РОБОТИ",
            "footer-hours-days": "ПН — ПТ, 10:00 — 18:00"
        },
        "footer": {
            "footer-find-us": "ДЕ НАС ЗНАЙТИ",
            "footer-location": "Чернігів, Україна",
            "footer-address-street": "Вулиця Незалежності, 21",
            "footer-map-btn": "ЗНАЙТИ НАС НА КАРТІ",
            "footer-tagline": "ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍",
            "footer-hours-title": "ГРАФІК РОБОТИ",
            "footer-hours-days": "Пн — Пт, 10:00 — 18:00",
            "footer-copyright": "Copyright © 2026. Dental Studio. Всі права захищені.",
            "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
        }
    };

    let html = '';
    
    // Check if schema has headings for tab generation
    const hasTabs = schema.some(f => f.type === 'heading');
    
    if (hasTabs) {
        html += `<div class="editor-inner-tabs">`;
        let tabIndex = 0;
        schema.forEach((field) => {
            if (field.type === 'heading') {
                const activeClass = tabIndex === 0 ? 'active' : '';
                html += `<button class="inner-tab-btn ${activeClass}" onclick="switchInnerTab(this, 'inner-tab-${tabIndex}')">${field.label}</button>`;
                tabIndex++;
            }
        });
        html += `</div>`;
        
        let currentTabContentIndex = -1;
        
        schema.forEach(field => {
            if (field.type === 'heading') {
                if (currentTabContentIndex !== -1) {
                    html += `</div>`; // Close previous tab
                }
                currentTabContentIndex++;
                const display = currentTabContentIndex === 0 ? 'block' : 'none';
                html += `<div class="inner-tab-content" id="inner-tab-${currentTabContentIndex}" style="display:${display};">`;
                return;
            }
            
            html += renderEditorField(field, existing, PAGE_DEFAULTS, pageSlug);
        });
        
        if (currentTabContentIndex !== -1) {
            html += `</div>`; // close the last tab
        }
    } else {
        // Render normally if no tabs
        schema.forEach(field => {
            html += renderEditorField(field, existing, PAGE_DEFAULTS, pageSlug);
        });
    }

    html += `<div style="margin-top:25px;">
        <button id="saveBtn-${pageSlug}" class="btn-primary" onclick="this.innerHTML='⏳ Зберігаємо...'; savePageContent('${pageSlug}')">💾 Зберегти зміни</button>
    </div>`;
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
        console.log('Attempting to save updates:', updates);
        try {
            const { error } = await sb.from('site_content').upsert(updates, {
                onConflict: 'page_slug,section_key'
            });
            
            if (error) {
                console.error('Database error details:', error);
                throw error;
            }
            
            showToast('✅ Зміни збережено');
            setTimeout(() => loadPageEditor(pageSlug), 500);
        } catch (err) {
            console.error('Save error:', err);
            showToast(`❌ Помилка: ${err.message || 'невідома помилка'}`);
        } finally {
            const btn = document.getElementById(`saveBtn-${pageSlug}`);
            if (btn) btn.innerHTML = '💾 Зберегти зміни';
        }
    } else {
        console.warn('Supabase not initialized!');
        showToast('⚠️ Supabase не підключено! Перейдіть у вкладку "Setup".');
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
    if (sb) {
        const { data, error } = await sb.from('price_list')
            .select('*').order('sort_order');
        
        if (error) {
            showToast('❌ Помилка БД: ' + error.message);
        }

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
    if (!sb) {
        doctors = [
            { id: 'l1', name: 'Др. Анатолій Токар', spec: 'Стоматолог-ортопед', photo: '' },
            { id: 'l2', name: 'Марія Токар', spec: 'Стоматолог-ортодонт', photo: '' },
        ];
        renderDoctors();
        return;
    }

    try {
        const { data, error } = await sb.from('doctors').select('*').order('sort_order');
        if (error) throw error;
        if (data) {
            doctors = data.map(d => ({
                id: d.id,
                name: d.name_uk || d.name || '',
                spec: d.specialization_uk || d.specialization || '',
                photo: d.photo_url || d.photo || 'assets/doctor.png',
                bio: d.bio_uk || d.description || '',
                is_active: d.is_active !== false
            }));

        }
    } catch (e) {
        console.error('loadDoctors error:', e);
        showToast('❌ Помилка завантаження лікарів');
    }
    renderDoctors();
}

function renderDoctors() {
    const area = document.getElementById('doctorsArea');
    if (!area) return;
    
    if (doctors.length === 0) {
        area.innerHTML = '<p class="editor-placeholder">Лікарі не додані</p>';
        return;
    }

    let html = '';
    doctors.forEach((doc, i) => {
        let photoSrc = doc.photo || '';
        if (photoSrc && !photoSrc.startsWith('http') && !photoSrc.startsWith('blob:') && !photoSrc.startsWith('/')) {
            photoSrc = '/' + photoSrc;
        }

        html += `<div class="doctor-card-admin">
            <div class="doctor-photo-admin" onclick="uploadDoctorPhoto(${i})">
                ${photoSrc ? `<img src="${photoSrc}">` : '📷'}
                <div class="media-upload-hint">Змінити фото</div>
            </div>
            <div class="doctor-card-body">
                <div class="card-field-group">
                    <label class="card-field-label">ПІБ лікаря</label>
                    <input type="text" value="${escapeAttr(doc.name)}" placeholder="ПІБ" onchange="doctors[${i}].name=this.value">
                </div>
                <div class="card-field-group">
                    <label class="card-field-label">Спеціалізація</label>
                    <input type="text" value="${escapeAttr(doc.spec)}" placeholder="Спеціалізація" onchange="doctors[${i}].spec=this.value">
                </div>
                <div class="card-field-group">
                    <label class="card-field-label">Біографія / Опис</label>
                    <textarea rows="2" placeholder="Короткий опис..." onchange="doctors[${i}].bio=this.value">${escapeHtml(doc.bio)}</textarea>
                </div>
            </div>
            <div class="doctor-card-actions">
                <button class="btn-primary" style="flex:1;" onclick="saveDoctor(${i})">💾 Зберегти</button>
                <button class="btn-danger" onclick="deleteDoctor(${i})">🗑️</button>
            </div>
        </div>`;
    });

    area.innerHTML = html;
}

async function saveDoctor(index) {
    const doc = doctors[index];
    if (!sb) {
        showToast('✅ Збережено локально (режим демо)');
        return;
    }

    try {
        const row = {
            name_uk: doc.name,
            specialization_uk: doc.spec,
            bio_uk: doc.bio,
            photo_url: doc.photo,
            sort_order: index + 1,
            is_active: true
        };

        if (doc.id && !String(doc.id).startsWith('new_') && !String(doc.id).startsWith('l')) {
            await sb.from('doctors').update(row).eq('id', doc.id);
        } else {
            const { data, error } = await sb.from('doctors').insert(row).select('id').single();
            if (error) throw error;
            if (data) doctors[index].id = data.id;
        }
        showToast('✅ Лікаря збережено');
        renderDoctors();
    } catch (e) {
        showToast(`❌ Помилка: ${e.message}`);
    }
}

async function addDoctor() {
    doctors.unshift({ id: 'new_' + Date.now(), name: '', spec: '', bio: '', photo: '' });
    renderDoctors();
    window.scrollTo({ top: document.getElementById('doctorsArea').offsetTop - 100, behavior: 'smooth' });
}

async function deleteDoctor(index) {
    if (!confirm('Видалити цього лікаря?')) return;
    const doc = doctors[index];
    if (sb && doc.id && !String(doc.id).startsWith('new_') && !String(doc.id).startsWith('l')) {
        await sb.from('doctors').delete().eq('id', doc.id);
    }
    doctors.splice(index, 1);
    renderDoctors();
    showToast('🗑️ Видалено');
}

async function uploadDoctorPhoto(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast('⏳ Завантаження фото...');
        if (sb) {
            const filePath = `doctors/doc_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error } = await sb.storage.from('clinic-media').upload(filePath, file);
            if (error) {
                showToast(`❌ ${error.message}`);
                return;
            }
            const { data: urlData } = sb.storage.from('clinic-media').getPublicUrl(filePath);
            doctors[index].photo = urlData.publicUrl;
        } else {
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
// CASES (OUR WORKS)
// ============================================================

let cases = [];
let editingCaseIndex = -1; // -1 means list view, >=0 means editing specific case

async function loadCases() {
    if (!sb) {
        cases = [
            { id: 'c1', slug: 'ceramic-veneers-anna', title_uk: 'Керамічні вініри (Анна)', category: 'veneers', stages: [] }
        ];
        renderCases();
        return;
    }

    try {
        const { data, error } = await sb.from('treatment_cases').select('*').order('sort_order');
        if (error) throw error;
        cases = data || [];
    } catch (e) {
        console.error('loadCases error:', e);
        showToast('❌ Помилка завантаження кейсів');
    }
    renderCases();
}

function renderCases() {
    const area = document.getElementById('portfolioArea');
    if (!area) return;
    
    if (editingCaseIndex !== -1) {
        renderFullCaseEditor();
        return;
    }

    let html = '';

    if (cases.length === 0) {
        html += '<p class="editor-placeholder">Кейси не додані. Натисніть "+ Додати кейс"</p>';
        area.innerHTML = html;
        return;
    }

    html += '<div class="cases-grid-admin">';
    cases.forEach((c, i) => {
        const heroImg = c.main_image_url || '';
        html += `<div class="case-card-admin">
            <div class="case-photo-admin">
                ${heroImg ? `<img src="${heroImg}">` : '🖼️'}
            </div>
            <div class="case-card-body">
                <div class="case-card-title">${escapeHtml(c.title_uk || 'Без назви')}</div>
                <div class="case-card-meta">${c.category} | /${c.slug || 'no-slug'}</div>
            </div>
            <div class="case-card-actions">
                <button class="btn-primary" onclick="editCase(${i})">✏️ Редагувати</button>
                <button class="btn-danger" onclick="deleteCase(${i})">🗑️</button>
            </div>
        </div>`;
    });
    html += '</div>';

    area.innerHTML = html;
}

function addCase() {
    const newCase = { 
        id: 'new_' + Date.now(), 
        slug: 'case-' + Date.now(),
        title_uk: 'Новий кейс', 
        category: 'veneers', 
        stages: [],
        main_image_url: '',
        before_image_url: '',
        after_image_url: ''
    };
    cases.unshift(newCase);
    editingCaseIndex = 0;
    renderCases();
}

function editCase(index) {
    editingCaseIndex = index;
    renderCases();
}

function closeCaseEditor() {
    editingCaseIndex = -1;
    renderCases();
}

function renderFullCaseEditor() {
    const area = document.getElementById('portfolioArea');
    const c = cases[editingCaseIndex];

    let html = `
        <div class="full-editor">
            <div class="editor-header-actions">
                <button class="btn-outline" onclick="closeCaseEditor()">← Назад до списку</button>
                <button class="btn-primary" onclick="saveCase(${editingCaseIndex})">💾 Зберегти кейс</button>
            </div>
            
            <div class="editor-grid-dynamic">
                <div class="editor-column">
                    <h3>Основна інформація</h3>
                    <div class="card-field-group">
                        <label class="card-field-label">Назва кейсу (Заголовок на сторінці)</label>
                        <input type="text" value="${escapeAttr(c.title_uk || '')}" onchange="cases[${editingCaseIndex}].title_uk=this.value">
                    </div>
                    <div class="card-field-group">
                        <label class="card-field-label">URL Slug (для посилання, англійською)</label>
                        <input type="text" value="${escapeAttr(c.slug || '')}" onchange="cases[${editingCaseIndex}].slug=this.value">
                        <small>Буде доступно як: domain.com/case.html?id=${c.slug}</small>
                    </div>
                    <div class="card-field-group">
                        <label class="card-field-label">Категорія</label>
                        <select onchange="cases[${editingCaseIndex}].category=this.value">
                            <option value="veneers" ${c.category === 'veneers' ? 'selected' : ''}>Керамічні вініри</option>
                            <option value="composite-veneers" ${c.category === 'composite-veneers' ? 'selected' : ''}>Композитні вініри</option>
                            <option value="restorations" ${c.category === 'restorations' ? 'selected' : ''}>Реставрації</option>
                            <option value="implants" ${c.category === 'implants' ? 'selected' : ''}>Імплантація</option>
                            <option value="surgery" ${c.category === 'surgery' ? 'selected' : ''}>Хірургія</option>
                            <option value="ortho" ${c.category === 'ortho' ? 'selected' : ''}>Ортодонтія</option>
                        </select>
                    </div>
                    <div class="card-field-group">
                        <label class="card-field-label">Опис кейсу (під заголовком)</label>
                        <textarea rows="3" onchange="cases[${editingCaseIndex}].description_uk=this.value">${escapeHtml(c.description_uk || '')}</textarea>
                    </div>
                </div>

                <div class="editor-column">
                    <h3>Медіа (Зображення)</h3>
                    <div class="media-row-admin">
                        <div class="media-box-small" onclick="uploadCaseMedia(${editingCaseIndex}, 'main_image_url')">
                            <img src="${c.main_image_url || 'https://via.placeholder.com/150?text=Hero'}" id="prev-hero">
                            <div class="media-label">Головне фото (Hero)</div>
                        </div>
                        <div class="media-box-small" onclick="uploadCaseMedia(${editingCaseIndex}, 'before_image_url')">
                            <img src="${c.before_image_url || 'https://via.placeholder.com/150?text=Before'}" id="prev-before">
                            <div class="media-label">Фото ДО</div>
                        </div>
                        <div class="media-box-small" onclick="uploadCaseMedia(${editingCaseIndex}, 'after_image_url')">
                            <img src="${c.after_image_url || 'https://via.placeholder.com/150?text=After'}" id="prev-after">
                            <div class="media-label">Фото ПІСЛЯ</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="stages-manager">
                <div class="stages-header">
                    <h3>Етапи лікування (Конструктор)</h3>
                    <button class="btn-outline btn-sm" onclick="addStage(${editingCaseIndex})">+ Додати етап</button>
                </div>
                <div id="stagesList" class="stages-list-admin">
                    ${renderStages(c.stages || [], editingCaseIndex)}
                </div>
            </div>
        </div>
    `;
    area.innerHTML = html;
}

function renderStages(stages, caseIdx) {
    if (!stages || stages.length === 0) return '<p class="dim-text">Етапи не додані...</p>';
    
    return stages.map((s, i) => `
        <div class="stage-item-admin">
            <div class="stage-num">${i + 1}</div>
            <div class="stage-img-admin" onclick="uploadStageMedia(${caseIdx}, ${i})">
                <img src="${s.image_url || 'https://via.placeholder.com/80?text=Image'}">
            </div>
            <div class="stage-inputs">
                <input type="text" value="${escapeAttr(s.title || '')}" placeholder="Назва етапу (напр: ОРТОДОНТІЯ)" onchange="cases[${caseIdx}].stages[${i}].title=this.value">
                <input type="text" value="${escapeAttr(s.doctor || '')}" placeholder="Лікар (напр: МАРІЯ ТОКАР)" onchange="cases[${caseIdx}].stages[${i}].doctor=this.value">
                <textarea rows="2" placeholder="Опис етапу..." onchange="cases[${caseIdx}].stages[${i}].desc=this.value">${escapeHtml(s.desc || '')}</textarea>
            </div>
            <button class="btn-danger btn-sm" onclick="deleteStage(${caseIdx}, ${i})">✕</button>
        </div>
    `).join('');
}

function addStage(caseIdx) {
    if (!cases[caseIdx].stages) cases[caseIdx].stages = [];
    cases[caseIdx].stages.push({ title: '', doctor: '', desc: '', image_url: '' });
    renderFullCaseEditor();
}

function deleteStage(caseIdx, stageIdx) {
    cases[caseIdx].stages.splice(stageIdx, 1);
    renderFullCaseEditor();
}

async function uploadStageMedia(caseIdx, stageIdx) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast('⏳ Завантаження...');
        if (sb) {
            const filePath = `cases/stages/s_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error } = await sb.storage.from('clinic-media').upload(filePath, file);
            if (error) { showToast(`❌ ${error.message}`); return; }
            const { data: urlData } = sb.storage.from('clinic-media').getPublicUrl(filePath);
            cases[caseIdx].stages[stageIdx].image_url = urlData.publicUrl;
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => { cases[caseIdx].stages[stageIdx].image_url = ev.target.result; renderFullCaseEditor(); };
            reader.readAsDataURL(file);
        }
        renderFullCaseEditor();
        showToast('📤 Завантажено');
    };
    input.click();
}

async function saveCase(index) {
    const c = cases[index];
    if (!sb) { showToast('✅ Збережено (демо)'); return; }

    try {
        const row = {
            slug: c.slug,
            category: c.category,
            title_uk: c.title_uk,
            description_uk: c.description_uk,
            main_image_url: c.main_image_url,
            before_image_url: c.before_image_url,
            after_image_url: c.after_image_url,
            stages: c.stages,
            is_published: true,
            sort_order: index
        };

        if (c.id && !String(c.id).startsWith('new_')) {
            const { error } = await sb.from('treatment_cases').update(row).eq('id', c.id);
            if (error) throw error;
        } else {
            const { data, error } = await sb.from('treatment_cases').insert(row).select('id').single();
            if (error) throw error;
            if (data) cases[index].id = data.id;
        }
        showToast('✅ Кейс успішно збережено!');
        editingCaseIndex = -1;
        loadCases();
    } catch (e) {
        showToast(`❌ Помилка: ${e.message}`);
    }
}

async function deleteCase(index) {
    if (!confirm('Видалити цей кейс назавжди?')) return;
    const c = cases[index];
    if (sb && c.id && !String(c.id).startsWith('new_')) {
        await sb.from('treatment_cases').delete().eq('id', c.id);
    }
    cases.splice(index, 1);
    renderCases();
    showToast('🗑️ Кейс видалено');
}

async function uploadCaseMedia(index, field) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast('⏳ Завантаження основного медіа...');
        if (sb) {
            const filePath = `cases/c_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error } = await sb.storage.from('clinic-media').upload(filePath, file);
            if (error) { showToast(`❌ ${error.message}`); return; }
            const { data: urlData } = sb.storage.from('clinic-media').getPublicUrl(filePath);
            cases[index][field] = urlData.publicUrl;
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => { cases[index][field] = ev.target.result; renderFullCaseEditor(); };
            reader.readAsDataURL(file);
        }
        renderFullCaseEditor();
        showToast('📤 Завантажено');
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


function copyConfigForAI() {
    const config = getSupabaseConfig();
    if (!config) {
        showToast('❌ Спочатку підключіть Supabase');
        return;
    }
    const text = 'URL: ' + config.url + '\nKEY: ' + config.key;
    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ Скопійовано! Відправте це мені в чат.');
    });
}

function renderEditorField(field, existing, defaults, pageSlug) {
    let val = existing[field.key] !== undefined ? existing[field.key] : '';
    if (!val && defaults[pageSlug] && defaults[pageSlug][field.key]) {
        val = defaults[pageSlug][field.key];
    }
    
    let out = `<div class="editor-field">`;
    out += `<div class="editor-field-label">${field.label}</div>`;

    if (field.type === 'text') {
        out += `<input type="text" data-key="${field.key}" placeholder="${field.label}" value="${escapeAttr(val)}">`;
    } else if (field.type === 'textarea') {
        out += `<textarea data-key="${field.key}" rows="3" placeholder="${field.label}">${escapeHtml(val)}</textarea>`;
    } else if (field.type === 'image') {
        const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
        out += `<div class="media-upload-box" onclick="triggerMediaUpload('${field.key}', 'image')" id="media-${field.key}">`;
        out += `${val ? `<img src="${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">` : ''}`;
        out += `<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>`;
        out += `</div>`;
    } else if (field.type === 'video') {
        const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
        out += `<div class="media-upload-box" onclick="triggerMediaUpload('${field.key}', 'video')" id="media-${field.key}">`;
        out += `${val ? `<video src="${videoSrc}" style="max-width:100%;max-height:200px;" controls></video>` : ''}`;
        out += `<div class="media-upload-hint">🎥 Натисніть щоб завантажити відео</div>`;
        out += `</div>`;
    }

    out += `</div>`;
    return out;
}

window.switchInnerTab = function(btnEl, targetId) {
    // de-activate all tabs
    const container = btnEl.closest('.editor-area');
    container.querySelectorAll('.inner-tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.inner-tab-content').forEach(content => content.style.display = 'none');
    
    // activate chosen tab
    btnEl.classList.add('active');
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.style.display = 'block';
};
