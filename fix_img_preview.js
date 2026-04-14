const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// The code to find
const searchStr = `        } else if (field.type === 'image') {
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">
                \${val ? \`<img src="\${val}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}
                <div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>
            </div>\`;`;

// The code to replace with
const replaceStr = `        } else if (field.type === 'image') {
            const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">
                \${val ? \`<img src="\${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}
                <div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>
            </div>\`;`;

if (src.includes(searchStr)) {
    src = src.replace(searchStr, replaceStr);
    fs.writeFileSync('admin/admin.js', src, 'utf8');
    console.log('Successfully fixed image preview path in admin.js');
} else {
    console.log('Could not find image preview block in admin.js');
    // Try showing what it looks like to debug
    const part = src.substring(src.indexOf("field.type === 'image'") - 50, src.indexOf("field.type === 'image'") + 300);
    console.log('Context found:', JSON.stringify(part));
}
