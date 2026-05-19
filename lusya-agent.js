'use strict';
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

let lusyaBot = null;
let lusyaBotToken = null;

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

    lusyaBot.on('message', async (msg) => {
        const chatId = String(msg.chat.id);
        const text = msg.text;
        if (!text) return;

        // Only respond to text messages, ignore commands except /start
        if (text === '/start') {
            lusyaBot.sendMessage(chatId, '👋 Привет! Я Люся — ваш внутренний AI-ассистент клиники. Спрашивайте всё что угодно о пациентах, докторах, записях, финансах. Могу создавать рассылки, опросы и отчёты.');
            return;
        }

        try {
            lusyaBot.sendChatAction(chatId, 'typing');
            const reply = await handleLusyaMessage(chatId, text, supabase, aiSettings);
            await lusyaBot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Lusya message error:', e.message);
            lusyaBot.sendMessage(chatId, '⚠️ Произошла ошибка при обработке запроса. Попробуйте ещё раз.');
        }
    });

    lusyaBot.on('polling_error', (e) => console.error('Lusya polling error:', e.message));
    console.log('🌸 Lusya agent initialized.');
    return lusyaBot;
}

// ─── Core message handler ────────────────────────────────────────────────────

async function handleLusyaMessage(chatId, userText, supabase, aiSettings) {
    // 1. Load or create conversation session
    const { data: sessionRow } = await supabase
        .from('lusya_sessions')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .single();

    let history = sessionRow?.messages || [];

    // Keep only last 20 messages to avoid token bloat
    if (history.length > 20) history = history.slice(-20);

    // 2. Select model based on request complexity
    const model = selectModel(userText, aiSettings);

    // 3. Build system prompt
    const systemPrompt = aiSettings?.lusya_system_prompt || DEFAULT_SYSTEM_PROMPT;

    // 4. Build messages array
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userText }
    ];

    // 5. Call OpenRouter
    const apiKey = aiSettings?.lusya_openrouter_key || aiSettings?.api_key;
    let response = await callOpenRouter(model, messages, LUSYA_TOOLS, apiKey);

    // 6. Handle tool calls (agentic loop — up to 5 iterations)
    let iterations = 0;
    while (response.tool_calls && iterations < 5) {
        iterations++;
        const toolMessages = [];

        for (const tc of response.tool_calls) {
            let args = {};
            try { args = JSON.parse(tc.function.arguments); } catch(_) {}

            let result;
            try {
                result = await executeLusyaTool(tc.function.name, args, supabase, aiSettings);
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

        // Call model again with tool results
        response = await callOpenRouter(model, messages, LUSYA_TOOLS, apiKey);
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
    const simpleModel = aiSettings?.lusya_simple_model || 'google/gemini-flash-1.5';
    const complexModel = aiSettings?.lusya_complex_model || 'anthropic/claude-sonnet-4-6';

    const keywordsRaw = aiSettings?.lusya_simple_keywords ||
        'сколько,кто,список,покажи,когда,скільки,хто,список,покажи,коли,сколько,который,яка,який';
    const keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase());

    const lower = text.toLowerCase();
    const isSimple = keywords.some(kw => lower.includes(kw)) && lower.length < 80;

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
        throw new Error(`OpenRouter error ${response.status}: ${err.slice(0, 200)}`);
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
            description: 'Общая сводка по клинике: количество пациентов, визитов за разные периоды, активные доктора',
            parameters: { type: 'object', properties: {}, required: [] }
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
                    period: { type: 'string', description: 'today | this_week | this_month | last_month | last_30_days' }
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
                    period: { type: 'string', description: 'this_week | this_month | last_month | last_30_days | last_90_days' },
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
            description: 'Расписание доктора: занятые и свободные слоты',
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
            description: 'Поиск и фильтрация пациентов по различным критериям. Возвращает количество и список',
            parameters: {
                type: 'object',
                properties: {
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
    }
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeLusyaTool(toolName, args, supabase, aiSettings) {
    const today = new Date();

    function getPeriodDates(period) {
        const now = new Date();
        let from;
        switch (period) {
            case 'today': from = new Date(now.toDateString()); break;
            case 'this_week': from = new Date(now); from.setDate(now.getDate() - now.getDay()); break;
            case 'this_month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'last_month': from = new Date(now.getFullYear(), now.getMonth() - 1, 1); break;
            case 'last_30_days': from = new Date(Date.now() - 30 * 86400000); break;
            case 'last_90_days': from = new Date(Date.now() - 90 * 86400000); break;
            default: from = new Date(Date.now() - 30 * 86400000);
        }
        return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }

    switch (toolName) {

        case 'get_clinic_summary': {
            const last30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];

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

            if (servicePatientIds) query = query.in('id', servicePatientIds);
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

            const { data } = await query.limit(limit);
            const patients = data || [];
            return {
                count: patients.length,
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

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

// ─── Default system prompt ────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `Ты — Люся, внутренний ИИ-ассистент стоматологической клиники Dental Studio в Чернигове (Украина).
Ты общаешься с администратором и владельцем клиники на русском или украинском языке — отвечай на том языке, на котором пишут тебе.
У тебя есть полный доступ к данным клиники: доктора, расписание, пациенты, финансы, визиты.
Ты умеешь анализировать, отвечать на вопросы и ВЫПОЛНЯТЬ задания: создавать рассылки, опросы, сегментировать аудиторию, планировать задачи.

ПРАВИЛА:
1. Перед выполнением важных действий (отправить рассылку, изменить данные пациентов) — кратко опиши что именно будешь делать и жди подтверждения.
2. При создании кампаний — всегда показывай черновик текста сообщения перед сохранением.
3. Используй Markdown для форматирования ответов: **жирный**, _курсив_, таблицы.
4. Если данных нет — честно скажи об этом, не выдумывай.
5. Финансовые данные показывай в гривнах (₴).`;

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = { initLusya };
