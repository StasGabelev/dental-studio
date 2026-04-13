// ============================================================
// DENTAL STUDIO ADMIN PANEL — JavaScript Logic + Supabase
// ============================================================

// --- Supabase Client ---
let sb = null; 

// Global Error Handler for debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Global JS Error:', msg, lineNo);
    if (typeof showToast === 'function') {
        showToast(`❌ JS Error: ${msg} (line ${lineNo})`);
    }
};

function getSupabaseConfig() {
    try {
        const c = localStorage.getItem('ds_supabase');
        return c ? JSON.parse(c) : null;
    } catch(e) { return null; }
}

function initSupabase() {
    const config = getSupabaseConfig();
    if (config && config.url && config.key) {
        sb = supabase.createClient(config.url, config.key);
        return true;
    }
    return false;
}

// Try to init on load
initSupabase();

// --- State ---
let currentUser = null;
let currentSection = 'dashboard';
let currentPage = 'home';
let priceItems = [];
let doctors = [];

// --- Model options per provider ---
const MODEL_OPTIONS = {
    openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o-mini (дешево, швидко)' },
        { value: 'gpt-4o', label: 'GPT-4o (потужний)' },
    ],
    anthropic: [
        { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' }
    ],
    google: [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
    ]
};

// --- Page content schema ---
const PAGE_SCHEMA = {
    "home": [
        { "key": "hero-video", "label": "Головне відео", "type": "video" },
        { "key": "interior-video", "label": "Відео інтер'єру", "type": "video" },
        { "key": "hero-title", "label": "Головний заголовок", "type": "textarea" },
        { "key": "hero-subtitle", "label": "Підзаголовок", "type": "textarea" },
        { "key": "btn-book", "label": "Кнопка: Записатися", "type": "text" }
    ],
    "about": [],
    "services": [],
    "cases": [],
    "contact": [],
    "footer": []
};

// ============================================================
// AUTH
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

    if (sb) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
            // Check for 1234 fallback even if Supabase failed
            if (password === '1234') {
                loginSuccess({ email: email || 'admin' });
                return;
            }
            errorEl.textContent = 'Невірний email або пароль';
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Увійти';
            return;
        }
        loginSuccess(data.user);
    } else {
        // Fallback or demo
        if (password === '1234') {
            loginSuccess({ email: email || 'admin' });
        } else {
            errorEl.textContent = 'Підключіть Supabase або невірний пароль';
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Увійти';
        }
    }
}

function loginSuccess(user) {
    currentUser = user;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    loadDashboardData();
}

async function handleLogout() {
    if (sb) await sb.auth.signOut();
    currentUser = null;
    location.reload();
}

(async function checkAutoLogin() {
    if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            loginSuccess(session.user);
        }
    }
})();

// ============================================================
// NAVIGATION
// ============================================================

function switchSection(sectionId, navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('sec-' + sectionId);
    if (target) target.classList.add('active');
    currentSection = sectionId;
    
    if (sectionId === 'pages') loadPageEditor(currentPage);
    if (sectionId === 'setup') loadSetupForm();
    if (sectionId === 'dashboard') loadDashboardData();
}

// ============================================================
// PAGE EDITOR
// ============================================================

function selectPage(pageSlug, tabEl) {
    document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    currentPage = pageSlug;
    loadPageEditor(pageSlug);
}

async function loadPageEditor(pageSlug) {
    const area = document.getElementById('pageEditorArea');
    const schema = PAGE_SCHEMA[pageSlug] || [];
    area.innerHTML = 'Завантаження...';

    let existing = {};
    if (sb) {
        const { data } = await sb.from('site_content').select('*').eq('page_slug', pageSlug);
        data?.forEach(r => { existing[r.section_key] = r.media_url || r.value_uk || ''; });
    }

    let html = '';
    schema.forEach(field => {
        let val = existing[field.key] || '';
        html += `<div class="editor-field"><label>${field.label}</label>`;
        if (field.type === 'text') html += `<input type="text" data-key="${field.key}" value="${val}">`;
        else if (field.type === 'textarea') html += `<textarea data-key="${field.key}" rows="4">${val}</textarea>`;
        else if (field.type === 'video') {
            html += `<input type="text" data-key="${field.key}" value="${val}" placeholder="URL відео">`;
        }
        html += `</div>`;
    });
    html += `<button class="btn-primary" onclick="savePageContent('${pageSlug}')">Зберегти</button>`;
    area.innerHTML = html;
}

async function savePageContent(pageSlug) {
    const fields = document.querySelectorAll('#pageEditorArea [data-key]');
    const updates = Array.from(fields).map(f => ({
        page_slug: pageSlug, section_key: f.dataset.key, value_uk: f.value, updated_at: new Date().toISOString()
    }));
    if (sb) await sb.from('site_content').upsert(updates, { onConflict: 'page_slug,section_key' });
    showToast('Збережено!');
}

async function loadDashboardData() { 
    if (sb) {
        const { count } = await sb.from('chat_logs').select('*', { count: 'exact', head: true });
        document.getElementById('statChats').textContent = count || 0;
    }
}

function showToast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); }
function loadSetupForm() { 
    const c = getSupabaseConfig();
    if(c) { document.getElementById('sbUrl').value=c.url; document.getElementById('sbAnonKey').value=c.key; }
}
function connectSupabase() {
    const url = document.getElementById('sbUrl').value;
    const key = document.getElementById('sbAnonKey').value;
    localStorage.setItem('ds_supabase', JSON.stringify({ url, key }));
    location.reload();
}
