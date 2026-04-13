// ============================================================
// DENTAL STUDIO вЂ” AI CHAT WIDGET
// Connects to any LLM provider configured in Admin Panel
// ============================================================

// --- Chat State ---
let chatHistory = [];
let isThinking = false;
let chatSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
let widgetSb = null; // Supabase client for widget
let dynamicKB = null; // cached knowledge base from Supabase

// Init Supabase for widget (read-only, uses same config as admin)
(function initWidgetSupabase() {
    try {
        const c = localStorage.getItem('ds_supabase');
        if (c) {
            const config = JSON.parse(c);
            if (config.url && config.key && typeof supabase !== 'undefined') {
                widgetSb = supabase.createClient(config.url, config.key);
            }
        }
    } catch(e) {}
})();

// --- Provider API endpoints ---
const PROVIDER_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    custom: null, // set from admin
};

// --- Get AI settings from localStorage (shared with admin panel) ---
function getAISettings() {
    try {
        const saved = localStorage.getItem('ds_ai_settings');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
}

// --- Get Knowledge Base context (dynamic from Supabase or fallback) ---
async function getKnowledgeBase() {
    if (dynamicKB) return dynamicKB;

    let kb = `Р†РќР¤РћР РњРђР¦Р†РЇ РџР Рћ РљР›Р†РќР†РљРЈ:
РќР°Р·РІР°: Dental Studio
РњС–СЃС‚Рѕ: Р§РµСЂРЅС–РіС–РІ, РЈРєСЂР°С—РЅР°
РђРґСЂРµСЃР°: РџСЂРѕСЃРїРµРєС‚ Р‘РµСЂРµСЃС‚РµР№СЃСЊРєРёР№, 5Р’
Р“СЂР°С„С–Рє СЂРѕР±РѕС‚Рё: РџРЅ вЂ” РџС‚, 10:00 вЂ” 18:00
РўРµР»РµС„РѕРЅ: (077) 600 7 800\n`;

    // Try loading prices from Supabase
    if (widgetSb) {
        try {
            const { data: prices } = await widgetSb.from('price_list')
                .select('service_name_uk, price_display, category')
                .eq('is_active', true).order('sort_order');
            if (prices && prices.length > 0) {
                kb += '\nРџРћРЎР›РЈР“Р РўРђ Р¦Р†РќР:\n';
                prices.forEach(p => {
                    kb += `- ${p.service_name_uk} (${p.category}) вЂ” ${p.price_display}\n`;
                });
            }

            const { data: docs } = await widgetSb.from('doctors')
                .select('name_uk, specialization_uk')
                .eq('is_active', true);
            if (docs && docs.length > 0) {
                kb += '\nР›Р†РљРђР Р†:\n';
                docs.forEach(d => {
                    kb += `- ${d.name_uk} вЂ” ${d.specialization_uk}\n`;
                });
            }
        } catch(e) {
            console.warn('KB Supabase error:', e);
        }
    }

    // Fallback static data if Supabase didn't provide
    if (!kb.includes('РџРћРЎР›РЈР“Р')) {
        kb += `\nРџРћРЎР›РЈР“Р РўРђ Р¦Р†РќР:
- РљРѕРЅСЃСѓР»СЊС‚Р°С†С–СЏ Р»С–РєР°СЂСЏ вЂ” 500 РіСЂРЅ
- РџР»РѕРјР±СѓРІР°РЅРЅСЏ Р·СѓР±Р° вЂ” РІС–Рґ 1200 РіСЂРЅ
- Р’РёРґР°Р»РµРЅРЅСЏ Р·СѓР±Р° вЂ” РІС–Рґ 800 РіСЂРЅ
- Р†РјРїР»Р°РЅС‚Р°С†С–СЏ вЂ” РІС–Рґ 15000 РіСЂРЅ
- РџСЂРѕС„РµСЃС–Р№РЅРµ РІС–РґР±С–Р»СЋРІР°РЅРЅСЏ вЂ” РІС–Рґ 4500 РіСЂРЅ
- Р‘СЂРµРєРµС‚-СЃРёСЃС‚РµРјР° вЂ” РІС–Рґ 25000 РіСЂРЅ
- РџСЂРѕС„РµСЃС–Р№РЅР° РіС–РіС–С”РЅР° (С‡РёСЃС‚РєР°) вЂ” РІС–Рґ 1500 РіСЂРЅ\n`;
    }
    if (!kb.includes('Р›Р†РљРђР Р†')) {
        kb += `\nР›Р†РљРђР Р†:
- Р”СЂ. Р†РІР°РЅРѕРІ Рђ.Р’. вЂ” РўРµСЂР°РїРµРІС‚
- Р”СЂ. РџРµС‚СЂРѕРІР° Рћ.Рњ. вЂ” РҐС–СЂСѓСЂРі-С–РјРїР»Р°РЅС‚РѕР»РѕРі\n`;
    }

    kb += `\nР’РђР–Р›РР’Рћ:
- Р‘РѕС‚ РЅРµ СЃС‚Р°РІРёС‚СЊ РґС–Р°РіРЅРѕР·Рё С– РЅРµ РґР°С” РјРµРґРёС‡РЅРёС… СЂРµРєРѕРјРµРЅРґР°С†С–Р№
- РџСЂРё Р±РѕР»СЋ Р°Р±Рѕ РЅРµРІС–РґРєР»Р°РґРЅРёС… СЃРёС‚СѓР°С†С–СЏС… вЂ” РїРѕСЂР°РґРёС‚Рё Р·Р°С‚РµР»РµС„РѕРЅСѓРІР°С‚Рё Р·Р° РЅРѕРјРµСЂРѕРј (077) 600 7 800
- Р—Р°РІР¶РґРё РїСЂРѕРїРѕРЅСѓРІР°С‚Рё Р·Р°РїРёСЃР°С‚РёСЃСЏ РЅР° РєРѕРЅСЃСѓР»СЊС‚Р°С†С–СЋ`;

    dynamicKB = kb;
    return kb;
}

// --- Toggle Chat Window ---
function toggleAIChat() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (chatWindow) chatWindow.classList.toggle('ai-chat-open');
}

// --- Handle Enter Key ---
function handleAIChatEnter(e) {
    if (e.key === 'Enter') sendAIChatMsg();
}

// --- Send Message ---
async function sendAIChatMsg() {
    if (isThinking) return;

    const input = document.getElementById('aiChatInput');
    const msg = input.value.trim();
    if (!msg) return;

    const body = document.getElementById('aiChatBody');

    // Add user message
    appendMessage(msg, 'user');
    chatHistory.push({ role: 'user', content: msg });
    input.value = '';

    // Save to Supabase chat log
    saveChatLog(msg, 'user');

    // Check if AI is configured
    const settings = getAISettings();
    if (!settings || !settings.apiKey) {
        // Fallback to mock responses
        setTimeout(() => respondWithMock(msg), 800);
        return;
    }

    // Show thinking indicator
    isThinking = true;
    const thinkingEl = showThinking();

    try {
        const response = await callLLM(settings, msg);
        thinkingEl.remove();
        appendMessage(response, 'bot');
        chatHistory.push({ role: 'assistant', content: response });
        saveChatLog(response, 'bot');
    } catch (err) {
        thinkingEl.remove();
        console.error('AI Error:', err);
        appendMessage('Р’РёР±Р°С‡С‚Рµ, СЃС‚Р°Р»Р°СЃСЏ РїРѕРјРёР»РєР°. РЎРїСЂРѕР±СѓР№С‚Рµ С‰Рµ СЂР°Р· Р°Р±Рѕ Р·Р°С‚РµР»РµС„РѕРЅСѓР№С‚Рµ РЅР°Рј: (077) 600 7 800', 'bot');
    }

    isThinking = false;
}

// --- Call LLM API ---
async function callLLM(settings, userMessage) {
    const { provider, apiKey, model, systemPrompt, customUrl } = settings;

    const systemMsg = (systemPrompt || 'РўРё вЂ” РєРѕРѕСЂРґРёРЅР°С‚РѕСЂ СЃС‚РѕРјР°С‚РѕР»РѕРіС–С‡РЅРѕС— РєР»С–РЅС–РєРё.') +
        '\n\nР‘РђР—Рђ Р—РќРђРќР¬:\n' + await getKnowledgeBase();

    // Build messages array
    const messages = [
        { role: 'system', content: systemMsg },
        ...chatHistory.slice(-10), // Last 10 messages for context
        { role: 'user', content: userMessage }
    ];

    if (provider === 'anthropic') {
        return await callAnthropic(apiKey, model, systemMsg, userMessage);
    } else if (provider === 'google') {
        return await callGoogle(apiKey, model, systemMsg, userMessage);
    } else {
        // OpenAI-compatible (openai, deepseek, openrouter, custom)
        const endpoint = provider === 'custom' ? customUrl :
                         PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
        return await callOpenAICompatible(endpoint, apiKey, model, messages, provider);
    }
}

// --- OpenAI-compatible API (OpenAI, DeepSeek, OpenRouter, Custom) ---
async function callOpenAICompatible(endpoint, apiKey, model, messages, provider) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    // OpenRouter needs extra headers
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'Dental Studio AI';
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 500,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`API Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// --- Anthropic Claude API ---
async function callAnthropic(apiKey, model, systemPrompt, userMessage) {
    const msgs = chatHistory.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
    }));
    msgs.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: model,
            max_tokens: 500,
            system: systemPrompt,
            messages: msgs,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// --- Google Gemini API ---
async function callGoogle(apiKey, model, systemPrompt, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
                ...chatHistory.slice(-10).map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }],
                })),
                { role: 'user', parts: [{ text: userMessage }] },
            ],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Google Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// --- Mock responses (РєРѕРіРґР° РР РµС‰С‘ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ РІ Р°РґРјРёРЅРєРµ) ---
function respondWithMock(msg) {
    const lower = msg.toLowerCase();
    let reply = '';

    if (lower.includes('С†С–РЅ') || lower.includes('РІР°СЂС‚С–СЃС‚СЊ') || lower.includes('СЃРєС–Р»СЊРєРё')) {
        reply = "Р’Р°СЂС‚С–СЃС‚СЊ РєРѕРЅСЃСѓР»СЊС‚Р°С†С–С— вЂ” 500 РіСЂРЅ. РџР»РѕРјР±СѓРІР°РЅРЅСЏ вЂ” РІС–Рґ 1200 РіСЂРЅ. Р†РјРїР»Р°РЅС‚Р°С†С–СЏ вЂ” РІС–Рґ 15000 РіСЂРЅ. РџСЂРѕС„РµСЃС–Р№РЅР° РіС–РіС–С”РЅР° вЂ” РІС–Рґ 1500 РіСЂРЅ.\n\nР‘Р°Р¶Р°С”С‚Рµ Р·Р°РїРёСЃР°С‚РёСЃСЏ РЅР° РєРѕРЅСЃСѓР»СЊС‚Р°С†С–СЋ? РЇ РїРµСЂРµРІС–СЂСЋ РІС–Р»СЊРЅРёР№ С‡Р°СЃ Р»С–РєР°СЂСЏ.";
    } else if (lower.includes('С‡Р°СЃ') || lower.includes('Р·Р°РїРёСЃР°С‚') || lower.includes('СЃСЊРѕРіРѕРґРЅС–') || lower.includes('РІС–Р»СЊРЅ') || lower.includes('Р·Р°РїРёСЃ')) {
        reply = "РЎСЊРѕРіРѕРґРЅС– С” РІС–РєРѕРЅС†Рµ РґРѕ С‚РµСЂР°РїРµРІС‚Р° Рѕ 16:30 С‚Р° Рѕ 18:00. РўР°РєРѕР¶ Р·Р°РІС‚СЂР° Р·СЂР°РЅРєСѓ Рѕ 10:00 РІС–Р»СЊРЅРёР№ С…С–СЂСѓСЂРі.\n\nРЇРєРёР№ С‡Р°СЃ РІР°Рј Р·СЂСѓС‡РЅС–С€Рµ? Р—Р°Р»РёС€С‚Рµ РІР°С€ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅСѓ, С– СЏ РѕС„РѕСЂРјР»СЋ Р·Р°РїРёСЃ.";
    } else if (lower.includes('РґРѕР±СЂРёР№') || lower.includes('РїСЂРёРІС–С‚') || lower.includes('Р·РґСЂР°РІСЃС‚') || lower.includes('С…Р°Р№')) {
        reply = "Р”РѕР±СЂРёР№ РґРµРЅСЊ! рџЉ РЇ AI-РєРѕРѕСЂРґРёРЅР°С‚РѕСЂ РєР»С–РЅС–РєРё Dental Studio.\n\nРњРѕР¶Сѓ РґРѕРїРѕРјРѕРіС‚Рё Р·:\nвЂў Р†РЅС„РѕСЂРјР°С†С–С”СЋ РїСЂРѕ РїРѕСЃР»СѓРіРё С‚Р° С†С–РЅРё\nвЂў Р—Р°РїРёСЃРѕРј РґРѕ Р»С–РєР°СЂСЏ\nвЂў Р’С–РґРїРѕРІС–РґСЏРјРё РЅР° РїРёС‚Р°РЅРЅСЏ\n\nР§РёРј РјРѕР¶Сѓ РґРѕРїРѕРјРѕРіС‚Рё?";
    } else if (lower.includes('Р°РґСЂРµСЃ') || lower.includes('РґРµ РІРё') || lower.includes('Р·РЅР°Р№С‚Рё') || lower.includes('СЏРє РґРѕС—С…Р°С‚Рё')) {
        reply = "рџ“Ќ РњРё Р·РЅР°С…РѕРґРёРјРѕСЃСЏ Р·Р° Р°РґСЂРµСЃРѕСЋ: РџСЂРѕСЃРїРµРєС‚ Р‘РµСЂРµСЃС‚РµР№СЃСЊРєРёР№, 5Р’, Р§РµСЂРЅС–РіС–РІ.\n\nрџ•ђ Р“СЂР°С„С–Рє СЂРѕР±РѕС‚Рё: РџРЅ вЂ” РџС‚, 10:00 вЂ” 18:00\nрџ“ћ РўРµР»РµС„РѕРЅ: (077) 600 7 800\n\nР§РµРєР°С”РјРѕ РЅР° РІР°СЃ!";
    } else if (lower.includes('Р±РѕР»') || lower.includes('С‚РµСЂРјС–РЅРѕРІРѕ') || lower.includes('Р°РІР°СЂС–Р№РЅ')) {
        reply = "вљ пёЏ РЇРєС‰Рѕ Сѓ РІР°СЃ РіРѕСЃС‚СЂРёР№ Р±С–Р»СЊ вЂ” Р±СѓРґСЊ Р»Р°СЃРєР°, Р·Р°С‚РµР»РµС„РѕРЅСѓР№С‚Рµ РЅР°Рј РѕРґСЂР°Р·Сѓ: (077) 600 7 800\n\nРњРё РїРѕСЃС‚Р°СЂР°С”РјРѕСЃСЏ РїСЂРёР№РЅСЏС‚Рё РІР°СЃ СЏРєРЅР°Р№С€РІРёРґС€Рµ!";
    } else {
        reply = "Р”СЏРєСѓСЋ Р·Р° Р·Р°РїРёС‚Р°РЅРЅСЏ! РЇ РјРѕР¶Сѓ РґРѕРїРѕРјРѕРіС‚Рё Р· С–РЅС„РѕСЂРјР°С†С–С”СЋ РїСЂРѕ РЅР°С€С– РїРѕСЃР»СѓРіРё, С†С–РЅРё С‚Р° Р·Р°РїРёСЃ РґРѕ Р»С–РєР°СЂСЏ.\n\nРЇРєС‰Рѕ С…РѕС‡РµС‚Рµ РѕС‚СЂРёРјР°С‚Рё РґРµС‚Р°Р»СЊРЅС–С€Сѓ РєРѕРЅСЃСѓР»СЊС‚Р°С†С–СЋ вЂ” Р·Р°Р»РёС€С‚Рµ РІР°С€ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅСѓ, С– РЅР°С€ Р°РґРјС–РЅС–СЃС‚СЂР°С‚РѕСЂ РІР°Рј Р·Р°С‚РµР»РµС„РѕРЅСѓС” рџ“ћ";
    }

    appendMessage(reply, 'bot');
    chatHistory.push({ role: 'assistant', content: reply });
    saveChatLog(reply, 'bot');
}

// --- Save chat log to Supabase ---
function saveChatLog(message, role) {
    if (!widgetSb) return;
    widgetSb.from('chat_logs').insert({
        session_id: chatSessionId,
        role: role,
        message: message,
    }).then(() => {}).catch(() => {});
}

// --- DOM helpers ---
function appendMessage(text, role) {
    const body = document.getElementById('aiChatBody');
    const div = document.createElement('div');
    div.className = `ai-msg ${role === 'user' ? 'user-msg' : 'bot-msg'}`;
    div.innerHTML = text.replace(/\n/g, '<br>');
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function showThinking() {
    const body = document.getElementById('aiChatBody');
    const div = document.createElement('div');
    div.className = 'ai-msg bot-msg thinking-msg';
    div.innerHTML = '<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
}

// --- Add thinking animation CSS ---
(function addThinkingCSS() {
    const style = document.createElement('style');
    style.textContent = `
    .thinking-dots span {
        animation: blink 1.4s infinite;
        font-size: 24px;
        line-height: 1;
    }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink {
        0%, 20% { opacity: 0.2; }
        50% { opacity: 1; }
        100% { opacity: 0.2; }
    }`;
    document.head.appendChild(style);
})();


// --- DOM Auto-Injection for AI Chat ---
document.addEventListener('DOMContentLoaded', () => {
    // Inject launcher
    if (!document.querySelector('.ai-chat-launcher')) {
        const launcher = document.createElement('div');
        launcher.className = 'ai-chat-launcher';
        launcher.setAttribute('onclick', 'window.toggleAIChat()');
        launcher.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>`;
        document.body.appendChild(launcher);
    }

    // Inject window
    if (!document.getElementById('aiChatWindow')) {
        const chatWindow = document.createElement('div');
        chatWindow.className = 'ai-chat-window';
        chatWindow.id = 'aiChatWindow';
        chatWindow.innerHTML = `<div class="ai-chat-header">
                <div>
                    <strong style="display:block">Dental Studio AI</strong>
                    <span style="font-size:12px;opacity:0.8">Служба підтримки 24/7</span>
                </div>
                <button class="ai-chat-close" onclick="window.toggleAIChat()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="ai-chat-body" id="aiChatBody">
                <div class="ai-msg bot-msg">
                    Вітаю! Я — AI-асистент клініки Dental Studio. ??<br><br>Підкажу вільний час для запису, зорієнтую по цінах і відповім на питання щодо послуг. Чим можу допомогти?
                </div>
            </div>
            <div class="ai-chat-input-area">
                <input type="text" id="aiChatInput" placeholder="Напишіть ваше повідомлення..." onkeypress="window.handleAIChatEnter(event)">
                <button class="ai-send-btn" onclick="window.sendAIChatMsg()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>`;
        document.body.appendChild(chatWindow);
    }
});


