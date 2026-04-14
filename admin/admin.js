// ============================================================
// DENTAL STUDIO ADMIN PANEL — v1.0.3 (Persistent Login + Defaults)
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
    if (config && config.url && config.key && typeof supabase !== 'undefined') {
        sb = supabase.createClient(config.url, config.key);
        return true;
    }
    return false;
}

initSupabase();

// ============================================================
// AUTH — persistent login (survives page refresh)
// ============================================================

async function handleLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');

    btn.disabled = true;
    btn.textContent = 'Завантаження...';
    errorEl.style.display = 'none';

    // Priority bypass 1234
    if (password === '1234') {
        localStorage.setItem('ds_admin_session', JSON.stringify({ email: email || 'admin@clinic', ts: Date.now() }));
        loginSuccess(email || 'admin@clinic');
        return;
    }

    if (sb) {
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            localStorage.setItem('ds_admin_session', JSON.stringify({ email: data.user.email, ts: Date.now() }));
            loginSuccess(data.user.email);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Увійти';
        }
    } else {
        errorEl.textContent = 'Підключіть Supabase або введіть пароль 1234';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Увійти';
    }
}

function loginSuccess(email) {
    document.getElementById('userEmail').textContent = email;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    loadDashboardData();
}

async function handleLogout() {
    localStorage.removeItem('ds_admin_session');
    if (sb) await sb.auth.signOut();
    location.reload();
}

// Auto-login on page load if session exists
(function autoLogin() {
    try {
        const sess = localStorage.getItem('ds_admin_session');
        if (sess) {
            const { email } = JSON.parse(sess);
            if (email) loginSuccess(email);
        }
    } catch(e) {}
})();

// ============================================================
// PAGE SCHEMA + DEFAULTS (hardcoded from live site)
// ============================================================

const PAGE_SCHEMA = {
    "home": [
        { "key": "hero-video", "label": "Головне відео (Hero)", "type": "video" },
        { "key": "hero-title", "label": "Головний заголовок", "type": "textarea" },
        { "key": "hero-subtitle", "label": "Підзаголовок Hero", "type": "textarea" },
        { "key": "btn-book", "label": "Кнопка: Записатися", "type": "text" },
        { "key": "feat-aesthetic", "label": "Послуга: Естетика", "type": "text" },
        { "key": "feat-therapy", "label": "Послуга: Терапія", "type": "text" },
        { "key": "feat-surgery", "label": "Послуга: Хірургія", "type": "text" },
        { "key": "feat-ortho", "label": "Послуга: Ортодонтія", "type": "text" },
        { "key": "interior-video", "label": "Відео інтер'єру", "type": "video" },
        { "key": "about-p1", "label": "Про нас: Абзац 1", "type": "textarea" },
        { "key": "about-p2", "label": "Про нас: Абзац 2", "type": "textarea" },
        { "key": "about-more", "label": "Кнопка: Дізнатися більше", "type": "text" },
        { "key": "about-services", "label": "Кнопка: Переглянути послуги", "type": "text" },
        { "key": "works-title", "label": "Заголовок: Наші роботи", "type": "text" },
        { "key": "works-btn", "label": "Кнопка: Всі роботи", "type": "text" },
        { "key": "form-title", "label": "Форма: Заголовок", "type": "text" },
        { "key": "form-subtitle", "label": "Форма: Підзаголовок", "type": "textarea" },
        { "key": "form-phone-label", "label": "Форма: Телефон-лейбл", "type": "text" },
        { "key": "form-name-placeholder", "label": "Форма: Плейсхолдер імені", "type": "text" },
        { "key": "form-phone-placeholder", "label": "Форма: Плейсхолдер телефону", "type": "text" },
        { "key": "form-comment-placeholder", "label": "Форма: Плейсхолдер коментаря", "type": "text" },
        { "key": "form-privacy", "label": "Форма: Текст приватності", "type": "textarea" },
        { "key": "form-btn", "label": "Форма: Кнопка", "type": "text" }
    ],
    "about": [
        { "key": "about-section-tag", "label": "Тег розділу", "type": "text" },
        { "key": "hero-title", "label": "Заголовок", "type": "text" },
        { "key": "about-p1", "label": "Основний опис", "type": "textarea" },
        { "key": "nav-works", "label": "Кнопка: Наші роботи", "type": "text" },
        { "key": "nav-services", "label": "Кнопка: Послуги", "type": "text" },
        { "key": "about-team-title", "label": "Заголовок команди", "type": "text" },
        { "key": "team-savchuk-name", "label": "Савчук: Ім'я", "type": "text" },
        { "key": "team-savchuk-role", "label": "Савчук: Посада", "type": "text" },
        { "key": "team-anatoliy-name", "label": "Анатолій: Ім'я", "type": "text" },
        { "key": "team-anatoliy-role", "label": "Анатолій: Посада", "type": "text" },
        { "key": "team-mariya-name", "label": "Марія: Ім'я", "type": "text" },
        { "key": "team-mariya-role", "label": "Марія: Посада", "type": "text" }
    ],
    "services": [],
    "cases": [],
    "contact": [],
    "footer": []
};

// Defaults — the real content currently on the live site
const PAGE_DEFAULTS = {
    "home": {
        "hero-video": "https://storage.googleapis.com/tokar_clinic_site/video/home-cover/web.mp4",
        "hero-title": "ІННОВАЦІЇ.\nЕСТЕТИКА.\nКОМФОРТ",
        "hero-subtitle": "Від ідеальної гігієни до імплантів 'під ключ'.",
        "btn-book": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        "feat-aesthetic": "Естетична стоматологія",
        "feat-therapy": "Лікування зубів",
        "feat-surgery": "Хірургія",
        "feat-ortho": "Ортодонтія",
        "interior-video": "assets/dental2.mp4",
        "about-p1": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",
        "about-p2": "Ми надаємо широкий спектр стоматологічних послуг найвищого рівня, в основі якого цифрова стоматологія та часть душі кожного з наших лікарів, що задають тенденції в сучасній стоматологіії.",
        "about-more": "ДІЗНАТИСЯ БІЛЬШЕ",
        "about-services": "ПЕРЕГЛЯНУТИ НАШІ ПОСЛУГИ",
        "works-title": "НАШІ РОБОТИ",
        "works-btn": "ПЕРЕГЛЯНУТИ УСІ РОБОТИ",
        "form-title": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ",
        "form-subtitle": "Залиште заявку і администратор зв'яжеться з Вами, або зателефонуйте нам особисто",
        "form-phone-label": "Зв'язатися з нами для консультації:",
        "form-name-placeholder": "Прізвище та ім'я",
        "form-phone-placeholder": "Номер телефону",
        "form-comment-placeholder": "Коментар",
        "form-privacy": "Погоджуюся на обробку персональних данных та з умовами політики конфіденційності",
        "form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"
    },
    "about": {
        "about-section-tag": "ПРО КЛІНІКУ",
        "hero-title": "Ми доповнюємо вашу красу",
        "about-p1": "Dental Studio — це стоматологічна клініка в Чернігові, що об'єднала однодумців, для яких краса та естетика вашої посмішки — сенс професійного життя.",
        "nav-works": "НАШІ РОБОТИ",
        "nav-services": "ПОСЛУГИ",
        "about-team-title": "НАША КОМАНДА",
        "team-savchuk-name": "АНДРІЙ САВЧУК",
        "team-savchuk-role": "Заступник головного лікаря. Художня реставрація зубів.",
        "team-anatoliy-name": "АНАТОЛІЙ ТОКАР",
        "team-anatoliy-role": "Засновник, головний лікар. Стоматолог-ортопед/хірург.",
        "team-mariya-name": "МАРІЯ ТОКАР",
        "team-mariya-role": "Стоматолог-терапевт. Естетична реставрація."
    }
};

let currentPage = 'home';

// ============================================================
// NAVIGATION
// ============================================================

function switchSection(sectionId, navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('sec-' + sectionId);
    if (target) target.classList.add('active');
    if (navEl) document.getElementById('sectionTitle').textContent = navEl.querySelector('span').textContent;

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

// ============================================================
// PAGE EDITOR — loads defaults first, then overrides from DB
// ============================================================

async function loadPageEditor(pageSlug) {
    const area = document.getElementById('pageEditorArea');
    const schema = PAGE_SCHEMA[pageSlug];
    if (!schema || schema.length === 0) {
        area.innerHTML = '<p class="editor-placeholder">Ця сторінка ще не налаштована в схемі</p>';
        return;
    }
    area.innerHTML = '<p class="editor-placeholder">⏳ Завантаження...</p>';

    // Step 1: start with hardcoded defaults (always available)
    const defaults = PAGE_DEFAULTS[pageSlug] || {};

    // Step 2: override with Supabase data if connected
    let dbData = {};
    if (sb) {
        try {
            const { data } = await sb.from('site_content').select('*').eq('page_slug', pageSlug);
            if (data) {
                data.forEach(r => {
                    dbData[r.section_key] = r.media_url || r.value_uk || '';
                });
            }
        } catch(e) {
            console.warn('DB load error:', e);
        }
    }

    // Merge: DB wins over defaults
    const merged = { ...defaults, ...dbData };

    let html = '';
    schema.forEach(field => {
        const val = merged[field.key] || '';
        html += '<div class="editor-field">';
        html += '<div class="editor-field-label">' + field.label + ' <small style="color:#555; font-weight:normal;">[' + field.key + ']</small></div>';

        if (field.type === 'text') {
            html += '<input type="text" data-key="' + field.key + '" value="' + escapeAttr(val) + '">';
        } else if (field.type === 'textarea') {
            html += '<textarea data-key="' + field.key + '" rows="3">' + escapeHtml(val) + '</textarea>';
        } else if (field.type === 'video' || field.type === 'image') {
            html += '<div style="display:flex; gap:8px; align-items:center;">';
            html += '<input type="text" data-key="' + field.key + '" value="' + escapeAttr(val) + '" style="flex:1;" placeholder="URL файлу">';
            html += '<button class="btn-outline" onclick="triggerMediaUpload(\'' + field.key + '\', \'' + field.type + '\')" style="padding:8px 12px; font-size:12px; white-space:nowrap;">📁 Файл</button>';
            html += '</div>';
            if (val) {
                if (field.type === 'video') {
                    html += '<video src="' + val + '" style="max-height:80px; margin-top:8px; border-radius:4px;" controls muted></video>';
                } else {
                    html += '<img src="' + val + '" style="max-height:80px; margin-top:8px; border-radius:4px;">';
                }
            }
        }
        html += '</div>';
    });

    html += '<div style="margin-top:30px;"><button class="btn-primary" id="savePageBtn" onclick="savePageContent(\'' + pageSlug + '\')">💾 Зберегти зміни</button>';
    if (!sb) html += '<p style="color:#f90; margin-top:10px; font-size:12px;">⚠️ Supabase не підключено — зміни не збережуться. Підключіть у розділі Supabase.</p>';
    html += '</div>';
    area.innerHTML = html;
}

async function savePageContent(pageSlug) {
    if (!sb) { showToast('❌ Підключіть Supabase для збереження'); return; }
    const fields = document.querySelectorAll('#pageEditorArea [data-key]');
    const btn = document.getElementById('savePageBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Зберігаємо...'; }

    const updates = Array.from(fields).map(f => {
        const k = f.dataset.key;
        const v = f.value;
        const isMedia = k.includes('video') || k.includes('img') || k.includes('photo');
        return {
            page_slug: pageSlug,
            section_key: k,
            content_type: isMedia ? 'video' : 'text',
            value_uk: v,
            media_url: isMedia ? v : null,
            updated_at: new Date().toISOString()
        };
    });

    try {
        const { error } = await sb.from('site_content').upsert(updates, { onConflict: 'page_slug,section_key' });
        if (error) throw error;
        showToast('✅ Збережено!');
    } catch(e) {
        showToast('❌ ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Зберегти зміни'; }
    }
}

async function triggerMediaUpload(key, type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !sb) { showToast('❌ Підключіть Supabase'); return; }
        showToast('⏳ Завантаження...');
        const path = 'uploads/' + currentPage + '/' + Date.now() + '_' + file.name;
        const { error } = await sb.storage.from('clinic-media').upload(path, file);
        if (error) { showToast('❌ ' + error.message); return; }
        const { data: { publicUrl } } = sb.storage.from('clinic-media').getPublicUrl(path);
        const field = document.querySelector('[data-key="' + key + '"]');
        if (field) field.value = publicUrl;
        showToast('✅ Завантажено. Натисніть "Зберегти".');
    };
    input.click();
}

// ============================================================
// STUBS for other sections (keep page functional)
// ============================================================
async function loadPriceList() {}
async function loadDoctors() {}
async function loadAISettings() {}
async function loadChatLogs() {}
async function loadDashboardData() {
    if (sb) {
        try {
            const { count } = await sb.from('chat_logs').select('*', { count: 'exact', head: true });
            document.getElementById('statChats').textContent = count || 0;
        } catch(e) {}
    }
}

// ============================================================
// UTILS
// ============================================================
function showToast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 3000); }
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function loadSetupForm() { var c = getSupabaseConfig(); if(c) { document.getElementById('sbUrl').value = c.url; document.getElementById('sbAnonKey').value = c.key; } }
function connectSupabase() { var url = document.getElementById('sbUrl').value; var key = document.getElementById('sbAnonKey').value; localStorage.setItem('ds_supabase', JSON.stringify({ url: url, key: key })); location.reload(); }
