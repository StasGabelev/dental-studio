const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

const replacements = [
    // Hero Section
    [`<h1 class="hero-huge-title">ІННОВАЦІЇ.<br>ЕСТЕТИКА.<br>КОМФОРТ<svg`, `<h1 class="hero-huge-title"><span data-i18n="hero-title">ІННОВАЦІЇ.<br>ЕСТЕТИКА.<br>КОМФОРТ</span><svg`],
    [`<p class="hero-subtitle">Від ідеальної гігієни до імплантів 'під ключ'.</p>`, `<p class="hero-subtitle" data-i18n="hero-subtitle">Від ідеальної гігієни до імплантів 'під ключ'.</p>`],
    [`<a href="#form" class="btn btn--cta">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</a>`, `<a href="#form" class="btn btn--cta" data-i18n="btn-book">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</a>`],
    
    // Features Section
    [`<h3 class="feature-card__title">Естетична стоматологія</h3>`, `<h3 class="feature-card__title" data-i18n="feat-aesthetic">Естетична стоматологія</h3>`],
    [`<h3 class="feature-card__title">Лікування зубів</h3>`, `<h3 class="feature-card__title" data-i18n="feat-therapy">Лікування зубів</h3>`],
    [`<h3 class="feature-card__title">Хірургія</h3>`, `<h3 class="feature-card__title" data-i18n="feat-surgery">Хірургія</h3>`],
    [`<h3 class="feature-card__title">Ортодонтія</h3>`, `<h3 class="feature-card__title" data-i18n="feat-ortho">Ортодонтія</h3>`],
    
    // About Section
    [`<p class="about__text">Dental Studio — це стоматологічна клініка в Чернігові`, `<p class="about__text" data-i18n="about-p1">Dental Studio — це стоматологічна клініка в Чернігові`],
    [`<p class="about__text">Ми надаємо широкий спектр стоматологічних послуг`, `<p class="about__text" data-i18n="about-p2">Ми надаємо широкий спектр стоматологічних послуг`],
    [`<a href="about.html" class="btn btn--nude">ДІЗНАТИСЯ БІЛЬШЕ</a>`, `<a href="about.html" class="btn btn--nude" data-i18n="about-more">ДІЗНАТИСЯ БІЛЬШЕ</a>`],
    [`<a href="services.html" class="btn btn--outline" style="border-color: var(--gold); color: var(--gold);">ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ</a>`, `<a href="services.html" class="btn btn--outline" style="border-color: var(--gold); color: var(--gold);" data-i18n="about-services">ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ</a>`],
    
    // Works Section
    [`<h2 class="section-title-altWorks" style="margin-bottom: 50px;">НАШІ РОБОТИ</h2>`, `<h2 class="section-title-altWorks" style="margin-bottom: 50px;" data-i18n="works-title">НАШІ РОБОТИ</h2>`],
    [`<a href="cases.html" class="btn btn--nude btn--more-works" style="letter-spacing: 2px; font-size: 11px;">ПЕРЕГЛЯНУТИ ВСІ РОБОТИ</a>`, `<a href="cases.html" class="btn btn--nude btn--more-works" style="letter-spacing: 2px; font-size: 11px;" data-i18n="works-btn">ПЕРЕГЛЯНУТИ ВСІ РОБОТИ</a>`],
    
    // Contact Choice Section
    [`<h2 class="section-title-alt" style="margin-bottom: 24px;">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</h2>`, `<h2 class="section-title-alt" style="margin-bottom: 24px;" data-i18n="contact-choice-title">ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ</h2>`],
    [`<p class="appointment-subtitle" style="margin-bottom: 48px; color: #888; font-size: 14px; letter-spacing: 1.5px; line-height: 1.8;">
                        Виберіть онлайн-запис для миттєвого бронювання часу,<br>або напишіть нам у месенджер для консультації.
                    </p>`, `<p class="appointment-subtitle" data-i18n="contact-choice-subtitle" style="margin-bottom: 48px; color: #888; font-size: 14px; letter-spacing: 1.5px; line-height: 1.8;">
                        Виберіть онлайн-запис для миттєвого бронювання часу,<br>або напишіть нам у месенджер для консультації.
                    </p>`],
    [`<button onclick="openOnlineBooking()" class="btn btn--cta" style="width: 100%; padding: 22px; font-size: 12px; font-family: var(--font-sans); letter-spacing: 2px; text-transform: uppercase; cursor: pointer;">ОНЛАЙН ЗАПИС</button>`, `<button onclick="openOnlineBooking()" class="btn btn--cta" style="width: 100%; padding: 22px; font-size: 12px; font-family: var(--font-sans); letter-spacing: 2px; text-transform: uppercase; cursor: pointer;" data-i18n="btn-online-booking">ОНЛАЙН ЗАПИС</button>`],
    [`<button onclick="openContactHub()" style="width: 100%; padding: 20px; border: 1px solid var(--gold); background: transparent; color: var(--gold); letter-spacing: 2.5px; text-transform: uppercase; font-size: 11px; cursor: pointer; font-family: var(--font-sans); transition: all 0.3s ease;">ЗВ'ЯЗАТИСЯ З НАМИ</button>`, `<button onclick="openContactHub()" style="width: 100%; padding: 20px; border: 1px solid var(--gold); background: transparent; color: var(--gold); letter-spacing: 2.5px; text-transform: uppercase; font-size: 11px; cursor: pointer; font-family: var(--font-sans); transition: all 0.3s ease;" data-i18n="btn-contact-hub">ЗВ'ЯЗАТИСЯ З НАМИ</button>`],
    
    // Map Section
    [`<h2 class="section-title-alt" style="margin-bottom: 25px;">ДЕ НАС ЗНАЙТИ</h2>`, `<h2 class="section-title-alt" data-i18n="map-title" style="margin-bottom: 25px;">ДЕ НАС ЗНАЙТИ</h2>`],
    [`>Відкрити карту</a>`, ` data-i18n="map-open-btn">Відкрити карту</a>`],
    [`<span class="box-label" style="font-size: 11px; color: #888; letter-spacing: 2px;">ГРАФІК РОБОТИ</span>`, `<span class="box-label" style="font-size: 11px; color: #888; letter-spacing: 2px;" data-i18n="map-hours-label">ГРАФІК РОБОТИ</span>`],
    [`<p class="box-text" style="font-size: 15px; color: #1a1a1a;">Пн — Пт, 10:00 — 18:00</p>`, `<p class="box-text" data-i18n="footer-hours" style="font-size: 15px; color: #1a1a1a;">Пн — Пт, 10:00 — 18:00</p>`]
];

replacements.forEach(([search, replace]) => {
    content = content.replace(search, replace);
});

fs.writeFileSync('index.html', content, 'utf8');
console.log("Updated index.html");
