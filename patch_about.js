const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// Find the "about": [ ... ] block
const startIdx = src.indexOf('"about": [');
const endIdx = src.indexOf('],', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const newAboutSchema = `"about": [
        { "key": "about-page-title", "label": "SEO Title сторінки", "type": "text" },
        { "key": "about-section-tag", "label": "Тег розділу (мала позначка)", "type": "text" },
        { "key": "hero-title", "label": "Головний заголовок", "type": "text" },
        { "key": "about-p1", "label": "Основний опис клініки", "type": "textarea" },
        { "key": "about-hero-img", "label": "Фото: Головне (Hero)", "type": "image" },
        { "key": "about-secondary-img", "label": "Фото: Поруч з текстом", "type": "image" },
        { "key": "nav-works", "label": "Кнопка: Наші роботи", "type": "text" },
        { "key": "nav-services", "label": "Кнопка: Послуги", "type": "text" },
        { "key": "about-team-title", "label": "Заголовок команди (Лікарі налаштовуються у розділі 'Лікарі')", "type": "text" }
    `;
    src = src.substring(0, startIdx) + newAboutSchema + src.substring(endIdx);
    
    // Also we need to clean up PAGE_DEFAULTS.about to remove team-savchuk etc and add default images
    // Let's just do simple replacements.
    src = src.replace(
        `"team-savchuk-name": "АНДРІЙ САВЧУК",`,
        `"about-hero-img": "assets/dental-2.png",\n            "about-secondary-img": "assets/dental-2.png",\n            "team-savchuk-name": "АНДРІЙ САВЧУК",`
    );
    
    // Next, delete all "team-" keys from PAGE_DEFAULTS inside about: {...} section.
    src = src.replace(/            "team-.*?": ".*?",\n/g, '');
    src = src.replace(/            "team-\w+-\w+": ".*?"\n/g, '');
    // Specifically catch the last one which might not have a comma
    src = src.replace(/            "team-mariya-role": ".*?"/g, '');
    
    fs.writeFileSync('admin/admin.js', src, 'utf8');
    console.log('Successfully updated about schema in admin.js');
} else {
    console.log('Could not find about block in PAGE_SCHEMA');
}
