const text = {
  "hero-title": "ІННОВАЦІЇ.<br>ЕСТЕТИКА.<br>КОМФОРТ<svg width=\"60\" height=\"60\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\" class=\"heart-icon\"><path d=\"M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78v0z\"/></svg>",
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
  "works-btn": "ПЕРЕГЛЯНУТИ ВСІ РОБОТИ",
  "contact-choice-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
  "contact-choice-subtitle": "Виберіть онлайн-запис для миттєвого бронювання часу,<br>або напишіть нам у месенджер для консультації.",
  "btn-online-booking": "ОНЛАЙН ЗАПИС",
  "btn-contact-hub": "ЗВ'ЯЗАТИСЯ З НАМИ",
  "map-title": "ДЕ НАС ЗНАЙТИ",
  "map-open-btn": "Відкрити карту",
  "map-hours-label": "ГРАФІК РОБОТИ",
  "footer-hours": "Пн — Пт, 10:00 — 18:00"
};

function toUnicode(str) {
    return str.split('').map(function (value, index, array) {
        let temp = value.charCodeAt(0).toString(16).toUpperCase();
        if (temp.length > 2) {
            return '\\u0' + temp;
        }
        return value;
    }).join('');
}

for (let key in text) {
    text[key] = toUnicode(text[key]);
}

console.log(JSON.stringify(text, null, 2));
