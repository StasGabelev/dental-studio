const text = {
  "Hero Video": "Головне відео",
  "Interior Video": "Відео інтер'єру",
  "Hero Title": "Головний заголовок",
  "Hero Subtitle": "Підзаголовок",
  "Btn Book": "Кнопка: Записатися",
  "Feat Aesthetic": "Блок: Естетична стоматологія",
  "Feat Therapy": "Блок: Лікування зубів",
  "Feat Surgery": "Блок: Хірургія",
  "Feat Ortho": "Блок: Ортодонтія",
  "About P1": "Про нас: Абзац 1",
  "About P2": "Про нас: Абзац 2",
  "About More": "Кнопка: Дізнатися більше",
  "About Services": "Кнопка: Переглянути послуги",
  "Works Title": "Наші роботи: Заголовок",
  "Works Btn": "Кнопка: Переглянути всі роботи",
  "Contact Choice Title": "Контакти: Заголовок",
  "Contact Choice Subtitle": "Контакти: Підзаголовок",
  "Btn Online Booking": "Кнопка: Онлайн запис",
  "Btn Contact Hub": "Кнопка: Месенджери",
  "Map Title": "Карта: Заголовок",
  "Map Open Btn": "Кнопка: Відкрити карту",
  "Map Hours Label": "Графік: Заголовок",
  "Footer Hours": "Графік: Робочі години"
};

function toUnicode(str) {
    return str.split('').map(function (value) {
        if (value.charCodeAt(0) > 127) {
            let temp = value.charCodeAt(0).toString(16).toUpperCase();
            return '\\u' + ('0000' + temp).slice(-4);
        }
        return value;
    }).join('');
}

for (let key in text) {
    console.log(`"${key}" -> "${toUnicode(text[key])}"`);
}
