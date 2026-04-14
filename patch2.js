const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// ===== 1. Translate labels in PAGE_SCHEMA =====

// about section - translate labels
const aboutLabels = {
    '"About Page Title"': '"SEO Title сторінки"',
    '"About Section Tag"': '"Тег розділу (мала позначка)"',
    '"Hero Title"': '"Головний заголовок"',
    '"About P1"': '"Основний опис клініки"',
    '"Nav Works"': '"Кнопка: Наші роботи"',
    '"Nav Services"': '"Кнопка: Послуги"',
    '"About Team Title"': '"Заголовок команди"',
    '"Team Savchuk Name"': '"Лікар 1: Ім\'я (Савчук)"',
    '"Team Savchuk Role"': '"Лікар 1: Посада (Савчук)"',
    '"Team Anatoliy Name"': '"Лікар 2: Ім\'я (Анатолій)"',
    '"Team Anatoliy Role"': '"Лікар 2: Посада (Анатолій)"',
    '"Team Mariya Name"': '"Лікар 3: Ім\'я (Марія)"',
    '"Team Mariya Role"': '"Лікар 3: Посада (Марія)"',
};

// services section
const serviceLabels = {
    '"Feat Aesthetic"': '"Фільтр: Естетична стоматологія"',
    '"Btn Book"': '"Кнопка: Записатися на консультацію"',
    '"Feat Therapy"': '"Фільтр: Лікування зубів"',
    '"Feat Surgery"': '"Фільтр: Хірургія"',
    '"Feat Ortho"': '"Фільтр: Ортодонтія"',
    '"Svc Consult Title"': '"Послуга: Консультація — Заголовок"',
    '"Svc Consult Desc"': '"Послуга: Консультація — Опис"',
    '"Price Consult General"': '"Ціна: Загальна консультація"',
    '"Btn Book Short"': '"Кнопка: Записатися (коротка)"',
    '"Price Consult Modjaw"': '"Ціна: Діагностика MODJAW"',
    '"Price Consult Checkup"': '"Ціна: CHECK-UP"',
    '"Svc Composite Veneer Title"': '"Послуга: Композитні вініри — Заголовок"',
    '"Svc Composite Veneer Desc"': '"Послуга: Композитні вініри — Опис"',
    '"Price Frontal Restoration"': '"Ціна: Реставрація фронтального зуба"',
    '"Price Art Restoration"': '"Ціна: Художня реставрація"',
    '"Svc Ceramic Restoration Title"': '"Послуга: Керамічні реставрації — Заголовок"',
    '"Svc Ceramic Restoration Desc"': '"Послуга: Керамічні реставрації — Опис"',
    '"Price Veneer Digital"': '"Ціна: Вінір (digital)"',
    '"Price Veneer Layering"': '"Ціна: Вінір (digital + нашарування)"',
    '"Price Veneer Handmade"': '"Ціна: Вінір (hand made)"',
    '"Price Veneer Rework"': '"Ціна: Переробка вініра"',
    '"Price Veneer Single"': '"Ціна: Вінір одиночний"',
    '"Price Crown Digital"': '"Ціна: Коронка (digital)"',
    '"Price Crown Layering"': '"Ціна: Коронка (digital + нашарування)"',
    '"Price Crown Handmade"': '"Ціна: Коронка (hand made)"',
    '"Svc Endo Title"': '"Послуга: Ендодонтія — Заголовок"',
    '"Svc Endo Desc"': '"Послуга: Ендодонтія — Опис"',
    '"Price Endo Incisor"': '"Ціна: Канали (різці, ікла)"',
    '"Price Endo Premolar"': '"Ціна: Канали (премоляри)"',
    '"Price Endo Molar"': '"Ціна: Канали (моляри)"',
    '"Svc Caries Title"': '"Послуга: Лікування карієсу — Заголовок"',
    '"Svc Caries Desc"': '"Послуга: Лікування карієсу — Опис"',
    '"Price Caries 2"': '"Ціна: Карієс II рівень"',
    '"Price Caries 3"': '"Ціна: Карієс III рівень"',
    '"Svc Periodontal Title"': '"Послуга: Пародонтологія — Заголовок"',
    '"Svc Periodontal Desc"': '"Послуга: Пародонтологія — Опис"',
    '"Price Periodont 1"': '"Ціна: Пародонтит I ступінь"',
    '"Price Periodont 2"': '"Ціна: Пародонтит II ступінь"',
    '"Price Periodont 3"': '"Ціна: Пародонтит III ступінь"',
    '"Svc Hygiene Title"': '"Послуга: Гігієна — Заголовок"',
    '"Svc Hygiene Desc"': '"Послуга: Гігієна — Опис"',
    '"Price Hygiene"': '"Ціна: Професійна гігієна"',
    '"Price Hygiene Smoker"': '"Ціна: Гігієна (нальот курця)"',
    '"Svc Whitening Title"': '"Послуга: Відбілювання — Заголовок"',
    '"Svc Whitening Desc"': '"Послуга: Відбілювання — Опис"',
    '"Price Whitening"': '"Ціна: Відбілювання"',
    '"Svc Implant Title"': '"Послуга: Імплантація — Заголовок"',
    '"Svc Implant Desc"': '"Послуга: Імплантація — Опис"',
    '"Price Implant Neodent"': '"Ціна: Імплант NEODENT"',
    '"Price Implant Sla"': '"Ціна: Імплант STRAUMANN SLA"',
    '"Price Implant Slactive"': '"Ціна: Імплант STRAUMANN SLACTIVE"',
    '"Price Crown Monolit"': '"Ціна: Коронка (monolit)"',
    '"Price Crown Aesthetic"': '"Ціна: Коронка (ceramic + абатмент)"',
    '"Svc Extraction Title"': '"Послуга: Видалення зубів — Заголовок"',
    '"Svc Extraction Desc"': '"Послуга: Видалення зубів — Опис"',
    '"Price Extraction"': '"Ціна: Видалення зуба"',
    '"Price Extraction Atypical 1"': '"Ціна: Атипове видалення (просте)"',
    '"Price Extraction Atypical 2"': '"Ціна: Атипове видалення (складне)"',
    '"Price Sedation"': '"Ціна: Седація (1 година)"',
    '"Svc Gum Surgery Title"': '"Послуга: Хірургія ясен — Заголовок"',
    '"Svc Gum Surgery Desc"': '"Послуга: Хірургія ясен — Опис"',
    '"Price Gum Smile"': '"Ціна: Усунення ясеневої посмішки"',
    '"Price Recession"': '"Ціна: Закриття рецесій"',
    '"Price Gum Extension"': '"Ціна: Видовження ясен"',
    '"Svc Braces Title"': '"Послуга: Брекети — Заголовок"',
    '"Svc Braces Desc"': '"Послуга: Брекети — Опис"',
    '"Price Braces Metal"': '"Ціна: Брекети (метал)"',
    '"Price Braces Ceramic"': '"Ціна: Брекети (кераміка)"',
    '"Price Braces Self Metal"': '"Ціна: Самолігуючі (метал)"',
    '"Price Ortho Visit"': '"Ціна: Контрольний візит ортодонта"',
    '"Price Braces Self Ceramic"': '"Ціна: Самолігуючі (кераміка)"',
    '"Svc Aligners Title"': '"Послуга: Елайнери — Заголовок"',
    '"Svc Aligners Desc"': '"Послуга: Елайнери — Опис"',
    '"Price Aligners"': '"Ціна: Лікування елайнерами"',
    '"Form Name Placeholder"': '"Форма: Плейсхолдер імені"',
    '"Form Comment Placeholder"': '"Форма: Плейсхолдер коментаря"',
    '"Form Phone Placeholder"': '"Форма: Плейсхолдер телефону"',
    '"Form Privacy"': '"Форма: Текст приватності"',
    '"Form Btn"': '"Форма: Кнопка"',
};

// cases section
const casesLabels = {
    '"Cases Page Title"': '"SEO Title сторінки"',
    '"Cases Hero Title"': '"Головний заголовок"',
    '"Filter All"': '"Фільтр: Всі роботи"',
    '"Filter Veneers"': '"Фільтр: Керамічні вініри"',
    '"Filter Composite"': '"Фільтр: Композитні вініри"',
    '"Filter Restoration"': '"Фільтр: Композитні реставрації"',
    '"Filter Implants"': '"Фільтр: Імплантація"',
    '"Filter Ortho"': '"Фільтр: Ортодонтія"',
    '"Filter Whitening"': '"Фільтр: Відбілювання зубів"',
};

// contact section
const contactLabels = {
    '"Contacts Page Title"': '"SEO Title сторінки"',
    '"Form Title"': '"Форма: Заголовок"',
    '"Form Subtitle"': '"Форма: Підзаголовок"',
    '"Form Phone Label"': '"Форма: Телефон-лейбл"',
    '"Footer Find Us"': '"Де нас знайти"',
    '"Map Address"': '"Адреса клініки"',
    '"Footer Map Btn"': '"Кнопка: Знайти на карті"',
    '"Footer Hours Title"': '"Графік роботи: Заголовок"',
    '"Footer Hours Days"': '"Графік роботи: Години"',
};

// footer section
const footerLabels = {
    '"Footer Location"': '"Місто"',
    '"Footer Address Street"': '"Вулиця та номер"',
    '"Footer Map Btn"': '"Кнопка: Карта"',
    '"Footer Tagline"': '"Слоган (з емодзі)"',
    '"Footer Hours Title"': '"Графік: Заголовок"',
    '"Footer Hours Days"': '"Графік: Години роботи"',
    '"Footer Copyright"': '"Копірайт"',
    '"Btn Book"': '"Кнопка: Записатися"',
};

// Apply all translations - replace "label": "English" -> "label": "Українська"
// We do this safely by matching the pattern within label fields
function replaceLabels(content, map) {
    for (const [eng, ukr] of Object.entries(map)) {
        // Match: "label": "English Text"
        const pattern = new RegExp(`"label": ${eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        content = content.replace(pattern, `"label": ${ukr}`);
    }
    return content;
}

const allLabels = { ...aboutLabels, ...serviceLabels, ...casesLabels, ...contactLabels, ...footerLabels };
src = replaceLabels(src, allLabels);

// ===== 2. Fix hero-title in PAGE_DEFAULTS (change <br> tags OR missing heart) =====
// The current default has: "ІННОВАЦІЇ.\nЕСТЕТИКА.\nКОМФОРТ"  (no heart)
// We want: "ІННОВАЦІЇ.\nЕСТЕТИКА.\nКОМФОРТ🤍"
src = src.replace(
    `"hero-title": "ІННОВАЦІЇ.\\nЕСТЕТИКА.\\nКОМФОРТ"`,
    `"hero-title": "ІННОВАЦІЇ.\\nЕСТЕТИКА.\\nКОМФОРТ\u{1F90D}"`
);

// ===== 3. Add defaults for about, cases, contact, footer in PAGE_DEFAULTS =====
// Find the closing of "home" section in PAGE_DEFAULTS and add after it

const homeDefaultsEnd = `            "footer-hours": "Пн — Пт, 10:00 — 18:00"
        }
    };`;

const newSections = `            "footer-hours": "Пн — Пт, 10:00 — 18:00"
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
            "svc-consult-desc": "Лікар проводить повну діагностику стану ротової порожнини, сканує зуби, оглядає зуби під мікроскопом та складає план лікування із кошторисом по кожному етапу.",
            "price-consult-general": "Загальна консультація",
            "btn-book-short": "Записатися",
            "price-consult-modjaw": "Функціональна діагностика MODJAW",
            "price-consult-checkup": "Стоматологічний CHECK-UP",
            "form-name-placeholder": "Прізвище та ім'я",
            "form-comment-placeholder": "Коментар",
            "form-phone-placeholder": "Номер телефону",
            "form-privacy": "Погоджуюся на обробку персональних даних та з умовами політики конфіденційності",
            "form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
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
            "footer-tagline": "ІННОВАЦІЇ, ЕСТЕТИКА, КОМФОРТ\u{1F90D}",
            "footer-hours-title": "ГРАФІК РОБОТИ",
            "footer-hours-days": "Пн — Пт, 10:00 — 18:00",
            "footer-copyright": "Copyright © 2026. Dental Studio. Всі права захищені.",
            "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
        }
    };`;

if (src.includes(homeDefaultsEnd)) {
    src = src.replace(homeDefaultsEnd, newSections);
    console.log('✅ PAGE_DEFAULTS expanded with all pages');
} else {
    console.error('❌ Could not find homeDefaultsEnd anchor. Looking for it...');
    // Try to find approximate position
    const idx = src.indexOf('"footer-hours": "Пн — Пт, 10:00 — 18:00"');
    console.log('Position of footer-hours:', idx, src.substring(Math.max(0, idx-50), idx+100));
}

// ===== 4. Update version badge =====
src = src.replace(/v1\.0\.\d+/, 'v1.0.7');

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('✅ Done! admin.js updated successfully');
