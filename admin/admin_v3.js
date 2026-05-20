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
    const defaultUrl = 'https://ladeofbnhqcxjaomlvbx.supabase.co';
    const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZGVvZmJuaHFjeGphb21sdmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDMzNDksImV4cCI6MjA5NDMxOTM0OX0.pr3COkOr2h1V986c4-2tluSttWhQuiMD4H4OZaXmdW4';

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
        { "key": "home-page-title", "label": "Заголовок сторінки (SEO)", "type": "text" },
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
            "key": "feat-children",
            "label": "\u0411\u043B\u043E\u043A: \u0414\u0438\u0442\u044F\u0447\u0430 \u0441\u0442\u043E\u043C\u0430\u0442\u043E\u043B\u043E\u0433\u0456\u044F",
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
            "key": "footer-hours-title",
            "label": "Графік: Заголовок",
            "type": "text"
        },
        {
            "key": "footer-hours-days",
            "label": "Графік: Робочі години",
            "type": "textarea"
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
        { "label": "ХЕДДЕР ПОСЛУГИ", "type": "heading" },
        { "key": "img-services-hero", "label": "🖼️ Головне фото (Hero)", "type": "image" },
        { "key": "services-hero-title", "label": "Головний заголовок сторінки", "type": "textarea" },
        { "key": "services-hero-subtitle", "label": "Підзаголовок сторінки", "type": "textarea" },

        { "label": "ЕСТЕТИЧНА СТОМАТОЛОГІЯ", "type": "heading" },
        { "key": "feat-aesthetic", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-consult-aesthetic-visible", "label": "👁 Консультація — показати/сховати", "type": "toggle" },
        { "key": "svc-consult-title", "label": "Консультація", "type": "text" },
        { "key": "svc-consult-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "vid-svc-consult-aesthetic", "label": "🎬 Відео: Консультація", "type": "video" },
        { "key": "consult-aesthetic", "label": "📋 Прайс-лист: Консультація", "type": "price_group" },


        { "key": "svc-composite-veneer-visible", "label": "👁 Композитні вініри — показати/сховати", "type": "toggle" },
        { "key": "svc-composite-veneer-title", "label": "Композитні вініри — Заголовок", "type": "text" },
        { "key": "svc-composite-veneer-desc", "label": "Композитні вініри — Опис", "type": "textarea" },
        { "key": "vid-svc-composite-veneer", "label": "🎬 Відео: Композитні вініри", "type": "video" },
        { "key": "composite-veneer", "label": "📋 Прайс-лист: Композитні вініри", "type": "price_group" },

        { "key": "svc-ceramic-restoration-visible", "label": "👁 Керамічні реставрації — показати/сховати", "type": "toggle" },
        { "key": "svc-ceramic-restoration-title", "label": "Керамічні реставрації — Заголовок", "type": "textarea" },
        { "key": "svc-ceramic-restoration-desc", "label": "Керамічні реставрації — Опис", "type": "textarea" },
        { "key": "vid-svc-ceramic-restoration", "label": "🎬 Відео: Керамічні реставрації", "type": "video" },
        { "key": "ceramic-restoration", "label": "📋 Прайс-лист: Керамічні реставрації", "type": "price_group" },

        { "label": "ЛІКУВАННЯ ЗУБІВ", "type": "heading" },
        { "key": "feat-therapy", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-consult-therapy-visible", "label": "👁 Консультація — показати/сховати", "type": "toggle" },
        { "key": "svc-consult-therapy-title", "label": "Консультація", "type": "text" },
        { "key": "svc-consult-therapy-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "vid-svc-consult-therapy", "label": "🎬 Відео: Консультація", "type": "video" },
        { "key": "svc-endo-visible", "label": "👁 Ендодонтія — показати/сховати", "type": "toggle" },
        { "key": "svc-endo-title", "label": "Ендодонтія", "type": "text" },
        { "key": "svc-endo-desc", "label": "Ендодонтія — Опис", "type": "textarea" },
        { "key": "vid-svc-endo", "label": "🎬 Відео: Ендодонтія", "type": "video" },
        { "key": "consult-therapy", "label": "📋 Прайс-лист: Консультація", "type": "price_group" },
        { "key": "endo", "label": "📋 Прайс-лист: Ендодонтія", "type": "price_group" },

        { "key": "svc-caries-visible", "label": "👁 Лікування карієсу — показати/сховати", "type": "toggle" },
        { "key": "svc-caries-title", "label": "Лікування карієсу", "type": "text" },
        { "key": "svc-caries-desc", "label": "Лікування карієсу — Опис", "type": "textarea" },
        { "key": "vid-svc-caries", "label": "🎬 Відео: Лікування карієсу", "type": "video" },
        { "key": "caries", "label": "📋 Прайс-лист: Лікування карієсу", "type": "price_group" },

        { "key": "svc-periodontal-visible", "label": "👁 Пародонтологічне лікування — показати/сховати", "type": "toggle" },
        { "key": "svc-periodontal-title", "label": "Пародонтологічне лікування", "type": "text" },
        { "key": "svc-periodontal-desc", "label": "Пародонтологічне лікування — Опис", "type": "textarea" },
        { "key": "vid-svc-periodontal", "label": "🎬 Відео: Пародонтологічне лікування", "type": "video" },
        { "key": "periodontal", "label": "📋 Прайс-лист: Пародонтологічне лікування", "type": "price_group" },

        { "key": "svc-hygiene-visible", "label": "👁 Гігієна зубів — показати/сховати", "type": "toggle" },
        { "key": "svc-hygiene-title", "label": "Професійна гігієна зубів", "type": "text" },
        { "key": "svc-hygiene-desc", "label": "Професійна гігієна зубів — Опис", "type": "textarea" },
        { "key": "vid-svc-hygiene", "label": "🎬 Відео: Гігієна зубів", "type": "video" },
        { "key": "hygiene", "label": "📋 Прайс-лист: Професійна гігієна", "type": "price_group" },

        { "key": "svc-whitening-visible", "label": "👁 Відбілювання зубів — показати/сховати", "type": "toggle" },
        { "key": "svc-whitening-title", "label": "Відбілювання зубів", "type": "text" },
        { "key": "svc-whitening-desc", "label": "Відбілювання зубів — Опис", "type": "textarea" },
        { "key": "vid-svc-whitening", "label": "🎬 Відео: Відбілювання зубів", "type": "video" },
        { "key": "whitening", "label": "📋 Прайс-лист: Відбілювання зубів", "type": "price_group" },


        { "label": "ХІРУРГІЯ", "type": "heading" },
        { "key": "feat-surgery", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-consult-surgery-visible", "label": "👁 Консультація — показати/сховати", "type": "toggle" },
        { "key": "svc-consult-surgery-title", "label": "Консультація", "type": "text" },
        { "key": "svc-consult-surgery-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "vid-svc-consult-surgery", "label": "🎬 Відео: Консультація", "type": "video" },
        { "key": "svc-implant-visible", "label": "👁 Імплантація — показати/сховати", "type": "toggle" },
        { "key": "svc-implant-title", "label": "Імплантація — Заголовок", "type": "text" },
        { "key": "svc-implant-desc", "label": "Імплантація — Опис", "type": "textarea" },
        { "key": "vid-svc-implant", "label": "🎬 Відео: Імплантація", "type": "video" },
        { "key": "consult-surgery", "label": "📋 Прайс-лист: Консультація", "type": "price_group" },
        { "key": "implant", "label": "📋 Прайс-лист: Імплантація", "type": "price_group" },


        { "key": "svc-extraction-visible", "label": "👁 Видалення зубів — показати/сховати", "type": "toggle" },
        { "key": "svc-extraction-title", "label": "Видалення зубів — Заголовок", "type": "text" },
        { "key": "svc-extraction-desc", "label": "Видалення зубів — Опис", "type": "textarea" },
        { "key": "vid-svc-extraction", "label": "🎬 Відео: Видалення зубів", "type": "video" },
        { "key": "extraction", "label": "📋 Прайс-лист: Видалення зубів", "type": "price_group" },

        { "key": "svc-gum-surgery-visible", "label": "👁 Хірургія ясен — показати/сховати", "type": "toggle" },
        { "key": "svc-gum-surgery-title", "label": "Хірургія ясен — Заголовок", "type": "textarea" },
        { "key": "svc-gum-surgery-desc", "label": "Хірургія ясен — Опис", "type": "textarea" },
        { "key": "vid-svc-gum-surgery", "label": "🎬 Відео: Хірургія ясен", "type": "video" },
        { "key": "gum-surgery", "label": "📋 Прайс-лист: Хірургія ясен", "type": "price_group" },

        { "label": "ОРТОДОНТІЯ", "type": "heading" },
        { "key": "feat-ortho", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-consult-ortho-visible", "label": "👁 Консультація — показати/сховати", "type": "toggle" },
        { "key": "svc-consult-ortho-title", "label": "Консультація", "type": "text" },
        { "key": "svc-consult-ortho-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "vid-svc-consult-ortho", "label": "🎬 Відео: Консультація", "type": "video" },
        { "key": "svc-braces-visible", "label": "👁 Брекети — показати/сховати", "type": "toggle" },
        { "key": "svc-braces-title", "label": "Брекети — Заголовок", "type": "text" },
        { "key": "svc-braces-desc", "label": "Брекети — Опис", "type": "textarea" },
        { "key": "vid-svc-braces", "label": "🎬 Відео: Лікування брекетами", "type": "video" },
        { "key": "consult-ortho", "label": "📋 Прайс-лист: Консультація", "type": "price_group" },
        { "key": "braces", "label": "📋 Прайс-лист: Лікування брекетами", "type": "price_group" },

        { "key": "svc-aligners-visible", "label": "👁 Елайнери — показати/сховати", "type": "toggle" },
        { "key": "svc-aligners-title", "label": "Елайнери — Заголовок", "type": "text" },
        { "key": "svc-aligners-desc", "label": "Елайнери — Опис", "type": "textarea" },
        { "key": "vid-svc-aligners", "label": "🎬 Відео: Лікування елайнерами", "type": "video" },
        { "key": "aligners", "label": "📋 Прайс-лист: Лікування елайнерами", "type": "price_group" },

        { "label": "ДИТЯЧА СТОМАТОЛОГІЯ", "type": "heading" },
        { "key": "feat-children", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-consult-children-visible", "label": "👁 Консультація — показати/сховати", "type": "toggle" },
        { "key": "svc-consult-children-title", "label": "Консультація", "type": "text" },
        { "key": "svc-consult-children-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "vid-svc-consult-children", "label": "🎬 Відео: Консультація", "type": "video" },
        { "key": "svc-children-caries-visible", "label": "👁 Карієс у дітей — показати/сховати", "type": "toggle" },
        { "key": "svc-children-caries-title", "label": "Карієс у дітей — Заголовок", "type": "text" },
        { "key": "svc-children-caries-desc", "label": "Карієс у дітей — Опис", "type": "textarea" },
        { "key": "vid-svc-children-caries", "label": "🎬 Відео: Карієс у дітей", "type": "video" },
        { "key": "consult-children", "label": "📋 Прайс-лист: Консультація", "type": "price_group" },
        { "key": "children-caries", "label": "📋 Прайс-лист: Карієс у дітей", "type": "price_group" },
        { "key": "svc-children-hygiene-visible", "label": "👁 Дитяча гігієна — показати/сховати", "type": "toggle" },
        { "key": "svc-children-hygiene-title", "label": "Дитяча гігієна — Заголовок", "type": "text" },
        { "key": "svc-children-hygiene-desc", "label": "Дитяча гігієна — Опис", "type": "textarea" },
        { "key": "vid-svc-children-hygiene", "label": "🎬 Відео: Дитяча гігієна", "type": "video" },
        { "key": "children-hygiene", "label": "📋 Прайс-лист: Дитяча гігієна", "type": "price_group" },
        { "key": "svc-children-sealants-visible", "label": "👁 Герметизація фісур — показати/сховати", "type": "toggle" },
        { "key": "svc-children-sealants-title", "label": "Герметизація фісур — Заголовок", "type": "text" },
        { "key": "svc-children-sealants-desc", "label": "Герметизація фісур — Опис", "type": "textarea" },
        { "key": "vid-svc-children-sealants", "label": "🎬 Відео: Герметизація фісур", "type": "video" },
        { "key": "children-sealants", "label": "📋 Прайс-лист: Герметизація фісур", "type": "price_group" },
        { "key": "svc-children-extraction-visible", "label": "👁 Видалення молочного зуба — показати/сховати", "type": "toggle" },
        { "key": "svc-children-extraction-title", "label": "Видалення молочного зуба — Заголовок", "type": "text" },
        { "key": "svc-children-extraction-desc", "label": "Видалення молочного зуба — Опис", "type": "textarea" },
        { "key": "vid-svc-children-extraction", "label": "🎬 Відео: Видалення молочного зуба", "type": "video" },
        { "key": "children-extraction", "label": "📋 Прайс-лист: Видалення молочного зуба", "type": "price_group" },

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
            "key": "filter-composite-veneers",
            "label": "Фільтр: Композитні вініри",
            "type": "text"
        },
        {
            "key": "filter-restorations",
            "label": "Фільтр: Композитні реставрації",
            "type": "text"
        },
        {
            "key": "filter-caries",
            "label": "Фільтр: Лікування карієсу",
            "type": "text"
        },
        {
            "key": "filter-endo",
            "label": "Фільтр: Лікування каналів",
            "type": "text"
        },
        {
            "key": "filter-periodontal",
            "label": "Фільтр: Пародонтологія",
            "type": "text"
        },
        {
            "key": "filter-implants",
            "label": "Фільтр: Імплантація",
            "type": "text"
        },
        {
            "key": "filter-recessions",
            "label": "Фільтр: Закриття рецесій",
            "type": "text"
        },
        {
            "key": "filter-gum-extension",
            "label": "Фільтр: Видовження ясен",
            "type": "text"
        },
        {
            "key": "filter-braces",
            "label": "Фільтр: Брекет-системи",
            "type": "text"
        },
        {
            "key": "filter-aligners",
            "label": "Фільтр: Елайнери",
            "type": "text"
        },
        {
            "key": "filter-whitening",
            "label": "Фільтр: Відбілювання зубів",
            "type": "text"
        },
        { "key": "filter-military", "label": "Фільтр: Лікування військовослужбовців", "type": "text" },
        { "label": "СТОРІНКА ОКРЕМОГО КЕЙСУ", "type": "heading" },
        { "key": "case-plan-title", "label": "Заголовок: План лікування", "type": "text" },
        { "key": "case-result-title", "label": "Заголовок: Результат", "type": "text" },
        { "key": "case-before-label", "label": "Лейбл: ДО", "type": "text" },
        { "key": "case-after-label", "label": "Лейбл: ПІСЛЯ", "type": "text" },
        { "key": "case-cta-title", "label": "CTA: Заголовок (внизу)", "type": "text" },
        { "key": "case-cta-subtitle", "label": "CTA: Підзаголовок (внизу)", "type": "textarea" }
    ],
    "contact": [
        { "key": "contacts-page-title", "label": "SEO Title сторінки", "type": "text" },
        { "key": "contacts-hero-title", "label": "Hero: Заголовок", "type": "text" },
        { "key": "contacts-hero-subtitle", "label": "Hero: Підзаголовок", "type": "textarea" },
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
            "type": "textarea"
        }
    ],
    "footer": [
        { "key": "footer-find-us", "label": "Де нас знайти", "type": "text" },
        { "key": "footer-location", "label": "Місто", "type": "text" },
        { "key": "footer-address-street", "label": "Вулиця та номер", "type": "text" },
        { "key": "footer-phone-1", "label": "Телефон 1", "type": "text" },
        { "key": "footer-phone-2", "label": "Телефон 2", "type": "text" },
        { "key": "footer-map-btn", "label": "Кнопка: Карта", "type": "text" },
        { "key": "footer-tagline", "label": "Слоган (з емодзі)", "type": "text" },
        { "key": "footer-hours-title", "label": "Графік: Заголовок", "type": "text" },
        { "key": "footer-hours-days", "label": "Графік: Години роботи", "type": "textarea" },
        { "key": "footer-copyright", "label": "Копірайт", "type": "text" },
        { "key": "btn-book", "label": "Кнопка: Записатися", "type": "text" }
    ],
    "header": [
        { "key": "logo-text-top", "label": "Логотип (Верхній рядок)", "type": "text" },
        { "key": "logo-text-bottom", "label": "Логотип (Нижній рядок)", "type": "text" },
        { "key": "nav-home", "label": "Меню: Головна", "type": "text" },
        { "key": "nav-services", "label": "Меню: Послуги", "type": "text" },
        { "key": "nav-works", "label": "Меню: Наші роботи", "type": "text" },
        { "key": "nav-about", "label": "Меню: Про нас", "type": "text" },
        { "key": "nav-contacts", "label": "Меню: Контакти", "type": "text" },
        { "key": "header-instagram-url", "label": "Посилання: Instagram", "type": "text" },
        { "key": "header-location-url", "label": "Посилання: Карта (Google Maps)", "type": "text" }
    ],
    "social": [
        { "label": "МЕСЕНДЖЕРИ (CONTACT HUB)", "type": "heading" },
        { "key": "whatsapp-phone", "label": "WhatsApp: Номер (без +)", "type": "text" },
        { "key": "viber-phone", "label": "Viber: Номер (або URI)", "type": "text" },
        { "key": "telegram-username", "label": "Telegram: Username (без @)", "type": "text" },
        { "label": "ФОРМА ЗВОРОТНЬОГО ДЗВ'ІНКА", "type": "heading" },
        { "type": "info", "label": "<b>Як налаштувати сповіщення в Telegram:</b><br><br><b>Крок 1.</b> Відкрий Telegram → знайди <b>@BotFather</b> → напиши <code>/newbot</code> → придумай назву → отримаєш токен вигляду <code>7123456789:AAHxxxxx</code>. Скопіюй його.<br><br><b>Крок 2.</b> Знайди <b>@userinfobot</b> → напиши <code>/start</code> → він надішле твій Chat ID (просто число, наприклад <code>123456789</code>). Скопіюй його.<br><br><b>Крок 3.</b> Вставте обидва значення у поля нижче → натисни «Зберегти зміни».<br><br>Після цього кожна заявка з сайту буде приходити тобі в Telegram." },
        { "key": "telegram-bot-token", "label": "Telegram Bot Token (від @BotFather)", "type": "text" },
        { "key": "telegram-chat-id", "label": "Telegram Chat ID адміністратора", "type": "text" },
        { "label": "GOOGLE ВІДГУКИ", "type": "heading" },
        { "key": "google-rating", "label": "Google: Рейтинг (наприклад: 5.0)", "type": "text" },
        { "key": "google-review-count", "label": "Google: Кількість відгуків (наприклад: (47 відгуків))", "type": "text" }
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
            window.isSuperAdmin = (data.user.email === 'sgabelev@gmail.com');
            document.getElementById('userEmail').textContent = email;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'flex';
            applyRoleRestrictions();
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
    // Зберігаємо і застосовуємо актуальні дані з інпутів перед перевіркою
    connectSupabase();

    const status = document.getElementById('sbStatus');
    if (!sb) {
        status.innerHTML = '<span style="color:var(--danger);">❌ Помилка підключення. Перевірте URL та Anon Key</span>';
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
    'ai-hub': 'AI HUB — Управління клінікою',
    'chat-logs': 'Чат-логи',
    'setup': 'Supabase',
    'lusya-settings': '🌸 Люся — Внутрішній ІІ-Агент',
};

const SUPER_ADMIN_SECTIONS = ['ai-hub', 'chat-logs'];

function applyRoleRestrictions() {
    if (window.isSuperAdmin) return;
    document.querySelectorAll('.nav-item').forEach(el => {
        const section = el.getAttribute('data-section');
        if (SUPER_ADMIN_SECTIONS.includes(section)) {
            el.style.opacity = '0.45';
            el.title = 'Доступно тільки для супер-адміністратора';
            const span = el.querySelector('span');
            if (span && !span.textContent.includes('🔒')) span.textContent += ' 🔒';
        }
    });
}

function switchSection(sectionId, navEl) {
    if (SUPER_ADMIN_SECTIONS.includes(sectionId) && !window.isSuperAdmin) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if (navEl) navEl.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('sectionTitle').textContent = '🔒 Розділ заблоковано';
        const locked = document.getElementById('sec-locked');
        if (locked) { locked.classList.add('active'); return; }
        const div = document.createElement('section');
        div.id = 'sec-locked';
        div.className = 'section active';
        div.innerHTML = '<div style="text-align:center;padding:80px 20px;"><div style="font-size:48px;margin-bottom:16px;">🔒</div><h2 style="font-size:20px;margin-bottom:12px;color:#e0c99a;">Розділ заблоковано</h2><p style="color:#888;font-size:14px;">Цей розділ доступний тільки для супер-адміністратора.</p></div>';
        document.querySelector('.content-area').appendChild(div);
        return;
    }

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
    if (sectionId === 'lusya-settings') loadAISettings();
    if (sectionId === 'ai-hub') loadAIHub();
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
            "home-page-title": "Dental Studio — Стоматологічна клініка в Чернігові",
            "hero-video": "https://storage.googleapis.com/tokar_clinic_site/video/home-cover/web.mp4",
            "interior-video": "assets/dental2.mp4",
            "hero-title": "ІННОВАЦІЇ.\nЕСТЕТИКА.\nКОМФОРТ🤍",
            "hero-subtitle": "Від ідеальної гігієни до імплантів 'під ключ'.",
            "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
            "feat-aesthetic": "Естетична стоматологія",
            "feat-therapy": "Лікування зубів",
            "feat-surgery": "Хірургія",
            "feat-ortho": "Ортодонтія",
            "feat-children": "Дитяча стоматологія",
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
            "footer-hours-title": "ГРАФІК РОБОТИ",
            "footer-hours-days": "Пн — Пт, 09:00 — 19:00\nСб — Нд, 09:00 — 16:00"
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
            "filter-all": "Усі роботи",
            "filter-veneers": "Керамічні вініри",
            "filter-composite-veneers": "Композитні вініри",
            "filter-restorations": "Композитні реставрації",
            "filter-caries": "Лікування карієсу",
            "filter-endo": "Лікування кореневих каналів",
            "filter-periodontal": "Пародонтологічне лікування",
            "filter-implants": "Імплантація",
            "filter-recessions": "Закриття рецесій",
            "filter-gum-extension": "Видовження ясен",
            "filter-braces": "Лікування брекет-системою",
            "filter-aligners": "Лікування елайнерами",
            "filter-whitening": "Відбілювання зубів",
            "filter-military": "Лікування військовослужбовців",
            "case-plan-title": "ПЛАН ЛІКУВАННЯ",
            "case-result-title": "РЕЗУЛЬТАТ",
            "case-before-label": "ДО",
            "case-after-label": "ПІСЛЯ",
            "case-cta-title": "БАЖАЄТЕ ТАКИЙ ЖЕ РЕЗУЛЬТАТ?",
            "case-cta-subtitle": "Запишіться на консультацію в Dental Studio вже сьогодні."
        },
        "services": {
            "feat-aesthetic": "Естетична стоматологія",
            "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
            "feat-therapy": "Лікування зубів",
            "feat-surgery": "Хірургія",
            "feat-ortho": "Ортодонтія",
            "feat-children": "Дитяча стоматологія",
            "svc-consult-title": "Консультація",
            "svc-consult-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу.",
            "svc-consult-therapy-title": "Консультація",
            "svc-consult-therapy-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу.",
            "svc-consult-surgery-title": "Консультація",
            "svc-consult-surgery-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу.",
            "svc-consult-ortho-title": "Консультація",
            "svc-consult-ortho-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу.",
            "svc-consult-children-title": "Консультація",
            "svc-consult-children-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу.",
            "price-consult-general": "Загальна консультація",
            "price-consult-modjaw": "Функціональна діагностика MODJAW",
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
            "feat-children": "Дитяча стоматологія",
            "svc-children-caries-title": "Лікування карієсу у дітей",
            "svc-children-caries-desc": "Лікування карієсу молочних та постійних зубів у дітей з використанням сучасних матеріалів та безболісних технік. Комфортний підхід до маленьких пацієнтів.",
            "svc-children-hygiene-title": "Дитяча гігієна та профілактика",
            "svc-children-hygiene-desc": "Професійне чищення зубів, навчання правильній гігієні, контроль стану ротової порожнини дитини.",
            "svc-children-sealants-title": "Герметизація фісур",
            "svc-children-sealants-desc": "Запечатування природніх заглибин на жувальній поверхні зубів спеціальним герметиком для захисту від карієсу.",
            "svc-children-extraction-title": "Видалення молочного зуба",
            "svc-children-extraction-desc": "Безболісне видалення молочних зубів під місцевою анестезією. М'який підхід до дітей, комфортна атмосфера без стресу.",
            "price-children-consult": "Консультація дитячого стоматолога",
            "price-children-consult-val": "500 ₴",
            "price-children-caries-milk": "Лікування карієсу молочного зуба",
            "price-children-caries-milk-val": "80 €",
            "price-children-caries-perm": "Лікування карієсу постійного зуба у дитини",
            "price-children-caries-perm-val": "100 €",
            "price-children-hygiene": "Дитяча гігієна (до 12 років)",
            "price-children-hygiene-val": "60 €",
            "price-children-sealants": "Герметизація фісур (1 зуб)",
            "price-children-sealants-val": "40 €",
            "price-children-extraction": "Видалення молочного зуба",
            "price-children-extraction-val": "60 €",
        },
        "contact": {
            "contacts-page-title": "Контакти — Dental Studio",
            "contacts-hero-title": "КОНТАКТИ ТА ЗАПИС",
            "contacts-hero-subtitle": "Виберіть онлайн-запис для миттєвого бронювання часу, або зв'яжіться з нами напряму.",
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
            "footer-hours-days": "Пн — Пт, 09:00 — 19:00\nСб — Нд, 09:00 — 16:00"
        },
        "footer": {
            "footer-find-us": "ДЕ НАС ЗНАЙТИ",
            "footer-location": "Чернігів, Україна",
            "footer-address-street": "Вулиця Незалежності, 21",
            "footer-phone-1": "(077) 600 7 800",
            "footer-phone-2": "(073) 600 7 800",
            "footer-map-btn": "ЗНАЙТИ НАС НА КАРТІ",
            "footer-tagline": "ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍",
            "footer-hours-title": "ГРАФІК РОБОТИ",
            "footer-hours-days": "Пн — Пт, 09:00 — 19:00\nСб — Нд, 09:00 — 16:00",
            "footer-copyright": "Copyright © 2026. Dental Studio. Всі права захищені.",
            "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
        },
        "header": {
            "logo-text-top": "DENTAL",
            "logo-text-bottom": "Studio",
            "nav-home": "Головна",
            "nav-services": "Послуги",
            "nav-works": "Наші роботи",
            "nav-about": "Про нас",
            "nav-contacts": "Контакти",
            "header-instagram-url": "https://www.instagram.com/dental_studio_che/",
            "header-location-url": "https://maps.google.com/?q=Chernihiv,+Nezalezhnosti+21"
        },
        "social": {
            "whatsapp-phone": "380776007800",
            "viber-phone": "380776007800",
            "telegram-username": "dentalstudioche"
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

    if (pageSlug === 'services') {
        loadServicePricesUI();
    }
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

// Compress image to max 1400px, JPEG quality 0.82 (~200-400KB)
async function compressImage(file, maxPx = 1400, quality = 0.82) {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxPx || height > maxPx) {
                if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
                else { width = Math.round(width * maxPx / height); height = maxPx; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', quality);
        };
        img.src = url;
    });
}

async function triggerMediaUpload(key, type, event) {
    if (event) event.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 200 MB after bucket update, default 50 MB)
        const MAX_MB = 200;
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        if (file.size > MAX_MB * 1024 * 1024) {
            showToast(`❌ Файл завеликий: ${fileSizeMB} МБ (макс. ${MAX_MB} МБ). Стисніть відео або збільшіть ліміт у Supabase Storage.`);
            return;
        }

        showToast(`📤 Завантажується "${file.name}" (${fileSizeMB} МБ)...`);

        if (sb) {
            // Compress image before upload (videos skip)
            const uploadFile = type === 'image' ? await compressImage(file) : file;
            const safeName = uploadFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const filePath = `pages/${currentPage}/${key}_${Date.now()}_${safeName}`;
            const { data, error } = await sb.storage
                .from('clinic-media')
                .upload(filePath, uploadFile, { upsert: true });

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
                let innerHtml = '';
                if (type === 'image') {
                    innerHtml += `<img src="${publicUrl}" style="max-width:100%;max-height:200px;border-radius:4px;">`;
                } else {
                    innerHtml += `<video src="${publicUrl}" style="max-width:100%;max-height:200px;" controls></video>`;
                }
                innerHtml += `
                    <div class="media-actions" style="display:flex; justify-content:center; gap:10px; margin-top:10px;">
                        <button class="btn btn-primary" onclick="triggerMediaUpload('${key}', '${type}', event)">Змінити</button>
                        <button class="btn btn-danger" onclick="deleteMedia('${key}', '${type}', event)">Видалити</button>
                    </div>
                `;
                box.innerHTML = innerHtml;
            }

            showToast('✅ Файл завантажено');
        } else {
            showToast(`⚠️ Підключіть Supabase для збереження файлів`);
        }
    };
    input.click();
}

window.deleteMedia = async function(key, type, event) {
    if (event) event.stopPropagation();
    if (!confirm('Видалити цей медіафайл?')) return;
    
    showToast(`🗑 Видалення...`);
    
    if (sb) {
        const { error } = await sb.from('site_content').upsert({
            page_slug: currentPage,
            section_key: key,
            content_type: type,
            media_url: '',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'page_slug,section_key' });
        
        if (error) {
            showToast(`❌ Помилка: ${error.message}`);
            return;
        }

        const box = document.getElementById(`media-${key}`);
        if (box) {
            box.innerHTML = `
                <div class="media-upload-hint">${type === 'image' ? '📷' : '🎥'} Немає файлу</div>
                <div class="media-actions" style="margin-top:10px; display:flex; justify-content:center;">
                    <button class="btn btn-primary" onclick="triggerMediaUpload('${key}', '${type}', event)">Завантажити</button>
                </div>
            `;
        }
        showToast('✅ Видалено');
    } else {
        showToast(`⚠️ Підключіть Supabase`);
    }
};

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
            const compressed = await compressImage(file);
            const filePath = `doctors/doc_${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error } = await sb.storage.from('clinic-media').upload(filePath, compressed);
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
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; color:${c.show_on_homepage ? '#B8924A' : '#888'};" title="Показувати на головній">
                    <input type="checkbox" ${c.show_on_homepage ? 'checked' : ''} onchange="toggleHomepage(${i}, this.checked)" style="accent-color:#B8924A; width:16px; height:16px;">
                    ⭐
                </label>
            </div>
        </div>`;
    });

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
                            <option value="military" ${c.category === 'military' ? 'selected' : ''}>Лікування військовослужбовців</option>
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

            <div class="stages-manager" style="margin-top: 30px;">
                <div class="stages-header">
                    <h3>РЕЗУЛЬТАТ (До / Після)</h3>
                </div>
                <div class="stages-list-admin">
                    <div class="stage-item-admin">
                        <div class="stage-num">ДО</div>
                        <div class="stage-img-admin" onclick="uploadCaseMedia(${editingCaseIndex}, 'before_image_url')">
                            <img src="${c.before_image_url || 'https://via.placeholder.com/80?text=Before'}">
                        </div>
                        <div class="stage-inputs">
                            <input type="text" value="Фото ДО" disabled style="opacity:0.5;">
                            <textarea rows="3" placeholder="Опишіть початковий стан пацієнта..." onchange="cases[${editingCaseIndex}].before_text=this.value">${escapeHtml(c.before_text || '')}</textarea>
                        </div>
                    </div>
                    <div class="stage-item-admin">
                        <div class="stage-num">ПІСЛЯ</div>
                        <div class="stage-img-admin" onclick="uploadCaseMedia(${editingCaseIndex}, 'after_image_url')">
                            <img src="${c.after_image_url || 'https://via.placeholder.com/80?text=After'}">
                        </div>
                        <div class="stage-inputs">
                            <input type="text" value="Фото ПІСЛЯ" disabled style="opacity:0.5;">
                            <textarea rows="3" placeholder="Опишіть отриманий результат..." onchange="cases[${editingCaseIndex}].after_text=this.value">${escapeHtml(c.after_text || '')}</textarea>
                        </div>
                    </div>
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
            const compressed = await compressImage(file);
            const filePath = `cases/stages/s_${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error } = await sb.storage.from('clinic-media').upload(filePath, compressed);
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
            before_text: c.before_text || '',
            after_text: c.after_text || '',
            stages: c.stages,
            is_published: true,
            show_on_homepage: c.show_on_homepage || false,
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

async function toggleHomepage(index, checked) {
    cases[index].show_on_homepage = checked;
    const c = cases[index];
    if (sb && c.id && !String(c.id).startsWith('new_')) {
        try {
            const { error } = await sb.from('treatment_cases').update({ show_on_homepage: checked }).eq('id', c.id);
            if (error) throw error;
            showToast(checked ? '⭐ Додано на головну' : '❌ Прибрано з головної');
        } catch (e) {
            showToast('❌ Помилка: ' + e.message);
        }
    }
    renderCases();
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
            const compressed = await compressImage(file);
            const filePath = `cases/c_${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const { error } = await sb.storage.from('clinic-media').upload(filePath, compressed);
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
    const providerEl = document.getElementById('aiProvider');
    if (!providerEl) return;
    
    const provider = providerEl.value;
    const modelSelect = document.getElementById('aiModel');
    const customUrlGroup = document.getElementById('customUrlGroup');

    if (modelSelect) {
        const options = MODEL_OPTIONS[provider] || [];
        modelSelect.innerHTML = '';
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            modelSelect.appendChild(o);
        });
    }

    if (customUrlGroup) {
        customUrlGroup.style.display = provider === 'custom' ? 'block' : 'none';
    }

    const keyInput = document.getElementById('aiApiKey');
    if (keyInput) {
        const placeholders = {
            openai: 'sk-...', anthropic: 'sk-ant-...', google: 'AIza...',
            deepseek: 'sk-...', openrouter: 'sk-or-...', custom: 'your-api-key',
        };
        keyInput.placeholder = placeholders[provider] || 'API Key';
    }
}

function toggleKeyVisibility() {
    const input = document.getElementById('aiApiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function loadChatbotToggle() {
    const btn = document.getElementById('chatbotToggleBtn');
    if (!btn || !sb) return;
    try {
        const { data } = await sb.from('site_content')
            .select('value_uk')
            .eq('page_slug', 'social')
            .eq('section_key', 'chatbot-enabled')
            .single();
        const enabled = !data || data.value_uk !== 'false';
        btn.textContent = enabled ? '👁 Чат-бот увімкнено' : '🚫 Чат-бот вимкнено';
        btn.className = 'btn ' + (enabled ? 'btn-success' : 'btn-danger');
        btn.dataset.enabled = enabled ? 'true' : 'false';
    } catch(e) {
        btn.textContent = '👁 Чат-бот увімкнено';
        btn.dataset.enabled = 'true';
    }
}

window.toggleChatbotVisibility = async function(btn) {
    const nowEnabled = btn.dataset.enabled !== 'false';
    const newVal = nowEnabled ? 'false' : 'true';
    btn.disabled = true;
    btn.textContent = '⏳ Збереження...';
    try {
        const { data: existing } = await sb.from('site_content')
            .select('id').eq('page_slug', 'social').eq('section_key', 'chatbot-enabled').single();
        if (existing) {
            await sb.from('site_content').update({ value_uk: newVal }).eq('id', existing.id);
        } else {
            await sb.from('site_content').insert({ page_slug: 'social', section_key: 'chatbot-enabled', content_type: 'text', value_uk: newVal });
        }
        btn.dataset.enabled = newVal;
        btn.textContent = newVal === 'true' ? '👁 Чат-бот увімкнено' : '🚫 Чат-бот вимкнено';
        btn.className = 'btn ' + (newVal === 'true' ? 'btn-success' : 'btn-danger');
    } catch(e) {
        btn.textContent = '❌ Помилка';
    }
    btn.disabled = false;
};

async function loadAISettings() {
    loadChatbotToggle();
    // Try Supabase first
    if (sb) {
        try {
            const { data, error } = await sb.from('ai_settings').select('*').limit(1).single();
            if (data && !error) {
                const provEl = document.getElementById('aiProvider');
                if (provEl) {
                    provEl.value = data.provider || 'openai';
                    onProviderChange();
                }
                const keyEl = document.getElementById('aiApiKey');
                if (keyEl) keyEl.value = data.api_key || '';
                const modEl = document.getElementById('aiModel');
                if (modEl) modEl.value = data.model || '';
                const promptEl = document.getElementById('aiSystemPrompt');
                if (promptEl) promptEl.value = data.system_prompt || '';
                const manualEl = document.getElementById('aiKnowledgeManual');
                if (manualEl) manualEl.value = data.knowledge_base_manual || '';
                const customEl = document.getElementById('aiCustomUrl');
                if (customEl) customEl.value = data.custom_url || '';
                const tgBotEl = document.getElementById('tgBotToken');
                if (tgBotEl) tgBotEl.value = data.tg_bot_token || '';
                const tgChatEl = document.getElementById('tgChatId');
                if (tgChatEl) tgChatEl.value = data.tg_chat_id || '';
                const tgPatientEl = document.getElementById('tgPatientBotToken');
                if (tgPatientEl) tgPatientEl.value = data.tg_patient_bot_token || '';
                const viberEl = document.getElementById('viberBotToken');
                if (viberEl) viberEl.value = data.viber_bot_token || '';
                const waBotEl = document.getElementById('waBotToken');
                if (waBotEl) waBotEl.value = data.wa_bot_token || '';
                const waEl = document.getElementById('waLink');
                if (waEl) waEl.value = data.wa_link || '';
                
                // Cliniccards & URIs
                const ccTokenEl = document.getElementById('ccApiToken');
                if (ccTokenEl) ccTokenEl.value = data.cc_api_token || '';
                const tgUserEl = document.getElementById('tgBotUsername');
                if (tgUserEl) tgUserEl.value = data.tg_bot_username || '';
                const viberUriEl = document.getElementById('viberBotUri');
                if (viberUriEl) viberUriEl.value = data.viber_bot_uri || '';
                const autoBookEl = document.getElementById('aiAutonomousBooking');
                if (autoBookEl) autoBookEl.checked = data.autonomous_booking || false;

                // Populate Lusya fields
                const lusyaBotEl = document.getElementById('lusyaBotToken');
                if (lusyaBotEl) lusyaBotEl.value = data.lusya_bot_token || '';
                const lusyaOrEl = document.getElementById('lusyaOpenrouterKey');
                if (lusyaOrEl) lusyaOrEl.value = data.lusya_openrouter_key || '';
                const lusyaSimpleEl = document.getElementById('lusyaSimpleModel');
                if (lusyaSimpleEl) lusyaSimpleEl.value = data.lusya_simple_model || '';
                const lusyaComplexEl = document.getElementById('lusyaComplexModel');
                if (lusyaComplexEl) lusyaComplexEl.value = data.lusya_complex_model || '';
                const lusyaKwEl = document.getElementById('lusyaSimpleKeywords');
                if (lusyaKwEl) lusyaKwEl.value = data.lusya_simple_keywords || '';
                const lusyaPromptEl = document.getElementById('lusyaSystemPrompt');
                if (lusyaPromptEl) lusyaPromptEl.value = data.lusya_system_prompt || '';
                const bookingRulesEl = document.getElementById('bookingRules');
                if (bookingRulesEl) bookingRulesEl.value = data.booking_rules ? JSON.stringify(data.booking_rules, null, 2) : '';

                return;
            }
        } catch(e) { console.warn('Supabase AI load error:', e); }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('ds_ai_settings');
    if (saved) {
        try {
            const s = JSON.parse(saved);
            const provEl = document.getElementById('aiProvider');
            if (provEl) {
                provEl.value = s.provider || 'openai';
                onProviderChange();
            }
            const keyEl = document.getElementById('aiApiKey');
            if (keyEl) keyEl.value = s.apiKey || '';
            const modEl = document.getElementById('aiModel');
            if (modEl) modEl.value = s.model || '';
            const promptEl = document.getElementById('aiSystemPrompt');
            if (promptEl) promptEl.value = s.systemPrompt || '';
            const manualEl = document.getElementById('aiKnowledgeManual');
            if (manualEl) manualEl.value = s.knowledgeManual || '';
            const customEl = document.getElementById('aiCustomUrl');
            if (customEl) customEl.value = s.customUrl || '';
            const tgBotEl = document.getElementById('tgBotToken');
            if (tgBotEl) tgBotEl.value = s.tgBotToken || '';
            const tgChatEl = document.getElementById('tgChatId');
            if (tgChatEl) tgChatEl.value = s.tgChatId || '';
            const tgPatientEl = document.getElementById('tgPatientBotToken');
            if (tgPatientEl) tgPatientEl.value = s.tgPatientBotToken || '';
            const viberEl = document.getElementById('viberBotToken');
            if (viberEl) viberEl.value = s.viberBotToken || '';
            const waBotEl = document.getElementById('waBotToken');
            if (waBotEl) waBotEl.value = s.waBotToken || '';
            const waEl = document.getElementById('waLink');
            if (waEl) waEl.value = s.waLink || '';
        } catch(e) {}
    }
}
async function saveAISettings() {
    const settings = {
        provider: document.getElementById('aiProvider').value,
        apiKey: document.getElementById('aiApiKey').value,
        model: document.getElementById('aiModel').value,
        systemPrompt: document.getElementById('aiSystemPrompt').value,
        knowledgeManual: document.getElementById('aiKnowledgeManual').value,
        customUrl: document.getElementById('aiCustomUrl').value,
        tgBotToken: document.getElementById('tgBotToken').value,
        tgChatId: document.getElementById('tgChatId').value,
        viberBotToken: document.getElementById('viberBotToken').value,
        tgPatientBotToken: document.getElementById('tgPatientBotToken').value,
        waBotToken: document.getElementById('waBotToken').value,
        waLink: document.getElementById('waLink').value,
        ccApiToken: document.getElementById('ccApiToken').value,
        tgBotUsername: document.getElementById('tgBotUsername').value,
        viberBotUri: document.getElementById('viberBotUri').value,
        autonomousBooking: document.getElementById('aiAutonomousBooking').checked
    };

    localStorage.setItem('ds_ai_settings', JSON.stringify(settings));

    if (sb) {
        try {
            const { data: existing, error: selErr } = await sb.from('ai_settings').select('id').limit(1).single();
            if (selErr && selErr.code !== 'PGRST116' && selErr.code !== '42P01') throw selErr;

            const row = {
                provider: settings.provider,
                api_key: settings.apiKey,
                model: settings.model,
                system_prompt: settings.systemPrompt,
                knowledge_base_manual: settings.knowledgeManual,
                custom_url: settings.customUrl,
                tg_bot_token: settings.tgBotToken,
                tg_chat_id: settings.tgChatId,
                viber_bot_token: settings.viberBotToken,
                tg_patient_bot_token: settings.tgPatientBotToken,
                wa_bot_token: settings.waBotToken,
                wa_link: settings.waLink,
                cc_api_token: settings.ccApiToken,
                tg_bot_username: settings.tgBotUsername,
                viber_bot_uri: settings.viberBotUri,
                autonomous_booking: settings.autonomousBooking,
                updated_at: new Date().toISOString(),
            };
            
            if (existing) {
                await sb.from('ai_settings').update(row).eq('id', existing.id);
            } else {
                await sb.from('ai_settings').insert(row);
            }
            showToast('✅ Налаштування ІІ збережено в БД');
        } catch(e) {
            console.error(e);
            showToast('❌ Помилка БД (збережено локально)');
        }
    } else {
        showToast('✅ Збережено локально');
    }
}

async function saveLusyaSettings() {
    const statusEl = document.getElementById('lusya-save-status');
    statusEl.style.display = 'block';
    statusEl.textContent = '⏳ Зберігаємо...';
    statusEl.style.color = '#666';

    try {
        let bookingRules = null;
        const bookingRulesRaw = document.getElementById('bookingRules').value.trim();
        if (bookingRulesRaw) {
            try { bookingRules = JSON.parse(bookingRulesRaw); }
            catch(e) {
                statusEl.textContent = '❌ Помилка: некоректний JSON в "Правила запису"';
                statusEl.style.color = 'red';
                return;
            }
        }

        const updates = {
            lusya_bot_token: document.getElementById('lusyaBotToken').value.trim() || null,
            lusya_openrouter_key: document.getElementById('lusyaOpenrouterKey').value.trim() || null,
            lusya_simple_model: document.getElementById('lusyaSimpleModel').value.trim() || 'google/gemini-2.0-flash-001',
            lusya_complex_model: document.getElementById('lusyaComplexModel').value.trim() || 'anthropic/claude-sonnet-4-6',
            lusya_simple_keywords: document.getElementById('lusyaSimpleKeywords').value.trim() || null,
            lusya_system_prompt: document.getElementById('lusyaSystemPrompt').value.trim() || null,
            booking_rules: bookingRules
        };

        if (sb) {
            const { data: existing, error: selErr } = await sb.from('ai_settings').select('id').limit(1).single();
            if (selErr && selErr.code !== 'PGRST116' && selErr.code !== '42P01') throw selErr;

            if (existing) {
                const { error } = await sb.from('ai_settings').update(updates).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await sb.from('ai_settings').insert(updates);
                if (error) throw error;
            }
        } else {
            throw new Error('Supabase не підключено');
        }

        statusEl.textContent = '✅ Налаштування Люси збережено!';
        statusEl.style.color = 'green';
        setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    } catch(e) {
        statusEl.textContent = '❌ Помилка: ' + e.message;
        statusEl.style.color = 'red';
    }
}

async function testAIApiKey() {
    const provider = document.getElementById('aiProvider').value;
    const apiKey = document.getElementById('aiApiKey').value.trim();
    const statusEl = document.getElementById('aiTestStatus');
    const btn = document.getElementById('btnTestAI');
    
    if (!apiKey) {
        statusEl.innerHTML = '<span style="color:var(--danger);">❌ Введіть ключ.</span>';
        return;
    }

    saveAISettings();
    btn.disabled = true;
    btn.textContent = '⏳...';

    try {
        let success = false;
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
            success = res.ok;
        } else if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'h' }] })
            });
            success = res.ok || res.status === 400;
        } else if (provider === 'google') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            success = res.ok;
        } else if (provider === 'deepseek') {
            const res = await fetch('https://api.deepseek.com/v1/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
            success = res.ok;
        } else if (provider === 'openrouter') {
            const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
            success = res.ok;
        }

        statusEl.innerHTML = success ? '<span style="color:var(--success);">✅ Ключ дійсний!</span>' : '<span style="color:var(--danger);">❌ Помилка ключа.</span>';
    } catch(err) {
        statusEl.innerHTML = `<span style="color:var(--danger);">❌ Помилка мережі.</span>`;
    }
    btn.disabled = false;
    btn.textContent = '🧪 Перевірити';
}

async function handleKBUpload(event) {
    const files = event.target.files;
    for (const file of Array.from(files)) {
        if (sb) {
            const filePath = `knowledge-base/${Date.now()}_${file.name}`;
            await sb.storage.from('clinic-media').upload(filePath, file);
        }
    }
    showToast(`📎 Файли додано.`);
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

        // Count today's chat sessions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count } = await sb.from('chat_sessions')
            .select('id', { count: 'exact', head: true })
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
    
    if (field.type === 'info') {
        return `<div class="editor-info-box">${field.label}</div>`;
    }

    let out = `<div class="editor-field">`;
    out += `<div class="editor-field-label">${field.label}</div>`;

    if (field.type === 'text') {
        out += `<input type="text" data-key="${field.key}" placeholder="${field.label}" value="${escapeAttr(val)}">`;
    } else if (field.type === 'textarea') {
        out += `<textarea data-key="${field.key}" rows="3" placeholder="${field.label}">${escapeHtml(val)}</textarea>`;
    } else if (field.type === 'image') {
        const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
        out += `<div class="media-upload-box" id="media-${field.key}" style="cursor:default;">`;
        if (val) {
            out += `<img src="${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">`;
            out += `<div class="media-actions" style="display:flex; justify-content:center; gap:10px; margin-top:10px;">
                        <button class="btn btn-primary" onclick="triggerMediaUpload('${field.key}', 'image', event)">Змінити</button>
                        <button class="btn btn-danger" onclick="deleteMedia('${field.key}', 'image', event)">Видалити</button>
                    </div>`;
        } else {
            out += `<div class="media-upload-hint">📷 Немає файлу</div>`;
            out += `<div class="media-actions" style="margin-top:10px; display:flex; justify-content:center;">
                        <button class="btn btn-primary" onclick="triggerMediaUpload('${field.key}', 'image', event)">Завантажити</button>
                    </div>`;
        }
        out += `</div>`;
    } else if (field.type === 'video') {
        const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
        out += `<div class="media-upload-box" id="media-${field.key}" style="cursor:default;">`;
        if (val) {
            out += `<video src="${videoSrc}" style="max-width:100%;max-height:200px;" controls></video>`;
            out += `<div class="media-actions" style="display:flex; justify-content:center; gap:10px; margin-top:10px;">
                        <button class="btn btn-primary" onclick="triggerMediaUpload('${field.key}', 'video', event)">Змінити</button>
                        <button class="btn btn-danger" onclick="deleteMedia('${field.key}', 'video', event)">Видалити</button>
                    </div>`;
        } else {
            out += `<div class="media-upload-hint">🎥 Немає файлу</div>`;
            out += `<div class="media-actions" style="margin-top:10px; display:flex; justify-content:center;">
                        <button class="btn btn-primary" onclick="triggerMediaUpload('${field.key}', 'video', event)">Завантажити</button>
                    </div>`;
        }
        out += `</div>`;
    } else if (field.type === 'toggle') {
        const isVisible = val !== 'false';
        out += `<input type="hidden" data-key="${field.key}" value="${isVisible ? 'true' : 'false'}">`;
        out += `<button type="button" class="btn ${isVisible ? 'btn-success' : 'btn-danger'}" style="width:100%;" onclick="toggleSectionVisibility(this)">${isVisible ? '👁 Розділ показано' : '🚫 Розділ прихований'}</button>`;
    } else if (field.type === 'price_group') {
        out += `<div class="price-group-container" id="pg-container-${field.key}" style="border:1px solid #333; padding:15px; border-radius:8px; margin-bottom:15px;">
                    <div id="pg-list-${field.key}">⏳ Завантаження прайс-листа...</div>
                    <button class="btn btn-primary" style="margin-top:10px; width:100%;" onclick="addPriceItem('${field.key}')">➕ Додати позицію</button>
                </div>`;
    }

    out += `</div>`;
    return out;
}

window.toggleSectionVisibility = function(btn) {
    const hidden = btn.previousElementSibling;
    const isCurrentlyVisible = hidden.value === 'true';
    if (isCurrentlyVisible) {
        hidden.value = 'false';
        btn.textContent = '🚫 Розділ прихований';
        btn.className = 'btn btn-danger';
    } else {
        hidden.value = 'true';
        btn.textContent = '👁 Розділ показано';
        btn.className = 'btn btn-success';
    }
};

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

// ============================================================
// CHAT LOGS
// ============================================================

// ============================================================
// CHAT LOGS & CRM
// ============================================================

let currentChatStatus = 'active';
let allSessions = [];

async function loadChatLogs() {
    const area = document.getElementById('chatLogsArea');
    if (!sb) {
        area.innerHTML = '<p class="editor-placeholder">Підключіть Supabase для перегляду чат-логів</p>';
        return;
    }

    try {
        console.log('CRM: Loading sessions with status:', currentChatStatus);
        
        // Try filtering by status, if fails (missing col), fallback to all
        const { data: sessions, error } = await sb.from('chat_sessions')
            .select('*')
            .or(`status.eq.${currentChatStatus},status.is.null`) 
            .order('last_message_at', { ascending: false });
        
        if (error) {
            console.warn('CRM: Specific status query failed, falling back to all sessions.', error);
            const { data: all, error: allErr } = await sb.from('chat_sessions').select('*').order('created_at', { ascending: false });
            if (allErr) throw allErr;
            allSessions = all || [];
        } else {
            console.log(`CRM: Found ${sessions?.length || 0} sessions`);
            allSessions = sessions || [];
        }
        renderChatList(allSessions);
    } catch(e) {
        console.error('CRM: Fatal load error:', e);
        try {
            const { data: all } = await sb.from('chat_sessions').select('*').order('created_at', { ascending: false });
            allSessions = all || [];
            renderChatList(allSessions);
        } catch(innerE) {
            area.innerHTML = `<p class="editor-placeholder">Помилка: ${e.message}</p>`;
        }
    }
}

function renderChatList(sessions) {
    const area = document.getElementById('chatLogsArea');
    if (!sessions || sessions.length === 0) {
        area.innerHTML = `<p class="editor-placeholder">Чат-логи (${currentChatStatus === 'active' ? 'активні' : 'архів'}) відсутні</p>`;
        return;
    }

    let html = '';
    sessions.forEach(session => {
        let icon = '💬';
        if (session.contact_type === 'email') icon = '✉️';
        else if (session.contact_type === 'phone') icon = '📞';
        else if (session.contact_type === 'telegram') icon = '🔹';
        else if (session.contact_type === 'viber') icon = '🟣';

        const date = new Date(session.last_message_at || session.created_at).toLocaleString('uk-UA');
        const displayName = (session.client_name || session.client_surname) 
            ? `${session.client_name || ''} ${session.client_surname || ''}`.trim()
            : session.client_contact;

        html += `
            <div class="chat-log-item" id="session-${session.id}">
                <div class="chat-log-header">
                    <div class="chat-log-user-info">
                        <span class="chat-log-name">${icon} ${escapeHtml(displayName)}</span>
                        ${(session.client_name || session.client_surname) ? `<span class="chat-log-contact">${escapeHtml(session.client_contact)}</span>` : ''}
                    </div>
                    <div class="chat-log-actions">
                        <button class="chat-action-btn" title="Редагувати" onclick="openClientModal('${session.id}', '${escapeAttr(session.client_name || '')}', '${escapeAttr(session.client_surname || '')}')">✏️</button>
                        ${session.status === 'active' 
                            ? `<button class="chat-action-btn" title="В архів" onclick="archiveChatSession('${session.id}')">📦</button>`
                            : `<button class="chat-action-btn" title="Відновити" onclick="restoreChatSession('${session.id}')">🔄</button>`
                        }
                        <button class="chat-action-btn danger" title="Видалити" onclick="deleteChatSession('${session.id}')">🗑️</button>
                    </div>
                    <span style="font-size:12px; color:#666;">${date}</span>
                </div>
                <div class="chat-log-messages" id="msgs-${session.id}" style="display:none;"></div>
                <div class="chat-expand-trigger" onclick="toggleChatMessages('${session.id}')" style="text-align:center; padding:5px; cursor:pointer; color:#555; font-size:12px;">Показати повідомлення ▼</div>
            </div>`;
    });
    area.innerHTML = html;
}

async function toggleChatMessages(sessionId) {
    const msgArea = document.getElementById(`msgs-${sessionId}`);
    const trigger = msgArea.nextElementSibling;
    
    if (msgArea.style.display === 'none') {
        if (msgArea.innerHTML === '') {
            msgArea.innerHTML = '<div style="padding:10px; text-align:center;">⏳ Завантаження...</div>';
            const { data: messages } = await sb.from('chat_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });
            
            if (messages) {
                msgArea.innerHTML = messages.map(m => `
                    <div class="chat-log-msg ${m.role}">${escapeHtml(m.content)}</div>
                `).join('');
            } else {
                msgArea.innerHTML = '<div style="padding:10px; color:#666;">Повідомлень немає</div>';
            }
        }
        msgArea.style.display = 'block';
        trigger.textContent = 'Приховати повідомлення ▲';
    } else {
        msgArea.style.display = 'none';
        trigger.textContent = 'Показати повідомлення ▼';
    }
}

function filterChatLogs() {
    const query = document.getElementById('chatSearch').value.toLowerCase();
    const platform = document.getElementById('chatPlatform').value;
    
    const filtered = allSessions.filter(s => {
        const name = `${s.client_name || ''} ${s.client_surname || ''}`.toLowerCase();
        const contact = (s.client_contact || '').toLowerCase();
        const matchesQuery = name.includes(query) || contact.includes(query);
        const matchesPlatform = (platform === 'all') || (s.contact_type === platform);
        return matchesQuery && matchesPlatform;
    });
    renderChatList(filtered);
}

function switchChatStatus(status, btn) {
    currentChatStatus = status;
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadChatLogs();
}

// CRM Actions
function openClientModal(id, name, surname) {
    document.getElementById('editClientId').value = id;
    document.getElementById('editClientName').value = name;
    document.getElementById('editClientSurname').value = surname;
    document.getElementById('editClientModal').style.display = 'flex';
}

function closeClientModal() {
    document.getElementById('editClientModal').style.display = 'none';
}

async function saveClientInfo() {
    const id = document.getElementById('editClientId').value;
    const name = document.getElementById('editClientName').value;
    const surname = document.getElementById('editClientSurname').value;

    try {
        const { error } = await sb.from('chat_sessions')
            .update({ client_name: name, client_surname: surname })
            .eq('id', id);
        
        if (error) throw error;
        showToast('✅ Дані клієнта оновлено');
        closeClientModal();
        loadChatLogs();
    } catch(e) {
        showToast('❌ Помилка оновлення');
    }
}

async function archiveChatSession(id) {
    if (!confirm('Перемістити цей чат в архів?')) return;
    await sb.from('chat_sessions').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', id);
    showToast('📦 Чат архівовано');
    loadChatLogs();
}

async function restoreChatSession(id) {
    await sb.from('chat_sessions').update({ status: 'active', archived_at: null }).eq('id', id);
    showToast('🔄 Чат відновлено');
    loadChatLogs();
}

async function deleteChatSession(id) {
    if (!confirm('Ви впевнені, що хочете видалити цей чат назавжди?')) return;
    const { error } = await sb.from('chat_sessions').delete().eq('id', id);
    if (!error) {
        showToast('🗑️ Чат видалено');
        loadChatLogs();
    }
}

// ============================================================
// AI HUB LOGIC
// ============================================================

let aiHubTaskInterval = null;

async function loadAIHub() {
    console.log('AI HUB: Loading status and tasks...');
    updateSyncStatusUI();
    loadAIHubTasks();
    
    // Start polling for new tasks if not already running
    if (!aiHubTaskInterval) {
        aiHubTaskInterval = setInterval(loadAIHubTasks, 10000); // Check every 10s
    }
}

async function loadAIHubTasks() {
    if (!sb) return;
    try {
        const { data: tasks, error } = await sb.from('admin_tasks')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        renderAIHubTasks(tasks);
    } catch (e) {
        console.error('AI HUB: Task load error', e);
    }
}

function renderAIHubTasks(tasks) {
    const area = document.getElementById('aiHubTasksArea');
    if (!tasks || tasks.length === 0) {
        area.innerHTML = '<p class="editor-placeholder" style="font-size:12px;">Нових завдань немає</p>';
        return;
    }

    area.innerHTML = tasks.map(task => `
        <div class="glass ${task.status === 'pending' ? 'pulse-gold-border' : ''}" style="padding: 12px; border-radius: var(--radius-sm); border-left: 3px solid ${task.status === 'pending' ? 'var(--accent)' : 'var(--success)'}; font-size: 13px; margin-bottom: 10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="font-weight:600;">${escapeHtml(task.task_type || 'Запит')}</span>
                <span style="font-size:10px; color:var(--text-muted);">${new Date(task.created_at).toLocaleTimeString()}</span>
            </div>
            <div style="color: var(--text); margin-bottom: 8px;">${escapeHtml(task.description)}</div>
            <div id="task-actions-${task.id}" style="display:flex; gap:5px;">
                ${task.status === 'pending' ? `
                    <button class="btn-primary" style="font-size:10px; padding:4px 10px;" onclick="handleTask('${task.id}', 'approve')">Схвалити</button>
                    <button class="btn-outline" style="font-size:10px; padding:4px 10px;" onclick="handleTask('${task.id}', 'reject')">Відхилити</button>
                ` : `<span style="color:var(--success); font-size:10px;">✅ Виконано</span>`}
            </div>
        </div>
    `).join('');
}

async function handleTask(taskId, action) {
    if (!confirm(`Бажаєте ${action === 'approve' ? 'схвалити' : 'відхилити'} це завдання?`)) return;
    
    showToast('⏳ Обробка...');
    const btnBox = document.getElementById(`task-actions-${taskId}`);
    if (btnBox) btnBox.innerHTML = '<span style="font-size:10px;">⏳ Обробка...</span>';

    try {
        const serverUrl = localStorage.getItem('ds_bot_server_url') || window.location.origin.replace('admin', '');
        const response = await fetch(`${serverUrl}/api/admin/task-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, action })
        });
        
        const res = await response.json();
        if (res.success) {
            showToast('✅ Виконано та пацієнта сповіщено');
            loadAIHubTasks();
        } else {
            throw new Error(res.error || 'Помилка сервера');
        }
    } catch (e) {
        console.error(e);
        showToast('❌ Помилка: ' + e.message);
        loadAIHubTasks();
    }
}

function updateSyncStatusUI() {
    const box = document.getElementById('syncStatusBox');
    const ccToken = document.getElementById('ccApiToken')?.value;
    
    if (ccToken) {
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                <span>Статус:</span>
                <span style="color: var(--success);">Підключено до CRM</span>
            </div>
            <div style="font-size:10px; color:var(--text-muted); margin-bottom:10px;">Остання синхронізація: Щойно</div>
            <button class="btn-outline" style="width:100%; font-size:11px; padding:8px;" onclick="syncNow()">Синхронізувати зараз</button>
        `;
    }
}

async function handleAIHubEnter(e) {
    if (e.key === 'Enter') sendToAIHub();
}

async function sendToAIHub() {
    const input = document.getElementById('aiHubInput');
    const msg = input.value.trim();
    if (!msg) return;

    const history = document.getElementById('aiHubChatHistory');
    
    // Add user message to UI
    history.innerHTML += `
        <div class="ai-msg user-msg" style="align-self: flex-end; background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent); padding: 10px 15px; border-radius: 15px 15px 0 15px; max-width: 80%; font-size: 13px;">
            ${escapeHtml(msg)}
        </div>
    `;
    input.value = '';
    history.scrollTop = history.scrollHeight;

    // Simulate AI thinking
    setTimeout(() => {
        history.innerHTML += `
            <div class="ai-msg bot-msg" style="align-self: flex-start; background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 10px 15px; border-radius: 15px 15px 15px 0; max-width: 80%; font-size: 13px;">
                Отримав завдання: "<i>${escapeHtml(msg)}</i>". <br><br> Зараз я проаналізую базу підключеної системи Cliniccards та підготую звіт.
            </div>
        `;
        history.scrollTop = history.scrollHeight;
    }, 1000);
}

async function syncNow() {
    const ccToken = document.getElementById('ccApiToken')?.value;

    if (!ccToken) {
        showToast('❌ Спочатку введіть Cliniccards API Token');
        return;
    }

    showToast('⏳ Початок синхронізації з Cliniccards...');
    const serverUrl = localStorage.getItem('ds_bot_server_url') || window.location.origin.replace('/admin', '');

    try {
        // Fetch Patients via server proxy (token-only auth, no clinic_id needed)
        const response = await fetch(`${serverUrl}/api/proxy/cliniccards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: 'https://cliniccards.com/api/patients',
                token: ccToken
            })
        });

        const res = await response.json();
        if (res.result === 'success' && res.data) {
            const patients = res.data;
            showToast(`📥 Отримано ${patients.length} пацієнтів. Оновлюємо базу...`);

            for (const p of patients) {
                const row = {
                    cc_id: String(p.patient_id),
                    full_name: [p.lastname, p.firstname].filter(Boolean).join(' '),
                    phone: p.phone || p.phone2 || '',
                    email: p.email || '',
                    dob: p.birthday || null,
                    note: p.note || p.important_note || '',
                    last_visit_at: p.last_visit_date ? new Date(p.last_visit_date).toISOString() : null,
                    last_sync_at: new Date().toISOString()
                };
                // Only sync gender if CRM has it — otherwise keep the value we set manually
                if (p.gender) row.gender = p.gender;
                await sb.from('cc_patients').upsert(row, { onConflict: 'cc_id' });
            }

            showToast('✅ База синхронізована успішно');
            updateSyncStatusUI();
        } else {
            throw new Error(res.error || 'Невірний формат відповіді');
        }
    } catch (e) {
        console.error('Sync Error:', e);
        showToast('❌ Помилка синхронізації: ' + e.message);
    }
}


// ============================================================
// REVIEWS & TRUST COUNTERS — Admin CRUD
// ============================================================

// --- Section titles ---
if (typeof SECTION_TITLES !== 'undefined') {
    SECTION_TITLES['reviews']  = 'Відгуки пацієнтів';
    SECTION_TITLES['counters'] = 'Лічильники довіри';
}

// Patch switchSection to load data on demand
(function() {
    const _orig = typeof switchSection === 'function' ? switchSection : null;
    window.switchSection = function(name, el) {
        if (_orig) _orig(name, el);
        if (name === 'reviews')  loadReviews();
        if (name === 'counters') loadCounters();
    };
})();

// ============================================================
// REVIEWS
// ============================================================

let reviewsList = [];
let editingReviewId = null;
let reviewAvatarDataUrl = null;

async function loadReviews() {
    const area = document.getElementById('reviewsArea');
    if (!area) return;
    if (!sb) { area.innerHTML = '<p style="color:#c00">Supabase не підключено</p>'; return; }
    area.innerHTML = '<p class="editor-placeholder">Завантаження...</p>';
    const { data, error } = await sb.from('reviews').select('*').order('sort_order');
    if (error) { area.innerHTML = '<p style="color:#c00">Помилка: ' + error.message + '</p>'; return; }
    reviewsList = data || [];
    renderReviews();
}

function renderReviews() {
    const area = document.getElementById('reviewsArea');
    if (!area) return;
    if (!reviewsList.length) {
        area.innerHTML = '<p class="editor-placeholder">Відгуків ще немає. Додайте перший!</p>';
        return;
    }
    area.innerHTML = reviewsList.map(r => `
        <div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #f0ebe2;">
            <div style="width:48px;height:48px;border-radius:50%;background:#e8ddd0;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#b8924a;">
                ${r.avatar_url ? '<img src="' + r.avatar_url + '" style="width:100%;height:100%;object-fit:cover;">' : (r.author_initial || r.author_name.charAt(0))}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;">${r.author_name}</div>
                <div style="font-size:12px;color:#888;margin:2px 0;">${'★'.repeat(r.stars || 5)} &nbsp;${r.review_date || ''}</div>
                <div style="font-size:13px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.review_text}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                <button onclick="openReviewModal(${r.id})" style="padding:6px 14px;background:#b8924a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Редагувати</button>
                <button onclick="deleteReview(${r.id})" style="padding:6px 14px;background:#f5f5f5;color:#c00;border:1px solid #e0d5c5;border-radius:6px;cursor:pointer;font-size:12px;">Видалити</button>
            </div>
        </div>
    `).join('');
}

function openReviewModal(id) {
    editingReviewId = id || null;
    reviewAvatarDataUrl = null;
    const r = id ? reviewsList.find(x => x.id === id) : null;

    document.getElementById('reviewModalTitle').textContent = id ? 'Редагувати відгук' : 'Новий відгук';
    document.getElementById('reviewAuthorName').value  = r ? r.author_name  : '';
    document.getElementById('reviewAuthorInit').value  = r ? (r.author_initial || '') : '';
    document.getElementById('reviewText').value        = r ? r.review_text   : '';
    document.getElementById('reviewStars').value       = r ? (r.stars || 5)  : 5;
    document.getElementById('reviewDate').value        = r ? (r.review_date || '') : '';
    document.getElementById('reviewSortOrder').value   = r ? (r.sort_order || 0) : 0;
    document.getElementById('reviewIsActive').checked  = r ? (r.is_active !== false) : true;

    const avatarPreview = document.getElementById('reviewAvatarPreview');
    if (r && r.avatar_url) {
        avatarPreview.style.backgroundImage = 'url(' + r.avatar_url + ')';
        avatarPreview.textContent = '';
    } else {
        avatarPreview.style.backgroundImage = '';
        avatarPreview.textContent = r ? (r.author_initial || r.author_name.charAt(0)) : '+';
    }

    document.getElementById('reviewModal').style.display = 'flex';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    editingReviewId = null;
    reviewAvatarDataUrl = null;
}

function reviewAvatarClick() {
    document.getElementById('reviewAvatarInput').click();
}

function reviewAvatarChange(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        reviewAvatarDataUrl = e.target.result;
        const preview = document.getElementById('reviewAvatarPreview');
        preview.style.backgroundImage = 'url(' + reviewAvatarDataUrl + ')';
        preview.textContent = '';
    };
    reader.readAsDataURL(file);
}

async function uploadReviewAvatar(dataUrl, authorName) {
    if (!dataUrl) return null;
    try {
        const base64 = dataUrl.split(',')[1];
        const byteChars = atob(base64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const mimeMatch = dataUrl.match(/data:([^;]+);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const ext = mime.split('/')[1] || 'jpg';
        const fileName = 'reviews/' + Date.now() + '_' + (authorName || 'avatar').replace(/\s+/g, '_') + '.' + ext;
        const { data, error } = await sb.storage.from('avatars').upload(fileName, byteArr.buffer, { contentType: mime, upsert: true });
        if (error) { console.error('Avatar upload error:', error); return null; }
        const { data: urlData } = sb.storage.from('avatars').getPublicUrl(fileName);
        return urlData ? urlData.publicUrl : null;
    } catch(e) { console.error('Avatar upload exception:', e); return null; }
}

async function saveReview() {
    const authorName = document.getElementById('reviewAuthorName').value.trim();
    const reviewText = document.getElementById('reviewText').value.trim();
    if (!authorName || !reviewText) { showToast('Введіть ім\'я та текст відгуку'); return; }

    const saveBtn = document.getElementById('reviewSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Збереження...';

    try {
        let avatarUrl = editingReviewId ? (reviewsList.find(x => x.id === editingReviewId) || {}).avatar_url || null : null;
        if (reviewAvatarDataUrl) {
            const uploaded = await uploadReviewAvatar(reviewAvatarDataUrl, authorName);
            if (uploaded) avatarUrl = uploaded;
        }

        const row = {
            author_name:    authorName,
            author_initial: document.getElementById('reviewAuthorInit').value.trim() || authorName.charAt(0),
            avatar_url:     avatarUrl || '',
            review_text:    reviewText,
            stars:          parseInt(document.getElementById('reviewStars').value) || 5,
            review_date:    document.getElementById('reviewDate').value.trim(),
            sort_order:     parseInt(document.getElementById('reviewSortOrder').value) || 0,
            is_active:      document.getElementById('reviewIsActive').checked
        };

        let error;
        if (editingReviewId) {
            ({ error } = await sb.from('reviews').update(row).eq('id', editingReviewId));
        } else {
            ({ error } = await sb.from('reviews').insert(row));
        }

        if (error) throw error;
        showToast('✅ Відгук збережено');
        closeReviewModal();
        await loadReviews();
    } catch(e) {
        showToast('❌ Помилка: ' + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Зберегти';
    }
}

async function deleteReview(id) {
    if (!confirm('Видалити цей відгук?')) return;
    const { error } = await sb.from('reviews').delete().eq('id', id);
    if (error) { showToast('❌ Помилка: ' + error.message); return; }
    showToast('✅ Відгук видалено');
    await loadReviews();
}

// ============================================================
// TRUST COUNTERS
// ============================================================

let countersList = [];

async function loadCounters() {
    const area = document.getElementById('countersArea');
    if (!area) return;
    if (!sb) { area.innerHTML = '<p style="color:#c00">Supabase не підключено</p>'; return; }
    area.innerHTML = '<p class="editor-placeholder">Завантаження...</p>';
    const { data, error } = await sb.from('trust_counters').select('*').order('sort_order');
    if (error) { area.innerHTML = '<p style="color:#c00">Помилка: ' + error.message + '</p>'; return; }
    countersList = data || [];
    renderCounters();
}

function renderCounters() {
    const area = document.getElementById('countersArea');
    if (!area) return;
    if (!countersList.length) {
        area.innerHTML = '<p class="editor-placeholder">Лічильників немає</p>';
        return;
    }
    area.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">' +
        countersList.map(c => `
            <div style="background:#faf7f2;border:1px solid #e8ddd0;border-radius:10px;padding:16px;">
                <div style="font-size:12px;color:#888;margin-bottom:8px;font-weight:600;">Лічильник #${c.sort_order}</div>
                <label style="font-size:12px;color:#555;">Значення</label>
                <input type="number" id="cval_${c.id}" value="${c.value}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin:4px 0 10px;font-size:16px;font-weight:700;">
                <label style="font-size:12px;color:#555;">Суфікс (напр. + або %)</label>
                <input type="text" id="csuf_${c.id}" value="${c.suffix || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin:4px 0 10px;">
                <label style="font-size:12px;color:#555;">Підпис</label>
                <input type="text" id="clab_${c.id}" value="${c.label_uk || ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;margin:4px 0 10px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
                    <input type="checkbox" id="cact_${c.id}" ${c.is_active ? 'checked' : ''}>
                    <span>Активний</span>
                </label>
            </div>
        `).join('') +
    '</div>';
}

async function saveAllCounters() {
    if (!countersList.length) return;
    const btn = document.getElementById('saveCountersBtn');
    btn.disabled = true;
    btn.textContent = 'Збереження...';
    try {
        for (const c of countersList) {
            const valEl   = document.getElementById('cval_' + c.id);
            const sufEl   = document.getElementById('csuf_' + c.id);
            const labEl   = document.getElementById('clab_' + c.id);
            const actEl   = document.getElementById('cact_' + c.id);
            if (!valEl) continue;
            const { error } = await sb.from('trust_counters').update({
                value:     parseInt(valEl.value) || 0,
                suffix:    sufEl ? sufEl.value : c.suffix,
                label_uk:  labEl ? labEl.value : c.label_uk,
                is_active: actEl ? actEl.checked : c.is_active
            }).eq('id', c.id);
            if (error) throw error;
        }
        showToast('✅ Лічильники збережено');
        await loadCounters();
    } catch(e) {
        showToast('❌ Помилка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Зберегти всі лічильники';
    }
}

// ============================================================
// DYNAMIC SERVICE PRICES
// ============================================================

async function loadServicePricesUI() {
    if (!sb) return;
    
    // Find all price group containers currently on screen
    const containers = document.querySelectorAll('.price-group-container');
    if (!containers.length) return;

    try {
        const { data: prices, error } = await sb.from('service_prices')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        // Group by service_group
        const grouped = {};
        prices.forEach(p => {
            if (!grouped[p.service_group]) grouped[p.service_group] = [];
            grouped[p.service_group].push(p);
        });

        containers.forEach(container => {
            const key = container.id.replace('pg-container-', '');
            const listEl = document.getElementById(`pg-list-${key}`);
            if (!listEl) return;

            const groupPrices = grouped[key] || [];
            
            if (groupPrices.length === 0) {
                listEl.innerHTML = `<div class="editor-placeholder">Прайс-лист порожній. Додайте першу позицію.</div>`;
                return;
            }

            let html = '';
            groupPrices.forEach(p => {
                html += `
                <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                    <div style="flex:1;">
                        <input type="text" value="${escapeAttr(p.name_uk)}" onchange="updatePriceItem('${p.id}', 'name_uk', this.value)" placeholder="Назва послуги">
                    </div>
                    <div style="width:150px;">
                        <input type="text" value="${escapeAttr(p.price_display)}" onchange="updatePriceItem('${p.id}', 'price_display', this.value)" style="font-weight:bold;" placeholder="Ціна (напр. 500 ₴)">
                    </div>
                    <button class="btn btn-danger" style="padding:10px 15px;" onclick="deletePriceItem('${p.id}')">❌</button>
                </div>`;
            });
            listEl.innerHTML = html;
        });

    } catch (e) {
        console.error('Error loading service prices:', e);
        containers.forEach(c => {
            const listEl = c.querySelector('div[id^="pg-list-"]');
            if (listEl) listEl.innerHTML = `<div class="editor-placeholder">Помилка завантаження: ${e.message}</div>`;
        });
    }
}

window.addPriceItem = async function(groupKey) {
    if (!sb) return showToast('⚠️ Підключіть Supabase');
    try {
        const { error } = await sb.from('service_prices').insert({
            service_group: groupKey,
            name_uk: 'Нова послуга',
            price_display: '0 ₴',
            sort_order: 99
        });
        if (error) throw error;
        showToast('✅ Позицію додано');
        loadServicePricesUI(); // reload UI
    } catch (e) {
        showToast('❌ Помилка: ' + e.message);
    }
};

window.updatePriceItem = async function(id, field, value) {
    if (!sb) return;
    try {
        let updateData = {};
        if (field === 'sort_order') {
            updateData[field] = parseInt(value) || 0;
        } else {
            updateData[field] = value;
        }
        
        const { error } = await sb.from('service_prices').update(updateData).eq('id', id);
        if (error) throw error;
        showToast('💾 Збережено');
    } catch (e) {
        showToast('❌ Помилка: ' + e.message);
    }
};

window.deletePriceItem = async function(id) {
    if (!confirm('Видалити цю позицію прайсу?')) return;
    if (!sb) return;
    try {
        const { error } = await sb.from('service_prices').delete().eq('id', id);
        if (error) throw error;
        showToast('🗑 Видалено');
        loadServicePricesUI();
    } catch (e) {
        showToast('❌ Помилка: ' + e.message);
    }
};
