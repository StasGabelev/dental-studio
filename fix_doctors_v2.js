const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

const newRenderDoctors = `function renderDoctors() {
    const area = document.getElementById('doctorsArea');
    if (!area) return;
    
    if (doctors.length === 0) {
        area.innerHTML = '<p class="editor-placeholder">Лікарі не додані</p>';
        return;
    }

    let html = '';
    doctors.forEach((doc, i) => {
        let photoSrc = doc.photo || '';
        // Fix path if it's a relative asset
        if (photoSrc && !photoSrc.startsWith('http') && !photoSrc.startsWith('blob:') && !photoSrc.startsWith('/')) {
            photoSrc = '/' + photoSrc;
        }

        html += \`<div class="doctor-card-admin">
            <div class="doctor-photo-admin" style="display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:40px;cursor:pointer;" onclick="uploadDoctorPhoto(\${i})">
                \${photoSrc ? \`<img src="\${photoSrc}" style="width:100%;height:100%;object-fit:cover;">\` : '📷'}
            </div>
            <div class="doctor-card-body">
                <input type="text" value="\${escapeAttr(doc.name)}" placeholder="ПІБ лікаря" onchange="doctors[\${i}].name=this.value">
                <input type="text" value="\${escapeAttr(doc.spec)}" placeholder="Спеціалізація" onchange="doctors[\${i}].spec=this.value">
            </div>
            <div class="doctor-card-actions">
                <button class="btn-outline" style="flex:1;" onclick="saveDoctor(\${i})">💾 Зберегти</button>
                <button class="btn-danger" onclick="deleteDoctor(\${i})">🗑️</button>
            </div>
        </div>\`;
    });

    area.innerHTML = html;
}`;

// Find the old function and replace it
const functionRegex = /function renderDoctors\(\) \{.*?\n\}/s;
src = src.replace(functionRegex, newRenderDoctors);

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('Cleanly replaced renderDoctors function.');
