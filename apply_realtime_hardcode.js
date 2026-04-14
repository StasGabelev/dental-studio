const fs = require('fs');

const SB_URL = 'https://ckldvntrsiacbjpiydmn.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGR2bnRyc2lhY2JqcGl5ZG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzMzMTUsImV4cCI6MjA5MTY0OTMxNX0.6zxRqTheJDt2BTb1hbAxQHCLZI8wT5xPus2Ad97AuMg';

// Fix dynamic-content.js
let dynamicJs = fs.readFileSync('dynamic-content.js', 'utf8');
const staticInit = `
    const PUBLIC_SB_URL = '${SB_URL}';
    const PUBLIC_SB_KEY = '${SB_KEY}';
    let sbClient = null;
    if (typeof supabase !== 'undefined') {
        sbClient = supabase.createClient(PUBLIC_SB_URL, PUBLIC_SB_KEY);
    }
`;
// Replace the localStorage logic with hardcoded one
dynamicJs = dynamicJs.replace(/\(async function initDynamicContent\(\) \{.*?\n\s+\n/s, `(async function initDynamicContent() {${staticInit}\n`);
// Note: I also need to make sure I reload content on change.
// I'll add a realtime subscriber at the end of initDynamicContent.

const realtimeCode = `
    // --- Realtime Subscription ---
    if (sbClient) {
        sbClient.channel('any')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content' }, payload => {
                console.log('Realtime update (content):', payload);
                window.location.reload(); // Simple way: reload page on change
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, payload => {
                console.log('Realtime update (doctors):', payload);
                window.location.reload();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'price_list' }, payload => {
                window.location.reload();
            })
            .subscribe();
    }
})();`;
dynamicJs = dynamicJs.replace(/\}\)\(\);$/, realtimeCode);
fs.writeFileSync('dynamic-content.js', dynamicJs, 'utf8');


// Fix chat-widget.js
let chatJs = fs.readFileSync('chat-widget.js', 'utf8');
chatJs = chatJs.replace(/const config = localStorage\.getItem\('ds_supabase'\);/, `const config = { url: '${SB_URL}', key: '${SB_KEY}' };`);
fs.writeFileSync('chat-widget.js', chatJs, 'utf8');

console.log('Hardcoded Supabase and enabled Realtime.');
