const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// Add a helper button to copy config for the assistant
const syncSectionExtra = `
    <div class="settings-card" style="margin-top:20px; border: 1px dashed var(--primary);">
        <h3>🚀 Налаштування для Live-сайту</h3>
        <p>Щоб сайт оновлювався миттєво для всіх відвідувачів, натисніть ці кнопку та відправте мені код:</p>
        <button class="btn-primary" onclick="copyConfigForAI()">📋 Копіювати ключ для ШІ</button>
    </div>
`;

// Add the function to the end of admin.js
const copyFn = `
function copyConfigForAI() {
    const config = getSupabaseConfig();
    if (!config) {
        showToast('❌ Спочатку підключіть Supabase');
        return;
    }
    const text = 'URL: ' + config.url + '\\nKEY: ' + config.key;
    navigator.clipboard.writeText(text).then(() => {
        showToast('✅ Скопійовано! Відправте це мені в чат.');
    });
}
`;

// Insert the button into the Setup section
src = src.replace('<!-- Supabase Setup -->', '<!-- Supabase Setup -->' + syncSectionExtra);
src += copyFn;

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('Added copyConfigForAI to admin panel.');
