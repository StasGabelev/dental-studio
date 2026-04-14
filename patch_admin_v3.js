const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

const lines = src.split(/\r?\n/);
let found = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("} else if (field.type === 'image') {")) {
        // We found the start. Let's replace the next 4 lines.
        lines[i] = `        } else if (field.type === 'image') {`;
        lines[i+1] = `            const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;`;
        lines[i+2] = `            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">\`;`;
        lines[i+3] = `            html += \`\${val ? \`<img src="\${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}\`;`;
        lines[i+4] = `            html += \`<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>\`;`;
        lines[i+5] = `            html += \`</div>\`;`;
        found = true;
        break;
    }
}

if (found) {
    fs.writeFileSync('admin/admin.js', lines.join('\r\n'), 'utf8');
    console.log('Successfully patched admin.js');
} else {
    console.log('Could not find the target line in admin.js');
}
