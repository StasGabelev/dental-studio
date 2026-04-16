// ============================================================
// DENTAL STUDIO - AI CHAT WIDGET (with contact form + logging)
// ============================================================

let chatHistory = [];
let isThinking = false;
let widgetSb = null;
let chatSessionId = null;
let clientContact = null;

// Init Supabase for widget
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

const PROVIDER_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    custom: null,
};

async function getAISettings() {
    // 1. Try local cache (from admin panel or previous fetch)
    try {
        const saved = localStorage.getItem('ds_ai_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Only return if valid (has at least provider)
            if (parsed && (parsed.provider || parsed.apiKey)) return parsed;
        }
    } catch(e) {}

    // 2. Fetch from Supabase (for public visitors)
    if (widgetSb) {
        try {
            const { data } = await widgetSb.from('ai_settings').select('*').limit(1).single();
            if (data) {
                const settings = {
                    provider: data.provider,
                    apiKey: data.api_key,
                    model: data.model,
                    systemPrompt: data.system_prompt,
                    customUrl: data.custom_url
                };
                localStorage.setItem('ds_ai_settings', JSON.stringify(settings));
                return settings;
            }
        } catch(err) {
            console.warn('Cannot fetch AI settings:', err.message);
        }
    }
    return null;
}

async function getKnowledgeBase() {
    let kb = "\u0406\u041d\u0424\u041e\u0420\u041c\u0410\u0426\u0406\u042f \u041f\u0420\u041e \u041a\u041b\u0406\u041d\u0406\u041a\u0423:\n" +
        "\u041d\u0430\u0437\u0432\u0430: Dental Studio\n" +
        "\u041c\u0456\u0441\u0442\u043e: \u0427\u0435\u0440\u043d\u0456\u0433\u0456\u0432, \u0423\u043a\u0440\u0430\u0457\u043d\u0430\n" +
        "\u0410\u0434\u0440\u0435\u0441\u0430: \u043f\u0440\u043e\u0441\u043f. \u041d\u0435\u0437\u0430\u043b\u0435\u0436\u043d\u043e\u0441\u0442\u0456, 21\n" +
        "\u0413\u0440\u0430\u0444\u0456\u043a: \u041f\u043d-\u041f\u0442, 10:00-18:00\n" +
        "\u0422\u0435\u043b\u0435\u0444\u043e\u043d: (077) 600 7 800\n";

    if (widgetSb) {
        try {
            const { data: prices } = await widgetSb.from('price_list')
                .select('service_name_uk, price_display, category')
                .eq('is_active', true).order('sort_order');
            if (prices && prices.length > 0) {
                kb += '\n\u041f\u041e\u0421\u041b\u0423\u0413\u0418 \u0422\u0410 \u0426\u0406\u041d\u0418:\n';
                prices.forEach(p => {
                    kb += `- ${p.service_name_uk} (${p.category}) - ${p.price_display}\n`;
                });
            }
            const { data: docs } = await widgetSb.from('doctors')
                .select('name_uk, specialization_uk').eq('is_active', true);
            if (docs && docs.length > 0) {
                kb += '\n\u041b\u0406\u041a\u0410\u0420\u0406:\n';
                docs.forEach(d => { kb += `- ${d.name_uk} - ${d.specialization_uk}\n`; });
            }
        } catch(e) { console.warn('KB error:', e); }
    }
    return kb;
}

// --- Save message to Supabase ---
async function saveChatMessage(role, content) {
    if (!widgetSb || !chatSessionId) return;
    try {
        await widgetSb.from('chat_messages').insert({
            session_id: chatSessionId,
            role: role,
            content: content
        });
        // Update last_message_at
        await widgetSb.from('chat_sessions')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', chatSessionId);
    } catch(e) { console.warn('Save chat msg error:', e); }
}

// --- Create chat session ---
async function createChatSession(contact, contactType) {
    if (!widgetSb) return null;
    try {
        const { data, error } = await widgetSb.from('chat_sessions').insert({
            client_contact: contact,
            contact_type: contactType
        }).select('id').single();
        if (data) return data.id;
    } catch(e) { console.warn('Create session error:', e); }
    return null;
}

// --- Handle contact form submit ---
window.submitChatContact = async function() {
    const emailInput = document.getElementById('chatContactEmail');
    const phoneInput = document.getElementById('chatContactPhone');
    const contactForm = document.getElementById('chatContactForm');
    const chatBody = document.getElementById('aiChatBody');
    const inputArea = document.querySelector('.ai-chat-input-area');

    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!email && !phone) {
        const err = document.getElementById('chatContactError');
        if (err) err.style.display = 'block';
        return;
    }

    const contact = email || phone;
    const contactType = email ? 'email' : 'phone';
    clientContact = contact;

    // Create session in Supabase
    chatSessionId = await createChatSession(contact, contactType);

    // Save session locally to remember user
    if (chatSessionId) {
        localStorage.setItem('ds_chat_contact', contact);
        localStorage.setItem('ds_chat_session', chatSessionId);
    }

    // Hide contact form, show chat
    if (contactForm) contactForm.style.display = 'none';
    if (chatBody) chatBody.style.display = 'block';
    if (inputArea) inputArea.style.display = 'flex';

    // Save the greeting as bot message
    const greeting = "\u0412\u0456\u0442\u0430\u044e! \u042f \u2014 AI-\u0430\u0441\u0438\u0441\u0442\u0435\u043d\u0442 Dental Studio. \ud83e\uddb7 \u041f\u0456\u0434\u043a\u0430\u0436\u0443 \u0432\u0456\u043b\u044c\u043d\u0438\u0439 \u0447\u0430\u0441 \u0434\u043b\u044f \u0437\u0430\u043f\u0438\u0441\u0443, \u0437\u043e\u0440\u0456\u0454\u043d\u0442\u0443\u044e \u043f\u043e \u0446\u0456\u043d\u0430\u0445 \u0456 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u043c \u043d\u0430 \u043f\u0438\u0442\u0430\u043d\u043d\u044f. \u0427\u0438\u043c \u043c\u043e\u0436\u0443 \u0434\u043e\u043f\u043e\u043c\u043e\u0433\u0442\u0438?";
    saveChatMessage('bot', greeting);
};

// --- Toggle Chat Window ---
window.toggleAIChat = function() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (chatWindow) chatWindow.classList.toggle('ai-chat-open');
};

// --- Handle Enter Key ---
window.handleAIChatEnter = function(e) {
    if (e.key === 'Enter') window.sendAIChatMsg();
};

// --- Send Message ---
window.sendAIChatMsg = async function() {
    if (isThinking) return;
    const input = document.getElementById('aiChatInput');
    const msg = input ? input.value.trim() : '';
    if (!msg) return;
    input.value = '';

    appendMessage(msg, 'user');
    chatHistory.push({ role: 'user', content: msg });
    saveChatMessage('user', msg);

    const thinkingEl = showThinking();
    isThinking = true;

    const settings = await getAISettings();
    if (!settings || !settings.apiKey) {
        if (thinkingEl) thinkingEl.remove();
        isThinking = false;
        const fallback = getFallbackReply(msg);
        appendMessage(fallback, 'bot');
        chatHistory.push({ role: 'assistant', content: fallback });
        saveChatMessage('bot', fallback);
        return;
    }

    try {
        const kb = await getKnowledgeBase();
        const sysPrompt = (settings.systemPrompt || '') + '\n\n' + kb;
        const reply = await callAI(settings, sysPrompt, chatHistory.slice(-10));
        if (thinkingEl) thinkingEl.remove();
        isThinking = false;
        appendMessage(reply, 'bot');
        chatHistory.push({ role: 'assistant', content: reply });
        saveChatMessage('bot', reply);
    } catch(err) {
        if (thinkingEl) thinkingEl.remove();
        isThinking = false;
        const fallback = getFallbackReply(msg);
        appendMessage(fallback, 'bot');
        chatHistory.push({ role: 'assistant', content: fallback });
        saveChatMessage('bot', fallback);
        console.error('AI error:', err);
    }
};

function getFallbackReply(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('\u0446\u0456\u043d') || lower.includes('\u0432\u0430\u0440\u0442') || lower.includes('\u043a\u043e\u0448\u0442') || lower.includes('price')) {
        return "\u0426\u0456\u043d\u0438 \u0437\u0430\u043b\u0435\u0436\u0430\u0442\u044c \u0432\u0456\u0434 \u043f\u043e\u0441\u043b\u0443\u0433\u0438 \u0442\u0430 \u0441\u043a\u043b\u0430\u0434\u043d\u043e\u0441\u0442\u0456 \u043a\u043b\u0456\u043d\u0456\u0447\u043d\u043e\u0433\u043e \u0432\u0438\u043f\u0430\u0434\u043a\u0443. \u0414\u043b\u044f \u0442\u043e\u0447\u043d\u043e\u0433\u043e \u0440\u043e\u0437\u0440\u0430\u0445\u0443\u043d\u043a\u0443 \u0437\u0430\u0445\u043e\u0434\u044c\u0442\u0435 \u043d\u0430 \u0431\u0435\u0437\u043a\u043e\u0448\u0442\u043e\u0432\u043d\u0443 \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u0446\u0456\u044e \u0430\u0431\u043e \u0437\u0430\u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443\u0439\u0442\u0435: (077) 600 7 800";
    }
    if (lower.includes('\u0430\u0434\u0440\u0435\u0441') || lower.includes('\u0434\u0435') || lower.includes('\u0437\u043d\u0430\u0445\u043e\u0434\u0438') || lower.includes('where')) {
        return "\u041c\u0438 \u0437\u043d\u0430\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u044c: \u043f\u0440\u043e\u0441\u043f. \u041d\u0435\u0437\u0430\u043b\u0435\u0436\u043d\u043e\u0441\u0442\u0456, 21, \u0427\u0435\u0440\u043d\u0456\u0433\u0456\u0432. \u0413\u0440\u0430\u0444\u0456\u043a: \u041f\u043d-\u041f\u0442 10:00-18:00. \u0422\u0435\u043b.: (077) 600 7 800";
    }
    if (lower.includes('\u0437\u0430\u043f\u0438\u0441') || lower.includes('\u0432\u0456\u043b\u044c\u043d') || lower.includes('\u0447\u0430\u0441') || lower.includes('book')) {
        return "\u0414\u043b\u044f \u0437\u0430\u043f\u0438\u0441\u0443 \u0437\u0430\u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443\u0439\u0442\u0435: (077) 600 7 800 \u0430\u0431\u043e \u043d\u0430\u0442\u0438\u0441\u043d\u0456\u0442\u044c \u043a\u043d\u043e\u043f\u043a\u0443 '\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u0438\u0441\u044f' \u043d\u0430 \u0441\u0430\u0439\u0442\u0456.";
    }
    return "\u0412\u0456\u0442\u0430\u044e! \u042f \u2014 AI-\u0430\u0441\u0438\u0441\u0442\u0435\u043d\u0442 Dental Studio. \u041c\u043e\u0436\u0443 \u0434\u043e\u043f\u043e\u043c\u043e\u0433\u0442\u0438 \u0437 \u043f\u0438\u0442\u0430\u043d\u043d\u044f\u043c\u0438 \u0449\u043e\u0434\u043e \u043f\u043e\u0441\u043b\u0443\u0433, \u0446\u0456\u043d \u0442\u0430 \u0437\u0430\u043f\u0438\u0441\u0443. \u0417\u0430\u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0443\u0439\u0442\u0435: (077) 600 7 800";
}

async function callAI(settings, sysPrompt, history) {
    const provider = settings.provider || 'openrouter';
    const model = settings.model || 'gpt-4o-mini';
    const apiKey = settings.apiKey;

    const messages = [{ role: 'system', content: sysPrompt }, ...history];

    let url = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openrouter;
    if (provider === 'google') url = url.replace('{model}', model);

    const headers = { 'Content-Type': 'application/json' };

    if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ model, max_tokens: 1024, messages: history, system: sysPrompt })
        });
        const data = await res.json();
        return data.content?.[0]?.text || 'Error';
    }

    if (provider === 'google') {
        const res = await fetch(url + '?key=' + apiKey, {
            method: 'POST',
            headers,
            body: JSON.stringify({ contents: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) })
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error';
    }

    // OpenAI-compatible (openai, deepseek, openrouter, custom)
    headers['Authorization'] = 'Bearer ' + apiKey;
    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://rozetka.space';
        headers['X-Title'] = 'Dental Studio AI';
    }

    const body = { model, messages, temperature: 0.7, max_tokens: 1024 };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Error';
}

function appendMessage(text, role) {
    const body = document.getElementById('aiChatBody');
    if (!body) return;
    const div = document.createElement('div');
    div.className = `ai-msg ${role === 'user' ? 'user-msg' : 'bot-msg'}`;
    div.innerHTML = text.replace(/\n/g, '<br>');
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function showThinking() {
    const body = document.getElementById('aiChatBody');
    if (!body) return null;
    const div = document.createElement('div');
    div.className = 'ai-msg bot-msg thinking-msg';
    div.innerHTML = '<span class="thinking-dots"><span>.</span><span>.</span><span>.</span></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
}

// --- Thinking animation CSS ---
(function addThinkingCSS() {
    const style = document.createElement('style');
    style.textContent = `
    .thinking-dots span { animation: blink 1.4s infinite; font-size: 24px; line-height: 1; }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink { 0%, 20% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
    #chatContactForm { padding: 20px; }
    #chatContactForm h4 { margin-bottom: 12px; font-size: 14px; color: #333; }
    #chatContactForm input { width: 100%; padding: 10px 12px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; font-family: inherit; box-sizing: border-box; }
    #chatContactForm input:focus { border-color: #c5a882; outline: none; }
    #chatContactForm .or-divider { text-align: center; color: #999; font-size: 12px; margin: 4px 0; }
    #chatContactForm button { width: 100%; padding: 10px; background: #c5a882; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
    #chatContactForm button:hover { background: #b89872; }
    #chatContactError { display: none; color: #e74c3c; font-size: 12px; margin-bottom: 8px; }`;
    document.head.appendChild(style);
})();

// --- DOM Auto-Injection ---
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.ai-chat-launcher')) {
        const launcher = document.createElement('div');
        launcher.className = 'ai-chat-launcher';
        launcher.onclick = window.toggleAIChat;
        launcher.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
        document.body.appendChild(launcher);
    }

    if (!document.getElementById('aiChatWindow')) {
        const chatWindow = document.createElement('div');
        chatWindow.className = 'ai-chat-window';
        chatWindow.id = 'aiChatWindow';
        chatWindow.innerHTML = [
            '<div class="ai-chat-header">',
            '<div><strong style="display:block">Dental Studio AI</strong>',
            '<span style="font-size:12px;opacity:0.7">\u0421\u043b\u0443\u0436\u0431\u0430 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u043a\u0438 24/7</span></div>',
            '<button class="ai-chat-close" onclick="window.toggleAIChat()">',
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
            '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            '</button></div>',
            // Contact form (shown first)
            '<div id="chatContactForm">',
            '<h4>\u0412\u043a\u0430\u0436\u0456\u0442\u044c email \u0430\u0431\u043e \u0442\u0435\u043b\u0435\u0444\u043e\u043d, \u0449\u043e\u0431 \u043f\u043e\u0447\u0430\u0442\u0438 \u0447\u0430\u0442:</h4>',
            '<div id="chatContactError">\u0412\u043a\u0430\u0436\u0456\u0442\u044c email \u0430\u0431\u043e \u0442\u0435\u043b\u0435\u0444\u043e\u043d</div>',
            '<input type="email" id="chatContactEmail" placeholder="Email">',
            '<div class="or-divider">\u0430\u0431\u043e</div>',
            '<input type="tel" id="chatContactPhone" placeholder="\u0422\u0435\u043b\u0435\u0444\u043e\u043d">',
            '<button onclick="window.submitChatContact()">\u041f\u043e\u0447\u0430\u0442\u0438 \u0447\u0430\u0442</button>',
            '</div>',
            // Chat body (hidden until contact submitted)
            '<div class="ai-chat-body" id="aiChatBody" style="display:none;">',
            '<div class="ai-msg bot-msg">\u0412\u0456\u0442\u0430\u044e! \u042f \u2014 AI-\u0430\u0441\u0438\u0441\u0442\u0435\u043d\u0442 Dental Studio. \ud83e\uddb7<br><br>',
            '\u041f\u0456\u0434\u043a\u0430\u0436\u0443 \u0432\u0456\u043b\u044c\u043d\u0438\u0439 \u0447\u0430\u0441 \u0434\u043b\u044f \u0437\u0430\u043f\u0438\u0441\u0443, ',
            '\u0437\u043e\u0440\u0456\u0454\u043d\u0442\u0443\u044e \u043f\u043e \u0446\u0456\u043d\u0430\u0445 \u0456 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u043c \u043d\u0430 \u043f\u0438\u0442\u0430\u043d\u043d\u044f. ',
            '\u0427\u0438\u043c \u043c\u043e\u0436\u0443 \u0434\u043e\u043f\u043e\u043c\u043e\u0433\u0442\u0438?</div>',
            '</div>',
            // Input area (hidden until contact submitted)
            '<div class="ai-chat-input-area" style="display:none;">',
            '<input type="text" id="aiChatInput" placeholder="\u041d\u0430\u043f\u0438\u0448\u0456\u0442\u044c \u0432\u0430\u0448\u0435 \u043f\u043e\u0432\u0456\u0434\u043e\u043c\u043b\u0435\u043d\u043d\u044f..." onkeypress="window.handleAIChatEnter(event)">',
            '<button class="ai-send-btn" onclick="window.sendAIChatMsg()">',
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
            '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
            '</button></div>'
        ].join('');
        document.body.appendChild(chatWindow);
    }
    
    // Auto-resume session if exists
    setTimeout(resumeChatSession, 500);
});

async function resumeChatSession() {
    const contact = localStorage.getItem('ds_chat_contact');
    const sessionId = localStorage.getItem('ds_chat_session');
    
    if (contact && sessionId) {
        const form = document.getElementById('chatContactForm');
        const body = document.getElementById('aiChatBody');
        const inputArea = document.querySelector('.ai-chat-input-area');
        
        if (form) form.style.display = 'none';
        if (body) body.style.display = 'block';
        if (inputArea) inputArea.style.display = 'flex';
        
        clientContact = contact;
        chatSessionId = sessionId;

        if (widgetSb) {
            try {
                const { data: msgs } = await widgetSb.from('chat_messages')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: true });
                    
                if (msgs && msgs.length > 0) {
                    body.innerHTML = '';
                    chatHistory = [];
                    msgs.forEach(m => {
                        appendMessage(m.content, m.role);
                        chatHistory.push({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content });
                    });
                }
            } catch(e) { console.warn('Could not load chat history', e); }
        }
    }
}

