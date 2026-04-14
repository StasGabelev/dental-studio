const fs = require('fs');

const adminJsPath = './admin/admin.js';
let content = fs.readFileSync(adminJsPath, 'utf8');

// The new services schema
const newServicesSchema = `    "services": [
        { "label": "ЕСТЕТИЧНА СТОМАТОЛОГІЯ", "type": "heading" },
        { "key": "feat-aesthetic", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-consult-title", "label": "Консультація — Заголовок (спільна для всіх розділів)", "type": "text" },
        { "key": "svc-consult-desc", "label": "Консультація — Опис", "type": "textarea" },
        { "key": "price-consult-general", "label": "Ціна: Загальна консультація", "type": "text" },
        { "key": "price-consult-modjaw", "label": "Ціна: Діагностика MODJAW", "type": "text" },
        { "key": "price-consult-checkup", "label": "Ціна: CHECK-UP", "type": "text" },

        { "key": "svc-composite-veneer-title", "label": "Композитні вініри — Заголовок", "type": "text" },
        { "key": "svc-composite-veneer-desc", "label": "Композитні вініри — Опис", "type": "textarea" },
        { "key": "price-frontal-restoration", "label": "Ціна: Реставрація фронтального зуба", "type": "text" },
        { "key": "price-art-restoration", "label": "Ціна: Художня реставрація", "type": "text" },

        { "key": "svc-ceramic-restoration-title", "label": "Керамічні реставрації — Заголовок", "type": "textarea" },
        { "key": "svc-ceramic-restoration-desc", "label": "Керамічні реставрації — Опис", "type": "textarea" },
        { "key": "price-veneer-digital", "label": "Ціна: Вінір (digital)", "type": "text" },
        { "key": "price-veneer-layering", "label": "Ціна: Вінір (digital + нашарування)", "type": "text" },
        { "key": "price-veneer-handmade", "label": "Ціна: Вінір (hand made)", "type": "text" },
        { "key": "price-veneer-rework", "label": "Ціна: Переробка вініра", "type": "text" },
        { "key": "price-veneer-single", "label": "Ціна: Вінір одиночний", "type": "text" },
        { "key": "price-crown-digital", "label": "Ціна: Коронка (digital)", "type": "text" },
        { "key": "price-crown-layering", "label": "Ціна: Коронка (digital + нашарування)", "type": "textarea" },
        { "key": "price-crown-handmade", "label": "Ціна: Коронка (hand made)", "type": "textarea" },

        { "label": "ЛІКУВАННЯ ЗУБІВ", "type": "heading" },
        { "key": "feat-therapy", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-endo-title", "label": "Ендодонтія — Заголовок", "type": "text" },
        { "key": "svc-endo-desc", "label": "Ендодонтія — Опис", "type": "textarea" },
        { "key": "price-endo-incisor", "label": "Ціна: Канали (різці, ікла)", "type": "text" },
        { "key": "price-endo-premolar", "label": "Ціна: Канали (премоляри)", "type": "text" },
        { "key": "price-endo-molar", "label": "Ціна: Канали (моляри)", "type": "text" },

        { "key": "svc-caries-title", "label": "Лікування карієсу — Заголовок", "type": "text" },
        { "key": "svc-caries-desc", "label": "Лікування карієсу — Опис", "type": "textarea" },
        { "key": "price-caries-2", "label": "Ціна: Карієс II рівень", "type": "text" },
        { "key": "price-caries-3", "label": "Ціна: Карієс III рівень", "type": "text" },

        { "key": "svc-periodontal-title", "label": "Пародонтологія — Заголовок", "type": "text" },
        { "key": "svc-periodontal-desc", "label": "Пародонтологія — Опис", "type": "textarea" },
        { "key": "price-periodont-1", "label": "Ціна: Пародонтит I ступінь", "type": "text" },
        { "key": "price-periodont-2", "label": "Ціна: Пародонтит II ступінь", "type": "text" },
        { "key": "price-periodont-3", "label": "Ціна: Пародонтит III ступінь", "type": "text" },

        { "key": "svc-hygiene-title", "label": "Гігієна — Заголовок", "type": "text" },
        { "key": "svc-hygiene-desc", "label": "Гігієна — Опис", "type": "textarea" },
        { "key": "price-hygiene", "label": "Ціна: Гігієна", "type": "text" },
        { "key": "price-hygiene-smoker", "label": "Ціна: Гігієна (нальот курця)", "type": "text" },

        { "key": "svc-whitening-title", "label": "Відбілювання — Заголовок", "type": "text" },
        { "key": "svc-whitening-desc", "label": "Відбілювання — Опис", "type": "textarea" },
        { "key": "price-whitening", "label": "Ціна: Відбілювання", "type": "text" },

        { "label": "ХІРУРГІЯ", "type": "heading" },
        { "key": "feat-surgery", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-implant-title", "label": "Імплантація — Заголовок", "type": "text" },
        { "key": "svc-implant-desc", "label": "Імплантація — Опис", "type": "textarea" },
        { "key": "price-implant-neodent", "label": "Ціна: Імплант NEODENT", "type": "text" },
        { "key": "price-implant-sla", "label": "Ціна: Імплант STRAUMANN SLA", "type": "text" },
        { "key": "price-implant-slactive", "label": "Ціна: Імплант STRAUMANN SLACTIVE", "type": "text" },
        { "key": "price-crown-monolit", "label": "Ціна: Коронка (monolit)", "type": "text" },
        { "key": "price-crown-aesthetic", "label": "Ціна: Коронка (ceramic + абатмент)", "type": "textarea" },

        { "key": "svc-extraction-title", "label": "Видалення зубів — Заголовок", "type": "text" },
        { "key": "svc-extraction-desc", "label": "Видалення зубів — Опис", "type": "textarea" },
        { "key": "price-extraction", "label": "Ціна: Видалення зуба", "type": "text" },
        { "key": "price-extraction-atypical-1", "label": "Ціна: Атипове видалення (просте)", "type": "text" },
        { "key": "price-extraction-atypical-2", "label": "Ціна: Атипове видалення (складне)", "type": "text" },
        { "key": "price-sedation", "label": "Ціна: Седація (1 година)", "type": "text" },

        { "key": "svc-gum-surgery-title", "label": "Хірургія ясен — Заголовок", "type": "textarea" },
        { "key": "svc-gum-surgery-desc", "label": "Хірургія ясен — Опис", "type": "textarea" },
        { "key": "price-gum-smile", "label": "Ціна: Усунення ясеневої посмішки", "type": "text" },
        { "key": "price-recession", "label": "Ціна: Закриття рецесій", "type": "text" },
        { "key": "price-gum-extension", "label": "Ціна: Видовження ясен", "type": "text" },

        { "label": "ОРТОДОНТІЯ", "type": "heading" },
        { "key": "feat-ortho", "label": "Фільтр: Редагувати назву вкладки", "type": "text" },
        { "key": "svc-braces-title", "label": "Брекети — Заголовок", "type": "text" },
        { "key": "svc-braces-desc", "label": "Брекети — Опис", "type": "textarea" },
        { "key": "price-braces-metal", "label": "Ціна: Брекети (метал)", "type": "text" },
        { "key": "price-braces-ceramic", "label": "Ціна: Брекети (кераміка)", "type": "text" },
        { "key": "price-braces-self-metal", "label": "Ціна: Самолігуючі (метал)", "type": "text" },
        { "key": "price-braces-self-ceramic", "label": "Ціна: Самолігуючі (кераміка)", "type": "text" },
        { "key": "price-ortho-visit", "label": "Ціна: Контрольний візит ортодонта", "type": "text" },

        { "key": "svc-aligners-title", "label": "Елайнери — Заголовок", "type": "text" },
        { "key": "svc-aligners-desc", "label": "Елайнери — Опис", "type": "textarea" },
        { "key": "price-aligners", "label": "Ціна: Лікування елайнерами", "type": "text" },

        { "label": "КНОПКИ ТА ФОРМА ЗАПИСУ", "type": "heading" },
        { "key": "btn-book", "label": "Кнопка: Записатися (Hero)", "type": "text" },
        { "key": "btn-book-short", "label": "Кнопка: Записатися (Списки цін)", "type": "text" },
        { "key": "form-name-placeholder", "label": "Форма: Плейсхолдер імені", "type": "text" },
        { "key": "form-comment-placeholder", "label": "Форма: Плейсхолдер коментаря", "type": "text" },
        { "key": "form-phone-placeholder", "label": "Форма: Плейсхолдер телефону", "type": "text" },
        { "key": "form-privacy", "label": "Форма: Текст приватності", "type": "textarea" },
        { "key": "form-btn", "label": "Форма: Кнопка відправки", "type": "text" }
    ],`;

// We use regex to replace the array of "services" inside PAGE_SCHEMA 
const regex = /"services":\s*\[[\s\S]*?\],\s*"cases"/;

content = content.replace(regex, newServicesSchema + '\n    "cases"');

// And now replace loadPageEditor
const oldRender = `    schema.forEach(field => {
        let val = existing[field.key] !== undefined ? existing[field.key] : '';`;

const newRender = `    schema.forEach(field => {
        if (field.type === 'heading') {
            html += \`<div class="editor-section-heading">\${field.label}</div>\`;
            return;
        }
        let val = existing[field.key] !== undefined ? existing[field.key] : '';`;

content = content.replace(oldRender, newRender);

fs.writeFileSync(adminJsPath, content, 'utf8');
console.log('Successfully updated services schema and loadPageEditor!');
