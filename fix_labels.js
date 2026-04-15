const fs = require('fs');

let code = fs.readFileSync('admin/admin_v3.js', 'utf8');

// The typical line looks like:
// { "key": "price-consult-general", "label": "Ціна: Загальна консультація", "type": "text" }
// BUT for the price values it looks like:
// { "key": "price-consult-general-val", "label": "💰 Ціна: Загальна консультація", "type": "text" }

// We want to replace "Ціна:" with "Назва:" if there is no 💰 before it. Quick regex for exactly `label: "Ціна: `
// But wait, what if they don't have exactly that spacing?
// We can use a regex that matches: "key": "price-something" (not ending in val), "label": "Ціна: Something"

const updatedCode = code.replace(
    /\{\s*"key":\s*"([^"]+)"\s*,\s*"label":\s*"Ціна:\s([^"]+)"\s*,\s*"type":\s*"text"\s*\}/g,
    (match, key, labelValue) => {
        if (!key.endsWith('-val')) {
            return `{ "key": "${key}", "label": "Назва: ${labelValue}", "type": "text" }`;
        }
        return match; // Shouldn't happen if we're only matching exactly "Ціна: " because val has "💰 Ціна: "
    }
);

// We had some with `type="textarea"`! Let's just do a string replace on `"label": "Ціна: ` -> `"label": "Назва: ` globally
// Because all the actual price inputs have `"label": "💰 Ціна: ` now! 
// Let's verify this.

let lines = code.split('\n');
let modifiedLines = lines.map(line => {
    // If the line has "key": "price-" but does NOT have "-val", and has "label": "Ціна: "
    if (line.includes('"key": "price-') && !line.includes('-val"') && line.includes('"label": "Ціна: ')) {
        return line.replace('"label": "Ціна: ', '"label": "Назва: ');
    }
    return line;
});

fs.writeFileSync('admin/admin_v3.js', modifiedLines.join('\n'), 'utf8');
console.log('Done rewriting Назва: in admin_v3.js');
