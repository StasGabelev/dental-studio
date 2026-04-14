const fs = require('fs');

let content = fs.readFileSync('admin/admin.js', 'utf8');

// The new PAGE_SCHEMA definition
const newSchema = `const PAGE_SCHEMA = {
    "home": [
        { "key": "hero-video", "label": "Головне відео (Hero)", "type": "video" },
        { "key": "hero-title", "label": "Головний заголовок", "type": "textarea" },
        { "key": "hero-subtitle", "label": "Підзаголовок", "type": "textarea" },
        { "key": "btn-book", "label": "Кнопка: Записатися", "type": "text" },
        { "key": "feat-aesthetic", "label": "Послуга: Естетика", "type": "text" },
        { "key": "feat-therapy", "label": "Послуга: Терапія", "type": "text" },
        { "key": "feat-surgery", "label": "Послуга: Хірургія", "type": "text" },
        { "key": "feat-ortho", "label": "Послуга: Ортодонтія", "type": "text" },
        { "key": "interior-video", "label": "Відео інтер'єру", "type": "video" },
        { "key": "about-p1", "label": "Про нас: Абзац 1", "type": "textarea" },
        { "key": "about-p2", "label": "Про нас: Абзац 2", "type": "textarea" },
        { "key": "about-more", "label": "Кнопка: Дізнатися більше", "type": "text" },
        { "key": "about-services", "label": "Кнопка: Переглянути послуги", "type": "text" },
        { "key": "works-title", "label": "Заголовок: Наші роботи", "type": "text" },
        { "key": "works-btn", "label": "Кнопка: Всі роботи", "type": "text" },
        { "key": "form-title", "label": "Форма: Заголовок", "type": "text" },
        { "key": "form-subtitle", "label": "Форма: Підзаголовок", "type": "textarea" },
        { "key": "form-phone-label", "label": "Форма: Телефон-лейбл", "type": "text" },
        { "key": "form-name-placeholder", "label": "Форма: Плейсхолдер імені", "type": "text" },
        { "key": "form-phone-placeholder", "label": "Форма: Плейсхолдер телефону", "type": "text" },
        { "key": "form-comment-placeholder", "label": "Форма: Плейсхолдер коментаря", "type": "text" },
        { "key": "form-privacy", "label": "Форма: Текст приватності", "type": "textarea" },
        { "key": "form-btn", "label": "Форма: Кнопка", "type": "text" },
        { "key": "contact-choice-title", "label": "Контакти: Заголовок", "type": "text" },
        { "key": "contact-choice-subtitle", "label": "Контакти: Підзаголовок", "type": "textarea" },
        { "key": "btn-online-booking", "label": "Кнопка: Онлайн запис", "type": "text" },
        { "key": "btn-contact-hub", "label": "Кнопка: Месенджери", "type": "text" },
        { "key": "map-title", "label": "Карта: Заголовок", "type": "text" },
        { "key": "map-open-btn", "label": "Кнопка: Відкрити карту", "type": "text" },
        { "key": "map-hours-label", "label": "Графік: Заголовок", "type": "text" },
        { "key": "footer-hours", "label": "Графік: Робочі години", "type": "text" }
    ],
    "about": [
        { "key": "about-page-title", "label": "SEO Title", "type": "text" },
        { "key": "about-section-tag", "label": "Тег розділу", "type": "text" },
        { "key": "hero-title", "label": "Заголовок", "type": "text" },
        { "key": "about-p1", "label": "Основний опис", "type": "textarea" },
        { "key": "nav-works", "label": "Кнопка: Наші роботи", "type": "text" },
        { "key": "nav-services", "label": "Кнопка: Послуги", "type": "text" },
        { "key": "about-team-title", "label": "Заголовок команди", "type": "text" },
        { "key": "team-savchuk-name", "label": "Савчук: Ім'я", "type": "text" },
        { "key": "team-savchuk-role", "label": "Савчук: Посада", "type": "text" },
        { "key": "team-anatoliy-name", "label": "Анатолій: Ім'я", "type": "text" },
        { "key": "team-anatoliy-role", "label": "Анатолій: Посада", "type": "text" },
        { "key": "team-mariya-name", "label": "Марія: Ім'я", "type": "text" },
        { "key": "team-mariya-role", "label": "Марія: Посада", "type": "text" }
    ],
    "services": [
        { "key": "feat-aesthetic", "label": "Естетична стоматологія", "type": "text" },
        { "key": "btn-book", "label": "Кнопка: Записатися на консультацію", "type": "text" },
        { "key": "feat-therapy", "label": "Лікування зубів", "type": "text" },
        { "key": "feat-surgery", "label": "Хірургія", "type": "text" },
        { "key": "feat-ortho", "label": "Ортодонтія", "type": "text" },
        { "key": "svc-consult-title", "label": "Консультація: Заголовок", "type": "text" },
        { "key": "svc-consult-desc", "label": "Консультація: Опис", "type": "textarea" },
        { "key": "btn-book-short", "label": "Кнопка: Записатися (коротка)", "type": "text" },
        { "key": "form-name-placeholder", "label": "Форма: Плейсхолдер імені", "type": "text" },
        { "key": "form-comment-placeholder", "label": "Форма: Плейсхолдер коментаря", "type": "text" },
        { "key": "form-phone-placeholder", "label": "Форма: Плейсхолдер телефону", "type": "text" },
        { "key": "form-privacy", "label": "Форма: Текст приватності", "type": "textarea" },
        { "key": "form-btn", "label": "Форма: Кнопка", "type": "text" }
    ],
    "cases": [
        { "key": "cases-page-title", "label": "SEO Title", "type": "text" },
        { "key": "cases-hero-title", "label": "Заголовок сторінки", "type": "text" },
        { "key": "filter-all", "label": "Фільтр: Всі роботи", "type": "text" },
        { "key": "filter-veneers", "label": "Фільтр: Вініри", "type": "text" },
        { "key": "filter-composite", "label": "Фільтр: Композитні вініри", "type": "text" },
        { "key": "filter-restoration", "label": "Фільтр: Реставрації", "type": "text" },
        { "key": "filter-implants", "label": "Фільтр: Імплантація", "type": "text" },
        { "key": "filter-ortho", "label": "Фільтр: Ортодонтія", "type": "text" },
        { "key": "filter-whitening", "label": "Фільтр: Відбілювання", "type": "text" }
    ],
    "contact": [
        { "key": "contacts-page-title", "label": "SEO Title", "type": "text" },
        { "key": "form-title", "label": "Форма: Заголовок", "type": "text" },
        { "key": "form-subtitle", "label": "Форма: Підзаголовок", "type": "textarea" },
        { "key": "form-phone-label", "label": "Форма: Телефон-лейбл", "type": "text" },
        { "key": "form-name-placeholder", "label": "Форма: Плейсхолдер імені", "type": "text" },
        { "key": "form-comment-placeholder", "label": "Форма: Плейсхолдер коментаря", "type": "text" },
        { "key": "form-phone-placeholder", "label": "Форма: Плейсхолдер телефону", "type": "text" },
        { "key": "form-privacy", "label": "Форма: Текст приватності", "type": "textarea" },
        { "key": "form-btn", "label": "Форма: Кнопка", "type": "text" },
        { "key": "footer-find-us", "label": "Де нас знайти", "type": "text" },
        { "key": "map-address", "label": "Адреса", "type": "text" },
        { "key": "footer-map-btn", "label": "Знайти на карті", "type": "text" },
        { "key": "footer-hours-title", "label": "Графік роботи: Заголовок", "type": "text" },
        { "key": "footer-hours-days", "label": "Графік роботи: Години", "type": "text" }
    ],
    "footer": [
        { "key": "footer-find-us", "label": "Де нас знайти", "type": "text" },
        { "key": "footer-location", "label": "Локація (Місто)", "type": "text" },
        { "key": "footer-address-street", "label": "Вулиця", "type": "text" },
        { "key": "footer-map-btn", "label": "Кнопка: Карта", "type": "text" },
        { "key": "footer-tagline", "label": "Слоган", "type": "textarea" },
        { "key": "footer-hours-title", "label": "Графік: Заголовок", "type": "text" },
        { "key": "footer-hours-days", "label": "Графік: Години", "type": "text" },
        { "key": "footer-copyright", "label": "Копірайт", "type": "text" },
        { "key": "btn-book", "label": "Кнопка: Записатися", "type": "text" }
    ]
};`;

// The new PAGE_DEFAULTS definition
const newDefaults = `const PAGE_DEFAULTS = {
    "home": {
        "hero-video": "https://storage.googleapis.com/tokar_clinic_site/video/home-cover/web.mp4",
        "interior-video": "assets/dental2.mp4",
        "hero-title": "ІННОВАЦІЇ.\\nЕСТЕТИКА.\\nКОМФОРТ🤍",
        "hero-subtitle": "Від ідеальної гігієни до імплантів 'під ключ'.",
        "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        "feat-aesthetic": "Естетична стоматологія",
        "feat-therapy": "Лікування зубів",
        "feat-surgery": "Хірургія",
        "feat-ortho": "Ортодонтія",
        "about-p1": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",
        "about-p2": "Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів, що задають тенденції в сучасній стоматологіії.",
        "about-more": "ДІЗНАТИСЯ БІЛЬШЕ",
        "about-services": "ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ",
        "works-title": "НАШІ РОБОТИ",
        "works-btn": "ПЕРЕГЛЯНУТИ УСІ РОБОТИ",
        "form-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        "form-subtitle": "Залиште заявку і администратор зв'яжеться з Вами, або зателефонуйте нам особисто",
        "form-phone-label": "Зв'язатися з нами для консультації:",
        "form-name-placeholder": "Прізвище та ім'я",
        "form-comment-placeholder": "Коментар",
        "form-phone-placeholder": "Номер телефону",
        "form-privacy": "Погоджуюся на обробку персональних данных та з умовами політики конфіденційності",
        "form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
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
        "hero-title": "Ми доповнюємо вашу красу",
        "about-p1": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",
        "nav-works": "НАШІ РОБОТИ",
        "nav-services": "ПОСЛУГИ",
        "about-team-title": "НАША КОМАНДА",
        "team-savchuk-name": "АНДРІЙ САВЧУК",
        "team-savchuk-role": "Заступник головного лікаря. Художня реставрація зубів.",
        "team-anatoliy-name": "АНАТОЛІЙ ТОКАР",
        "team-anatoliy-role": "Засновник, головний лікар. Стоматолог-ортопед/хірург.",
        "team-mariya-name": "МАРІЯ ТОКАР",
        "team-mariya-role": "Стоматолог-терапевт. Естетична реставрація."
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
        "svc-consult-desc": "Лікар проводить повну діагностику стану...",
        "btn-book-short": "Записатися",
        "form-name-placeholder": "Прізвище та ім'я",
        "form-comment-placeholder": "Коментар",
        "form-phone-placeholder": "Номер телефону",
        "form-privacy": "Погоджуюся на обробку персональних даних...",
        "form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
    },
    "contact": {
        "contacts-page-title": "Контакти — Dental Studio",
        "form-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        "form-subtitle": "Залишіть заявку й адміністратор зв'яжеться з Вами...",
        "form-phone-label": "Зв'язатися з нами для консультації:",
        "form-name-placeholder": "Прізвище та ім'я",
        "form-comment-placeholder": "Коментар",
        "form-phone-placeholder": "Номер телефону",
        "form-privacy": "Погоджуюся на обробку персональних даних...",
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
        "footer-address-street": "проспект Незалежності, 21",
        "footer-map-btn": "ЗНАЙТИ НАС НА КАРТІ",
        "footer-tagline": "ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ🤍",
        "footer-hours-title": "ГРАФІК РОБОТИ",
        "footer-hours-days": "Пн — Пт, 10:00 — 18:00",
        "footer-copyright": "Copyright © 2026. Dental Studio. Всі права захищені.",
        "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
    }
};`;

// Use regex to replace the PAGE_SCHEMA and PAGE_DEFAULTS blocks in the actual file securely.
const schemaRegex = /const PAGE_SCHEMA = \{[\s\S]*?^\};\n?/m;
const defaultsRegex = /const PAGE_DEFAULTS = \{[\s\S]*?^\};\n?/m;

let updatedContent = content;

// Replace schema
if(schemaRegex.test(updatedContent)){
    updatedContent = updatedContent.replace(schemaRegex, newSchema + '\\n\\n');
} else {
    console.error("Could not find PAGE_SCHEMA array mapping.");
}
// Replace defaults
if(defaultsRegex.test(updatedContent)){
    updatedContent = updatedContent.replace(defaultsRegex, newDefaults + '\\n\\n');
} else {
    console.error("Could not find PAGE_DEFAULTS object.");
}

fs.writeFileSync('admin/admin.js', updatedContent, 'utf8');
console.log("Successfully updated admin.js with fresh unified schema!");
