const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const ViberBot = require('viber-bot').Bot;
const TextMessage = require('viber-bot').Message.Text;
const fetch = require('node-fetch');
const { initLusya } = require('./lusya-agent');
const { initCampaignRunner, updateSettings: updateCampaignSettings } = require('./campaign-runner');

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

// --- Manual CORS Middleware ---
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Token');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

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
                avatar: "https://dentstudio.in.ua/assets/logo.png" // Replace with real logo
            });
            setupViberHandlers();
        }

        // Build Knowledge Base String
        await rebuildKnowledgeBase();

        // Initialize Lusya internal agent
        initLusya(supabase, data);

        // Hot-reload campaign runner settings (bots may have changed)
        updateCampaignSettings(data, tgBot, viberBot);
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
2. БРОНИРОВАНИЕ ОНЛАЙН (КРИТИЧЕСКИ ВАЖНО): Ты должен САМ записать клиента. НИКОГДА не отправляй клиента звонить по телефону!
   - Шаг 1: Если клиент хочет записаться, но ты не знаешь его имя и телефон — обязательно спроси их.
   - Шаг 2: Используй функцию check_slots, чтобы проверить расписание.
   - Шаг 3: Когда есть Имя, Телефон и Время, ОБЯЗАТЕЛЬНО используй функцию make_booking!
3. ТУПИК: Если не знаешь ответа, ответь: "Вибачте, уточню у адміністратора" и добавь [[CALLBACK:TRUE]].
4. ВСЕГДА отвечай на украинском языке, так как мы в Украине.

БАЗА ЗНАНИЙ:
${knowledgeBase}`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({ role: h.role === 'bot' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: userMessage }
    ];

    const tools = [
        {
            type: "function",
            function: {
                name: "check_slots",
                description: "Проверка свободного времени у врача на নির্দিষ্ট дату.",
                parameters: {
                    type: "object",
                    properties: { doctor_name: { type: "string" }, date: { type: "string" } },
                    required: ["doctor_name", "date"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "make_booking",
                description: "Сделать реальную бронь в системе для клиента.",
                parameters: {
                    type: "object",
                    properties: {
                        patient_name: { type: "string" }, phone: { type: "string" },
                        doctor_name: { type: "string" }, datetime: { type: "string" }
                    },
                    required: ["patient_name", "phone", "datetime"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_doctors_list",
                description: "Отримати список активних лікарів клініки з їх спеціалізацією",
                parameters: { type: "object", properties: {}, required: [] }
            }
        }
    ];

    try {
        let apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        const provider = aiSettings.provider || 'openrouter';
        const headers = {
            'Authorization': `Bearer ${aiSettings.api_key}`,
            'Content-Type': 'application/json'
        };

        if (provider === 'openai') {
            apiUrl = 'https://api.openai.com/v1/chat/completions';
        } else if (provider === 'deepseek') {
            apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        } else if (provider === 'google') {
            apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'; // OpenAI compatibility layer
        } else if (provider === 'anthropic') {
            apiUrl = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = aiSettings.api_key;
            headers['anthropic-version'] = '2023-06-01';
            delete headers['Authorization'];
        } else if (provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://dentstudio.in.ua';
            headers['X-Title'] = 'Dental Studio AI';
        } else if (provider === 'custom' && aiSettings.custom_url) {
            apiUrl = aiSettings.custom_url;
        }

        const payload = { model: aiSettings.model || 'gpt-4o-mini', messages, tools };
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`AI API Error (${response.status}):`, errorText);
            return "Вибачте, сталася помилка зв'язку з ШІ-сервісом. 🔄 Спробуйте пізніше.";
        }

        const data = await response.json();
        const msgMatch = data.choices[0].message;
        
        if (msgMatch.tool_calls) {
            // Intercept Tool Calls
            return await handleAITools(msgMatch.tool_calls, messages);
        }
        
        return msgMatch.content;
    } catch (e) {
        console.error('AI API Error:', e);
        return "Помилка зв'язку з ШІ.";
    }
}

async function handleAITools(toolCalls, previousMessages) {
    let toolResults = [];
    
    for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        let resultStr = "";
        
        if (tc.function.name === 'check_slots') {
            // Simulate Cliniccards GET /schedule logic
            console.log(`🤖 AI: Searching slots for ${args.doctor_name || 'any'} on ${args.date}...`);
            resultStr = `{"status": "success", "free_slots": ["10:00", "11:30", "15:00"]}`;
        } else if (tc.function.name === 'make_booking') {
            console.log(`🤖 AI: Booking ${args.patient_name} at ${args.datetime}...`);

            // Check booking rules: some services auto-book, others need admin approval
            const bookingRules = aiSettings.booking_rules || {};
            const autoBookServices = bookingRules.auto_book || [];
            const service = (args.service || '').toLowerCase();
            const isAutoBook = aiSettings.autonomous_booking || autoBookServices.some(s => service.includes(s.toLowerCase()));

            if (isAutoBook) {
                // AUTO: Book directly in CRM
                resultStr = `{"status": "success", "message": "Запис оформлено автоматично. Повідом клієнту що все підтверджено на ${args.datetime}."}`;
                triggerAdminAlert('System', args.patient_name, `[АВТО] ШІ записав клієнта ${args.patient_name} на ${args.datetime} (${args.phone})`);
            } else {
                // MANUAL: Create admin_task for approval
                await supabase.from('admin_tasks').insert({
                    type: 'booking_request',
                    client_name: args.patient_name,
                    description: `Клієнт ${args.patient_name} (${args.phone}) — запис на ${args.datetime}${args.service ? ', послуга: ' + args.service : ''}`,
                    status: 'new',
                    priority: 'normal',
                    payload: { patient_name: args.patient_name, phone: args.phone, datetime: args.datetime, service: args.service, doctor: args.doctor_name }
                });
                resultStr = `{"status": "success", "message": "Запит надіслано адміністратору на підтвердження. Попередь клієнта що запис буде підтверджений найближчим часом."}`;
            }
        } else if (tc.function.name === 'get_doctors_list') {
            const { data: doctors } = await supabase.from('cc_doctors')
                .select('full_name, specialization').eq('is_active', true);
            resultStr = JSON.stringify({ doctors: doctors || [] });
        }
        
        toolResults.push({ tool_call_id: tc.id, role: "tool", content: resultStr });
    }

    // Call Model Again with Tool Results
    const finalPayload = {
        model: aiSettings.model || 'gpt-4o-mini',
        messages: [
            ...previousMessages,
            { role: "assistant", content: null, tool_calls: toolCalls },
            ...toolResults
        ]
    };
    
    // Use same provider URL as the main call
    let apiUrl2 = 'https://openrouter.ai/api/v1/chat/completions';
    const provider = aiSettings.provider || 'openrouter';
    const headers2 = {
        'Authorization': `Bearer ${aiSettings.api_key}`,
        'Content-Type': 'application/json'
    };
    if (provider === 'openai') {
        apiUrl2 = 'https://api.openai.com/v1/chat/completions';
    } else if (provider === 'deepseek') {
        apiUrl2 = 'https://api.deepseek.com/v1/chat/completions';
    } else if (provider === 'google') {
        apiUrl2 = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    } else if (provider === 'custom' && aiSettings.custom_url) {
        apiUrl2 = aiSettings.custom_url;
    } else {
        headers2['HTTP-Referer'] = 'https://dentstudio.in.ua';
        headers2['X-Title'] = 'Dental Studio AI';
    }

    const response2 = await fetch(apiUrl2, {
        method: 'POST',
        headers: headers2,
        body: JSON.stringify(finalPayload)
    });

    if (!response2.ok) {
        const errText = await response2.text();
        console.error(`AI Tool Follow-up Error (${response2.status}):`, errText);
        return "Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз або зателефонуйте: (077) 600 7 800.";
    }

    const data2 = await response2.json();
    if (!data2.choices || !data2.choices[0]) {
        console.error('AI Tool Follow-up: unexpected response:', JSON.stringify(data2));
        return "Вибачте, отримано неочікувану відповідь від ШІ. Зателефонуйте нам: (077) 600 7 800.";
    }
    return data2.choices[0].message.content;
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
    // 1. Send push to Telegram
    if (aiSettings?.tg_bot_token && aiSettings?.tg_chat_id) {
        const alertBot = new TelegramBot(aiSettings.tg_bot_token);
        const text = `🚨 *ТУТПИКОВА СИТУАЦІЯ (${platform})*\n\n👤 Клієнт: ${userName}\n💬 Питання: ${lastMsg}\n\nПотрібне втручання адміністратора!`;
        alertBot.sendMessage(aiSettings.tg_chat_id, text, { parse_mode: 'Markdown' });
    }

    // 2. Also put it in Admin UI Task Queue
    try {
        await supabase.from('admin_tasks').insert({
            task_type: 'Тупик / Питання',
            description: `Клієнт ${userName} пише: "${lastMsg}"`,
            status: 'pending',
            metadata: { session_id: sessionId, platform }
        });
    } catch(e) { console.error('Failed to save fallback task:', e); }
}

// --- 5. Web API for Widget ---
app.get('/health_check_unique', (req, res) => {
    res.json({ status: 'ok', message: 'Unique endpoint reached!' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), provider: aiSettings?.provider || 'not set' });
});

app.post('/api/chat', async (req, res) => {
    console.log('📩 Incoming chat request:', req.body);
    const { message, sessionId } = req.body;
    if (!sessionId) return res.status(400).send('Session ID required');

    try {
        const history = await getChatHistory(sessionId);
        let reply = await getAIResponse(message, history);

        // Check for callback trigger before stripping tag
        if (reply.includes('[[CALLBACK:TRUE]]')) {
            const { data: sess } = await supabase.from('chat_sessions').select('client_name').eq('id', sessionId).single();
            const clientName = (sess && sess.client_name) ? sess.client_name : sessionId;
            triggerAdminAlert('WebChat', clientName, message, sessionId);
        }
        // Strip internal tags from client-facing reply
        reply = reply.replace(/\[\[CALLBACK:TRUE\]\]/g, '').trim();

        await saveMessage(sessionId, 'user', message);
        await saveMessage(sessionId, 'bot', reply);

        res.json({ reply });
    } catch (err) {
        console.error('❌ Chat Handler Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- 6. Admin API (AI Hub Integration) ---

// Proxy to bypass CORS for Cliniccards
app.post('/api/proxy/cliniccards', async (req, res) => {
    const { endpoint, token, method = 'GET', body = null } = req.body;
    if (!endpoint || !token) return res.status(400).json({ error: 'Endpoint and Token required' });

    console.log(`📡 PROXY: ${method} to Cliniccards -> ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method,
            headers: {
                'Token': token,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : null
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('Proxy Error:', e);
        res.status(500).json({ error: 'Cliniccards API Error: ' + e.message });
    }
});

// Notify patient when Admin performs action
app.post('/api/admin/task-action', async (req, res) => {
    const { taskId, action, message } = req.body;
    if (!taskId || !action) return res.status(400).json({ error: 'TaskId and Action required' });

    try {
        // 1. Get Task & Session
        const { data: task, error: tErr } = await supabase.from('admin_tasks').select('*').eq('id', taskId).single();
        if (tErr || !task) throw new Error('Task not found');

        // 2. Find associated messenger user
        const { data: mUser } = await supabase.from('messenger_users')
            .select('*')
            .eq('session_id', task.metadata?.session_id)
            .single();
        
        if (mUser && mUser.platform_user_id) {
            const replyMsg = message || (action === 'approve' ? '✅ Ваш запит схвалено! Ми зв\'яжемося з вами найближчим часом.' : '❌ На жаль, ваш запит було відхилено. Оберіть інший час.');

            if (mUser.platform === 'telegram' && tgBot) {
                await tgBot.sendMessage(mUser.platform_user_id, replyMsg);
            } else if (mUser.platform === 'viber' && viberBot) {
                const TextMessage = require('viber-bot').Message.Text;
                await viberBot.sendMessage({ id: mUser.platform_user_id }, [new TextMessage(replyMsg)]);
            }
        }

        // 3. Update task status in DB
        await supabase.from('admin_tasks').update({ 
            status: action === 'approve' ? 'completed' : 'rejected',
            updated_at: new Date().toISOString()
        }).eq('id', taskId);

        res.json({ success: true });
    } catch (e) {
        console.error('Admin Action Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- 7. Autonomous 30-Min Sync Cron ---
// Cliniccards API base: https://cliniccards.com/api
// Auth: Token header only (no clinic_id param needed — token identifies the clinic)
function ccHeaders() {
    return { 'Token': aiSettings.cc_api_token, 'Content-Type': 'application/json' };
}

async function syncCliniccardsDatabase() {
    if (!aiSettings || !aiSettings.cc_api_token) {
        console.log('⏳ CRON: Skipping sync, cc_api_token missing in ai_settings.');
        return;
    }

    console.log('🔄 CRON: Starting 30-min background sync with Cliniccards API...');
    try {
        const response = await fetch('https://cliniccards.com/api/patients', { headers: ccHeaders() });
        const res = await response.json();
        if (res.result === 'success' && res.data) {
            const patients = res.data;
            console.log(`📥 CRON: Retrieved ${patients.length} patients from CRM. Upserting to Supabase...`);

            for (const p of patients) {
                const row = {
                    cc_id: String(p.patient_id),
                    full_name: [p.lastname, p.firstname].filter(Boolean).join(' '),
                    phone: p.phone || p.phone2 || '',
                    email: p.email || '',
                    gender: p.gender || null,
                    dob: p.birthday || null,
                    note: p.note || p.important_note || '',
                    last_visit_at: p.last_visit_date ? new Date(p.last_visit_date).toISOString() : null,
                    last_sync_at: new Date().toISOString()
                };
                supabase.from('cc_patients').upsert(row, { onConflict: 'cc_id' }).then(({error}) => {
                    if (error) console.error('CRON Upsert Error for patient', p.patient_id, error.message);
                });
            }
            console.log('✅ CRON: Patients sync completed.');
        } else {
            console.warn('⚠️ CRON API Warning:', res);
        }
    } catch (e) {
        console.error('❌ CRON Error during sync:', e);
    }
}

async function syncDoctors() {
    if (!aiSettings?.cc_api_token) return;
    console.log('🔄 CRON: Syncing doctors from Cliniccards...');
    try {
        const response = await fetch('https://cliniccards.com/api/staff', { headers: ccHeaders() });
        const res = await response.json();
        if (res.result === 'success' && res.data) {
            console.log(`📥 CRON: Syncing ${res.data.length} staff members...`);
            for (const d of res.data) {
                await supabase.from('cc_doctors').upsert({
                    cc_id: String(d.doctor_id),
                    full_name: [d.lastname, d.firstname].filter(Boolean).join(' '),
                    specialization: d.role || '',
                    is_active: true,
                    last_sync_at: new Date().toISOString()
                }, { onConflict: 'cc_id' });
            }
            console.log('✅ CRON: Doctors sync done.');
        }
    } catch (e) {
        console.error('❌ CRON syncDoctors error:', e.message);
    }
}

async function syncServices() {
    // Services endpoint not available in Cliniccards API — skip silently
    console.log('ℹ️ CRON: Services sync skipped (no API endpoint available).');
}

async function syncVisitsAndRevenue() {
    if (!aiSettings?.cc_api_token) return;
    console.log('🔄 CRON: Syncing visits from Cliniccards...');
    try {
        const dateFrom = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
        const dateTo = new Date().toISOString().split('T')[0];
        const url = `https://cliniccards.com/api/visits?from=${dateFrom}&to=${dateTo}`;
        const response = await fetch(url, { headers: ccHeaders() });
        const res = await response.json();
        if (res.result === 'success' && res.data) {
            console.log(`📥 CRON: Syncing ${res.data.length} recent visits...`);
            for (const v of res.data) {
                const visitStart = v.visit_start ? new Date(v.visit_start) : null;
                const visitEnd = v.visit_end ? new Date(v.visit_end) : null;

                const visitRow = {
                    cc_id: String(v.visit_id),
                    doctor_cc_id: String(v.doctor_id || ''),
                    doctor_id: String(v.doctor_id || ''),
                    visit_date: visitStart ? visitStart.toISOString().split('T')[0] : null,
                    time_start: visitStart ? visitStart.toTimeString().slice(0, 5) : null,
                    time_end: visitEnd ? visitEnd.toTimeString().slice(0, 5) : null,
                    status: v.status || 'PLANNED',
                    note: v.note || null,
                    last_sync_at: new Date().toISOString()
                };

                if (v.patient_id) {
                    const { data: pt } = await supabase.from('cc_patients')
                        .select('id').eq('cc_id', String(v.patient_id)).single();
                    if (pt) {
                        visitRow.patient_id = pt.id;
                        if (v.status === 'VISITED' && visitEnd) {
                            await supabase.from('cc_patients').update({
                                last_visit_at: visitEnd.toISOString()
                            }).eq('id', pt.id).or(`last_visit_at.is.null,last_visit_at.lt.${visitEnd.toISOString()}`);
                        }
                    }
                }

                await supabase.from('cc_visits').upsert(visitRow, { onConflict: 'cc_id' });
            }
            console.log('✅ CRON: Visits sync done.');
        }
    } catch (e) {
        console.error('❌ CRON syncVisitsAndRevenue error:', e.message);
    }
}

// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 AI Omni-Server running on port ${PORT}`);
    await refreshSettings();
    setInterval(refreshSettings, 60000 * 5); // every 5 min

    setInterval(syncCliniccardsDatabase, 1800000); // patients: every 30 min
    setTimeout(syncCliniccardsDatabase, 10000);

    setInterval(syncVisitsAndRevenue, 3600000); // visits+revenue: every 1 hour
    setTimeout(syncVisitsAndRevenue, 30000);

    // doctors and services: once per day (86400000 ms)
    setInterval(syncDoctors, 86400000);
    setInterval(syncServices, 86400000);
    setTimeout(syncDoctors, 60000);    // first run 60s after start
    setTimeout(syncServices, 90000);   // first run 90s after start

    // Campaign runner: campaigns, surveys, automated flows
    initCampaignRunner(supabase, aiSettings, tgBot, viberBot);
});
