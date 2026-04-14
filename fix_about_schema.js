const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

const oldAboutDefaults = `"about": {
            "about-page-title": "Про клініку — Dental Studio",
            "about-section-tag": "ПРО КЛІНІКУ",
            "hero-title": "Ми доповнюємо вашу красу",
            "about-p1": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",
            "nav-works": "НАШІ РОБОТИ",
            "nav-services": "ПОСЛУГИ",
            "about-team-title": "НАША КОМАНДА",
            "about-hero-img": "assets/dental-2.png",
            "about-secondary-img": "assets/dental-2.png",
            "team-savchuk-name": "АНДРІЙ САВЧУК",
            "team-savchuk-role": "Заступник головного лікаря. Художня реставрація зубів.",
            "team-anatoliy-name": "АНАТОЛІЙ ТОКАР",
            "team-anatoliy-role": "Засновник, головний лікар. Стоматолог-ортопед/хірург.",
            "team-mariya-name": "МАРІЯ ТОКАР",

        },`;

const newAboutDefaults = `"about": {
            "about-page-title": "Про клініку — Dental Studio",
            "about-section-tag": "ПРО КЛІНІКУ",
            "about-p1": "Ми доповнюємо вашу красу",
            "about-p2": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя. Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів, що задають тенденції в сучасній стоматології.",
            "nav-works": "НАШІ РОБОТИ",
            "nav-services": "ПОСЛУГИ",
            "about-team-title": "НАША КОМАНДА",
            "about-hero-img": "assets/dental-2.png",
            "about-secondary-img": "assets/dental-2.png"
        },`;

src = src.replace(oldAboutDefaults, newAboutDefaults);

const oldAboutSchema = `"about": [
        { "key": "about-page-title", "label": "SEO Title сторінки", "type": "text" },
        { "key": "about-section-tag", "label": "Тег розділу (мала позначка)", "type": "text" },
        { "key": "hero-title", "label": "Головний заголовок", "type": "text" },
        { "key": "about-p1", "label": "Основний опис клініки", "type": "textarea" },
        { "key": "about-p2", "label": "Другий (нижній) опис клініки", "type": "textarea" },
        { "key": "about-hero-img", "label": "Фото: Головне (Hero)", "type": "image" },
        { "key": "about-secondary-img", "label": "Фото: Поруч з текстом", "type": "image" },
        { "key": "nav-works", "label": "Кнопка: Наші роботи", "type": "text" },
        { "key": "nav-services", "label": "Кнопка: Послуги", "type": "text" },
        { "key": "about-team-title", "label": "Заголовок команди (Лікарі налаштовуються у розділі 'Лікарі')", "type": "text" }
    ],`;

const newAboutSchema = `"about": [
        { "key": "about-page-title", "label": "SEO Title сторінки", "type": "text" },
        { "key": "about-section-tag", "label": "Тег розділу (мала позначка)", "type": "text" },
        { "key": "about-p1", "label": "Головний заголовок (під 'Про клініку')", "type": "text" },
        { "key": "about-p2", "label": "Опис клініки (текстовий блок)", "type": "textarea" },
        { "key": "about-hero-img", "label": "Фото: Головне (Hero)", "type": "image" },
        { "key": "about-secondary-img", "label": "Фото: Поруч з текстом", "type": "image" },
        { "key": "nav-works", "label": "Кнопка: Наші роботи", "type": "text" },
        { "key": "nav-services", "label": "Кнопка: Послуги", "type": "text" },
        { "key": "about-team-title", "label": "Заголовок команди (Лікарі налаштовуються у розділі 'Лікарі')", "type": "text" }
    ],`;

src = src.replace(oldAboutSchema, newAboutSchema);

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('Fixed about page schema and defaults.');
