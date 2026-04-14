const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// 1. Fix image preview path logic: use absolute path from root (/assets/)
src = src.replace(
    /const imgSrc = \(val && !val\.startsWith\('http'\) && !val\.startsWith\('blob:'\)\) \? '\.\.\/' \+ val : val;/g,
    "const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;"
);

// 2. Fix video preview path logic similarly
src = src.replace(
    /const videoSrc = \(val && !val\.startsWith\('http'\) && !val\.startsWith\('blob:'\)\) \? '\.\.\/' \+ val : val;/g,
    "const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;"
);

// 3. Clean up PAGE_DEFAULTS.about
const aboutDefaultsRegex = /"about": \{.*?\n\s+\},/s;
const cleanAboutDefaults = `"about": {
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

src = src.replace(aboutDefaultsRegex, cleanAboutDefaults);

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('Fixed admin.js preview paths and about defaults.');
