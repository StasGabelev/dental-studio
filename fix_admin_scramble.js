const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

const oldSection = `        } else if (field.type === 'image') {
            const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">\`;
            html += \`\${val ? \`<img src="\${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}\`;
            html += \`<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>\`;
            html += \`</div>\`;
            const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'video')" id="media-\${field.key}">
                \${val ? \`<video src="\${videoSrc}" style="max-width:100%;max-height:200px;" controls></video>\` : ''}
                <div class="media-upload-hint">🎥 Натисніть щоб завантажити відео</div>
            </div>\`;
        }`;

const newSection = `        } else if (field.type === 'image') {
            const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">\`;
            html += \`\${val ? \`<img src="\${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}\`;
            html += \`<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>\`;
            html += \`</div>\`;
        } else if (field.type === 'video') {
            const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'video')" id="media-\${field.key}">\`;
            html += \`\${val ? \`<video src="\${videoSrc}" style="max-width:100%;max-height:200px;" controls></video>\` : ''}\`;
            html += \`<div class="media-upload-hint">🎥 Натисніть щоб завантажити відео</div>\`;
            html += \`</div>\`;
        }`;

if (src.includes(oldSection.replace(/\r?\n/g, '\r\n'))) {
     src = src.replace(oldSection.replace(/\r?\n/g, '\r\n'), newSection.replace(/\r?\n/g, '\r\n'));
} else if (src.includes(oldSection.replace(/\r?\n/g, '\n'))) {
     src = src.replace(oldSection.replace(/\r?\n/g, '\n'), newSection.replace(/\r?\n/g, '\n'));
} else {
    // Failsafe: just find the specific mess
    src = src.replace(/html \+= `<\/div>`;\r?\n\s+const videoSrc =/, "html += `</div>`;\r\n        } else if (field.type === 'video') {\r\n            const videoSrc =");
}

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('Fixed scrambled image/video logic in admin.js');
