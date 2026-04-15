const fs = require('fs');

const adminJsPath = './admin/admin.js';
let content = fs.readFileSync(adminJsPath, 'utf8');

const oldRender = `    let html = '';
    schema.forEach(field => {
        if (field.type === 'heading') {
            html += \`<div class="editor-section-heading">\${field.label}</div>\`;
            return;
        }
        let val = existing[field.key] !== undefined ? existing[field.key] : '';
        if (!val && PAGE_DEFAULTS[pageSlug] && PAGE_DEFAULTS[pageSlug][field.key]) {
            val = PAGE_DEFAULTS[pageSlug][field.key];
        }
        html += \`<div class="editor-field">\`;
        html += \`<div class="editor-field-label">\${field.label}</div>\`;

        if (field.type === 'text') {
            html += \`<input type="text" data-key="\${field.key}" placeholder="\${field.label}" value="\${escapeAttr(val)}">\`;
        } else if (field.type === 'textarea') {
            html += \`<textarea data-key="\${field.key}" rows="3" placeholder="\${field.label}">\${escapeHtml(val)}</textarea>\`;
        } else if (field.type === 'image') {
            const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">\`;
            html += \`\${val ? \`<img src="\${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}\`;
            html += \`<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>\`;
            html += \`</div>\`;
        } else if (field.type === 'video') {
            const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
            html += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'video')" id="media-\${field.key}">\`;
            html += \`\${val ? \`<video src="\${videoSrc}" style="max-width:100%;max-height:200px;" controls></video>\` : ''}\`;
            html += \`<div class="media-upload-hint">🎥 Натисніть щоб завантажити відео</div>\`;
            html += \`</div>\`;
        }

        html += \`</div>\`;
    });`;

const newRender = `    let html = '';
    
    // Check if schema has headings for tab generation
    const hasTabs = schema.some(f => f.type === 'heading');
    
    if (hasTabs) {
        html += \`<div class="editor-inner-tabs">\`;
        let tabIndex = 0;
        schema.forEach((field) => {
            if (field.type === 'heading') {
                const activeClass = tabIndex === 0 ? 'active' : '';
                html += \`<button class="inner-tab-btn \${activeClass}" onclick="switchInnerTab(this, 'inner-tab-\${tabIndex}')">\${field.label}</button>\`;
                tabIndex++;
            }
        });
        html += \`</div>\`;
        
        let currentTabContentIndex = -1;
        
        schema.forEach(field => {
            if (field.type === 'heading') {
                if (currentTabContentIndex !== -1) {
                    html += \`</div>\`; // Close previous tab
                }
                currentTabContentIndex++;
                const display = currentTabContentIndex === 0 ? 'block' : 'none';
                html += \`<div class="inner-tab-content" id="inner-tab-\${currentTabContentIndex}" style="display:\${display};">\`;
                return;
            }
            
            html += renderEditorField(field, existing, PAGE_DEFAULTS, pageSlug);
        });
        
        if (currentTabContentIndex !== -1) {
            html += \`</div>\`; // close the last tab
        }
    } else {
        // Render normally if no tabs
        schema.forEach(field => {
            html += renderEditorField(field, existing, PAGE_DEFAULTS, pageSlug);
        });
    }

    // Helper to render a single field (put inside or near loadPageEditor)
`;

const newHelper = `
function renderEditorField(field, existing, defaults, pageSlug) {
    let val = existing[field.key] !== undefined ? existing[field.key] : '';
    if (!val && defaults[pageSlug] && defaults[pageSlug][field.key]) {
        val = defaults[pageSlug][field.key];
    }
    
    let out = \`<div class="editor-field">\`;
    out += \`<div class="editor-field-label">\${field.label}</div>\`;

    if (field.type === 'text') {
        out += \`<input type="text" data-key="\${field.key}" placeholder="\${field.label}" value="\${escapeAttr(val)}">\`;
    } else if (field.type === 'textarea') {
        out += \`<textarea data-key="\${field.key}" rows="3" placeholder="\${field.label}">\${escapeHtml(val)}</textarea>\`;
    } else if (field.type === 'image') {
        const imgSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
        out += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'image')" id="media-\${field.key}">\`;
        out += \`\${val ? \`<img src="\${imgSrc}" style="max-width:100%;max-height:200px;border-radius:4px;">\` : ''}\`;
        out += \`<div class="media-upload-hint">📷 Натисніть щоб завантажити зображення</div>\`;
        out += \`</div>\`;
    } else if (field.type === 'video') {
        const videoSrc = (val && !val.startsWith('http') && !val.startsWith('blob:') && !val.startsWith('/')) ? '/' + val : val;
        out += \`<div class="media-upload-box" onclick="triggerMediaUpload('\${field.key}', 'video')" id="media-\${field.key}">\`;
        out += \`\${val ? \`<video src="\${videoSrc}" style="max-width:100%;max-height:200px;" controls></video>\` : ''}\`;
        out += \`<div class="media-upload-hint">🎥 Натисніть щоб завантажити відео</div>\`;
        out += \`</div>\`;
    }

    out += \`</div>\`;
    return out;
}

window.switchInnerTab = function(btnEl, targetId) {
    // de-activate all tabs
    const container = btnEl.closest('.editor-area');
    container.querySelectorAll('.inner-tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.inner-tab-content').forEach(content => content.style.display = 'none');
    
    // activate chosen tab
    btnEl.classList.add('active');
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.style.display = 'block';
};
`;

content = content.replace(oldRender, newRender);
content += newHelper; 

fs.writeFileSync(adminJsPath, content, 'utf8');
console.log('Successfully injected inner tabs rendering! Updated lines in admin.js');
