const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'admin', 'admin.js');
let content = fs.readFileSync(adminPath, 'utf8');

const defaults = {
  "hero-video": "assets/dental-hero.mp4",
  "interior-video": "assets/dental2.mp4",
  "hero-title": "\u0406\u041D\u041D\u041E\u0412\u0410\u0426\u0406\u0407.<br>\u0415\u0421\u0422\u0415\u0422\u0418\u041A\u0410.<br>\u041A\u041E\u041C\u0424\u041E\u0420\u0422<svg width=\"60\" height=\"60\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.2\" class=\"heart-icon\"><path d=\"M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78v0z\"/></svg>",
  "hero-subtitle": "\u0412\u0456\u0434 \u0456\u0434\u0435\u0430\u043B\u044C\u043D\u043E\u0457 \u0433\u0456\u0433\u0456\u0454\u043D\u0438 \u0434\u043E \u0456\u043C\u043F\u043B\u0430\u043D\u0442\u0456\u0432 '\u043F\u0456\u0434 \u043A\u043B\u044E\u0447'.",
  "btn-book": "\u0417\u0410\u041F\u0418\u0421\u0410\u0422\u0418\u0421\u042F \u041D\u0410 \u041A\u041E\u041D\u0421\u0423\u041B\u042C\u0422\u0410\u0426\u0406\u042E",
  "feat-aesthetic": "\u0415\u0441\u0442\u0435\u0442\u0438\u0447\u043D\u0430 \u0441\u0442\u043E\u043C\u0430\u0442\\u043E\\u043B\\u043E\\u0433\\u0456\\u044F",
  "feat-therapy": "\u041B\u0456\u043A\u0443\u0432\u0430\u043D\u043D\u044F \u0437\u0443\u0431\u0456\u0432",
  "feat-surgery": "\u0425\u0456\u0440\u0443\u0440\u0433\u0456\\u044F",
  "feat-ortho": "\u041E\u0440\u0442\u043E\u0434\\u043E\\u043D\\u0442\\u0456\\u044F",
  "about-p1": "Dental Studio \u2014 \u0446\u0435 \u0441\u0442\u043E\u043C\u0430\u0442\\u043E\\u043B\\u043E\\u0433\u0456\u0447\u043D\u0430 \u043A\u043B\u0456\u043D\u0456\u043A\u0430 \u0432 \u0427\u0435\u0440\u043D\u0456\u0433\u043E\u0432\u0456, \u0449\u043E \u043E\u0431'\u0454\u0434\u043D\u0430\\u043B\u0430 \u043E\u0434\u043D\u043E\u0434\u0443\u043C\u0446\u0456\u0432, \u0434\u043B\u044F \u044F\u043A\u0438\u0445 \u043A\\u0440\u0430\u0441\u0430 \u0442\u0430 \u0435\u0441\u0442\u0435\u0442\\u0438\\u043A\u0430 \u0432\u0430\\u0448\\u043E\u0457 \u043F\u043E\\u0441\u043C\u0456\\u0448\\u043A\\u0438 \u2014 \u0441\u0435\u043D\u0441 \u043F\u0440\u043E\\u0444\u0435\\u0441\\u0456\u0439\u043D\u043E\\u0433\\u043E \u0436\u0438\\u0442\\u0442\u044F.",
  "about-p2": "\u041C\u0438 \u043D\u0430\u0434\u0430\u0454\u043C\u043E \u0448\u0438\\u0440\u043E\u043A\u0438\u0439 \u0441\u043F\u0435\u043A\\u0442\\u0440 \u0441\u0442\u043E\u043C\u0430\u0442\\u043E\\u043B\\u043E\\u0433\u0456\u0447\u043D\\u0438\u0445 \u043F\u043E\\u0441\\u043B\\u0443\u0433 \u043D\u0430\u0439\u0432\\u0438\u0449\u043E\u0433\\u043E \u0440\\u0456\u0432\\u043D\\u044F, \u0432 \u043E\\u0441\u043D\\u043E\u0432\u0456 \u044F\u043A\\u043E\u0433\\u043E \u0446\u0438\\u0444\\u0440\\u043E\u0432\u0430 \u0441\u0442\u043E\u043C\u0430\u0442\\u043E\\u043B\\u043E\\u0433\u0456\u044F \u0442\u0430 \u0447\u0430\\u0441\\u0442\\u044C \u0434\u0443\u0448\u0456 \u043A\u043E\u0436\\u043D\u043E\u0433\\u043E \u0437 \u043D\u0430\\u0448\u0438\u0445 \u043B\u0456\u043A\u0430\\u0440\u0456\u0432, \u0449\u043E \u0437\u0430\u0434\u0430\\u044E\\u0442\\u044C \\u0442\u0435\\u043D\u0434\u0435\\u043D\u0446\u0456\u0457 \u0432 \u0441\u0443\\u0447\u0430\\u0441\u043D\u0456\u0439 \u0441\u0442\u043E\u043C\u0430\u0442\\u043E\\u043B\\u043E\\u0433\u0456\u0456\u0457.",
  "about-more": "\u0414\u0406\u0417\u041D\u0410\u0422\u0418\\u0421\\u042F \u0411\u0406\u041B\\u042C\\u0428\u0415",
  "about-services": "\u041F\u0415\u0420\u0415\u0413\u041B\\u042F\u041D\u0423\\u0422\u0418 \u041D\u0410\u0428\u0406 \\u041F\u041E\u0421\u041B\u0423\u0413\u0418",
  "works-title": "\u041D\u0410\u0428\u0406 \u0420\u041E\u0411\u041E\u0422\\u0418",
  "works-btn": "\u041F\u0415\u0420\u0415\u0413\u041B\\u042F\u041D\u0423\\u0422\\u0418 \u0412\u0421\u0406 \\u0420\u041E\u0411\u041E\u0422\\u0418",
  "contact-choice-title": "\u0417\u0410\u041F\u0418\u0421\u0410\u0422\u0418\\u0421\\u042F \u041D\u0410 \\u041A\u041E\u041D\u0421\u0423\u041B\\u042C\\u0422\u0410\u0426\u0406\u042E",
  "contact-choice-subtitle": "\u0412\u0438\u0431\u0435\\u0440\u0456\u0442\u044C \\u043E\u043D\u043B\u0430\u0439\u043D-\u0437\u0430\u043F\\u0438\\u0441 \u0434\u043B\u044F \u043C\u0438\\u0442\u0442\u0454\\u0432\\u043E\u0433\u043E \u0431\\u0440\u043E\u043D\u044E\\u0432\u0430\u043D\u043D\u044F \u0447\u0430\\u0441\u0443,<br>\u0430\u0431\u043E \u043D\u0430\u043F\\u0438\u0448\u0456\u0442\u044C \u043D\u0430\u043C \u0443 \u043C\u0435\u0441\u0435\u043D\u0434\\u0436\u0435\u0440 \u0434\u043B\u044F \u043A\u043E\u043D\u0441\u0443\u043B\\u044C\\u0442\u0430\u0446\u0456\u0457.",
  "btn-online-booking": "\u041E\u041D\u041B\u0410\u0419\u041D \u0417\u0410\u041F\\u0418\\u0421",
  "btn-contact-hub": "\u0417\u0412'\u042F\u0417\u0410\\u0422\u0418\\u0421\\u042F \u0417 \u041D\u0410\u041C\\u0418",
  "map-title": "\u0414\u0415 \u041D\u0410\u0421 \u0417\u041D\u0410\\u0419\u0422\\u0418",
  "map-open-btn": "\u0412\u0456\u0434\u043A\\u0440\u0438\\u0442\u0438 \u043A\u0430\\u0440\u0442\u0443",
  "map-hours-label": "\u0413\u0420\u0410\u0424\u0406\u041A \\u0420\u041E\u0411\u041E\u0422\\u0418",
  "footer-hours": "\u041F\u043D \u2014 \u041F\\u0442, 10:00 \u2014 18:00"
};

// 1) Replace PAGE_SCHEMA.home fields safely
let result = content.replace(
      /"key":\s*"form-title"[\s\S]+?(?=\],)/,
      `"key": "contact-choice-title",
            "label": "Contact Choice Title",
            "type": "text"
        },
        {
            "key": "contact-choice-subtitle",
            "label": "Contact Choice Subtitle",
            "type": "textarea"
        },
        {
            "key": "btn-online-booking",
            "label": "Btn Online Booking",
            "type": "text"
        },
        {
            "key": "btn-contact-hub",
            "label": "Btn Contact Hub",
            "type": "text"
        },
        {
            "key": "map-title",
            "label": "Map Title",
            "type": "text"
        },
        {
            "key": "map-open-btn",
            "label": "Map Open Btn",
            "type": "text"
        },
        {
            "key": "map-hours-label",
            "label": "Map Hours Label",
            "type": "text"
        },
        {
            "key": "footer-hours",
            "label": "Footer Hours",
            "type": "text"
        }
    `
);

let pageSchemaStart = result.indexOf('const PAGE_SCHEMA = {');
let aboutStart = result.indexOf('"about": [', pageSchemaStart);
let homeSection = result.substring(pageSchemaStart, aboutStart);

for (const [key, value] of Object.entries(defaults)) {
    const keyRegex = new RegExp(`"key":\\s*"${key}"`, '');
    const match = homeSection.match(keyRegex);
    if (match) {
        const replaceRegex = new RegExp(`("key":\\s*"${key}",\\s*"label":\\s*"[^"]+",\\s*"type":\\s*"[^"]+")`, '');
        homeSection = homeSection.replace(replaceRegex, `$1,\n            "default": ${JSON.stringify(value)}`);
    }
}
result = result.substring(0, pageSchemaStart) + homeSection + result.substring(aboutStart);

// 2) Replace existing[field.key] initializer
result = result.replace(
    /const val = existing\[field\.key\] \|\| '';/g,
    `const val = (existing[field.key] !== undefined) ? existing[field.key] : (field.default || '');`
);

fs.writeFileSync(adminPath, result, 'utf8');
console.log("Fixed without cyrillic issues");
