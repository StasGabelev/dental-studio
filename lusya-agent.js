'use strict';
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

let lusyaBot = null;
let lusyaBotToken = null;

// Balance monitoring state
let _adminChatId = null;          // auto-detected from first incoming message
let _lastBalanceWarnAt = 0;        // timestamp of last warning to avoid spam
const BALANCE_WARN_USD  = 3;       // ⚠️ warn below $3
const BALANCE_CRIT_USD  = 1;       // 🔴 critical below $1
const BALANCE_WARN_EVERY_MS = 6 * 3600 * 1000;  // at most once per 6 hours

// ─── Init ────────────────────────────────────────────────────────────────────

function initLusya(supabase, aiSettings) {
    const token = aiSettings?.lusya_bot_token;
    if (!token) {
        console.log('ℹ️  Lusya: no lusya_bot_token set, skipping init.');
        return null;
    }
    if (lusyaBot && lusyaBotToken === token) return lusyaBot; // already running

    if (lusyaBot) { try { lusyaBot.stopPolling(); } catch(_) {} }
    lusyaBotToken = token;
    lusyaBot = new TelegramBot(token, { polling: true });

    // Start hourly balance check
    const apiKey = aiSettings?.lusya_openrouter_key || aiSettings?.api_key;
    if (apiKey) {
        runBalanceCheck(apiKey); // check immediately on startup
        setInterval(() => runBalanceCheck(apiKey), 3600 * 1000); // then every hour
    }

    lusyaBot.on('message', async (msg) => {
        const chatId = String(msg.chat.id);
        const text = msg.text;
        if (!text) return;

        // Track who writes to Lusya — last sender becomes the alert recipient
        _adminChatId = chatId;

        // Only respond to text messages, ignore commands except /start
        if (text === '/start') {
            lusyaBot.sendMessage(chatId, '👋 Привет! Я Люся — ваш внутренний AI-ассистент клиники. Спрашивайте всё что угодно о пациентах, докторах, записях, финансах. Могу создавать рассылки, опросы и отчёты.');
            return;
        }

        try {
            lusyaBot.sendChatAction(chatId, 'typing');
            const reply = await handleLusyaMessage(chatId, text, supabase, aiSettings);
            // Try with Markdown first; if Telegram rejects (bad formatting) — send as plain text
            try {
                await lusyaBot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
            } catch (mdErr) {
                console.warn('Markdown send failed, retrying as plain text:', mdErr.message);
                await lusyaBot.sendMessage(chatId, reply);
            }
        } catch (e) {
            console.error('Lusya message error:', e.message, e.stack);
            let userMsg = 'Щось пішло не так, спробуйте ще раз.';
            if (/402|payment|balance|credit/i.test(e.message)) {
                userMsg = '💳 Закінчився баланс OpenRouter. Поповніть на openrouter.ai/credits';
            } else if (/401|unauthorized|api.?key/i.test(e.message)) {
                userMsg = '🔑 Проблема з API-ключем OpenRouter. Перевірте в налаштуваннях Люсі.';
            } else if (/429|rate.?limit/i.test(e.message)) {
                userMsg = '⏳ Занадто багато запитів, почекайте хвилину і спробуйте ще раз.';
            } else if (/404|not.?found|model/i.test(e.message)) {
                userMsg = '🤖 Модель AI недоступна. Зверніться до розробника @sgabelev.';
            } else if (/timeout|ETIMEDOUT|ECONNRESET/i.test(e.message)) {
                userMsg = '🌐 Тайм-аут з\'єднання. Спробуйте ще раз.';
            }
            try {
                await lusyaBot.sendMessage(chatId, userMsg);
            } catch (_) {}
        }
    });

    lusyaBot.on('polling_error', (e) => console.error('Lusya polling error:', e.message));
    console.log('🌸 Lusya agent initialized.');
    return lusyaBot;
}

// ─── Balance monitoring ───────────────────────────────────────────────────────

async function getOpenRouterBalance(apiKey) {
    // /api/v1/credits — works for prepaid accounts (returns USD)
    try {
        const res = await fetch('https://openrouter.ai/api/v1/credits', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (res.ok) {
            const j = await res.json();
            if (j.data) {
                const remaining = (j.data.total_credits || 0) - (j.data.total_usage || 0);
                return { remaining, usage: j.data.total_usage, limit: j.data.total_credits };
            }
        }
    } catch (_) {}

    // Fallback: /api/v1/auth/key — works when key has explicit spend limit
    try {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (res.ok) {
            const j = await res.json();
            const usage = j.data?.usage || 0;
            const limit = j.data?.limit;
            if (limit != null) return { remaining: limit - usage, usage, limit };
        }
    } catch (_) {}

    return null; // can't determine balance
}

async function runBalanceCheck(apiKey) {
    if (!lusyaBot || !_adminChatId) return;

    const bal = await getOpenRouterBalance(apiKey);
    if (!bal) return; // balance unknown — skip

    const { remaining } = bal;
    const isCritical = remaining < BALANCE_CRIT_USD;
    const isWarning  = remaining < BALANCE_WARN_USD;

    if (!isWarning) return;

    const now = Date.now();
    // For critical: warn every 6h; for warning: only once until it drops further
    if (now - _lastBalanceWarnAt < BALANCE_WARN_EVERY_MS) return;
    _lastBalanceWarnAt = now;

    const icon = isCritical ? '🔴' : '⚠️';
    const level = isCritical ? 'КРИТИЧНО' : 'Попередження';
    const advice = isCritical
        ? 'Люся може перестати відповідати. Поповніть зараз!'
        : 'Поповніть баланс щоб Люся продовжувала працювати.';

    const text = `${icon} *OpenRouter — ${level}*\n\nЗалишилось на балансі: *$${remaining.toFixed(2)}*\n${advice}\n\n👉 https://openrouter.ai/credits`;

    try {
        await lusyaBot.sendMessage(_adminChatId, text, { parse_mode: 'Markdown' });
        console.log(`💰 Balance warning sent: $${remaining.toFixed(2)} remaining`);
    } catch (e) {
        console.error('Balance warning send error:', e.message);
    }
}

// ─── Core message handler ────────────────────────────────────────────────────

async function handleLusyaMessage(chatId, userText, supabase, aiSettings) {
    // 1. Always fetch fresh settings so API key / model changes take effect without restart
    const { data: freshSettings } = await supabase.from('ai_settings').select('*').single();
    const s = freshSettings || aiSettings || {};

    // 2. Load or create conversation session
    const { data: sessionRow } = await supabase
        .from('lusya_sessions')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .single();

    let history = sessionRow?.messages || [];

    // Keep only last 20 messages to avoid token bloat
    if (history.length > 20) history = history.slice(-20);

    // 3. Select model based on request complexity
    const model = selectModel(userText, s);

    // 4. Build system prompt — inject current date so Lusya can resolve "tomorrow", "next week" etc.
    const now = new Date();
    const dateStr = now.toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemPrompt = (s.lusya_system_prompt || DEFAULT_SYSTEM_PROMPT)
        + `\n\n[СИСТЕМНА ІНФОРМАЦІЯ]\nПоточна дата: ${dateStr}\nДля дат у інструментах використовуй формат YYYY-MM-DD.`;

    // 5. Build messages array
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userText }
    ];

    // 6. Call OpenRouter (retry once on 429 rate-limit)
    const apiKey = s.lusya_openrouter_key || s.api_key;
    if (!apiKey) throw new Error('401: Missing Authentication header — API key not set');
    let response;
    try {
        response = await callOpenRouter(model, messages, LUSYA_TOOLS, apiKey);
    } catch (e) {
        if (/429/.test(e.message)) {
            console.warn('429 rate-limit, retrying in 5s...');
            await new Promise(r => setTimeout(r, 5000));
            response = await callOpenRouter(model, messages, LUSYA_TOOLS, apiKey);
        } else throw e;
    }

    // 7. Handle tool calls (agentic loop — up to 5 iterations)
    let iterations = 0;
    while (response.tool_calls && iterations < 5) {
        iterations++;
        const toolMessages = [];

        for (const tc of response.tool_calls) {
            let args = {};
            try { args = JSON.parse(tc.function.arguments); } catch(_) {}

            let result;
            try {
                result = await executeLusyaTool(tc.function.name, args, supabase, s);
            } catch (e) {
                result = { error: e.message };
            }

            toolMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result)
            });
        }

        // Add assistant message with tool calls + tool results
        messages.push({ role: 'assistant', content: response.content || null, tool_calls: response.tool_calls });
        messages.push(...toolMessages);

        // Call model again with tool results — if 429, wait 5s and retry once
        try {
            response = await callOpenRouter(model, messages, LUSYA_TOOLS, apiKey);
        } catch (e) {
            if (/429/.test(e.message)) {
                await new Promise(r => setTimeout(r, 5000));
                response = await callOpenRouter(model, messages, LUSYA_TOOLS, apiKey);
            } else throw e;
        }
    }

    const replyText = response.content || '_(нет ответа)_';

    // 7. Save updated history
    const updatedHistory = [
        ...history,
        { role: 'user', content: userText },
        { role: 'assistant', content: replyText }
    ].slice(-20);

    await supabase.from('lusya_sessions').upsert({
        telegram_chat_id: chatId,
        messages: updatedHistory,
        last_active: new Date().toISOString()
    }, { onConflict: 'telegram_chat_id' });

    return replyText;
}

// ─── Model selection ─────────────────────────────────────────────────────────

const ALWAYS_COMPLEX_TOOLS = ['create_campaign', 'create_survey', 'create_flow', 'send_campaign_now'];

function selectModel(text, aiSettings) {
    const simpleModel = aiSettings?.lusya_simple_model || 'google/gemini-2.0-flash-001';
    const complexModel = aiSettings?.lusya_complex_model || 'anthropic/claude-sonnet-4-6';

    const keywordsRaw = aiSettings?.lusya_simple_keywords ||
        'сколько,кто,список,покажи,когда,скільки,хто,список,покажи,коли,сколько,который,яка,який';
    const keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase());

    // These always need complex model (reliable tool calling)
    const complexKeywords = ['статистик', 'аналіз', 'анализ', 'звіт', 'отчёт', 'ltv', 'топ', 'порівня', 'сравни', 'ризик', 'риск'];

    const lower = text.toLowerCase();
    const needsComplex = complexKeywords.some(kw => lower.includes(kw));
    const isSimple = !needsComplex && keywords.some(kw => lower.includes(kw)) && lower.length < 80;

    return isSimple ? simpleModel : complexModel;
}

// ─── OpenRouter API call ─────────────────────────────────────────────────────

async function callOpenRouter(model, messages, tools, apiKey) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://dentstudio.in.ua',
            'X-Title': 'Dental Studio Lusya'
        },
        body: JSON.stringify({
            model,
            messages,
            tools,
            tool_choice: 'auto'
        })
    });

    if (!response.ok) {
        const err = await response.text();
        const msg = `OpenRouter error ${response.status}: ${err.slice(0, 300)}`;
        console.error('🔴', msg);
        throw new Error(msg);
    }

    const data = await response.json();
    return data.choices[0].message;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const LUSYA_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_clinic_summary',
            description: 'Загальна зведення по клініці: кількість пацієнтів, візитів за період, виручка. Використовуй коли питають "скільки клієнтів вчора/сьогодні/за тиждень".',
            parameters: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'today | yesterday | this_week | last_week | this_month | last_month | this_quarter | last_quarter | this_year | last_year | last_30_days | all_time. Якщо не вказано — повертає загальну зведення.' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_doctor_stats',
            description: 'Статистика по доктору или всем докторам: количество визитов, выручка, загруженность за период',
            parameters: {
                type: 'object',
                properties: {
                    doctor_name: { type: 'string', description: 'Имя доктора или "all" для всех' },
                    period: { type: 'string', description: 'today | yesterday | this_week | last_week | this_month | last_month | this_quarter | last_quarter | this_year | last_year | last_30_days | last_90_days | all_time' }
                },
                required: ['period']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_revenue_report',
            description: 'Финансовый отчёт по выручке. Можно группировать по докторам или услугам',
            parameters: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'today | yesterday | this_week | last_week | this_month | last_month | this_quarter | last_quarter | this_year | last_year | last_30_days | last_90_days | all_time' },
                    group_by: { type: 'string', description: 'doctor | service' }
                },
                required: ['period']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_schedule',
            description: 'Розклад візитів: минулі та майбутні записи. Використовуй для "скільки записано на завтра/наступний тиждень", "хто приймає сьогодні", "записи лікаря на дату".',
            parameters: {
                type: 'object',
                properties: {
                    doctor_name: { type: 'string', description: 'Имя доктора' },
                    date_from: { type: 'string', description: 'Дата начала YYYY-MM-DD' },
                    date_to: { type: 'string', description: 'Дата конца YYYY-MM-DD (необязательно)' }
                },
                required: ['date_from']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_patients',
            description: 'Поиск и фильтрация пациентов по различным критериям. Для поиска по имени или фамилии — использовать параметр name. Возвращает количество и список.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Пошук по імені або прізвищу (часткове співпадіння). Використовувати коли шукають конкретну людину за ім\'ям/прізвищем.' },
                    phone: { type: 'string', description: 'Пошук по номеру телефону (часткове співпадіння, напр. "0501234567" або "+38050")' },
                    visit_date: { type: 'string', description: 'Знайти пацієнтів що були на прийомі в конкретний день YYYY-MM-DD' },
                    gender: { type: 'string', description: 'M | F' },
                    age_min: { type: 'number' },
                    age_max: { type: 'number' },
                    has_children: { type: 'boolean' },
                    profession: { type: 'string', description: 'Профессия для поиска (частичное совпадение)' },
                    tag: { type: 'string', description: 'Тег из custom_tags' },
                    has_telegram: { type: 'boolean' },
                    no_visit_days: { type: 'number', description: 'Пациенты без визита более N дней' },
                    last_visit_from: { type: 'string', description: 'Последний визит не раньше YYYY-MM-DD' },
                    last_visit_to: { type: 'string', description: 'Последний визит не позже YYYY-MM-DD' },
                    no_visit_since_days: { type: 'number', description: 'Пациенты без визита более N дней (синоним no_visit_days)' },
                    service_name: { type: 'string', description: 'Название услуги которую получал пациент (напр. "чистка", "имплант")' },
                    limit: { type: 'number', description: 'Максимум записей (по умолчанию 50)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_patient_profile',
            description: 'Полный профиль пациента по id или номеру телефона',
            parameters: {
                type: 'object',
                properties: {
                    patient_id: { type: 'string' },
                    phone: { type: 'string' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_patient',
            description: 'Обновить данные пациента в Supabase (только наши поля, не трогает CRM)',
            parameters: {
                type: 'object',
                properties: {
                    patient_id: { type: 'string' },
                    has_children: { type: 'boolean' },
                    children_ages: { type: 'array', items: { type: 'object' } },
                    profession_verified: { type: 'string' },
                    custom_tags: { type: 'array', items: { type: 'string' } },
                    notes_lusya: { type: 'string' },
                    preferred_channel: { type: 'string' }
                },
                required: ['patient_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_campaign',
            description: 'Создать рекламную рассылку (черновик). Возвращает id кампании для дальнейшего планирования',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Название кампании' },
                    message_template: { type: 'string', description: 'Текст сообщения. Поддерживает {first_name}, {full_name}, {doctor_name}' },
                    audience_filter: { type: 'object', description: 'Фильтр аудитории: {gender, age_min, age_max, has_children, tag}' },
                    scheduled_at: { type: 'string', description: 'ISO дата и время отправки (null = черновик)' }
                },
                required: ['name', 'message_template']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'schedule_campaign',
            description: 'Запланировать существующую кампанию на определённое время',
            parameters: {
                type: 'object',
                properties: {
                    campaign_id: { type: 'string' },
                    send_at: { type: 'string', description: 'ISO datetime' }
                },
                required: ['campaign_id', 'send_at']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_campaigns',
            description: 'Список кампаний и их статусы',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'draft|scheduled|running|done|all' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_survey',
            description: 'Создать опрос для пациентов',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    questions: {
                        type: 'array',
                        description: 'Список вопросов',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                text: { type: 'string' },
                                type: { type: 'string', description: 'choice | text | rating' },
                                options: { type: 'array', items: { type: 'string' } },
                                extract_field: { type: 'string', description: 'Поле в cc_patients для обновления из ответа' }
                            }
                        }
                    },
                    trigger_type: { type: 'string', description: 'manual | post_visit | scheduled' },
                    audience_filter: { type: 'object' }
                },
                required: ['name', 'questions']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_survey_results',
            description: 'Результаты опроса: сколько ответили, агрегированные ответы',
            parameters: {
                type: 'object',
                properties: {
                    survey_id: { type: 'string' }
                },
                required: ['survey_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'toggle_flow',
            description: 'Включить или выключить автоматический поток (post_visit, birthday, etc.)',
            parameters: {
                type: 'object',
                properties: {
                    flow_id: { type: 'string' },
                    active: { type: 'boolean' }
                },
                required: ['flow_id', 'active']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_flows',
            description: 'Список всех автоматических потоков и их статус (активен/не активен)',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'send_campaign_now',
            description: 'Немедленно запустить кампанию (перевести в статус scheduled с текущим временем). Рассылка начнётся через ~5 минут.',
            parameters: {
                type: 'object',
                properties: {
                    campaign_id: { type: 'string', description: 'ID кампании из create_campaign' }
                },
                required: ['campaign_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_audience_reach',
            description: 'Узнать охват аудитории перед рассылкой: сколько человек, у скольких есть Telegram/Viber. Поддерживает те же фильтры что и search_patients.',
            parameters: {
                type: 'object',
                properties: {
                    gender: { type: 'string' },
                    age_min: { type: 'number' },
                    age_max: { type: 'number' },
                    has_children: { type: 'boolean' },
                    has_telegram: { type: 'boolean' },
                    no_visit_days: { type: 'number' },
                    last_visit_from: { type: 'string' },
                    last_visit_to: { type: 'string' },
                    no_visit_since_days: { type: 'number' },
                    service_name: { type: 'string' },
                    tag: { type: 'string' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_free_slots',
            description: 'Свободные окна у докторов на указанный период. Рабочий день 09:00-18:00, слоты по 30 мин.',
            parameters: {
                type: 'object',
                properties: {
                    doctor_name: { type: 'string', description: 'Имя доктора (частичное). Пусто = все доктора.' },
                    date_from: { type: 'string', description: 'YYYY-MM-DD' },
                    date_to: { type: 'string', description: 'YYYY-MM-DD (по умолчанию = date_from)' }
                },
                required: ['date_from']
            }
        }
    },
    // ─── NEW: Analytics & CRM roles ──────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_patient_stats',
            description: 'Загальна статистика по базі пацієнтів. Використовувати коли питають: "скільки жінок/мужчин в базі", "скільки пацієнтів мають дату народження / день народження / birthdate / dob", "скільки з телефоном/email", "загальна кількість пацієнтів", "статистика по базі", "заповненість бази". Повертає: total, female, male, with_dob, without_dob, with_phone, with_email.',
            parameters: {
                type: 'object',
                properties: {
                    group_by: { type: 'string', description: 'gender — розбивка по статі (за замовчуванням)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_top_patients',
            description: 'Топ-пацієнти за сумою витрат або кількістю візитів. Роль: Таргетолог, VIP-сегмент.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number', description: 'Кількість пацієнтів (за замовчуванням 10)' },
                    order_by: { type: 'string', description: 'spent — за витратами, visits — за візитами' },
                    period: { type: 'string', description: 'all_time | this_year | last_year | this_month | last_month | last_30_days | last_90_days' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_patient_history',
            description: 'Історія лікування конкретного пацієнта: всі візити з датами, лікарями, послугами та сумами. Використовувати коли питають "що лікували", "яка історія", "які послуги", "коли були", "покажи візити пацієнта". Можна передати patient_id (з попереднього пошуку) АБО name для пошуку по імені.',
            parameters: {
                type: 'object',
                properties: {
                    patient_id: { type: 'string', description: 'UUID пацієнта з попереднього результату search_patients' },
                    name: { type: 'string', description: 'Ім\'я або прізвище пацієнта якщо немає patient_id' },
                    limit: { type: 'number', description: 'Кількість останніх візитів (за замовчуванням 20)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_patient_ltv',
            description: 'Lifetime Value пацієнта: загальна сума витрат, кількість візитів, середній чек. Роль: Таргетолог, Бухгалтер.',
            parameters: {
                type: 'object',
                properties: {
                    patient_id: { type: 'string', description: 'UUID пацієнта (якщо конкретний пацієнт)' },
                    phone: { type: 'string', description: 'Телефон пацієнта (альтернатива patient_id)' },
                    segment: { type: 'object', description: 'Фільтр сегменту (gender, age_min, age_max) для середнього LTV по групі' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'compare_periods',
            description: 'Порівняння двох будь-яких періодів: візити, виручка, середній чек. Роль: Бухгалтер, Аналітик. Приклад: "цей місяць vs минулий".',
            parameters: {
                type: 'object',
                properties: {
                    period1: { type: 'string', description: 'Перший період: this_month | last_month | this_week | last_week | this_year | last_year | last_30_days тощо' },
                    period2: { type: 'string', description: 'Другий період для порівняння' }
                },
                required: ['period1', 'period2']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_average_check',
            description: 'Середній чек по клініці, лікарю або послузі за період. Роль: Бухгалтер.',
            parameters: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'today | this_week | this_month | last_month | this_year | last_30_days тощо' },
                    group_by: { type: 'string', description: 'doctor | service | null (загальний по клініці)' }
                },
                required: ['period']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_birthday_patients',
            description: 'Іменинники: пацієнти з днем народження. Використовувати коли питають "хто іменинник сьогодні/цього тижня/цього місяця/наступного місяця", "у кого день народження", "у кого ДН в цьому місяці", "birthday this month/next month". Роль: CRM-менеджер.',
            parameters: {
                type: 'object',
                properties: {
                    when: { type: 'string', description: 'today | this_week | this_month | next_month | next_30_days' }
                },
                required: ['when']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_churn_risk',
            description: 'Пацієнти з ризиком відтоку: не приходили N днів, але раніше були регулярними. Роль: Аналітик, CRM-менеджер.',
            parameters: {
                type: 'object',
                properties: {
                    days_inactive: { type: 'number', description: 'Кількість днів без візиту (за замовчуванням 90)' },
                    min_past_visits: { type: 'number', description: 'Мінімум візитів в минулому щоб вважатись регулярним (за замовчуванням 2)' },
                    limit: { type: 'number', description: 'Максимум результатів (за замовчуванням 50)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_doctor_recommendation',
            description: 'Рекомендація по завантаженості лікарів: хто недозавантажений і потребує більше клієнтів. Роль: Менеджер.',
            parameters: {
                type: 'object',
                properties: {
                    period: { type: 'string', description: 'this_month | last_month | this_week (за замовчуванням this_month)' }
                },
                required: []
            }
        }
    }
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeLusyaTool(toolName, args, supabase, aiSettings) {
    const today = new Date();

    function getPeriodDates(period) {
        const now = new Date();
        let from, to = new Date(now);

        switch (period) {
            case 'today':
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'yesterday': {
                const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                from = y;
                to = new Date(y);
                break;
            }
            case 'this_week': {
                // Monday of current week
                const day = now.getDay() || 7;
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
                break;
            }
            case 'last_week': {
                const day = now.getDay() || 7;
                from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 6);
                to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
                break;
            }
            case 'this_month':
                from = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'last_month':
                from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                to = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'this_quarter': {
                const q = Math.floor(now.getMonth() / 3);
                from = new Date(now.getFullYear(), q * 3, 1);
                break;
            }
            case 'last_quarter': {
                const q = Math.floor(now.getMonth() / 3);
                from = new Date(now.getFullYear(), (q - 1) * 3, 1);
                to = new Date(now.getFullYear(), q * 3, 0);
                break;
            }
            case 'this_year':
                from = new Date(now.getFullYear(), 0, 1);
                break;
            case 'last_year':
                from = new Date(now.getFullYear() - 1, 0, 1);
                to = new Date(now.getFullYear() - 1, 11, 31);
                break;
            case 'last_30_days':
                from = new Date(Date.now() - 30 * 86400000);
                break;
            case 'last_90_days':
                from = new Date(Date.now() - 90 * 86400000);
                break;
            case 'all_time':
                from = new Date(2020, 0, 1);
                break;
            default:
                from = new Date(Date.now() - 30 * 86400000);
        }
        return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }

    switch (toolName) {

        case 'get_clinic_summary': {
            const todayStr = today.toISOString().split('T')[0];

            if (args.period) {
                // Period-specific query
                const { from, to } = getPeriodDates(args.period);
                const [vRes, invRes] = await Promise.all([
                    supabase.from('cc_visits').select('id', { count: 'exact', head: true })
                        .gte('visit_date', from).lte('visit_date', to),
                    supabase.from('cc_invoices').select('amount')
                        .gte('date', from).lte('date', to)
                ]);
                const revenue = (invRes.data || []).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
                return {
                    period: args.period,
                    date_from: from,
                    date_to: to,
                    visits: vRes.count || 0,
                    revenue: Math.round(revenue)
                };
            }

            // General summary (no period)
            const last30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            const [pRes, vRes, vTodayRes, dRes, invRes] = await Promise.all([
                supabase.from('cc_patients').select('id', { count: 'exact', head: true }),
                supabase.from('cc_visits').select('id', { count: 'exact', head: true }).gte('visit_date', last30),
                supabase.from('cc_visits').select('id', { count: 'exact', head: true }).eq('visit_date', todayStr),
                supabase.from('cc_doctors').select('cc_id', { count: 'exact', head: true }),
                supabase.from('cc_invoices').select('amount').gte('date', new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0])
            ]);

            const monthRevenue = (invRes.data || []).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
            return {
                total_patients: pRes.count || 0,
                visits_last_30_days: vRes.count || 0,
                visits_today: vTodayRes.count || 0,
                active_doctors: dRes.count || 0,
                revenue_this_month: Math.round(monthRevenue)
            };
        }

        case 'get_doctor_stats': {
            const { from, to } = getPeriodDates(args.period);

            // Use cc_invoices for revenue (more reliable than cc_visits.amount_paid)
            const [{ data: visits }, { data: invoices }, { data: doctors }] = await Promise.all([
                supabase.from('cc_visits').select('doctor_cc_id, status')
                    .gte('visit_date', from).lte('visit_date', to),
                supabase.from('cc_invoices').select('doctor_cc_id, amount')
                    .gte('date', from).lte('date', to),
                supabase.from('cc_doctors').select('cc_id, full_name')
            ]);

            const doctorMap = {};
            (doctors || []).forEach(d => { doctorMap[d.cc_id] = d.full_name; });

            const stats = {};
            for (const v of (visits || [])) {
                const key = v.doctor_cc_id || 'unknown';
                if (!stats[key]) stats[key] = { visits: 0, revenue: 0 };
                stats[key].visits++;
            }
            for (const inv of (invoices || [])) {
                const key = inv.doctor_cc_id || 'unknown';
                if (!stats[key]) stats[key] = { visits: 0, revenue: 0 };
                stats[key].revenue += parseFloat(inv.amount || 0);
            }

            const result = Object.entries(stats).map(([ccId, s]) => ({
                doctor: doctorMap[ccId] || ccId,
                visits: s.visits,
                revenue: Math.round(s.revenue)
            })).sort((a, b) => b.visits - a.visits);

            if (args.doctor_name && args.doctor_name !== 'all') {
                const lower = args.doctor_name.toLowerCase();
                return result.filter(r => r.doctor.toLowerCase().includes(lower));
            }
            return result;
        }

        case 'get_revenue_report': {
            const { from, to } = getPeriodDates(args.period);

            // Use cc_invoices (has real paid amounts with service details)
            const { data: invoices } = await supabase.from('cc_invoices')
                .select('doctor_cc_id, doctor_name, amount, items')
                .gte('date', from).lte('date', to);

            if (!invoices?.length) return { period: args.period, total: 0, breakdown: [] };

            const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
            const breakdown = {};

            if (args.group_by === 'service') {
                for (const inv of invoices) {
                    for (const item of (inv.items || [])) {
                        const key = item.plan_item_name || 'Неизвестная услуга';
                        const amount = (item.price || 0) * (item.quantity || 1) * (1 - (item.discount || 0) / 100);
                        breakdown[key] = (breakdown[key] || 0) + amount;
                    }
                }
            } else {
                for (const inv of invoices) {
                    const key = inv.doctor_name || inv.doctor_cc_id || 'Неизвестно';
                    breakdown[key] = (breakdown[key] || 0) + parseFloat(inv.amount || 0);
                }
            }

            const sorted = Object.entries(breakdown)
                .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
                .sort((a, b) => b.amount - a.amount);

            return { period: args.period, total: Math.round(total), breakdown: sorted };
        }

        case 'get_schedule': {
            let query = supabase.from('cc_visits').select('visit_date, time_start, time_end, doctor_cc_id, status, service_name')
                .gte('visit_date', args.date_from);
            if (args.date_to) query = query.lte('visit_date', args.date_to);

            if (args.doctor_name) {
                const { data: docs } = await supabase.from('cc_doctors')
                    .select('cc_id').ilike('full_name', `%${args.doctor_name}%`);
                const ids = (docs || []).map(d => d.cc_id);
                if (ids.length) query = query.in('doctor_cc_id', ids);
            }

            const { data: visits } = await query.order('visit_date').order('time_start').limit(50);
            return visits || [];
        }

        case 'search_patients': {
            const limit = args.limit || 50;

            // If filtering by service — get patient UUIDs from cc_invoices first
            let servicePatientIds = null;
            if (args.service_name) {
                const { data: invs } = await supabase.from('cc_invoices')
                    .select('patient_id')
                    .ilike('items::text', `%${args.service_name}%`)
                    .not('patient_id', 'is', null);
                servicePatientIds = [...new Set((invs || []).map(i => i.patient_id))];
                if (!servicePatientIds.length) return { count: 0, patients: [], note: 'Нет пациентов с такой услугой' };
            }

            let query = supabase.from('cc_patients')
                .select('id, full_name, phone, gender, dob, has_children, custom_tags, last_visit_at, telegram_id, viber_id');

            // If filtering by visit_date — get patient IDs from cc_visits first
            if (args.visit_date) {
                const { data: visitRows } = await supabase.from('cc_visits')
                    .select('patient_id').eq('visit_date', args.visit_date).not('patient_id', 'is', null);
                const visitPatientIds = [...new Set((visitRows || []).map(v => v.patient_id))];
                if (!visitPatientIds.length) return { count: 0, patients: [], note: `Немає пацієнтів з візитом ${args.visit_date}` };
                query = query.in('id', visitPatientIds);
            }

            if (servicePatientIds) query = query.in('id', servicePatientIds);
            if (args.name) query = query.ilike('full_name', `%${args.name}%`);
            if (args.phone) query = query.ilike('phone', `%${args.phone.replace(/\D/g, '').slice(-9)}%`);
            if (args.gender) query = query.eq('gender', args.gender);
            if (args.has_children !== undefined) query = query.eq('has_children', args.has_children);
            if (args.has_telegram) query = query.not('telegram_id', 'is', null);
            if (args.tag) query = query.contains('custom_tags', [args.tag]);
            if (args.profession) query = query.or(`profession.ilike.%${args.profession}%,profession_verified.ilike.%${args.profession}%`);

            const noVisitDays = args.no_visit_days || args.no_visit_since_days;
            if (noVisitDays) {
                const cutoff = new Date(Date.now() - noVisitDays * 86400000).toISOString();
                query = query.or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`);
            }
            if (args.last_visit_from) query = query.gte('last_visit_at', args.last_visit_from);
            if (args.last_visit_to) query = query.lte('last_visit_at', args.last_visit_to + 'T23:59:59');

            if (args.age_min || args.age_max) {
                if (args.age_max) {
                    const minDob = new Date(today.getFullYear() - args.age_max - 1, today.getMonth(), today.getDate());
                    query = query.gte('dob', minDob.toISOString().split('T')[0]);
                }
                if (args.age_min) {
                    const maxDob = new Date(today.getFullYear() - args.age_min, today.getMonth(), today.getDate());
                    query = query.lte('dob', maxDob.toISOString().split('T')[0]);
                }
            }

            // Get server-side count first (correct even for large datasets)
            const { count: totalCount } = await query.select('id', { count: 'exact', head: true });
            const { data } = await query.limit(limit);
            const patients = data || [];
            return {
                total_count: totalCount || 0,
                shown: patients.length,
                patients,
                reach: {
                    with_telegram: patients.filter(p => p.telegram_id).length,
                    with_viber: patients.filter(p => p.viber_id).length,
                    unreachable: patients.filter(p => !p.telegram_id && !p.viber_id).length
                }
            };
        }

        case 'get_patient_profile': {
            let query = supabase.from('cc_patients').select('*');
            if (args.patient_id) query = query.eq('id', args.patient_id);
            else if (args.phone) query = query.eq('phone', args.phone);
            const { data } = await query.single();
            if (!data) return { error: 'Patient not found' };

            const { data: visits } = await supabase.from('cc_visits')
                .select('visit_date, time_start, service_name, amount_paid, status, doctor_cc_id')
                .eq('patient_id', data.id).order('visit_date', { ascending: false }).limit(5);
            return { ...data, recent_visits: visits || [] };
        }

        case 'update_patient': {
            const { patient_id, ...fields } = args;
            const allowed = ['has_children', 'children_ages', 'profession_verified', 'custom_tags', 'notes_lusya', 'preferred_channel'];
            const update = {};
            allowed.forEach(f => { if (fields[f] !== undefined) update[f] = fields[f]; });
            if (!Object.keys(update).length) return { error: 'No valid fields to update' };
            const { error } = await supabase.from('cc_patients').update(update).eq('id', patient_id);
            return error ? { error: error.message } : { success: true, updated: update };
        }

        case 'create_campaign': {
            const { data, error } = await supabase.from('campaigns').insert({
                name: args.name,
                message_template: args.message_template,
                audience_filter: args.audience_filter || {},
                scheduled_at: args.scheduled_at || null,
                status: args.scheduled_at ? 'scheduled' : 'draft',
                created_by: 'lusya'
            }).select('id, name, status').single();
            return error ? { error: error.message } : data;
        }

        case 'schedule_campaign': {
            const { error } = await supabase.from('campaigns').update({
                scheduled_at: args.send_at,
                status: 'scheduled'
            }).eq('id', args.campaign_id);
            return error ? { error: error.message } : { success: true };
        }

        case 'get_campaigns': {
            let query = supabase.from('campaigns').select('id, name, status, scheduled_at, stats, created_at');
            if (args.status && args.status !== 'all') query = query.eq('status', args.status);
            const { data } = await query.order('created_at', { ascending: false }).limit(20);
            return data || [];
        }

        case 'create_survey': {
            const { data, error } = await supabase.from('surveys').insert({
                name: args.name,
                questions: args.questions,
                trigger_type: args.trigger_type || 'manual',
                audience_filter: args.audience_filter || {},
                status: 'draft',
                created_by: 'lusya'
            }).select('id, name').single();
            return error ? { error: error.message } : data;
        }

        case 'get_survey_results': {
            const { data: responses } = await supabase.from('survey_responses')
                .select('responses, ai_extracted, responded_at')
                .eq('survey_id', args.survey_id);
            if (!responses?.length) return { total_responses: 0 };

            const { data: survey } = await supabase.from('surveys')
                .select('name, questions').eq('id', args.survey_id).single();

            // Aggregate answers per question
            const aggregated = {};
            (survey?.questions || []).forEach(q => { aggregated[q.id] = {}; });
            responses.forEach(r => {
                Object.entries(r.responses || {}).forEach(([qId, answer]) => {
                    if (!aggregated[qId]) aggregated[qId] = {};
                    const key = String(answer);
                    aggregated[qId][key] = (aggregated[qId][key] || 0) + 1;
                });
            });

            return { survey_name: survey?.name, total_responses: responses.length, aggregated };
        }

        case 'toggle_flow': {
            const { error } = await supabase.from('automated_flows')
                .update({ is_active: args.active }).eq('id', args.flow_id);
            return error ? { error: error.message } : { success: true, flow_id: args.flow_id, active: args.active };
        }

        case 'get_flows': {
            const { data } = await supabase.from('automated_flows')
                .select('id, name, trigger_type, delay_hours, is_active, created_at');
            return data || [];
        }

        case 'send_campaign_now': {
            const { error } = await supabase.from('campaigns').update({
                status: 'scheduled',
                scheduled_at: new Date().toISOString()
            }).eq('id', args.campaign_id);
            return error ? { error: error.message } : { ok: true, message: 'Кампания запущена, рассылка начнётся через ~5 минут' };
        }

        case 'get_audience_reach': {
            // Same filter logic as search_patients, but only counts
            let servicePatientIds = null;
            if (args.service_name) {
                const { data: invs } = await supabase.from('cc_invoices')
                    .select('patient_id').ilike('items::text', `%${args.service_name}%`).not('patient_id', 'is', null);
                servicePatientIds = [...new Set((invs || []).map(i => i.patient_id))];
                if (!servicePatientIds.length) return { total: 0, with_telegram: 0, with_viber: 0, unreachable: 0 };
            }

            let query = supabase.from('cc_patients').select('telegram_id, viber_id');
            if (servicePatientIds) query = query.in('id', servicePatientIds);
            if (args.gender) query = query.eq('gender', args.gender);
            if (args.has_children !== undefined) query = query.eq('has_children', args.has_children);
            if (args.has_telegram) query = query.not('telegram_id', 'is', null);
            if (args.tag) query = query.contains('custom_tags', [args.tag]);
            const noVisitDays = args.no_visit_days || args.no_visit_since_days;
            if (noVisitDays) {
                const cutoff = new Date(Date.now() - noVisitDays * 86400000).toISOString();
                query = query.or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`);
            }
            if (args.last_visit_from) query = query.gte('last_visit_at', args.last_visit_from);
            if (args.last_visit_to) query = query.lte('last_visit_at', args.last_visit_to + 'T23:59:59');
            if (args.age_min || args.age_max) {
                if (args.age_max) {
                    const minDob = new Date(today.getFullYear() - args.age_max - 1, today.getMonth(), today.getDate());
                    query = query.gte('dob', minDob.toISOString().split('T')[0]);
                }
                if (args.age_min) {
                    const maxDob = new Date(today.getFullYear() - args.age_min, today.getMonth(), today.getDate());
                    query = query.lte('dob', maxDob.toISOString().split('T')[0]);
                }
            }

            const { data } = await query.limit(10000);
            const patients = data || [];
            return {
                total: patients.length,
                with_telegram: patients.filter(p => p.telegram_id).length,
                with_viber: patients.filter(p => p.viber_id).length,
                unreachable: patients.filter(p => !p.telegram_id && !p.viber_id).length
            };
        }

        case 'get_free_slots': {
            const dateTo = args.date_to || args.date_from;
            const WORK_START = 9, WORK_END = 18, SLOT_MIN = 30;

            // Get booked slots
            let query = supabase.from('cc_visits')
                .select('visit_date, time_start, time_end, doctor_cc_id')
                .gte('visit_date', args.date_from).lte('visit_date', dateTo)
                .not('status', 'eq', 'CANCELLED');

            const { data: doctors } = await supabase.from('cc_doctors').select('cc_id, full_name').eq('is_active', true);
            const doctorMap = {};
            (doctors || []).forEach(d => { doctorMap[d.cc_id] = d.full_name; });

            if (args.doctor_name) {
                const ids = (doctors || []).filter(d => d.full_name.toLowerCase().includes(args.doctor_name.toLowerCase())).map(d => d.cc_id);
                if (ids.length) query = query.in('doctor_cc_id', ids);
            }

            const { data: booked } = await query;

            // Build free slots per doctor per date
            const bookedByDoctorDate = {};
            for (const v of (booked || [])) {
                const key = `${v.doctor_cc_id}|${v.visit_date}`;
                if (!bookedByDoctorDate[key]) bookedByDoctorDate[key] = [];
                bookedByDoctorDate[key].push({ start: v.time_start, end: v.time_end });
            }

            const result = [];
            const targetDoctors = args.doctor_name
                ? (doctors || []).filter(d => d.full_name.toLowerCase().includes(args.doctor_name.toLowerCase()))
                : (doctors || []);

            // Iterate dates
            const start = new Date(args.date_from);
            const end = new Date(dateTo);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const dow = d.getDay();
                if (dow === 0 || dow === 6) continue; // skip weekends

                for (const doc of targetDoctors) {
                    const key = `${doc.cc_id}|${dateStr}`;
                    const occupied = (bookedByDoctorDate[key] || []).map(s => {
                        const [sh, sm] = (s.start || '09:00').split(':').map(Number);
                        const [eh, em] = (s.end || '09:30').split(':').map(Number);
                        return { from: sh * 60 + sm, to: eh * 60 + em };
                    });

                    const free = [];
                    for (let t = WORK_START * 60; t < WORK_END * 60; t += SLOT_MIN) {
                        const slotEnd = t + SLOT_MIN;
                        const isFree = !occupied.some(o => t < o.to && slotEnd > o.from);
                        if (isFree) {
                            const hh = String(Math.floor(t / 60)).padStart(2, '0');
                            const mm = String(t % 60).padStart(2, '0');
                            free.push(`${hh}:${mm}`);
                        }
                    }

                    if (free.length) {
                        result.push({ doctor: doc.full_name, date: dateStr, free_slots: free });
                    }
                }
            }
            return result.length ? result : [{ message: 'Свободных окон не найдено' }];
        }

        case 'get_patient_stats': {
            const [{ count: total }, { count: female }, { count: male }, { count: with_dob }, { count: with_phone }, { count: with_email }] = await Promise.all([
                supabase.from('cc_patients').select('*', { count: 'exact', head: true }),
                supabase.from('cc_patients').select('*', { count: 'exact', head: true }).eq('gender', 'F'),
                supabase.from('cc_patients').select('*', { count: 'exact', head: true }).eq('gender', 'M'),
                supabase.from('cc_patients').select('*', { count: 'exact', head: true }).not('dob', 'is', null),
                supabase.from('cc_patients').select('*', { count: 'exact', head: true }).neq('phone', ''),
                supabase.from('cc_patients').select('*', { count: 'exact', head: true }).neq('email', ''),
            ]);
            const unknown_gender = total - female - male;
            const without_dob = total - with_dob;
            return { total, female, male, unknown_gender, with_dob, without_dob, with_phone, with_email };
        }

        case 'get_top_patients': {
            const limit = args.limit || 10;
            const orderBy = args.order_by || 'spent';
            const period = args.period || 'all_time';
            const { from, to } = getPeriodDates(period);

            if (orderBy === 'visits') {
                const { data: visits } = await supabase.from('cc_visits')
                    .select('patient_id').gte('visit_date', from).lte('visit_date', to).not('patient_id', 'is', null);
                const counts = {};
                for (const v of (visits || [])) counts[v.patient_id] = (counts[v.patient_id] || 0) + 1;
                const topIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
                if (!topIds.length) return { top_patients: [] };
                const { data: patients } = await supabase.from('cc_patients')
                    .select('id, full_name, phone, telegram_id, last_visit_at').in('id', topIds);
                const patMap = {};
                (patients || []).forEach(p => { patMap[p.id] = p; });
                return {
                    period, order_by: 'visits',
                    top_patients: topIds.map((id, i) => ({
                        rank: i + 1,
                        full_name: patMap[id]?.full_name || 'Невідомо',
                        phone: patMap[id]?.phone,
                        visit_count: counts[id],
                        last_visit_at: patMap[id]?.last_visit_at,
                        has_telegram: !!patMap[id]?.telegram_id
                    }))
                };
            } else {
                const { data: invoices } = await supabase.from('cc_invoices')
                    .select('patient_id, amount').gte('date', from).lte('date', to).not('patient_id', 'is', null);
                const totals = {};
                for (const inv of (invoices || [])) totals[inv.patient_id] = (totals[inv.patient_id] || 0) + parseFloat(inv.amount || 0);
                const topIds = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
                if (!topIds.length) return { top_patients: [] };
                const { data: visits } = await supabase.from('cc_visits')
                    .select('patient_id').in('patient_id', topIds).gte('visit_date', from).lte('visit_date', to);
                const visitCounts = {};
                (visits || []).forEach(v => { visitCounts[v.patient_id] = (visitCounts[v.patient_id] || 0) + 1; });
                const { data: patients } = await supabase.from('cc_patients')
                    .select('id, full_name, phone, telegram_id, last_visit_at').in('id', topIds);
                const patMap = {};
                (patients || []).forEach(p => { patMap[p.id] = p; });
                return {
                    period, order_by: 'spent',
                    top_patients: topIds.map((id, i) => ({
                        rank: i + 1,
                        full_name: patMap[id]?.full_name || 'Невідомо',
                        phone: patMap[id]?.phone,
                        total_spent: Math.round(totals[id]),
                        visit_count: visitCounts[id] || 0,
                        last_visit_at: patMap[id]?.last_visit_at,
                        has_telegram: !!patMap[id]?.telegram_id
                    }))
                };
            }
        }

        case 'get_patient_history': {
            const histLimit = args.limit || 20;
            let patient = null;
            if (args.patient_id) {
                const { data } = await supabase.from('cc_patients')
                    .select('id, full_name, phone, dob, gender').eq('id', args.patient_id).single();
                patient = data;
            } else if (args.name) {
                const { data } = await supabase.from('cc_patients')
                    .select('id, full_name, phone, dob, gender').ilike('full_name', `%${args.name}%`).limit(1).single();
                patient = data;
            }
            if (!patient) return { error: 'Пацієнта не знайдено' };

            const [{ data: visits }, { data: invoices }] = await Promise.all([
                supabase.from('cc_visits')
                    .select('visit_date, time_start, doctor_cc_id, service_name, status')
                    .eq('patient_id', patient.id)
                    .order('visit_date', { ascending: false })
                    .limit(histLimit),
                supabase.from('cc_invoices')
                    .select('date, amount, items, doctor_name')
                    .eq('patient_id', patient.id)
                    .order('date', { ascending: false })
                    .limit(histLimit)
            ]);

            const formattedVisits = (visits || []).map(v => ({
                date: v.visit_date,
                time: v.time_start,
                service: v.service_name,
                status: v.status
            }));

            const formattedInvoices = (invoices || []).map(inv => {
                const services = (inv.items || []).map(i => `${i.plan_item_name} (${i.quantity || 1}×${i.price}₴)`).join(', ');
                return { date: inv.date, amount: parseFloat(inv.amount || 0), doctor: inv.doctor_name, services };
            });

            const totalSpent = formattedInvoices.reduce((s, i) => s + i.amount, 0);

            return {
                patient: patient.full_name,
                phone: patient.phone,
                gender: patient.gender,
                dob: patient.dob,
                total_spent: Math.round(totalSpent),
                visit_count: formattedVisits.length,
                visits: formattedVisits,
                invoices: formattedInvoices
            };
        }

        case 'get_patient_ltv': {
            if (args.patient_id || args.phone) {
                let patQuery = supabase.from('cc_patients').select('id, full_name, phone, last_visit_at');
                if (args.patient_id) patQuery = patQuery.eq('id', args.patient_id);
                else patQuery = patQuery.eq('phone', args.phone);
                const { data: patient } = await patQuery.single();
                if (!patient) return { error: 'Пацієнта не знайдено' };
                const [{ data: invoices }, { data: visits }] = await Promise.all([
                    supabase.from('cc_invoices').select('amount, date').eq('patient_id', patient.id),
                    supabase.from('cc_visits').select('visit_date').eq('patient_id', patient.id).order('visit_date')
                ]);
                const totalSpent = (invoices || []).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
                const visitCount = (visits || []).length;
                return {
                    patient: patient.full_name,
                    phone: patient.phone,
                    total_spent: Math.round(totalSpent),
                    visit_count: visitCount,
                    avg_per_visit: visitCount ? Math.round(totalSpent / visitCount) : 0,
                    first_visit: visits?.[0]?.visit_date,
                    last_visit: visits?.[visits.length - 1]?.visit_date
                };
            } else {
                const seg = args.segment || {};
                let patQuery = supabase.from('cc_patients').select('id');
                if (seg.gender) patQuery = patQuery.eq('gender', seg.gender);
                if (seg.age_min) {
                    const maxDob = new Date(today.getFullYear() - seg.age_min, today.getMonth(), today.getDate());
                    patQuery = patQuery.lte('dob', maxDob.toISOString().split('T')[0]);
                }
                if (seg.age_max) {
                    const minDob = new Date(today.getFullYear() - seg.age_max - 1, today.getMonth(), today.getDate());
                    patQuery = patQuery.gte('dob', minDob.toISOString().split('T')[0]);
                }
                const { data: patients } = await patQuery.limit(5000);
                if (!patients?.length) return { total_patients: 0, avg_ltv: 0 };
                const ids = patients.map(p => p.id);
                const { data: invoices } = await supabase.from('cc_invoices').select('patient_id, amount').in('patient_id', ids);
                const spentByPatient = {};
                (invoices || []).forEach(inv => {
                    spentByPatient[inv.patient_id] = (spentByPatient[inv.patient_id] || 0) + parseFloat(inv.amount || 0);
                });
                const values = Object.values(spentByPatient);
                const avgLtv = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
                return {
                    segment: seg,
                    total_patients: patients.length,
                    patients_with_purchases: values.length,
                    avg_ltv: Math.round(avgLtv),
                    total_revenue: Math.round(values.reduce((s, v) => s + v, 0))
                };
            }
        }

        case 'compare_periods': {
            const p1 = getPeriodDates(args.period1);
            const p2 = getPeriodDates(args.period2);
            const [v1, v2, inv1, inv2] = await Promise.all([
                supabase.from('cc_visits').select('id', { count: 'exact', head: true }).gte('visit_date', p1.from).lte('visit_date', p1.to),
                supabase.from('cc_visits').select('id', { count: 'exact', head: true }).gte('visit_date', p2.from).lte('visit_date', p2.to),
                supabase.from('cc_invoices').select('amount').gte('date', p1.from).lte('date', p1.to),
                supabase.from('cc_invoices').select('amount').gte('date', p2.from).lte('date', p2.to)
            ]);
            const rev1 = (inv1.data || []).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
            const rev2 = (inv2.data || []).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
            const vis1 = v1.count || 0;
            const vis2 = v2.count || 0;
            const avg1 = vis1 ? rev1 / vis1 : 0;
            const avg2 = vis2 ? rev2 / vis2 : 0;
            const pct = (a, b) => b === 0 ? null : Math.round((a - b) / b * 100);
            return {
                period1: { name: args.period1, from: p1.from, to: p1.to, visits: vis1, revenue: Math.round(rev1), avg_check: Math.round(avg1) },
                period2: { name: args.period2, from: p2.from, to: p2.to, visits: vis2, revenue: Math.round(rev2), avg_check: Math.round(avg2) },
                diff: { visits_pct: pct(vis1, vis2), revenue_pct: pct(rev1, rev2), avg_check_pct: pct(avg1, avg2) }
            };
        }

        case 'get_average_check': {
            const { from, to } = getPeriodDates(args.period);
            const { data: invoices } = await supabase.from('cc_invoices')
                .select('doctor_cc_id, doctor_name, amount, items').gte('date', from).lte('date', to);
            if (!invoices?.length) return { period: args.period, avg_check: 0, total: 0, invoice_count: 0 };
            if (!args.group_by) {
                const total = invoices.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
                return { period: args.period, total: Math.round(total), invoice_count: invoices.length, avg_check: Math.round(total / invoices.length) };
            }
            const groups = {};
            if (args.group_by === 'doctor') {
                for (const inv of invoices) {
                    const key = inv.doctor_name || inv.doctor_cc_id || 'Невідомо';
                    if (!groups[key]) groups[key] = { total: 0, count: 0 };
                    groups[key].total += parseFloat(inv.amount || 0);
                    groups[key].count++;
                }
            } else if (args.group_by === 'service') {
                for (const inv of invoices) {
                    for (const item of (inv.items || [])) {
                        const key = item.plan_item_name || 'Невідома послуга';
                        const amount = (item.price || 0) * (item.quantity || 1) * (1 - (item.discount || 0) / 100);
                        if (!groups[key]) groups[key] = { total: 0, count: 0 };
                        groups[key].total += amount;
                        groups[key].count++;
                    }
                }
            }
            return {
                period: args.period,
                group_by: args.group_by,
                breakdown: Object.entries(groups)
                    .map(([name, g]) => ({ name, total: Math.round(g.total), invoice_count: g.count, avg_check: Math.round(g.total / g.count) }))
                    .sort((a, b) => b.avg_check - a.avg_check)
            };
        }

        case 'get_birthday_patients': {
            const when = args.when || 'today';
            const now = new Date();
            const todayM = now.getMonth() + 1;
            const todayD = now.getDate();
            const { data: patients } = await supabase.from('cc_patients')
                .select('id, full_name, phone, dob, telegram_id, last_visit_at').not('dob', 'is', null);
            if (!patients?.length) return { when, total: 0, patients: [] };
            const matches = (patients || []).filter(p => {
                if (!p.dob) return false;
                const d = new Date(p.dob);
                const m = d.getUTCMonth() + 1;
                const day = d.getUTCDate();
                if (when === 'today') return m === todayM && day === todayD;
                if (when === 'this_week') {
                    const weekDay = now.getDay() || 7;
                    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekDay + 1);
                    for (let i = 0; i < 7; i++) {
                        const check = new Date(monday); check.setDate(monday.getDate() + i);
                        if (m === check.getMonth() + 1 && day === check.getDate()) return true;
                    }
                    return false;
                }
                if (when === 'this_month') return m === todayM;
                if (when === 'next_month') {
                    const nextMonth = todayM === 12 ? 1 : todayM + 1;
                    return m === nextMonth;
                }
                if (when === 'next_30_days') {
                    for (let i = 1; i <= 30; i++) {
                        const check = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
                        if (m === check.getMonth() + 1 && day === check.getDate()) return true;
                    }
                    return false;
                }
                return false;
            }).map(p => {
                const dobDate = new Date(p.dob);
                const age = now.getFullYear() - dobDate.getUTCFullYear();
                return { full_name: p.full_name, phone: p.phone, dob: p.dob, age, last_visit_at: p.last_visit_at, has_telegram: !!p.telegram_id };
            });
            return { when, total: matches.length, patients: matches };
        }

        case 'get_churn_risk': {
            const daysInactive = args.days_inactive || 90;
            const minPastVisits = args.min_past_visits || 2;
            const limit = args.limit || 50;
            const cutoff = new Date(Date.now() - daysInactive * 86400000).toISOString().split('T')[0];
            const { data: patients } = await supabase.from('cc_patients')
                .select('id, full_name, phone, last_visit_at, telegram_id')
                .lt('last_visit_at', cutoff + 'T00:00:00')
                .not('last_visit_at', 'is', null)
                .limit(limit * 5);
            if (!patients?.length) return { days_inactive: daysInactive, total: 0, patients: [] };
            const ids = patients.map(p => p.id);
            const { data: visits } = await supabase.from('cc_visits').select('patient_id').in('patient_id', ids);
            const visitCounts = {};
            (visits || []).forEach(v => { visitCounts[v.patient_id] = (visitCounts[v.patient_id] || 0) + 1; });
            const atRisk = patients
                .filter(p => (visitCounts[p.id] || 0) >= minPastVisits)
                .slice(0, limit)
                .map(p => {
                    const lastDate = p.last_visit_at ? new Date(p.last_visit_at) : null;
                    const daysSince = lastDate ? Math.floor((Date.now() - lastDate) / 86400000) : null;
                    return {
                        full_name: p.full_name, phone: p.phone,
                        last_visit_at: p.last_visit_at, days_since_visit: daysSince,
                        total_visits: visitCounts[p.id] || 0, has_telegram: !!p.telegram_id,
                        risk_level: daysSince > 180 ? 'high' : daysSince > 90 ? 'medium' : 'low'
                    };
                })
                .sort((a, b) => (b.days_since_visit || 0) - (a.days_since_visit || 0));
            return { days_inactive: daysInactive, min_past_visits: minPastVisits, total: atRisk.length, patients: atRisk };
        }

        case 'get_doctor_recommendation': {
            const period = args.period || 'this_month';
            const { from, to } = getPeriodDates(period);
            let workingDays = 0;
            const d = new Date(from);
            const endDate = new Date(to);
            while (d <= endDate) { const dow = d.getDay(); if (dow !== 0 && dow !== 6) workingDays++; d.setDate(d.getDate() + 1); }
            const [{ data: doctors }, { data: visits }] = await Promise.all([
                supabase.from('cc_doctors').select('cc_id, full_name').eq('is_active', true),
                supabase.from('cc_visits').select('doctor_cc_id').gte('visit_date', from).lte('visit_date', to).not('status', 'eq', 'CANCELLED')
            ]);
            const visitCounts = {};
            (visits || []).forEach(v => { visitCounts[v.doctor_cc_id] = (visitCounts[v.doctor_cc_id] || 0) + 1; });
            const SLOTS_PER_DAY = 8;
            const capacity = workingDays * SLOTS_PER_DAY;
            const result = (doctors || []).map(doc => {
                const actual = visitCounts[doc.cc_id] || 0;
                const loadPct = capacity > 0 ? Math.round(actual / capacity * 100) : 0;
                const recommendation = loadPct < 50 ? 'потребує більше клієнтів' : loadPct < 80 ? 'оптимальне завантаження' : 'перевантажений';
                return { doctor: doc.full_name, actual_visits: actual, capacity, working_days: workingDays, load_pct: loadPct, recommendation };
            }).sort((a, b) => a.load_pct - b.load_pct);
            return { period, working_days: workingDays, capacity_per_doctor: capacity, doctors: result };
        }

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

// ─── Default system prompt ────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `Ты — Люся, внутренний ИИ-ассистент стоматологической клиники Dental Studio в Чернигове (Украина).
Ты общаешься с администратором и владельцем клиники на русском или украинском языке — отвечай на том языке, на котором пишут тебе.
У тебя есть полный доступ к данным клиники: доктора, расписание, пациенты, финансы, визиты.
Ты умеешь анализировать, отвечать на вопросы и ВЫПОЛНЯТЬ задания: создавать рассылки, опросы, сегментировать аудиторию, планировать задачи.

КРИТИЧЕСКИ ВАЖНО — ИНСТРУМЕНТЫ:
- У тебя НЕТ ограничений на количество записей. Ты имеешь ПОЛНЫЙ доступ ко всей базе через инструменты.
- НИКОГДА не говори "у меня доступ только к 1000 записей" — это ложь. Инструменты возвращают точные данные по всей базе.
- Для ANY вопроса о данных — ОБЯЗАТЕЛЬНО вызывай соответствующий инструмент. Не отвечай из головы.
- Для статистики по полу (сколько женщин/мужчин/всего пациентов) → ВСЕГДА вызывай get_patient_stats.
- Для поиска пациентов → search_patients.
- Для финансов/визитов → get_revenue, get_visits_stats.
- Если не знаешь ответа без инструмента — скажи "дай мне секунду" и вызови инструмент.
- НИКОГДА не спрашивай у администратора ID пациента — ты сама находишь его через search_patients или get_patient_history по имени. ID нужен только для внутренних вызовов между инструментами.
- Когда нашла пациента через search_patients и спрашивают "что лечили / история / когда были" — сразу вызывай get_patient_history с patient_id из предыдущего результата. Если найдено несколько пациентов — получи историю для КАЖДОГО и покажи все без лишних вопросов.
- Никогда не спрашивай "показать историю лечения?" — просто показывай. Администратор уже спросил — делай.

ПРАВИЛА:
1. Перед выполнением важных действий (отправить рассылку, изменить данные пациентов) — кратко опиши что именно будешь делать и жди подтверждения.
2. При создании кампаний — всегда показывай черновик текста сообщения перед сохранением.
3. Используй Markdown для форматирования ответов: **жирный**, _курсив_, таблицы.
4. Если данных нет — честно скажи об этом, не выдумывай.
5. Финансовые данные показывай в гривнах (₴).`;

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = { initLusya };
