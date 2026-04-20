const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const ViberBot = require('viber-bot').Bot;
const TextMessage = require('viber-bot').Message.Text;
const fetch = require('node-fetch');

// --- Configuration & Initialization ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ckldvntrsiacbjpiydmn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Service role key for admin access
const PORT = process.env.PORT || 3000;

if (!SUPABASE_KEY) {
    console.error('FATAL: SUPABASE_KEY (service_role) is required to run the server.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
app.use(bodyParser.json());

// --- State ---
let aiSettings = null;
let knowledgeBase = "";
let tgBot = null;
let viberBot = null;

// --- 1. Dynamic Settings Refresher ---
async function refreshSettings() {
    try {
        const { data, error } = await supabase.from('ai_settings').select('*').limit(1).single();
        if (error) throw error;
        aiSettings = data;

        // Initialize/Re-init Patient Telegram Bot if token provided
        if (data.tg_patient_bot_token && (!tgBot || tgBot.token !== data.tg_patient_bot_token)) {
            console.log('🤖 Initializing Patient Telegram Bot...');
            tgBot = new TelegramBot(data.tg_patient_bot_token, { polling: true });
            setupTelegramHandlers();
        }

        // Initialize/Re-init Viber Bot if token provided
        if (data.viber_bot_token && (!viberBot || viberBot.authToken !== data.viber_bot_token)) {
            console.log('🤖 Initializing Viber Bot...');
            viberBot = new ViberBot({
                authToken: data.viber_bot_token,
                name: "Dental Studio AI",
                avatar: "https://rozetka.space/assets/logo.png" // Replace with real logo
            });
            setupViberHandlers();
        }

        // Build Knowledge Base String
        await rebuildKnowledgeBase();
    } catch (e) {
        console.warn('Settings Refresh Error:', e.message);
    }
}

async function rebuildKnowledgeBase() {
    let kb = `ОСНОВНАЯ ИНФОРМАЦИЯ О КЛИНИКЕ DENTAL STUDIO:
- Город: Чернигов, Украина
- Адрес: просп. Независимости, 21
- График: Пн-Пт, 10:00-18:00
- Телефон: (077) 600 7 800\n`;

    if (aiSettings?.knowledge_base_manual) {
        kb += `\nИНСТРУКЦИИ КЛИНИКИ:\n${aiSettings.knowledge_base_manual}\n`;
    }

    const { data: prices } = await supabase.from('price_list').select('service_name_uk, price_display').eq('is_active', true);
    if (prices) {
        kb += "\nУСЛУГИ И ЦЕНЫ:\n" + prices.map(p => `- ${p.service_name_uk}: ${p.price_display}`).join('\n');
    }

    knowledgeBase = kb;
}

// --- 2. Core AI Logic ---
async function getAIResponse(userMessage, history = []) {
    if (!aiSettings || !aiSettings.api_key) return "Перепрошую, мій інтелект зараз на техобслуговуванні. Зверніться, будь ласка, за телефоном (077) 600 7 800.";

    const systemPrompt = `ТЫ — Ассистент Dental Studio. 
ОСНОВНЫЕ ПРАВИЛА:
1. Используй БАЗУ ЗНАНИЙ ниже.
2. ТУПИКОВАЯ СИТУАЦИЯ: Если не знаешь ответа, ответь: "Вибачте, я не можу відповісти максимально точно. Я передам ваш запит адміністратору, і він зв'яжеться з вами." и добавь [[CALLBACK:TRUE]].
3. CRM: Если узнал имя, добавь [[NAME:Имя]].

БАЗА ЗНАНИЙ:
${knowledgeBase}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({ role: h.role === 'bot' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: userMessage }
    ];

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${aiSettings.api_key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://rozetka.space',
                'X-Title': 'Dental Studio AI'
            },
            body: JSON.stringify({
                model: aiSettings.model || 'gpt-4o-mini',
                messages
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) {
        console.error('AI API Error:', e);
        return "Помилка зв'язку з ШІ.";
    }
}

// --- 3. Platform Handlers ---

function setupTelegramHandlers() {
    tgBot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        if (!text) return;

        // Get or Create Session
        let session = await getOrCreateSession('telegram', chatId, msg.from.first_name);
        
        const history = await getChatHistory(session.id);
        const reply = await getAIResponse(text, history);

        await saveMessage(session.id, 'user', text);
        await saveMessage(session.id, 'bot', reply);
        
        tgBot.sendMessage(chatId, reply.replace(/\[\[.*?\]\]/g, ''));

        if (reply.includes('[[CALLBACK:TRUE]]')) {
            triggerAdminAlert('Telegram', msg.from.first_name, text, session.id);
        }
    });
}

function setupViberHandlers() {
    viberBot.onSubscribe(response => {
        response.send(new TextMessage(`Вітаю, ${response.userProfile.name}! Я AI-асистент Dental Studio. Чим можу допомогти?`));
    });

    viberBot.onTextMessage(async (message, response) => {
        const userId = response.userProfile.id;
        const text = message.text;

        let session = await getOrCreateSession('viber', userId, response.userProfile.name);
        const history = await getChatHistory(session.id);
        const reply = await getAIResponse(text, history);

        await saveMessage(session.id, 'user', text);
        await saveMessage(session.id, 'bot', reply);

        response.send(new TextMessage(reply.replace(/\[\[.*?\]\]/g, '')));

        if (reply.includes('[[CALLBACK:TRUE]]')) {
            triggerAdminAlert('Viber', response.userProfile.name, text, session.id);
        }
    });
}

// --- 4. Database Helpers ---

async function getOrCreateSession(platform, platformId, name) {
    // Check if link exists
    let { data: link } = await supabase.from('messenger_users')
        .select('session_id').eq('platform', platform).eq('platform_user_id', String(platformId)).single();

    if (link) {
        let { data: session } = await supabase.from('chat_sessions').select('*').eq('id', link.session_id).single();
        return session;
    }

    // New User
    const { data: session } = await supabase.from('chat_sessions').insert({
        client_name: name,
        contact_type: platform
    }).select('*').single();

    await supabase.from('messenger_users').insert({
        platform,
        platform_user_id: String(platformId),
        session_id: session.id
    });

    return session;
}

async function getChatHistory(sessionId) {
    const { data } = await supabase.from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(10);
    return data || [];
}

async function saveMessage(sessionId, role, content) {
    await supabase.from('chat_messages').insert({ session_id: sessionId, role, content });
}

async function triggerAdminAlert(platform, userName, lastMsg, sessionId) {
    if (!aiSettings?.tg_bot_token || !aiSettings?.tg_chat_id) return;
    
    const alertBot = new TelegramBot(aiSettings.tg_bot_token);
    const text = `🚨 *ТУТПИКОВА СИТУАЦІЯ (${platform})*\n\n👤 Клієнт: ${userName}\n💬 Питання: ${lastMsg}\n\nПотрібне втручання адміністратора!`;
    alertBot.sendMessage(aiSettings.tg_chat_id, text, { parse_mode: 'Markdown' });
}

// --- 5. Web API for Widget ---
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!sessionId) return res.status(400).send('Session ID required');

    const history = await getChatHistory(sessionId);
    const reply = await getAIResponse(message, history);

    await saveMessage(sessionId, 'user', message);
    await saveMessage(sessionId, 'bot', reply);

    res.json({ reply });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 AI Omni-Server running on port ${PORT}`);
    await refreshSettings();
    setInterval(refreshSettings, 60000 * 5); // Refresh every 5 mins
});
