const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// Use regex to be line-ending agnostic
const regex = /(\s+\} else if \(field\.type === 'image'\) \{)\s+html \+= `(.*?)`;\s+\$\{val \? `(.*?)` : ''\}\s+(<div class="media-upload-hint">.*?<\/div>)\s+(<\/div>`;)/s;

// Wait, that's too complex. Let's just find the specific lines and replace them.

const oldBlock = /([ ]+\} else if \(field\.type === 'image'\) \{)\r?\n([ ]+html \+= `<div class="media-upload-box" onclick="triggerMediaUpload\('\$\{field\.key\}', 'image'\)" id="media-\$\{field\.key\}">`)\r?\n([ ]+\$\{val \? `<img src="\$\{val\}" style="max-width:100%;max-height:200px;border-radius:4px;">` : ''\})\r?\n([ ]+<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення<\/div>)\r?\n([ ]+<\/div>`;)/;

const match = src.match(oldBlock);
if (match) {
    const indent1 = match[1];
    const indent2 = match[2].match(/^ +/)[0];
    const indent3 = match[3].match(/^ +/)[0];
    const indent4 = match[4].match(/^ +/)[0];
    const indent5 = match[5].match(/^ +/)[0];
    
    const newBlock = `${indent1}
${indent2}const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:')) ? '../' + val : val;
${indent2}html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">\`;
${indent3}\${val ? \`<img src="\${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}
${indent4}<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>
${indent5}</div>\`;`;

    src = src.replace(match[0], newBlock);
    fs.writeFileSync('admin/admin.js', src, 'utf8');
    console.log('Successfully fixed image preview path in admin.js');
} else {
    console.log('Could not find image preview block using regex');
}
