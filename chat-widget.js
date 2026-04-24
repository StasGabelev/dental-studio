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
        const defaultUrl = 'https://ckldvntrsiacbjpiydmn.supabase.co';
        const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGR2bnRyc2lhY2JqcGl5ZG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzMzMTUsImV4cCI6MjA5MTY0OTMxNX0.6zxRqTheJDt2BTb1hbAxQHCLZI8wT5xPus2Ad97AuMg';

        const c = localStorage.getItem('ds_supabase');
        let url = defaultUrl;
        let key = defaultKey;
        
        if (c) {
            const config = JSON.parse(c);
            if (config.url) url = config.url;
            if (config.key) key = config.key;
        }

        if (url && key && typeof supabase !== 'undefined') {
            widgetSb = supabase.createClient(url, key);
        }
    } catch(e) { console.error('Widget init error:', e); }
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
    try {
        const saved = localStorage.getItem('ds_ai_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.provider || parsed.apiKey)) return parsed;
        }
    } catch(e) {}

    if (widgetSb) {
        try {
            const { data } = await widgetSb.from('ai_settings').select('*').limit(1).single();
            if (data) {
                const settings = {
                    provider: data.provider,
                    apiKey: data.api_key,
                    model: data.model,
                    customUrl: data.custom_url,
                    knowledgeManual: data.knowledge_base_manual,
                    tgBotToken: data.tg_bot_token,
                    tgChatId: data.tg_chat_id,
                    viberBotToken: data.viber_bot_token,
                    waLink: data.wa_link
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

async function getKnowledgeBase(settings) {
    let kb = "ОСНОВНАЯ ИНФОРМАЦИЯ О КЛИНИКЕ DENTAL STUDIO:\n" +
        "- Город: Чернигов, Украина\n" +
        "- Адрес: просп. Независимости, 21\n" +
        "- График: Пн-Пт, 10:00-18:00\n" +
        "- Телефон: (077) 600 7 800\n";

    if (settings && settings.knowledgeManual) {
        kb += "\nСПЕЦИАЛЬНЫЕ ПРАВИЛА И ИНСТРУКЦИИ КЛИНИКИ (ПРИОРИТЕТ):\n" + settings.knowledgeManual + "\n";
    }

    if (widgetSb) {
        try {
            const { data: prices } = await widgetSb.from('price_list').select('service_name_uk, price_display, category').eq('is_active', true).order('sort_order');
            if (prices && prices.length > 0) {
                kb += '\nУСЛУГИ И ЦЕНЫ:\n';
                prices.forEach(p => { kb += `- ${p.service_name_uk} (${p.category}) - ${p.price_display}\n`; });
            }
            const { data: docs } = await widgetSb.from('doctors').select('name_uk, specialization_uk').eq('is_active', true);
            if (docs && docs.length > 0) {
                kb += '\nВРАЧИ И СПЕЦИАЛИЗАЦИЯ:\n';
                docs.forEach(d => { kb += `- ${d.name_uk} - ${d.specialization_uk}\n`; });
            }
        } catch(e) { console.warn('KB error:', e); }
    }
    return kb;
}

async function saveChatMessage(role, content) {
    if (!widgetSb || !chatSessionId) return;
    try {
        await widgetSb.from('chat_messages').insert({ session_id: chatSessionId, role, content });
        await widgetSb.from('chat_sessions').update({ last_message_at: new Date().toISOString() }).eq('id', chatSessionId);
    } catch(e) {}
}

async function createChatSession(contact, contactType) {
    if (!widgetSb) return null;
    try {
        const { data, error } = await widgetSb.from('chat_sessions').insert({ client_contact: contact, contact_type: contactType }).select('id').single();
        if (data) return data.id;
    } catch(e) {}
    return null;
}

window.submitChatContact = async function() {
    const emailInput = document.getElementById('chatContactEmail');
    const phoneInput = document.getElementById('chatContactPhone');
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!email && !phone) {
        const err = document.getElementById('chatContactError');
        if (err) err.style.display = 'block';
        return;
    }

    const contact = email || phone;
    chatSessionId = await createChatSession(contact, email ? 'email' : 'phone');

    if (chatSessionId) {
        localStorage.setItem('ds_chat_contact', contact);
        localStorage.setItem('ds_chat_session', chatSessionId);
        document.getElementById('chatContactForm').style.display = 'none';
        document.getElementById('aiChatBody').style.display = 'block';
        document.querySelector('.ai-chat-input-area').style.display = 'flex';
        saveChatMessage('bot', "Вітаю! Я — AI-асистент Dental Studio. 🦷 Чим можу допомогти?");
    }
};

window.startWebChat = function() {
    document.getElementById('chatPlatformSelector').style.display = 'none';
    document.getElementById('chatContactForm').style.display = 'block';
};

window.openMessenger = function(platform) {
    getAISettings().then(async settings => {
        let url = '';
        let socialData = {};
        if (widgetSb) {
            try {
                const { data } = await widgetSb.from('site_content').select('section_key, value_uk').eq('page_slug', 'social');
                if (data) data.forEach(item => { socialData[item.section_key] = item.value_uk; });
            } catch(e) {}
        }
        const waPhone = socialData['whatsapp-phone'] || '380776007800';
        const vPhone = socialData['viber-phone'] || '380776007800';
        const tgUser = socialData['telegram-username'] || (settings ? settings.tgBotUsername : null) || 'dentalstudioche';
        if (platform === 'telegram') url = `https://t.me/${tgUser.replace('@','')}`;
        if (platform === 'viber') url = `viber://add?number=${vPhone.replace(/\D/g, '')}`;
        if (platform === 'whatsapp') url = `https://wa.me/${waPhone.replace(/\D/g, '')}`;
        if (url) window.open(url, '_blank');
    });
};

window.toggleAIChat = function() {
    const chatWindow = document.getElementById('aiChatWindow');
    if (chatWindow) {
        const isOpen = chatWindow.classList.toggle('ai-chat-open');
        if (isOpen) {
            setTimeout(() => {
                const input = document.getElementById('aiChatInput') || document.getElementById('chatContactPhone');
                if (input) input.focus();
            }, 400);
        }
    }
};

window.handleAIChatEnter = function(e) { if (e.key === 'Enter') window.sendAIChatMsg(); };

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
        saveChatMessage('bot', fallback);
        return;
    }
    try {
        const kb = await getKnowledgeBase(settings);
        const sysPrompt = `ТЫ — Ассистент Dental Studio. БАЗА ЗНАНИЙ:\n${kb}`;
        let reply = await callAI(settings, sysPrompt, chatHistory.slice(-10));
        if (thinkingEl) thinkingEl.remove();
        isThinking = false;
        appendMessage(reply, 'bot');
        saveChatMessage('bot', reply);
    } catch(err) {
        if (thinkingEl) thinkingEl.remove();
        isThinking = false;
        appendMessage(getFallbackReply(msg), 'bot');
    }
};

async function callAI(settings, sysPrompt, history) {
    const res = await fetch('https://rozetka.space/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: history[history.length - 1].content, sessionId: chatSessionId })
    });
    const data = await res.json();
    return data.reply || 'Error';
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

(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
    .ai-chat-launcher { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #c5a882; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 10000; transition: transform 0.3s; }
    .ai-chat-window { position: fixed; bottom: 100px; right: 30px; width: 380px; height: 600px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; z-index: 10001; font-family: 'Montserrat', sans-serif; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; transform: translateY(20px); box-sizing: border-box; }
    .ai-chat-window * { box-sizing: border-box; }
    .ai-chat-window.ai-chat-open { display: flex; opacity: 1; transform: translateY(0); }
    .ai-chat-header { background: #fff; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #c5a882; }
    .ai-chat-close { background: none; border: none; cursor: pointer; }
    .ai-chat-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; background: #fcfcfc; }
    .ai-msg { max-width: 85%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
    .bot-msg { background: #f0f0f0; align-self: flex-start; }
    .user-msg { background: #c5a882; color: #fff; align-self: flex-end; }
    .ai-chat-input-area { padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px; }
    .ai-chat-input-area input { flex: 1; border: 1px solid #ddd; padding: 10px 15px; border-radius: 24px; outline: none; font-size: 14px; }
    .ai-send-btn { background: #c5a882; color: #fff; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; }
    @media (max-width: 480px) {
        .ai-chat-window { bottom: 0 !important; right: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; max-height: 100% !important; border-radius: 0 !important; margin: 0 !important; }
        .ai-chat-window.ai-chat-open { display: flex; transform: none !important; }
        .ai-chat-input-area input, #chatContactForm input { font-size: 16px !important; }
        .ai-chat-launcher { bottom: 20px; right: 20px; }
    }
    `;
    document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', () => {
    const launcher = document.createElement('div');
    launcher.className = 'ai-chat-launcher';
    launcher.onclick = window.toggleAIChat;
    launcher.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
    document.body.appendChild(launcher);

    const chatWindow = document.createElement('div');
    chatWindow.className = 'ai-chat-window';
    chatWindow.id = 'aiChatWindow';
    chatWindow.innerHTML = `
        <div class="ai-chat-header">
            <div><strong>Dental Studio AI</strong><br><small>Служба підтримки 24/7</small></div>
            <button class="ai-chat-close" onclick="window.toggleAIChat()">✕</button>
        </div>
        <div id="chatPlatformSelector" style="padding: 20px; text-align: center;">
            <h4 style="margin-bottom: 15px;">Де Вам зручно спілкуватися?</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button onclick="window.startWebChat()" style="padding: 10px; border-radius: 10px; border: 1px solid #eee; cursor: pointer;">🌐 На сайті</button>
                <button onclick="window.openMessenger('telegram')" style="padding: 10px; border-radius: 10px; border: 1px solid #eee; cursor: pointer;">✈️ Telegram</button>
                <button onclick="window.openMessenger('viber')" style="padding: 10px; border-radius: 10px; border: 1px solid #eee; cursor: pointer;">💜 Viber</button>
                <button onclick="window.openMessenger('whatsapp')" style="padding: 10px; border-radius: 10px; border: 1px solid #eee; cursor: pointer;">🟢 WhatsApp</button>
            </div>
        </div>
        <div id="chatContactForm" style="display: none; padding: 20px;">
            <h4>Вкажіть дані для зв'язку:</h4>
            <input type="email" id="chatContactEmail" placeholder="Email" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px;">
            <input type="tel" id="chatContactPhone" placeholder="Телефон" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px;">
            <button onclick="window.submitChatContact()" style="width: 100%; padding: 10px; background: #c5a882; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Почати чат</button>
            <div id="chatContactError" style="display: none; color: red; font-size: 12px;">Вкажіть дані</div>
        </div>
        <div id="aiChatBody" class="ai-chat-body" style="display: none;"></div>
        <div class="ai-chat-input-area" style="display: none;">
            <input type="text" id="aiChatInput" placeholder="Ваше повідомлення..." onkeypress="window.handleAIChatEnter(event)">
            <button class="ai-send-btn" onclick="window.sendAIChatMsg()">➤</button>
        </div>
    `;
    document.body.appendChild(chatWindow);
    setTimeout(resumeChatSession, 500);
});

async function resumeChatSession() {
    const contact = localStorage.getItem('ds_chat_contact');
    const sessionId = localStorage.getItem('ds_chat_session');
    if (contact && sessionId) {
        document.getElementById('chatPlatformSelector').style.display = 'none';
        document.getElementById('chatContactForm').style.display = 'none';
        document.getElementById('aiChatBody').style.display = 'block';
        document.querySelector('.ai-chat-input-area').style.display = 'flex';
        chatSessionId = sessionId;
        if (widgetSb) {
            const { data: msgs } = await widgetSb.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
            if (msgs) {
                msgs.forEach(m => appendMessage(m.content, m.role));
            }
        }
    }
}

function getFallbackReply(text) {
    const t = text.toLowerCase();
    if (t.includes('привет') || t.includes('вітаю')) return "Вітаю! 👋 Чим можу бути корисним?";
    return "Вибачте, сталася помилка зв'язку. 🔄 Зателефонуйте нам: (077) 600 7 800.";
}
