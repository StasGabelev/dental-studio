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
        { "key": "svc-consult-title", "label": "Консультація — Заголовок (спільна для всіх розділів)", "type": "text" },
        { "key": "svc-consult-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "price-consult-general", "label": "Назва: Загальна консультація", "type": "text" },
        { "key": "price-consult-general-val", "label": "💰 Ціна: Загальна консультація", "type": "text" },
        { "key": "price-consult-modjaw", "label": "Назва: Діагностика MODJAW", "type": "text" },
        { "key": "price-consult-modjaw-val", "label": "💰 Ціна: Діагностика MODJAW", "type": "text" },
        { "key": "price-consult-checkup", "label": "Назва: CHECK-UP", "type": "text" },
        { "key": "price-consult-checkup-val", "label": "💰 Ціна: CHECK-UP", "type": "text" },

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
        { "key": "svc-endo-title", "label": "Ендодонтія — Заголовок", "type": "text" },
        { "key": "svc-endo-desc", "label": "Ендодонтія — Опис", "type": "textarea" },
        { "key": "price-endo-incisor", "label": "Назва: Канали (різці, ікла)", "type": "text" },
        { "key": "price-endo-incisor-val", "label": "💰 Ціна: Канали (різці, ікла)", "type": "text" },
        { "key": "price-endo-premolar", "label": "Назва: Канали (премоляри)", "type": "text" },
        { "key": "price-endo-premolar-val", "label": "💰 Ціна: Канали (премоляри)", "type": "text" },
        { "key": "price-endo-molar", "label": "Назва: Канали (моляри)", "type": "text" },
        { "key": "price-endo-molar-val", "label": "💰 Ціна: Канали (моляри)", "type": "text" },

        { "key": "svc-caries-title", "label": "Лікування карієсу — Заголовок", "type": "text" },
        { "key": "svc-caries-desc", "label": "Лікування карієсу — Опис", "type": "textarea" },
        { "key": "price-caries-2", "label": "Назва: Карієс II рівень", "type": "text" },
        { "key": "price-caries-2-val", "label": "💰 Ціна: Карієс II рівень", "type": "text" },
        { "key": "price-caries-3", "label": "Назва: Карієс III рівень", "type": "text" },
        { "key": "price-caries-3-val", "label": "💰 Ціна: Карієс III рівень", "type": "text" },

        { "key": "svc-periodontal-title", "label": "Пародонтологія — Заголовок", "type": "text" },
        { "key": "svc-periodontal-desc", "label": "Пародонтологія — Опис", "type": "textarea" },
        { "key": "price-periodont-1", "label": "Назва: Пародонтит I ступінь", "type": "text" },
        { "key": "price-periodont-1-val", "label": "💰 Ціна: Пародонтит I ступінь", "type": "text" },
        { "key": "price-periodont-2", "label": "Назва: Пародонтит II ступінь", "type": "text" },
        { "key": "price-periodont-2-val", "label": "💰 Ціна: Пародонтит II ступінь", "type": "text" },
        { "key": "price-periodont-3", "label": "Назва: Пародонтит III ступінь", "type": "text" },
        { "key": "price-periodont-3-val", "label": "💰 Ціна: Пародонтит III ступінь", "type": "text" },

        { "key": "svc-hygiene-title", "label": "Гігієна — Заголовок", "type": "text" },
        { "key": "svc-hygiene-desc", "label": "Гігієна — Опис", "type": "textarea" },
        { "key": "price-hygiene", "label": "Назва: Гігієна", "type": "text" },
        { "key": "price-hygiene-val", "label": "💰 Ціна: Гігієна", "type": "text" },
        { "key": "price-hygiene-smoker", "label": "Назва: Гігієна (нальот курця)", "type": "text" },
        { "key": "price-hygiene-smoker-val", "label": "💰 Ціна: Гігієна (нальот курця)", "type": "text" },

        { "key": "svc-whitening-title", "label": "Відбілювання — Заголовок", "type": "text" },
        { "key": "svc-whitening-desc", "label": "Відбілювання — Опис", "type": "textarea" },
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

    // Priority: password 1234
    if (password === '1234') {
        currentUser = { email: email || 'admin@dental-studio.com' };
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'flex';
        localStorage.setItem('ds_admin_email', currentUser.email);
        loadDashboardData();
        return;
    }

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
    console.log('DEFENSIVE LOAD DOCTORS START');
    if (!sb) {
        console.warn('Supabase not connected, showing defaults');
        doctors = [
            { id: 'l1', name: 'Др. Іванов А.В.', spec: 'Терапевт', photo: '' },
            { id: 'l2', name: 'Др. Петрова О.М.', spec: 'Хірург-імплантолог', photo: '' },
        ];
        renderDoctors();
        return;
    }

    try {
        const area = document.getElementById('doctorsArea');
        if (area) area.innerHTML = '<p class="editor-placeholder">Завантаження з бази даних...</p>';

        const { data, error } = await sb.from('doctors').select('*').order('sort_order');
        
        if (error) {
            console.error('DB ERROR:', error);
            showToast('❌ Помилка БД: ' + error.message);
            // Don't clear current doctors if error
        } else if (data) {
            console.log('DB SUCCESS, items:', data.length);
            doctors = data.map(d => ({
                id: d.id,
                name: d.name_uk || d.name || '',
                spec: d.specialization_uk || d.specialization || d.spec || '',
                photo: d.photo_url || d.photo || '',
                is_active: d.is_active !== false
            }));
            
            if (doctors.length === 0) {
                console.warn('DB returned 0 doctors');
            }
        }
    } catch (e) {
        console.error('CRITICAL JS ERROR in loadDoctors:', e);
        showToast('❌ JS Error: ' + e.message);
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
        // Fix path if it's a relative asset
        if (photoSrc && !photoSrc.startsWith('http') && !photoSrc.startsWith('blob:') && !photoSrc.startsWith('/')) {
            photoSrc = '/' + photoSrc;
        }

        html += `<div class="doctor-card-admin">
            <div class="doctor-photo-admin" style="display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:40px;cursor:pointer;" onclick="uploadDoctorPhoto(${i})">
                ${photoSrc ? `<img src="${photoSrc}" style="width:100%;height:100%;object-fit:cover;">` : '📷'}
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
