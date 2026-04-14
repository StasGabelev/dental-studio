// ============================================================
// DENTAL STUDIO ADMIN PANEL — JavaScript Logic + Supabase
// v1.0.2 (Full Schema Sync)
// ============================================================

let sb = null; 

function getSupabaseConfig() {
    try {
        const c = localStorage.getItem('ds_supabase');
        return c ? JSON.parse(c) : null;
    } catch(e) { return null; }
}

function initSupabase() {
    const config = getSupabaseConfig();
    if (config && config.url && config.key) {
        if (typeof supabase !== 'undefined') {
            sb = supabase.createClient(config.url, config.key);
            return true;
        }
    }
    return false;
}

initSupabase();

async function handleLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');

    btn.disabled = true;
    btn.textContent = 'Завантаження...';
    errorEl.style.display = 'none';

    if (password === '1234') {
        loginSuccess({ email: email || 'admin@dental-studio.com' });
        return;
    }

    if (sb) {
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            loginSuccess(data.user);
        } catch (err) {
            errorEl.textContent = 'Помилка: Невірні дані або пароль 1234';
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Увійти';
        }
    } else {
        errorEl.textContent = 'Підключіть Supabase або введіть 1234';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Увійти';
    }
}

function loginSuccess(user) {
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    loadDashboardData();
}

async function handleLogout() {
    if (sb) await sb.auth.signOut();
    location.reload();
}

const PAGE_SCHEMA = {
    "home": [
        { "key": "hero-video", "label": "Головне відео (Hero)", "type": "video" },
        { "key": "hero-title", "label": "Головний заголовок", "type": "textarea" },
        { "key": "hero-subtitle", "label": "Hero: Підзаголовок", "type": "textarea" },
        { "key": "btn-book", "label": "Кнопка: Запис на консультацію", "type": "text" },
        
        { "key": "feat-aesthetic", "label": "Послуга: Естетика", "type": "text" },
        { "key": "feat-therapy", "label": "Послуга: Терапія", "type": "text" },
        { "key": "feat-surgery", "label": "Послуга: Хірургія", "type": "text" },
        { "key": "feat-ortho", "label": "Послуга: Ортодонтія", "type": "text" },

        { "key": "interior-video", "label": "Відео інтер'єру", "type": "video" },
        { "key": "about-p1", "label": "Інтер'єр: Абзац 1", "type": "textarea" },
        { "key": "about-p2", "label": "Інтер'єр: Абзац 2", "type": "textarea" },
        { "key": "about-more", "label": "Кнопка: Дізнатися більше", "type": "text" },
        { "key": "about-services", "label": "Кнопка: Переглянути послуги", "type": "text" },

        { "key": "works-title", "label": "Заголовок: Наші роботи", "type": "text" },
        { "key": "works-btn", "label": "Кнопка: Переглянути всі роботи", "type": "text" },

        { "key": "form-title", "label": "Форма: Заголовок", "type": "text" },
        { "key": "form-subtitle", "label": "Форма: Підзаголовок", "type": "textarea" },
        { "key": "form-phone-label", "label": "Форма: Текст перед телефоном", "type": "text" },
        { "key": "form-name-placeholder", "label": "Форма: Плейсхолдер імені", "type": "text" },
        { "key": "form-phone-placeholder", "label": "Форма: Плейсхолдер телефону", "type": "text" },
        { "key": "form-comment-placeholder", "label": "Форма: Плейсхолдер коментаря", "type": "text" },
        { "key": "form-privacy", "label": "Форма: Текст приватності", "type": "textarea" },
        { "key": "form-btn", "label": "Форма: Текст кнопки", "type": "text" }
    ],
    "about": [
        { "key": "about-page-title", "label": "SEO Title сторінки", "type": "text" },
        { "key": "about-section-tag", "label": "Тег розділу (ПРО КЛІНІКУ)", "type": "text" },
        { "key": "hero-title", "label": "Головний заголовок", "type": "text" },
        { "key": "about-p1", "label": "Основний опис", "type": "textarea" },
        { "key": "nav-works", "label": "Кнопка: Наші роботи", "type": "text" },
        { "key": "nav-services", "label": "Кнопка: Послуги", "type": "text" },
        { "key": "about-team-title", "label": "Заголовок команди", "type": "text" }
    ],
    "services": [
        { "key": "svc-consult-title", "label": "Консультація: Заголовок", "type": "text" },
        { "key": "svc-consult-desc", "label": "Консультація: Опис", "type": "textarea" }
    ]
};

let currentPage = 'home';
let priceItems = [];
let doctors = [];

function switchSection(sectionId, navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('sec-' + sectionId);
    if (target) target.classList.add('active');
    document.getElementById('sectionTitle').textContent = navEl ? navEl.querySelector('span').textContent : sectionId;

    if (sectionId === 'pages') loadPageEditor(currentPage);
    if (sectionId === 'prices') loadPriceList();
    if (sectionId === 'doctors') loadDoctors();
    if (sectionId === 'setup') loadSetupForm();
    if (sectionId === 'ai-settings') loadAISettings();
    if (sectionId === 'chat-logs') loadChatLogs();
}

function selectPage(pageSlug, tabEl) {
    document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    currentPage = pageSlug;
    loadPageEditor(pageSlug);
}

async function loadPageEditor(pageSlug) {
    const area = document.getElementById('pageEditorArea');
    const schema = PAGE_SCHEMA[pageSlug];
    if (!schema) return;
    area.innerHTML = '<p class="editor-placeholder">⏳ Завантаження даних з бази...</p>';

    let existing = {};
    if (sb) {
        const { data, error } = await sb.from('site_content').select('*').eq('page_slug', pageSlug);
        if (data) {
            data.forEach(r => { 
                existing[r.section_key] = r.media_url || r.value_uk || ''; 
            });
        }
    }

    let html = '';
    schema.forEach(field => {
        const val = existing[field.key] || '';
        html += `<div class="editor-field"><div class="editor-field-label">${field.label} <small style="color:#666; font-weight:normal;">[${field.key}]</small></div>`;
        if (field.type === 'text') {
            html += `<input type="text" data-key="${field.key}" value="${escapeAttr(val)}">`;
        } else if (field.type === 'textarea') {
            html += `<textarea data-key="${field.key}" rows="3">${escapeHtml(val)}</textarea>`;
        } else if (field.type === 'image' || field.type === 'video') {
            html += `<div style="display:flex; gap:10px; align-items:center;">
                        <input type="text" data-key="${field.key}" value="${escapeAttr(val)}" style="flex:1;">
                        <button class="btn-outline" onclick="triggerMediaUpload('${field.key}', '${field.type}')" style="padding:10px; font-size:12px;">📁 Завантажити</button>
                     </div>`;
            if (val) {
                if (field.type === 'video') html += `<video src="${val}" style="max-height:60px; margin-top:5px;" controls></video>`;
                else html += `<img src="${val}" style="max-height:60px; margin-top:5px; border-radius:4px;">`;
            }
        }
        html += `</div>`;
    });
    html += `<div style="margin-top:30px;"><button class="btn-primary" onclick="savePageContent('${pageSlug}')">💾 Зберегти зміни</button></div>`;
    area.innerHTML = html;
}

async function savePageContent(pageSlug) {
    if (!sb) { showToast('❌ Підключіть Supabase'); return; }
    const fields = document.querySelectorAll('#pageEditorArea [data-key]');
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Зберігаємо...';

    const updates = Array.from(fields).map(f => {
        const k = f.dataset.key;
        const v = f.value;
        const isMedia = k.includes('video') || k.includes('img') || k.includes('photo');
        return {
            page_slug: pageSlug,
            section_key: k,
            value_uk: isMedia ? null : v,
            media_url: isMedia ? v : null,
            updated_at: new Date().toISOString()
        };
    });
    
    try {
        const { error } = await sb.from('site_content').upsert(updates, { onConflict: 'page_slug,section_key' });
        if (error) throw error;
        showToast('✅ Збережено успішно!');
        loadPageEditor(pageSlug);
    } catch(e) {
        showToast('❌ Помилка: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Зберегти зміни';
    }
}

async function triggerMediaUpload(key, type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !sb) return;
        showToast('⏳ Завантаження файлу...');
        const path = `uploads/${currentPage}/${Date.now()}_${file.name}`;
        const { data, error } = await sb.storage.from('clinic-media').upload(path, file);
        if (error) { showToast('❌ Помилка завантаження'); return; }
        const { data: { publicUrl } } = sb.storage.from('clinic-media').getPublicUrl(path);
        
        const field = document.querySelector(`[data-key="${key}"]`);
        if (field) field.value = publicUrl;
        showToast('✅ Завантажено! Натисніть "Зберегти"');
    };
    input.click();
}

// Stubs for other sections to keep code valid
async function loadPriceList() { /* ... */ }
async function loadDoctors() { /* ... */ }
async function loadAISettings() { /* ... */ }
async function loadChatLogs() { /* ... */ }
function loadSetupForm() { const c = getSupabaseConfig(); if(c) { document.getElementById('sbUrl').value=c.url; document.getElementById('sbAnonKey').value=c.key; } }
function connectSupabase() { const url = document.getElementById('sbUrl').value; const key = document.getElementById('sbAnonKey').value; localStorage.setItem('ds_supabase', JSON.stringify({ url, key })); location.reload(); }
async function loadDashboardData() { if (sb) { const { count } = await sb.from('chat_logs').select('*', { count: 'exact', head: true }); document.getElementById('statChats').textContent = count || 0; } }
function showToast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); }
function escapeHtml(s) { return s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { return s?.replace(/"/g, '&quot;'); }
