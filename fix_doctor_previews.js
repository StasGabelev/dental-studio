const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// Use regex to find and replace the image src logic in renderDoctors
const searchStr = /\$\{doc\.photo \? `<img src="\$\{doc\.photo\}" style="width:100%;height:100%;object-fit:cover;">` : '📷'\}/;
const replaceStr = `\${(()=>{
                const photoSrc = doc.photo ? ((!doc.photo.startsWith('http') && !doc.photo.startsWith('blob:') && !doc.photo.startsWith('/')) ? '/' + doc.photo : doc.photo) : '';
                return photoSrc ? \`<img src="\${photoSrc}" style="width:100%;height:100%;object-fit:cover;">\` : '📷';
            })()}`;

if (src.match(searchStr)) {
    src = src.replace(searchStr, replaceStr);
    fs.writeFileSync('admin/admin.js', src, 'utf8');
    console.log('Successfully fixed doctor photo preview path in admin.js');
} else {
    console.log('Could not find doctor photo preview line in admin.js');
}
