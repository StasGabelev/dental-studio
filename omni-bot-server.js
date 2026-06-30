const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const ViberBot = require('viber-bot').Bot;
const TextMessage = require('viber-bot').Message.Text;
const fetch = require('node-fetch');
const { initLusya } = require('./lusya-agent');
const { initCampaignRunner, updateSettings: updateCampaignSettings, handleComplaintMessage, scheduleProceduralFollowUps } = require('./campaign-runner');

// --- Configuration & Initialization ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ipuksuzlvyoosmlqzvkb.supabase.co';
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
        initLusya(supabase, data, tgBot, viberBot);

        // Hot-reload campaign runner settings (bots may have changed)
        updateCampaignSettings(data, tgBot, viberBot);
    } catch (e) {
        console.warn('Settings Refresh Error:', e.message);
    }
}

async function rebuildKnowledgeBase() {
    let kb = `ОСНОВНАЯ ИНФОРМАЦИЯ О КЛИНИКЕ DENTAL STUDIO:
- Город: Чернигов, Украина
- Адрес: вул. Незалежності, 21
- График: Пн-Пт 09:00-19:00, Сб-Нд 09:00-16:00
- Телефон: (073) 600 7 800, (077) 600 7 800\n`;

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
async function getMedicalQAResponse(userMessage, patientName) {
    if (!aiSettings || !aiSettings.api_key) return null;

    const systemPrompt = `Ти — асистент стоматології Dental Studio (Чернігів). Відповідаєш на питання пацієнта після процедур або загальні стоматологічні питання.

ПРАВИЛА:
1. Відповідай ТІЛЬКИ українською мовою, коротко і зрозуміло (2-4 речення).
2. Якщо питання просте (догляд після процедури, терміни загоєння, що можна їсти тощо) — відповідай сам.
3. Якщо питання СКЛАДНЕ або потребує огляду лікаря — відповідай доброзичливо і додай [[ESCALATE]] в кінці.
4. Завжди додавай [[ESCALATE]] якщо: сильний біль, кровотеча, температура, ускладнення, підозра на алергію, питання про діагноз або лікування конкретної ситуації.
5. НЕ давай медичних діагнозів. НЕ призначай ліки.
6. Підпис: "З повагою, команда Dental Studio 🦷"

Ім'я пацієнта: ${patientName || 'Пацієнт'}`;

    try {
        let apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        const provider = aiSettings.provider || 'openrouter';
        const headers = { 'Authorization': `Bearer ${aiSettings.api_key}`, 'Content-Type': 'application/json' };
        if (provider === 'openai') apiUrl = 'https://api.openai.com/v1/chat/completions';
        else if (provider === 'deepseek') apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        else if (provider === 'openrouter') { headers['HTTP-Referer'] = 'https://dentstudio.in.ua'; headers['X-Title'] = 'Dental Studio AI'; }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: aiSettings.model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ]
            })
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (e) {
        console.error('Medical QA Error:', e);
        return null;
    }
}

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

// In-memory: chatId -> true (waiting for phone input)
const waitingForPhone = new Map();

function detectGender(firstName) {
    if (!firstName) return null;
    const n = firstName.trim().split(/\s+/)[0].toLowerCase();
    return /[ая]$/.test(n) ? 'female' : 'male';
}

const MAIN_MENU = {
    reply_markup: {
        keyboard: [
            [{ text: '📅 Записатися онлайн' }, { text: '📋 Моя історія' }],
            [{ text: '👨‍⚕️ Мої лікарі' },        { text: '🤝 Наші партнери' }],
            [{ text: '📍 Як нас знайти' },       { text: '⭐ Залишити відгук' }],
            [{ text: '💬 Задати питання' },       { text: '📞 Зворотний дзвінок' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const waitingForQuestion = new Map();

async function showPatientHistory(chatId, phoneLast9, fullPhone, tgName) {
    const savedPhone = fullPhone || phoneLast9;

    // Upsert to ensure the row always exists, then save phone
    await supabase.from('messenger_users').upsert({
        platform: 'telegram',
        platform_user_id: String(chatId),
        patient_phone: savedPhone
    }, { onConflict: 'platform,platform_user_id' });

    const { data: patients } = await supabase
        .from('cc_patients')
        .select('id, cc_id, full_name, phone')
        .ilike('phone', `%${phoneLast9}%`)
        .not('cc_id', 'like', 'bot_%')
        .limit(1);

    if (!patients || patients.length === 0) {
        // Auto-create as new prospect in cc_patients
        const botCcId = 'bot_' + chatId;
        const firstName = (tgName || '').split(' ')[0];
        const gender = detectGender(firstName);
        await supabase.from('cc_patients').upsert({
            cc_id: botCcId,
            full_name: tgName || 'Новий клієнт',
            phone: savedPhone,
            telegram_id: String(chatId),
            gender,
            note: 'Зареєстрований через Telegram-бот'
        }, { onConflict: 'cc_id' });
        await supabase.from('messenger_users').upsert({
            platform: 'telegram',
            platform_user_id: String(chatId),
            patient_phone: savedPhone,
            patient_cc_id: botCcId
        }, { onConflict: 'platform,platform_user_id' });

        const greeting = firstName ? `, ${firstName}` : '';
        await tgBot.sendMessage(chatId,
            `✅ Дякуємо${greeting}! Ваш номер збережено.\n\n` +
            'Схоже, ви ще не були у нашій клініці — будемо раді вас прийняти! 🦷\n\n' +
            'Всі можливості бота вже доступні для вас.',
            MAIN_MENU);
        return false;
    }

    const patient = patients[0];

    // Save CRM link (upsert to guarantee row exists)
    await supabase.from('messenger_users').upsert({
        platform: 'telegram',
        platform_user_id: String(chatId),
        patient_phone: savedPhone,
        patient_cc_id: String(patient.cc_id)
    }, { onConflict: 'platform,platform_user_id' });

    // Sync telegram_id to cc_patients so Lusya and campaign-runner can find this subscriber
    await supabase.from('cc_patients')
        .update({ telegram_id: String(chatId) })
        .eq('cc_id', String(patient.cc_id));

    await showVisits(chatId, patient);
    return true;
}

async function showVisits(chatId, patient) {
    // Find all family members with the same phone to show full household history
    let patientIds = [patient.id];
    const phoneLast9 = (patient.phone || '').replace(/\D/g, '').slice(-9);
    if (phoneLast9) {
        const { data: family } = await supabase
            .from('cc_patients')
            .select('id')
            .ilike('phone', `%${phoneLast9}%`)
            .not('cc_id', 'like', 'bot_%');
        if (family?.length > 1) patientIds = family.map(p => p.id);
    }

    const [{ data: visits }, { data: invoices }] = await Promise.all([
        supabase.from('cc_visits')
            .select('visit_date, doctor_name, patient_id')
            .in('patient_id', patientIds)
            .eq('status', 'VISITED')
            .order('visit_date', { ascending: false })
            .limit(10),
        supabase.from('cc_invoices')
            .select('date, items, amount, patient_id')
            .in('patient_id', patientIds)
            .order('date', { ascending: false })
            .limit(30)
    ]);

    if (!visits || visits.length === 0) {
        await tgBot.sendMessage(chatId,
            `Привіт, ${patient.full_name}!\n\nІсторія ваших візитів поки що порожня.`,
            MAIN_MENU);
        return;
    }

    // Batch-load patient names for all unique patient_ids
    const allPatientIds = [...new Set([
        ...visits.map(v => v.patient_id),
        ...(invoices || []).map(i => i.patient_id)
    ].filter(Boolean))];
    const { data: familyMembers } = await supabase
        .from('cc_patients')
        .select('id, full_name')
        .in('id', allPatientIds);
    const patientNameMap = Object.fromEntries((familyMembers || []).map(p => [p.id, p.full_name]));

    // Build invoice map by date — store amount and items, keyed by date+patient_id
    const invoiceMap = {};
    for (const inv of (invoices || [])) {
        const d = inv.date ? inv.date.slice(0, 10) : null;
        if (!d) continue;
        const key = `${d}_${inv.patient_id}`;
        if (!invoiceMap[key]) invoiceMap[key] = { items: inv.items || [], amount: inv.amount };
    }

    const lines = visits.map(v => {
        const date = v.visit_date ? v.visit_date.slice(0, 10) : '—';
        const doc  = v.doctor_name || 'Лікар';
        const name = patientNameMap[v.patient_id] || patient.full_name;
        const firstName = name.split(' ')[1] || name.split(' ')[0] || name;
        const inv = invoiceMap[`${date}_${v.patient_id}`];
        const svc = inv?.items?.length ? inv.items.map(i => i.plan_item_name).filter(Boolean).join(', ') : null;
        return `👤 ${firstName}\n📅 ${date}\n👨‍⚕️ ${doc}${svc ? `\n🦷 ${svc}` : ''}`;
    });
    await tgBot.sendMessage(chatId,
        `📋 Історія візитів:\n\n${lines.join('\n\n')}`,
        MAIN_MENU);
}

async function requireLinked(chatId, message) {
    const { data: mu } = await supabase
        .from('messenger_users')
        .select('patient_phone')
        .eq('platform', 'telegram')
        .eq('platform_user_id', String(chatId))
        .single();

    if (mu?.patient_phone) return true;

    const text = message || '🔗 Щоб отримати персональний сервіс, підв\'яжіть ваш номер телефону.';
    await tgBot.sendMessage(chatId, text, {
        reply_markup: {
            keyboard: [[{ text: '📱 Поділитися номером телефону', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
    return false;
}

function setupTelegramHandlers() {
    // Inline button: "Підв'язати номер"
    tgBot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        if (query.data === 'booking_request') {
            await tgBot.answerCallbackQuery(query.id, { text: '✅ Дякуємо! Незабаром зателефонуємо.' });

            // Get client info
            const { data: mu } = await supabase
                .from('messenger_users')
                .select('patient_phone, patient_cc_id')
                .eq('platform', 'telegram')
                .eq('platform_user_id', String(chatId))
                .single();

            let clientName = [query.from.first_name, query.from.last_name].filter(Boolean).join(' ') || 'Клієнт';
            let phone = mu?.patient_phone || '—';

            if (mu?.patient_cc_id) {
                const { data: pt } = await supabase
                    .from('cc_patients')
                    .select('full_name, phone')
                    .eq('cc_id', mu.patient_cc_id)
                    .single();
                if (pt) {
                    clientName = pt.full_name || clientName;
                    phone = pt.phone || phone;
                }
            }

            // Notify admin
            if (aiSettings?.tg_bot_token && aiSettings?.tg_chat_id) {
                const alertBot = new TelegramBot(aiSettings.tg_bot_token);
                alertBot.sendMessage(aiSettings.tg_chat_id,
                    `📅 *Хоче записатися!*\n\n👤 ${clientName}\n📞 ${phone}\n\n_Натиснув кнопку в розсилці — передзвоніть для підтвердження._`,
                    { parse_mode: 'Markdown' }
                );
            }

            await tgBot.sendMessage(chatId,
                '✅ Дякуємо! Наш адміністратор зателефонує вам найближчим часом для уточнення зручного часу.\n\n🕐 Графік роботи: Пн–Пт 09:00–19:00, Сб–Нд 09:00–16:00',
                MAIN_MENU
            );
            return;
        }

        if (query.data === 'link_phone') {
            await tgBot.answerCallbackQuery(query.id);
            waitingForPhone.set(chatId, true);
            await tgBot.sendMessage(chatId,
                '📱 Натисніть кнопку нижче, щоб поділитися номером телефону.\n\nАбо введіть вручну: 0771234567',
                {
                    reply_markup: {
                        keyboard: [[{ text: '📱 Поділитися номером телефону', request_contact: true }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
        }
    });

    tgBot.on('message', async (msg) => {
        const chatId = msg.chat.id;

        // --- Contact shared via Telegram button ---
        if (msg.contact) {
            waitingForPhone.delete(chatId);
            const fullPhone = msg.contact.phone_number.replace(/\D/g, '');
            const phoneLast9 = fullPhone.slice(-9);
            const tgName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
            await showPatientHistory(chatId, phoneLast9, fullPhone, tgName);
            return;
        }

        const text = msg.text;
        if (!text) return;

        // --- Complaint message (if patient is in awaiting complaint state) ---
        if (await handleComplaintMessage(chatId, text)) return;

        // --- Question from patient (if in waitingForQuestion state) ---
        if (waitingForQuestion.has(chatId)) {
            const patientData = waitingForQuestion.get(chatId);
            waitingForQuestion.delete(chatId);

            await tgBot.sendMessage(chatId, '🔄 Одну мить, опрацьовую ваше питання...');

            const aiReply = await getMedicalQAResponse(text, patientData.name);

            if (!aiReply) {
                await tgBot.sendMessage(chatId,
                    '😔 Вибачте, зараз не можу відповісти автоматично. Ваше питання передано адміністратору — ми зв\'яжемося з вами найближчим часом.',
                    MAIN_MENU);
                await triggerQuestionAlert(chatId, patientData, text, '(AI недоступний)');
                return;
            }

            const needsEscalation = aiReply.includes('[[ESCALATE]]');
            const cleanReply = aiReply.replace('[[ESCALATE]]', '').trim();

            await tgBot.sendMessage(chatId, cleanReply, MAIN_MENU);

            if (needsEscalation) {
                await tgBot.sendMessage(chatId,
                    '📬 Ваше питання також передано нашому лікарю — він зв\'яжеться з вами найближчим часом.');
                await triggerQuestionAlert(chatId, patientData, text, cleanReply);
            }
            return;
        }

        // --- /start (завжди має пріоритет, скидає будь-який стан) ---
        if (text === '/start') {
            waitingForPhone.delete(chatId);
            waitingForQuestion.delete(chatId);

            // Ensure row exists in messenger_users (creates on first /start)
            await supabase.from('messenger_users').upsert({
                platform: 'telegram',
                platform_user_id: String(chatId)
            }, { onConflict: 'platform,platform_user_id', ignoreDuplicates: true });

            // Check if already linked
            const { data: mu } = await supabase
                .from('messenger_users')
                .select('patient_cc_id')
                .eq('platform', 'telegram')
                .eq('platform_user_id', String(chatId))
                .single();

            if (mu?.patient_cc_id) {
                // Already linked — just show menu
                await tgBot.sendMessage(chatId,
                    'Привіт! 👋 Раді бачити вас знову.\nЧим можу допомогти?',
                    MAIN_MENU);
                return;
            }

            // New user — offer phone sharing, but allow skipping
            waitingForPhone.set(chatId, true);
            await tgBot.sendMessage(chatId,
                'Привіт! 👋 Я — Люся, AI-асистент стоматології Dental Studio.\n\n' +
                'Поділіться номером телефону — і ми персоналізуємо сервіс, знижки та запис для вас.',
                {
                    reply_markup: {
                        keyboard: [
                            [{ text: '📱 Поділитися номером телефону', request_contact: true }],
                            [{ text: '⏭ Пропустити' }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
            return;
        }

        // --- Пропустити прив'язку ---
        if (text === '⏭ Пропустити') {
            waitingForPhone.delete(chatId);
            await tgBot.sendMessage(chatId,
                'Добре! Ви завжди можете підв\'язати номер пізніше — просто натисніть будь-яку кнопку меню.',
                MAIN_MENU);
            return;
        }

        // --- Очікуємо номер телефону (тільки якщо не команда меню) ---
        if (waitingForPhone.get(chatId) && !text.startsWith('📅') && !text.startsWith('📋') && !text.startsWith('💰') && !text.startsWith('🤝') && !text.startsWith('📍') && !text.startsWith('⭐') && !text.startsWith('📞')) {
            const digits = text.replace(/\D/g, '');
            if (digits.length < 9) {
                await tgBot.sendMessage(chatId,
                    'Будь ласка, введіть номер телефону цифрами.\nНаприклад: 0771234567',
                    MAIN_MENU);
                return;
            }
            waitingForPhone.delete(chatId);
            const tgName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
            await showPatientHistory(chatId, digits.slice(-9), null, tgName);
            return;
        }

        // --- Записатися онлайн ---
        if (text === '📅 Записатися онлайн') {
            if (!await requireLinked(chatId,
                '📅 Щоб записатися, будь ласка, підв\'яжіть номер телефону — ми зможемо передзвонити, уточнити зручний час та якісно вас обслужити.'))
                return;
            await tgBot.sendMessage(chatId, 'Оберіть зручний час для запису:', {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📅 Відкрити онлайн-запис', url: 'https://cliniccards.com/booking/F4GL5d_VJuiZHbRWoE-xIdr86ciDnhBJ' }
                    ]]
                }
            });
            return;
        }

        // --- Моя історія ---
        if (text === '📋 Моя історія') {
            const { data: mu } = await supabase
                .from('messenger_users')
                .select('patient_phone, patient_cc_id')
                .eq('platform', 'telegram')
                .eq('platform_user_id', String(chatId))
                .single();

            if (mu?.patient_cc_id) {
                // Fetch patient directly by cc_id to avoid duplicate phone matches
                const { data: pt } = await supabase
                    .from('cc_patients')
                    .select('id, cc_id, full_name, phone')
                    .eq('cc_id', mu.patient_cc_id)
                    .single();
                if (pt) {
                    await showVisits(chatId, pt);
                } else {
                    await tgBot.sendMessage(chatId, 'Не вдалося знайти ваші дані. Спробуйте ще раз.', MAIN_MENU);
                }
                return;
            }

            if (!await requireLinked(chatId)) return;
        }

        // --- Мої лікарі ---
        if (text === '👨‍⚕️ Мої лікарі') {
            const { data: mu } = await supabase
                .from('messenger_users')
                .select('patient_cc_id')
                .eq('platform', 'telegram')
                .eq('platform_user_id', String(chatId))
                .single();
            if (!mu?.patient_cc_id) { if (!await requireLinked(chatId)) return; return; }

            const { data: pt } = await supabase
                .from('cc_patients')
                .select('id, phone')
                .eq('cc_id', mu.patient_cc_id)
                .single();
            if (!pt) { await tgBot.sendMessage(chatId, 'Не вдалося знайти ваші дані.', MAIN_MENU); return; }

            // Find all family members by phone
            let patientIds = [pt.id];
            const phoneLast9 = (pt.phone || '').replace(/\D/g, '').slice(-9);
            if (phoneLast9) {
                const { data: family } = await supabase
                    .from('cc_patients')
                    .select('id, full_name')
                    .ilike('phone', `%${phoneLast9}%`)
                    .not('cc_id', 'like', 'bot_%');
                if (family?.length > 1) {
                    patientIds = family.map(p => p.id);
                    var familyNameMap = Object.fromEntries(family.map(p => [p.id, p.full_name]));
                }
            }

            const { data: visits } = await supabase
                .from('cc_visits')
                .select('visit_date, doctor_name, patient_id')
                .in('patient_id', patientIds)
                .eq('status', 'VISITED')
                .order('visit_date', { ascending: false })
                .limit(50);

            if (!visits?.length) {
                await tgBot.sendMessage(chatId, 'Записів про візити поки що немає.', MAIN_MENU);
                return;
            }

            // Load patient names if not loaded yet
            if (!familyNameMap) {
                const { data: pts } = await supabase.from('cc_patients').select('id, full_name').in('id', patientIds);
                familyNameMap = Object.fromEntries((pts || []).map(p => [p.id, p.full_name]));
            }

            // Group by doctor
            const byDoctor = {};
            for (const v of visits) {
                const doc = v.doctor_name || 'Невідомий лікар';
                if (!byDoctor[doc]) byDoctor[doc] = {};
                const pid = v.patient_id;
                if (!byDoctor[doc][pid]) byDoctor[doc][pid] = { dates: [] };
                byDoctor[doc][pid].dates.push(v.visit_date);
            }

            const lines = Object.entries(byDoctor).map(([doc, patients]) => {
                const patLines = Object.entries(patients).map(([pid, info]) => {
                    const name = familyNameMap[pid] || 'Пацієнт';
                    const firstName = name.split(' ')[1] || name.split(' ')[0] || name;
                    const last = info.dates[0]?.slice(0, 10) || '—';
                    const count = info.dates.length;
                    return `  └ ${firstName} — ${count} візит${count > 1 ? 'ів' : ''} (останній: ${last})`;
                });
                return `👨‍⚕️ ${doc}\n${patLines.join('\n')}`;
            });

            await tgBot.sendMessage(chatId, `🩺 Ваші лікарі:\n\n${lines.join('\n\n')}`, MAIN_MENU);
            return;
        }

        // --- Моя знижка ---
        if (text === '💰 Моя знижка') {
            if (!await requireLinked(chatId)) return;
            await tgBot.sendMessage(chatId,
                '🎁 Ваша знижка: 10% на лікування в Dental Studio.\n' +
                'Покажіть це повідомлення адміністратору при наступному візиті.',
                MAIN_MENU);
            return;
        }

        // --- Наші партнери ---
        if (text === '🤝 Наші партнери') {
            if (!await requireLinked(chatId,
                '🤝 Щоб отримати персональні знижки від наших партнерів — підв\'яжіть ваш номер телефону.'))
                return;
            try {
                const { data: partners } = await supabase
                    .from('partners')
                    .select('name, description, discount_text, contact')
                    .eq('is_active', true)
                    .order('created_at', { ascending: true });

                let partnersText;
                if (partners && partners.length > 0) {
                    const lines = partners.map(p => {
                        let line = `🏢 ${p.name}`;
                        if (p.description)   line += `\n${p.description}`;
                        if (p.discount_text) line += `\n🎁 ${p.discount_text}`;
                        if (p.contact)       line += `\n📍 ${p.contact}`;
                        return line;
                    });
                    partnersText = '🤝 Наші партнери\n\n' + lines.join('\n\n');
                } else {
                    partnersText = '🤝 Наші партнери\n\nНезабаром тут з\'являться знижки від наших партнерів!\nСлідкуйте за оновленнями.';
                }
                await tgBot.sendMessage(chatId, partnersText, MAIN_MENU);
            } catch (e) {
                await tgBot.sendMessage(chatId,
                    '🤝 Наші партнери\n\nНезабаром тут з\'являться знижки від наших партнерів!',
                    MAIN_MENU);
            }
            return;
        }

        // --- Як нас знайти ---
        if (text === '📍 Як нас знайти') {
            await tgBot.sendMessage(chatId,
                '📍 Dental Studio\nЧернігів, вулиця Незалежності, 21\n📞 (073) 600 7 800\n      (077) 600 7 800\n🕐 Пн-Пт: 09:00 - 19:00\n      Сб-Нд: 09:00 - 16:00',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🗺 Відкрити в Google Maps', url: 'https://maps.google.com/?q=Chernihiv,+Nezalezhnosti+21' }
                        ]]
                    }
                });
            return;
        }

        // --- Залишити відгук ---
        if (text === '⭐ Залишити відгук') {
            if (!await requireLinked(chatId,
                '⭐ Щоб залишити відгук, будь ласка, підв\'яжіть ваш номер телефону.'))
                return;
            await tgBot.sendMessage(chatId,
                'Будемо дуже вдячні за ваш відгук! Це займе лише хвилину 🙏',
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '⭐ Залишити відгук в Google', url: 'https://g.page/r/CRieZR5gW2LwEAE/review' }
                        ]]
                    }
                });
            return;
        }

        // --- Задати питання ---
        if (text === '💬 Задати питання') {
            const tgName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || 'Пацієнт';
            let patientName = tgName;

            const { data: mu } = await supabase
                .from('messenger_users')
                .select('patient_cc_id')
                .eq('platform', 'telegram')
                .eq('platform_user_id', String(chatId))
                .single();

            if (mu?.patient_cc_id) {
                const { data: pt } = await supabase
                    .from('cc_patients')
                    .select('full_name')
                    .eq('cc_id', mu.patient_cc_id)
                    .single();
                if (pt?.full_name) patientName = pt.full_name;
            }

            waitingForQuestion.set(chatId, { name: patientName, tgName });
            await tgBot.sendMessage(chatId,
                '💬 Напишіть ваше запитання — Люся відповість одразу.\n\nЯкщо питання потребує уваги лікаря, ми передамо його особисто.',
                {
                    reply_markup: {
                        keyboard: [[{ text: '❌ Скасувати' }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                }
            );
            return;
        }

        // --- Скасувати питання ---
        if (text === '❌ Скасувати' && waitingForQuestion.has(chatId)) {
            waitingForQuestion.delete(chatId);
            await tgBot.sendMessage(chatId, 'Скасовано.', MAIN_MENU);
            return;
        }

        // --- Зворотний дзвінок ---
        if (text === '📞 Зворотний дзвінок') {
            if (!await requireLinked(chatId,
                '📞 Щоб ми могли вам передзвонити — будь ласка, підв\'яжіть ваш номер телефону.'))
                return;
            if (aiSettings?.tg_bot_token && aiSettings?.tg_chat_id) {
                const alertBot = new TelegramBot(aiSettings.tg_bot_token);
                const name = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ');
                const uname = msg.from.username ? ` (@${msg.from.username})` : '';
                const { data: patient } = await supabase
                    .from('cc_patients')
                    .select('phone')
                    .eq('telegram_id', String(chatId))
                    .single();
                const phoneStr = patient?.phone ? `\n📱 Телефон: ${patient.phone}` : '';
                alertBot.sendMessage(aiSettings.tg_chat_id,
                    `☎️ *Зворотний дзвінок*\n\nКлієнт ${name}${uname} просить передзвонити.${phoneStr}`,
                    { parse_mode: 'Markdown' });
            }
            await tgBot.sendMessage(chatId,
                '☎️ Ваш запит передано адміністратору.\nМи зателефонуємо вам найближчим часом!\n\n🕐 Графік роботи: Пн-Пт 09:00-19:00, Сб-Нд 09:00-16:00',
                MAIN_MENU);
            return;
        }

        // --- Default: fixed response for free text ---
        await tgBot.sendMessage(chatId,
            'Якщо у вас є запитання, на які немає відповіді в меню цього сервісу — натисніть кнопку «Зворотний зв\'язок» або зателефонуйте нам:',
            {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📞 (077) 600 7 800', url: 'tel:+380776007800' }],
                        [{ text: '📞 (073) 600 7 800', url: 'tel:+380736007800' }]
                    ]
                }
            }
        );

    });
}

function getViberMenuKeyboard() {
    return {
        Type: "keyboard",
        DefaultHeight: false,
        Buttons: [
            { ActionType: "reply", ActionBody: "📅 Записатися", Text: "📅 Записатися", TextSize: "regular" },
            { ActionType: "reply", ActionBody: "💰 Моя знижка", Text: "💰 Моя знижка", TextSize: "regular" },
            { ActionType: "reply", ActionBody: "🤝 Наші партнери", Text: "🤝 Наші партнери", TextSize: "regular" },
            { ActionType: "reply", ActionBody: "📞 Контакти", Text: "📞 Контакти", TextSize: "regular" }
        ]
    };
}

function setupViberHandlers() {
    viberBot.onSubscribe(response => {
        const keyboard = getViberMenuKeyboard();
        const welcomeText =
            `Привіт! 👋 Я — Люся, AI-асистент стоматології Dental Studio.\n\n` +
            `🎁 Для нових підписників — знижка 10% на перший або наступний візит!\n` +
            `Просто покажіть це повідомлення адміністратору.\n\n` +
            `Оберіть дію нижче або напишіть своє питання.`;
        response.send(new TextMessage(welcomeText, undefined, undefined, undefined, undefined, keyboard));
    });

    viberBot.onTextMessage(async (message, response) => {
        const userId = response.userProfile.id;
        const text = message.text;

        const keyboard = getViberMenuKeyboard();

        // --- Menu button: Записатися ---
        if (text === '📅 Записатися') {
            let session = await getOrCreateSession('viber', userId, response.userProfile.name);
            const history = await getChatHistory(session.id);
            const aiText = 'Хочу записатися на прийом';
            const reply = await getAIResponse(aiText, history);

            await saveMessage(session.id, 'user', aiText);
            await saveMessage(session.id, 'bot', reply);

            response.send(new TextMessage(reply.replace(/\[\[.*?\]\]/g, ''), undefined, undefined, undefined, undefined, keyboard));

            if (reply.includes('[[CALLBACK:TRUE]]')) {
                triggerAdminAlert('Viber', response.userProfile.name, aiText, session.id);
            }
            return;
        }

        // --- Menu button: Моя знижка ---
        if (text === '💰 Моя знижка') {
            const discountText =
                `🎁 Ваша знижка: 10% на лікування в Dental Studio.\n` +
                `Покажіть це повідомлення адміністратору при наступному візиті.`;
            response.send(new TextMessage(discountText, undefined, undefined, undefined, undefined, keyboard));
            return;
        }

        // --- Menu button: Наші партнери ---
        if (text === '🤝 Наші партнери') {
            try {
                const { data: partners } = await supabase.from('partners').select('*').eq('is_active', true);
                if (partners && partners.length > 0) {
                    const list = partners.map(p => {
                        let line = `• ${p.name}`;
                        if (p.discount_text) line += ` — ${p.discount_text}`;
                        if (p.description) line += `\n  ${p.description}`;
                        if (p.contact) line += `\n  📍 ${p.contact}`;
                        return line;
                    }).join('\n\n');
                    response.send(new TextMessage(`🤝 Наші партнери\n\n${list}`, undefined, undefined, undefined, undefined, keyboard));
                } else {
                    const emptyText =
                        `🤝 Наші партнери\n\n` +
                        `Незабаром тут з'являться знижки від наших партнерів!\n` +
                        `Слідкуйте за оновленнями.`;
                    response.send(new TextMessage(emptyText, undefined, undefined, undefined, undefined, keyboard));
                }
            } catch (e) {
                console.error('Viber partners fetch error:', e);
                response.send(new TextMessage(
                    `🤝 Наші партнери\n\nНезабаром тут з'являться знижки від наших партнерів!\nСлідкуйте за оновленнями.`,
                    undefined, undefined, undefined, undefined, keyboard
                ));
            }
            return;
        }

        // --- Menu button: Контакти ---
        if (text === '📞 Контакти') {
            const contactsText =
                `📍 Dental Studio\n` +
                `Чернігів, вулиця Незалежності, 21\n` +
                `📞 (073) 600 7 800\n` +
                `      (077) 600 7 800\n` +
                `🕐 Пн-Пт: 09:00 - 19:00\n` +
                `      Сб-Нд: 09:00 - 16:00`;
            response.send(new TextMessage(contactsText, undefined, undefined, undefined, undefined, keyboard));
            return;
        }

        // --- Default: pass to AI ---
        let session = await getOrCreateSession('viber', userId, response.userProfile.name);
        const history = await getChatHistory(session.id);
        const reply = await getAIResponse(text, history);

        await saveMessage(session.id, 'user', text);
        await saveMessage(session.id, 'bot', reply);

        response.send(new TextMessage(reply.replace(/\[\[.*?\]\]/g, ''), undefined, undefined, undefined, undefined, keyboard));

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
        if (session) return session;
    }

    // New User — insert session
    const { data: session, error: sessionErr } = await supabase.from('chat_sessions').insert({
        client_name: name,
        contact_type: platform
    }).select('*').single();

    if (sessionErr || !session) {
        console.error('❌ chat_sessions insert failed:', sessionErr?.message || 'null returned');
        return { id: null };
    }

    const { error: muErr } = await supabase.from('messenger_users').insert({
        platform,
        platform_user_id: String(platformId),
        session_id: session.id
    });

    if (muErr) console.error('❌ messenger_users insert failed:', muErr.message);

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

async function triggerQuestionAlert(patientChatId, patientData, question, aiAnswer) {
    if (aiSettings?.tg_bot_token && aiSettings?.tg_chat_id) {
        const alertBot = new TelegramBot(aiSettings.tg_bot_token);
        const aiAnswerBlock = aiAnswer && aiAnswer !== '(AI недоступний)'
            ? `\n\n🤖 *AI відповів:*\n_${aiAnswer.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&').substring(0, 300)}_`
            : '';
        alertBot.sendMessage(
            aiSettings.tg_chat_id,
            `❓ *Питання від пацієнта*\n\n👤 ${patientData.name}${patientData.tgName !== patientData.name ? ` (${patientData.tgName})` : ''}\n💬 *Питання:* ${question}${aiAnswerBlock}\n\n_Потребує відповіді лікаря. Chat ID: ${patientChatId}_`,
            { parse_mode: 'Markdown' }
        );
    }

    try {
        const { data: mu } = await supabase
            .from('messenger_users')
            .select('session_id')
            .eq('platform', 'telegram')
            .eq('platform_user_id', String(patientChatId))
            .single();

        await supabase.from('admin_tasks').insert({
            task_type: 'Питання пацієнта',
            description: `${patientData.name} запитує: "${question}"`,
            status: 'pending',
            metadata: {
                session_id: mu?.session_id || null,
                platform: 'telegram',
                patient_chat_id: String(patientChatId),
                ai_answer: aiAnswer
            }
        });
    } catch(e) { console.error('Failed to save question task:', e); }
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

        // 2. Find associated messenger user (by session_id or direct patient_chat_id)
        let platformUserId = task.metadata?.patient_chat_id || null;
        let platform = task.metadata?.platform || 'telegram';

        if (!platformUserId && task.metadata?.session_id) {
            const { data: mUser } = await supabase.from('messenger_users')
                .select('*')
                .eq('session_id', task.metadata.session_id)
                .single();
            if (mUser) { platformUserId = mUser.platform_user_id; platform = mUser.platform; }
        }

        if (platformUserId) {
            const replyMsg = message || '👨‍⚕️ Лікар Dental Studio відповів на ваше питання. Зв\'яжіться з нами для уточнення деталей.';
            if (platform === 'telegram' && tgBot) {
                await tgBot.sendMessage(platformUserId, replyMsg, MAIN_MENU);
            } else if (platform === 'viber' && viberBot) {
                const TextMessage = require('viber-bot').Message.Text;
                await viberBot.sendMessage({ id: platformUserId }, [new TextMessage(replyMsg)]);
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

            const now = new Date().toISOString();
            const rows = patients.map(p => {
                const row = {
                    cc_id: String(p.patient_id),
                    full_name: [p.lastname, p.firstname].filter(Boolean).join(' '),
                    phone: p.phone || p.phone2 || '',
                    email: p.email || '',
                    dob: p.birthday || null,
                    note: p.note || p.important_note || '',
                    last_visit_at: p.last_visit_date ? new Date(p.last_visit_date).toISOString() : null,
                    last_sync_at: now
                };
                // Only sync gender if CRM has it — otherwise keep the value set manually in Supabase
                if (p.gender) row.gender = p.gender;
                return row;
            });
            // Batch upsert in chunks of 500
            const CHUNK = 500;
            for (let i = 0; i < rows.length; i += CHUNK) {
                const { error } = await supabase.from('cc_patients')
                    .upsert(rows.slice(i, i + CHUNK), { onConflict: 'cc_id' });
                if (error) console.error('CRON Patients batch error:', error.message);
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
        const dateFrom = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]; // 30 days
        const dateTo = new Date().toISOString().split('T')[0];
        const url = `https://cliniccards.com/api/visits?from=${dateFrom}&to=${dateTo}`;
        const response = await fetch(url, { headers: ccHeaders() });
        const res = await response.json();
        if (res.result === 'success' && res.data) {
            console.log(`📥 CRON: Syncing ${res.data.length} recent visits...`);

            // Batch-load patient UUIDs to avoid N+1 queries
            const patientCcIds = [...new Set(res.data.map(v => String(v.patient_id)).filter(Boolean))];
            const { data: patientRows } = await supabase.from('cc_patients')
                .select('id, cc_id').in('cc_id', patientCcIds);
            const patientMap = Object.fromEntries((patientRows || []).map(p => [p.cc_id, p.id]));

            for (const v of res.data) {
                const visitStart = v.visit_start ? new Date(v.visit_start) : null;
                const visitEnd = v.visit_end ? new Date(v.visit_end) : null;

                const visitRow = {
                    cc_id: String(v.visit_id),
                    doctor_cc_id: String(v.doctor_id || ''),
                    doctor_id: String(v.doctor_id || ''),
                    doctor_name: v.doctor || null,
                    visit_date: visitStart ? visitStart.toISOString().split('T')[0] : null,
                    time_start: visitStart ? visitStart.toTimeString().slice(0, 5) : null,
                    time_end: visitEnd ? visitEnd.toTimeString().slice(0, 5) : null,
                    status: v.status || 'PLANNED',
                    note: v.note || null,
                    last_sync_at: new Date().toISOString()
                };

                if (v.patient_id) {
                    const ptId = patientMap[String(v.patient_id)];
                    if (ptId) {
                        visitRow.patient_id = ptId;
                        if (v.status === 'VISITED' && visitEnd) {
                            await supabase.from('cc_patients').update({
                                last_visit_at: visitEnd.toISOString()
                            }).eq('id', ptId).or(`last_visit_at.is.null,last_visit_at.lt.${visitEnd.toISOString()}`);
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

async function syncInvoices() {
    if (!aiSettings?.cc_api_token) return;
    console.log('🔄 CRON: Syncing invoices from Cliniccards...');
    try {
        const dateFrom = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
        const dateTo = new Date().toISOString().split('T')[0];
        const url = `https://cliniccards.com/api/invoices?from=${dateFrom}&to=${dateTo}`;
        const response = await fetch(url, { headers: ccHeaders() });
        const res = await response.json();
        if (res.result === 'success' && res.data) {
            console.log(`📥 CRON: Syncing ${res.data.length} invoices...`);

            // Batch-load patient UUIDs to avoid N+1 queries
            const invPatientCcIds = [...new Set(res.data.map(inv => String(inv.patient_id)).filter(Boolean))];
            const { data: invPatientRows } = await supabase.from('cc_patients')
                .select('id, cc_id').in('cc_id', invPatientCcIds);
            const invPatientMap = Object.fromEntries((invPatientRows || []).map(p => [p.cc_id, p.id]));

            for (const inv of res.data) {
                const row = {
                    cc_id: String(inv.id),
                    patient_cc_id: String(inv.patient_id || ''),
                    amount: parseFloat(inv.amount) || 0,
                    date: inv.date_created || null,
                    doctor_name: inv.issuer_name || null,
                    doctor_cc_id: String(inv.issuer_id || ''),
                    items: inv.invoice_items || [],
                    performers: inv.performers || [],
                    last_sync_at: new Date().toISOString()
                };

                if (inv.patient_id) {
                    const ptId = invPatientMap[String(inv.patient_id)];
                    if (ptId) row.patient_id = ptId;
                }

                await supabase.from('cc_invoices').upsert(row, { onConflict: 'cc_id' });

                // Schedule procedure follow-ups for recent invoices
                const invoiceAge = Date.now() - new Date(inv.date_created || 0).getTime();
                if (invoiceAge < 2 * 3600 * 1000 && inv.invoice_items?.length) {
                    scheduleProceduralFollowUps(inv, invPatientMap).catch(() => {});
                }
            }
            console.log('✅ CRON: Invoices sync done.');
        }
    } catch (e) {
        console.error('❌ CRON syncInvoices error:', e.message);
    }
}

// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 AI Omni-Server running on port ${PORT}`);
    // Retry initial settings load until tgBot is initialized
    for (let i = 0; i < 10; i++) {
        await refreshSettings();
        if (tgBot) break;
        console.warn(`⚠️ Bot not initialized yet, retrying in 5s... (${i + 1}/10)`);
        await new Promise(r => setTimeout(r, 5000));
    }
    setInterval(refreshSettings, 60000 * 15); // every 15 min

    setInterval(syncCliniccardsDatabase, 6 * 3600000);  // patients: every 6 hours
    setTimeout(syncCliniccardsDatabase, 10000);

    setInterval(syncVisitsAndRevenue, 2 * 3600000);     // visits: every 2 hours
    setTimeout(syncVisitsAndRevenue, 30000);

    setInterval(syncInvoices, 3 * 3600000);             // invoices/finance: every 3 hours
    setTimeout(syncInvoices, 45000);

    setInterval(syncDoctors, 86400000);             // doctors: once per day
    setTimeout(syncDoctors, 60000);

    // Campaign runner: campaigns, surveys, automated flows
    initCampaignRunner(supabase, aiSettings, tgBot, viberBot);
});
