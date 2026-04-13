// ============================================================
// DENTAL STUDIO — AI CHAT WIDGET
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

    let kb = `ІНФОРМАЦІЯ ПРО КЛІНІКУ:
Назва: Dental Studio
Місто: Чернігів, Україна
Адреса: Проспект Берестейський, 5В
Графік роботи: Пн — Пт, 10:00 — 18:00
Телефон: (077) 600 7 800\n`;

    // Try loading prices from Supabase
    if (widgetSb) {
        try {
            const { data: prices } = await widgetSb.from('price_list')
                .select('service_name_uk, price_display, category')
                .eq('is_active', true).order('sort_order');
            if (prices && prices.length > 0) {
                kb += '\nПОСЛУГИ ТА ЦІНИ:\n';
                prices.forEach(p => {
                    kb += `- ${p.service_name_uk} (${p.category}) — ${p.price_display}\n`;
                });
            }

            const { data: docs } = await widgetSb.from('doctors')
                .select('name_uk, specialization_uk')
                .eq('is_active', true);
            if (docs && docs.length > 0) {
                kb += '\nЛІКАРІ:\n';
                docs.forEach(d => {
                    kb += `- ${d.name_uk} — ${d.specialization_uk}\n`;
                });
            }
        } catch(e) {
            console.warn('KB Supabase error:', e);
        }
    }

    // Fallback static data if Supabase didn't provide
    if (!kb.includes('ПОСЛУГИ')) {
        kb += `\nПОСЛУГИ ТА ЦІНИ:
- Консультація лікаря — 500 грн
- Пломбування зуба — від 1200 грн
- Видалення зуба — від 800 грн
- Імплантація — від 15000 грн
- Професійне відбілювання — від 4500 грн
- Брекет-система — від 25000 грн
- Професійна гігієна (чистка) — від 1500 грн\n`;
    }
    if (!kb.includes('ЛІКАРІ')) {
        kb += `\nЛІКАРІ:
- Др. Іванов А.В. — Терапевт
- Др. Петрова О.М. — Хірург-імплантолог\n`;
    }

    kb += `\nВАЖЛИВО:
- Бот не ставить діагнози і не дає медичних рекомендацій
- При болю або невідкладних ситуаціях — порадити зателефонувати за номером (077) 600 7 800
- Завжди пропонувати записатися на консультацію`;

    dynamicKB = kb;
    return kb;
}

// --- Toggle Chat Window ---
function toggleAIChat() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (chatWindow) chatWindow.classList.toggle('active');
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
        appendMessage('Вибачте, сталася помилка. Спробуйте ще раз або зателефонуйте нам: (077) 600 7 800', 'bot');
    }

    isThinking = false;
}

// --- Call LLM API ---
async function callLLM(settings, userMessage) {
    const { provider, apiKey, model, systemPrompt, customUrl } = settings;

    const systemMsg = (systemPrompt || 'Ти — координатор стоматологічної клініки.') +
        '\n\nБАЗА ЗНАНЬ:\n' + await getKnowledgeBase();

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

// --- Mock responses (когда ИИ ещё не настроен в админке) ---
function respondWithMock(msg) {
    const lower = msg.toLowerCase();
    let reply = '';

    if (lower.includes('цін') || lower.includes('вартість') || lower.includes('скільки')) {
        reply = "Вартість консультації — 500 грн. Пломбування — від 1200 грн. Імплантація — від 15000 грн. Професійна гігієна — від 1500 грн.\n\nБажаєте записатися на консультацію? Я перевірю вільний час лікаря.";
    } else if (lower.includes('час') || lower.includes('записат') || lower.includes('сьогодні') || lower.includes('вільн') || lower.includes('запис')) {
        reply = "Сьогодні є віконце до терапевта о 16:30 та о 18:00. Також завтра зранку о 10:00 вільний хірург.\n\nЯкий час вам зручніше? Залиште ваш номер телефону, і я оформлю запис.";
    } else if (lower.includes('добрий') || lower.includes('привіт') || lower.includes('здравст') || lower.includes('хай')) {
        reply = "Добрий день! 😊 Я AI-координатор клініки Dental Studio.\n\nМожу допомогти з:\n• Інформацією про послуги та ціни\n• Записом до лікаря\n• Відповідями на питання\n\nЧим можу допомогти?";
    } else if (lower.includes('адрес') || lower.includes('де ви') || lower.includes('знайти') || lower.includes('як доїхати')) {
        reply = "📍 Ми знаходимося за адресою: Проспект Берестейський, 5В, Чернігів.\n\n🕐 Графік роботи: Пн — Пт, 10:00 — 18:00\n📞 Телефон: (077) 600 7 800\n\nЧекаємо на вас!";
    } else if (lower.includes('бол') || lower.includes('терміново') || lower.includes('аварійн')) {
        reply = "⚠️ Якщо у вас гострий біль — будь ласка, зателефонуйте нам одразу: (077) 600 7 800\n\nМи постараємося прийняти вас якнайшвидше!";
    } else {
        reply = "Дякую за запитання! Я можу допомогти з інформацією про наші послуги, ціни та запис до лікаря.\n\nЯкщо хочете отримати детальнішу консультацію — залиште ваш номер телефону, і наш адміністратор вам зателефонує 📞";
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
