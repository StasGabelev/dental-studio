'use strict';
const fetch = require('node-fetch');

let _supabase, _aiSettings, _patientBot, _viberBot;
let _initialized = false;

// ─── Procedure follow-up rules ────────────────────────────────────────────────

const PROCEDURE_FLOWS = [
    {
        keywords: ['видалення зуба', 'видалення', 'удаление зуба', 'удалення'],
        followups: [
            { delay_hours: 2,  message: '🦷 Дякуємо за візит!\n\nПісля видалення зуба рекомендуємо:\n• Не їжте та не пийте 2 години\n• Уникайте гарячого та твердого\n• При сильному болі — знеболювальне\n\nЯкщо є питання — пишіть нам! 💙' },
            { delay_hours: 20, message: '👋 Доброго ранку!\n\nЯк ваше самопочуття після вчорашньої процедури? Сподіваємось, все добре. Якщо турбує набряк або біль — не зволікайте, зателефонуйте нам. 🌟' },
            { delay_hours: 72, message: '💙 3 дні після видалення зуба — лунка поступово загоюється.\n\nЯкщо відчуваєте дискомфорт — будемо раді прийняти вас на контрольний огляд. Здоров\'я вашої посмішки — наша турбота! 🦷' }
        ]
    },
    {
        keywords: ['імплантація', 'імплант', 'имплант', 'имплантация'],
        followups: [
            { delay_hours: 3,  message: '🦷 Після імплантації важливо:\n• Уникайте фізичних навантажень 24 год\n• Не куріть\n• Холодний компрес допоможе зменшити набряк\n\nМи поруч — пишіть якщо є питання! 💙' },
            { delay_hours: 24, message: '👋 Добрий день!\n\nЯк ваше самопочуття після імплантації? Невеликий набряк — це нормально. Якщо є сильний біль або температура — зателефонуйте нам одразу. 🌟' },
            { delay_hours: 168, message: '💙 Тиждень після імплантації!\n\nСподіваємось, загоєння проходить добре. Через 3-6 місяців ми запросимо вас на контрольний огляд для встановлення коронки.\n\nДякуємо за довіру! 🦷' }
        ]
    }
];

// ─── Init ─────────────────────────────────────────────────────────────────────

function initCampaignRunner(supabase, aiSettings, patientBot, viberBot) {
    _supabase = supabase;
    _aiSettings = aiSettings;
    _patientBot = patientBot;
    _viberBot = viberBot;

    if (_initialized) return; // don't double-register crons
    _initialized = true;

    // Campaign delivery: every 5 minutes
    setInterval(runPendingCampaigns, 5 * 60 * 1000);
    setTimeout(runPendingCampaigns, 5000); // first run 5s after init

    // Automated flows: every 15 minutes
    setInterval(runAutomatedFlows, 15 * 60 * 1000);
    setTimeout(runAutomatedFlows, 15000);

    // Appointment reminders: check every 15 min, fires at 09:00 and 17:00 Kyiv time
    setInterval(runAppointmentReminders, 15 * 60 * 1000);
    setTimeout(runAppointmentReminders, 30000);

    // Scheduled procedure follow-ups: every 15 min
    setInterval(runScheduledFollowUps, 15 * 60 * 1000);
    setTimeout(runScheduledFollowUps, 60000);

    // Process unprocessed survey responses: every 10 minutes
    setInterval(processSurveyResponses, 10 * 60 * 1000);

    // Register Telegram inline keyboard handler for survey answers
    if (_patientBot) {
        _patientBot.on('callback_query', handleCallbackQuery);
    }

    console.log('📣 Campaign Runner initialized.');
}

// ─── Settings hot-reload ──────────────────────────────────────────────────────

function updateSettings(aiSettings, patientBot, viberBot) {
    _aiSettings = aiSettings;
    _patientBot = patientBot;
    _viberBot = viberBot;
    // Re-register callback handler if new bot instance
    if (_patientBot) {
        _patientBot.removeAllListeners('callback_query');
        _patientBot.on('callback_query', handleCallbackQuery);
    }
}

// ─── Template engine ──────────────────────────────────────────────────────────

function renderTemplate(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : '');
}

function getPatientVars(patient, extraVars = {}) {
    const nameParts = (patient.full_name || '').split(' ');
    return {
        first_name: nameParts[0] || '',
        full_name: patient.full_name || '',
        clinic_name: 'Dental Studio',
        phone: patient.phone || '',
        ...extraVars
    };
}

// ─── Channel delivery ─────────────────────────────────────────────────────────

async function sendToPatient(patient, text, inlineKeyboard = null) {
    if (patient.telegram_id) {
        const opts = { parse_mode: 'Markdown' };
        if (inlineKeyboard) opts.reply_markup = { inline_keyboard: inlineKeyboard };
        await _patientBot.sendMessage(patient.telegram_id, text, opts);
        return { channel: 'telegram', success: true };
    }
    if (patient.wa_phone) {
        // WhatsApp Business API not yet configured
        return { channel: 'whatsapp', success: false, error: 'whatsapp_not_configured' };
    }
    if (patient.viber_id && _viberBot) {
        const { Message } = require('viber-bot');
        await _viberBot.sendMessage({ id: patient.viber_id }, [new Message.Text(text)]);
        return { channel: 'viber', success: true };
    }
    return { channel: null, success: false, error: 'no_channel' };
}

// ─── Campaign runner ──────────────────────────────────────────────────────────

async function runPendingCampaigns() {
    if (!_supabase) return;
    try {
        const now = new Date().toISOString();
        const { data: campaigns } = await _supabase.from('campaigns')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', now);

        for (const campaign of (campaigns || [])) {
            console.log(`📣 Running campaign: ${campaign.name} (${campaign.id})`);

            // Mark as running
            await _supabase.from('campaigns').update({ status: 'running' }).eq('id', campaign.id);

            const subscribers = await getSubscribers(campaign.audience_filter || {});
            let sent = 0, failed = 0;

            for (const sub of subscribers) {
                // Dedup: skip if already sent (only when patient UUID is known)
                if (sub.id) {
                    const { data: existing } = await _supabase.from('campaign_deliveries')
                        .select('id').eq('campaign_id', campaign.id).eq('patient_id', sub.id).single();
                    if (existing) continue;
                }

                const vars = getPatientVars(sub);
                const text = renderTemplate(campaign.message_template, vars);

                const bookingBtn = campaign.add_booking_button !== false
                    ? [[{ text: '📅 Записатися', callback_data: 'booking_request' }]]
                    : null;

                let delivery;
                try {
                    delivery = await sendToPatient(sub, text, bookingBtn);
                } catch (e) {
                    delivery = { channel: null, success: false, error: e.message };
                }

                if (sub.id) {
                    await _supabase.from('campaign_deliveries').insert({
                        campaign_id: campaign.id,
                        patient_id: sub.id,
                        channel: delivery.channel,
                        status: delivery.success ? 'sent' : 'failed',
                        sent_at: delivery.success ? new Date().toISOString() : null,
                        error: delivery.error || null
                    });
                }

                if (delivery.success) sent++; else failed++;
                await sleep(300);
            }

            await _supabase.from('campaigns').update({
                status: 'done',
                stats: { sent, failed, total: subscribers.length }
            }).eq('id', campaign.id);

            console.log(`✅ Campaign "${campaign.name}" done: ${sent} sent, ${failed} failed.`);
        }
    } catch (e) {
        console.error('Campaign runner error:', e.message);
    }
}

// Returns subscriber objects compatible with sendToPatient (have telegram_id/viber_id fields).
// audience_filter.audience === 'all_subscribers' → query messenger_users directly (all bot subscribers with linked phone)
// otherwise → query cc_patients with filters
async function getSubscribers(filter = {}) {
    if (filter.audience === 'all_subscribers') {
        const { data: muData } = await _supabase
            .from('messenger_users')
            .select('platform, platform_user_id, patient_cc_id, patient_phone')
            .not('patient_phone', 'is', null);

        const cascaded = cascadeSubscribers(muData || []);

        // Batch-load patient info for template vars and dedup
        const ccIds = [...new Set(cascaded.map(s => s.patient_cc_id).filter(Boolean))];
        const patientMap = {};
        if (ccIds.length) {
            const { data: patients } = await _supabase
                .from('cc_patients')
                .select('id, cc_id, full_name, phone')
                .in('cc_id', ccIds);
            (patients || []).forEach(p => { patientMap[p.cc_id] = p; });
        }

        return cascaded.map(s => {
            const pt = patientMap[s.patient_cc_id] || {};
            return {
                id: pt.id || null,
                full_name: pt.full_name || 'Підписник',
                phone: pt.phone || s.patient_phone || '',
                telegram_id: s.platform === 'telegram' ? s.platform_user_id : null,
                viber_id: s.platform === 'viber' ? s.platform_user_id : null
            };
        });
    }

    return getPatientsByFilter(filter);
}

// Cascade: Telegram has priority over Viber for the same patient
function cascadeSubscribers(messengerUsers) {
    const map = {};
    for (const mu of messengerUsers) {
        const key = mu.patient_cc_id || mu.platform_user_id;
        if (!map[key] || mu.platform === 'telegram') map[key] = mu;
    }
    return Object.values(map);
}

async function getPatientsByFilter(filter) {
    let query = _supabase.from('cc_patients').select('id, full_name, phone, telegram_id, viber_id, wa_phone, has_children, gender, dob');

    if (filter.gender) query = query.eq('gender', filter.gender);
    if (filter.has_children !== undefined) query = query.eq('has_children', filter.has_children);
    if (filter.tag) query = query.contains('custom_tags', [filter.tag]);
    if (filter.has_telegram) query = query.not('telegram_id', 'is', null);
    if (filter.age_min || filter.age_max) {
        const now = new Date();
        if (filter.age_max) {
            const minDob = new Date(now.getFullYear() - filter.age_max - 1, now.getMonth(), now.getDate());
            query = query.gte('dob', minDob.toISOString().split('T')[0]);
        }
        if (filter.age_min) {
            const maxDob = new Date(now.getFullYear() - filter.age_min, now.getMonth(), now.getDate());
            query = query.lte('dob', maxDob.toISOString().split('T')[0]);
        }
    }

    const { data } = await query;
    return data || [];
}

// ─── Automated flows ──────────────────────────────────────────────────────────

async function runAutomatedFlows() {
    if (!_supabase) return;
    try {
        const { data: flows } = await _supabase.from('automated_flows')
            .select('*').eq('is_active', true);

        for (const flow of (flows || [])) {
            if (flow.trigger_type === 'post_visit') await runPostVisitFlow(flow);
            else if (flow.trigger_type === 'birthday') await runBirthdayFlow(flow);
            else if (flow.trigger_type === 'no_visit_90days') await runReactivationFlow(flow);
        }
    } catch (e) {
        console.error('Automated flows error:', e.message);
    }
}

async function runPostVisitFlow(flow) {
    const delayHours = flow.delay_hours || 3;
    const windowEnd = new Date(Date.now() - delayHours * 3600000);
    const windowStart = new Date(windowEnd.getTime() - 15 * 60000); // 15 min window

    // Find visits that ended in this window
    const endTimeStr = windowEnd.toTimeString().slice(0, 5); // HH:MM
    const startTimeStr = windowStart.toTimeString().slice(0, 5);
    const dateStr = windowEnd.toISOString().split('T')[0];

    const { data: visits } = await _supabase.from('cc_visits')
        .select('cc_id, patient_id, doctor_cc_id, service_name')
        .eq('visit_date', dateStr)
        .eq('status', 'VISITED')
        .gte('time_end', startTimeStr)
        .lte('time_end', endTimeStr);

    for (const visit of (visits || [])) {
        if (!visit.patient_id) continue;

        // Check not already executed for this visit
        const { data: existing } = await _supabase.from('flow_executions')
            .select('id').eq('flow_id', flow.id).eq('visit_cc_id', visit.cc_id).single();
        if (existing) continue;

        const { data: patient } = await _supabase.from('cc_patients')
            .select('*').eq('id', visit.patient_id).single();
        if (!patient) continue;

        // Get doctor name
        let doctorName = '';
        if (visit.doctor_cc_id) {
            const { data: doc } = await _supabase.from('cc_doctors')
                .select('full_name').eq('cc_id', visit.doctor_cc_id).single();
            doctorName = doc?.full_name || '';
        }

        const vars = getPatientVars(patient, { doctor_name: doctorName, service_name: visit.service_name || '' });

        // Build post-visit survey message with inline keyboard
        const firstName = vars.first_name || '';
        let text = flow.message_template
            ? renderTemplate(flow.message_template, vars)
            : `${firstName ? firstName + ', дя' : 'Дя'}куємо за ваш вибір — Dental Studio! 🦷✨\n\n`
            + `${doctorName ? `Сподіваємось, що візит до ${doctorName} пройшов чудово.\n\n` : ''}`
            + `Будь ласка, оцініть ваш візит — це займе лише секунду:`;

        const inlineKeyboard = [
            [
                { text: '💚 Відмінно', callback_data: `survey_postvisit_great_${patient.id}` },
                { text: '💛 Добре', callback_data: `survey_postvisit_ok_${patient.id}` },
                { text: '🔴 Погано', callback_data: `survey_postvisit_bad_${patient.id}` }
            ]
        ];

        // Create flow execution record
        const { data: exec } = await _supabase.from('flow_executions').insert({
            flow_id: flow.id,
            patient_id: patient.id,
            visit_cc_id: visit.cc_id,
            triggered_at: new Date().toISOString(),
            status: 'pending'
        }).select('id').single();

        let delivery = { success: false, error: 'not_attempted' };
        try {
            delivery = await sendToPatient(patient, text, inlineKeyboard);
        } catch (e) {
            delivery = { success: false, error: e.message };
        }

        await _supabase.from('flow_executions').update({
            executed_at: new Date().toISOString(),
            status: delivery.success ? 'sent' : 'failed',
            channel: delivery.channel,
            result: { error: delivery.error }
        }).eq('id', exec.id);
    }
}

async function runBirthdayFlow(flow) {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Find patients with birthday today (compare month-day portion of dob)
    const { data: patients } = await _supabase.from('cc_patients')
        .select('*')
        .not('dob', 'is', null);

    const birthdayPatients = (patients || []).filter(p => {
        if (!p.dob) return false;
        const dob = p.dob.slice(5, 10); // MM-DD
        return dob === `${month}-${day}`;
    });

    for (const patient of birthdayPatients) {
        // Check not already sent today
        const todayStr = today.toISOString().split('T')[0];
        const { data: existing } = await _supabase.from('flow_executions')
            .select('id').eq('flow_id', flow.id).eq('patient_id', patient.id)
            .gte('triggered_at', todayStr).single();
        if (existing) continue;

        const vars = getPatientVars(patient);
        const text = flow.message_template
            ? renderTemplate(flow.message_template, vars)
            : `🎂 ${vars.first_name ? vars.first_name + ', с' : 'С'} днём рождения! Команда Dental Studio поздравляет вас и желает крепкого здоровья и голголивудской улыбки! 😁`;

        const { data: exec } = await _supabase.from('flow_executions').insert({
            flow_id: flow.id, patient_id: patient.id,
            triggered_at: new Date().toISOString(), status: 'pending'
        }).select('id').single();

        let delivery = { success: false };
        try { delivery = await sendToPatient(patient, text); } catch(e) { delivery.error = e.message; }

        await _supabase.from('flow_executions').update({
            executed_at: new Date().toISOString(),
            status: delivery.success ? 'sent' : 'failed',
            channel: delivery.channel
        }).eq('id', exec.id);
    }
}

async function runReactivationFlow(flow) {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: patients } = await _supabase.from('cc_patients')
        .select('*')
        .or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`)
        .not('telegram_id', 'is', null); // Only patients we can reach

    for (const patient of patients) {
        // Check not already sent in last 90 days
        const cutoffStr = new Date(Date.now() - 90 * 86400000).toISOString();
        const { data: existing } = await _supabase.from('flow_executions')
            .select('id').eq('flow_id', flow.id).eq('patient_id', patient.id)
            .gte('triggered_at', cutoffStr).single();
        if (existing) continue;

        const vars = getPatientVars(patient);
        const text = flow.message_template
            ? renderTemplate(flow.message_template, vars)
            : `Привет, ${vars.first_name || 'дорогой пациент'}! 😊 Мы соскучились! Прошло уже несколько месяцев с вашего последнего визита. Запишитесь на профилактический осмотр — здоровая улыбка важна! 🦷`;

        const { data: exec } = await _supabase.from('flow_executions').insert({
            flow_id: flow.id, patient_id: patient.id,
            triggered_at: new Date().toISOString(), status: 'pending'
        }).select('id').single();

        let delivery = { success: false };
        try { delivery = await sendToPatient(patient, text); } catch(e) { delivery.error = e.message; }

        await _supabase.from('flow_executions').update({
            executed_at: new Date().toISOString(),
            status: delivery.success ? 'sent' : 'failed',
            channel: delivery.channel
        }).eq('id', exec.id);

        await sleep(500);
    }
}

// ─── Appointment reminder flow ────────────────────────────────────────────────

async function runAppointmentReminders() {
    if (!_supabase || !_patientBot || !_aiSettings) return;

    // Only run at 09:00 and 17:00 Kyiv time (UTC+3)
    const now = new Date();
    const kyivHour = (now.getUTCHours() + 3) % 24;
    const kyivMin = now.getUTCMinutes();
    if (!((kyivHour === 9 && kyivMin < 15) || (kyivHour === 17 && kyivMin < 15))) return;

    // Get tomorrow's date in Kyiv time
    const kyivNow = new Date(now.getTime() + 3 * 3600000);
    const tomorrow = new Date(kyivNow);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: visits } = await _supabase.from('cc_visits')
        .select('cc_id, patient_id, time_start, doctor_name')
        .eq('visit_date', tomorrowStr)
        .eq('status', 'PLANNED')
        .not('patient_id', 'is', null);

    for (const visit of (visits || [])) {
        // Check not already sent today for this visit
        const todayStr = kyivNow.toISOString().split('T')[0];
        const { data: existing } = await _supabase.from('flow_executions')
            .select('id')
            .eq('visit_cc_id', visit.cc_id)
            .eq('status', 'sent')
            .gte('triggered_at', todayStr)
            .maybeSingle();
        if (existing) continue;

        const { data: patient } = await _supabase.from('cc_patients')
            .select('id, full_name, phone, telegram_id').eq('id', visit.patient_id).single();
        if (!patient?.telegram_id) continue;

        const firstName = (patient.full_name || '').split(' ')[1] || patient.full_name || '';
        const time = visit.time_start || '';
        const doctor = visit.doctor_name ? `\n👨‍⚕️ Лікар: ${visit.doctor_name}` : '';

        const text = `👋 Добрий день${firstName ? ', ' + firstName : ''}!\n\n`
            + `Нагадуємо, що завтра о ${time} у вас запланований візит до Dental Studio. 🦷\n`
            + `${doctor}\n📍 вул. Незалежності, 21\n\n`
            + `Будемо раді вас бачити! 😊`;

        const inlineKeyboard = [
            [
                { text: '✅ Підтверджую візит', callback_data: `appt_confirm_${visit.cc_id}_${patient.id}` },
                { text: '📞 Потрібна допомога', callback_data: `appt_reschedule_${visit.cc_id}_${patient.id}` }
            ]
        ];

        let sent = false;
        try {
            await _patientBot.sendMessage(patient.telegram_id, text, {
                reply_markup: { inline_keyboard: inlineKeyboard }
            });
            sent = true;
        } catch(e) { console.error('Reminder send error:', e.message); }

        try {
            await _supabase.from('flow_executions').insert({
                patient_id: patient.id,
                visit_cc_id: visit.cc_id,
                triggered_at: new Date().toISOString(),
                status: sent ? 'sent' : 'failed',
                result: { type: 'appointment_reminder' }
            });
        } catch(_) {}

        await sleep(500);
    }
}

// ─── Inline keyboard callback handler (survey answers) ────────────────────────

async function handleCallbackQuery(query) {
    const data = query.data;
    const chatId = String(query.message.chat.id);

    try {
        await _patientBot.answerCallbackQuery(query.id);
    } catch(_) {}

    // Post-visit satisfaction survey: survey_postvisit_{rating}_{patientId}
    if (data.startsWith('survey_postvisit_') || data.startsWith('survey_postvisiit_')) {
        const parts = data.split('_');
        const rating = parts[parts.length - 2]; // great | ok | bad
        const patientId = parts[parts.length - 1];

        if (rating === 'great' || rating === 'ok') {
            const reviewUrl = 'https://g.page/r/CRieZR5gW2LwEAE/review';
            const msg = rating === 'great'
                ? `🌟 Дуже раді, що все пройшло чудово!\n\nВаша довіра — це найбільша нагорода для нас. Ми постійно працюємо над тим, щоб кожен візит був ще кращим.\n\nБудемо дуже вдячні за ваш відгук у Google — навіть найкоротший коментар дуже допомагає нам! 🙏`
                : `💛 Дякуємо за вашу оцінку!\n\nМи завжди прагнемо ставати кращими. Якщо у вас є побажання — ми готові слухати.\n\nБудемо вдячні, якщо залишите відгук у Google — це допомагає іншим людям знайти нас! 😊`;
            await _patientBot.sendMessage(chatId, msg, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: '⭐ Залишити відгук на Google Maps', url: reviewUrl }
                    ]]
                }
            });
            await _supabase.from('cc_patients').update({ notes_lusya: `post_visit: ${rating}` }).eq('id', patientId);
        } else if (rating === 'bad') {
            await _patientBot.sendMessage(chatId,
                `😔 Нам дуже прикро це чути.\n\nМи хочемо розібратись у ситуації та зробити все можливе, щоб такого більше не повторилось.\n\nНатисніть кнопку нижче — ваше повідомлення отримає особисто власник клініки.`,
                {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '✉️ Написати власнику клініки', callback_data: `complaint_write_${patientId}` }
                        ]]
                    }
                }
            );
        }
    }

    // Appointment reminder callbacks
    if (data.startsWith('appt_confirm_') || data.startsWith('appt_reschedule_')) {
        const parts = data.split('_');
        const action = parts[1]; // confirm | reschedule
        const visitCcId = parts[2];
        const patientId = parts[parts.length - 1];

        const { data: patient } = await _supabase.from('cc_patients')
            .select('full_name, phone').eq('id', patientId).single();

        const { data: visit } = await _supabase.from('cc_visits')
            .select('visit_date, time_start, doctor_name').eq('cc_id', visitCcId).single();

        const name = patient?.full_name || 'Пацієнт';
        const phone = patient?.phone || '—';
        const date = visit?.visit_date || '—';
        const time = visit?.time_start || '—';
        const tgLink = `tg://user?id=${chatId}`;

        if (action === 'confirm') {
            await _patientBot.sendMessage(chatId,
                `✅ Чудово! Ваш візит підтверджено.\n\nЧекаємо вас ${date} о ${time}. До зустрічі! 😊`
            );
            if (_aiSettings?.tg_bot_token && _aiSettings?.tg_chat_id) {
                const TelegramBot = require('node-telegram-bot-api');
                const alertBot = new TelegramBot(_aiSettings.tg_bot_token);
                await alertBot.sendMessage(_aiSettings.tg_chat_id,
                    `✅ *Підтвердження запису*\n\n👤 ${name}\n📱 ${phone}\n🔗 ${tgLink}\n📅 ${date} о ${time}`,
                    { parse_mode: 'Markdown' }
                );
            }
        } else {
            await _patientBot.sendMessage(chatId,
                `📞 Дякуємо! Наш адміністратор зв'яжеться з вами найближчим часом для уточнення деталей.`
            );
            if (_aiSettings?.tg_bot_token && _aiSettings?.tg_chat_id) {
                const TelegramBot = require('node-telegram-bot-api');
                const alertBot = new TelegramBot(_aiSettings.tg_bot_token);
                await alertBot.sendMessage(_aiSettings.tg_chat_id,
                    `⚠️ *Потрібна допомога із записом*\n\n👤 ${name}\n📱 ${phone}\n🔗 ${tgLink}\n📅 Запис: ${date} о ${time}\n\nКлієнт хоче змінити або скасувати візит.`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
        return;
    }

    // Complaint: patient pressed "Написати власнику"
    if (data.startsWith('complaint_write_')) {
        const patientId = data.replace('complaint_write_', '');
        awaitingComplaint.set(chatId, patientId);
        await _patientBot.sendMessage(chatId,
            `✍️ Опишіть, будь ласка, що сталось. Ваше повідомлення буде передано особисто власнику клініки.`,
            { reply_markup: { force_reply: true, selective: true } }
        );
    }
}

// In-memory state for patients awaiting complaint input
const awaitingComplaint = new Map();

async function handleComplaintMessage(chatId, text) {
    const patientId = awaitingComplaint.get(String(chatId));
    if (!patientId) return false;
    awaitingComplaint.delete(String(chatId));

    const { data: patient } = await _supabase.from('cc_patients')
        .select('full_name, phone').eq('id', patientId).single();

    // Send complaint to admin
    if (_aiSettings?.tg_bot_token && _aiSettings?.tg_chat_id) {
        const TelegramBot = require('node-telegram-bot-api');
        const alertBot = new TelegramBot(_aiSettings.tg_bot_token);
        const uname = `tg://user?id=${chatId}`;
        await alertBot.sendMessage(_aiSettings.tg_chat_id,
            `📩 *Скарга від пацієнта*\n\n👤 ${patient?.full_name || 'Невідомо'}\n📱 ${patient?.phone || '—'}\n🔗 ${uname}\n\n💬 ${text}`,
            { parse_mode: 'Markdown' }
        );
    }

    await _patientBot.sendMessage(String(chatId),
        `✅ Дякуємо. Власник клініки отримав ваше повідомлення і зв'яжеться з вами найближчим часом.`
    );
    return true;
}

// ─── AI extraction for survey text responses ──────────────────────────────────

async function processSurveyResponses() {
    if (!_supabase || !_aiSettings) return;
    try {
        const { data: unprocessed } = await _supabase.from('survey_responses')
            .select('id, survey_id, patient_id, responses')
            .eq('processed', false)
            .limit(20);

        for (const resp of (unprocessed || [])) {
            const { data: survey } = await _supabase.from('surveys')
                .select('questions').eq('id', resp.survey_id).single();

            const extractableQuestions = (survey?.questions || []).filter(q => q.extract_field);
            if (!extractableQuestions.length) {
                await _supabase.from('survey_responses').update({ processed: true }).eq('id', resp.id);
                continue;
            }

            // Use AI to extract structured data from responses
            const extracted = await extractFromResponses(resp.responses, extractableQuestions);

            // Update patient profile
            if (Object.keys(extracted).length) {
                await _supabase.from('cc_patients').update(extracted).eq('id', resp.patient_id);
            }

            await _supabase.from('survey_responses').update({
                processed: true,
                ai_extracted: extracted
            }).eq('id', resp.id);
        }
    } catch (e) {
        console.error('Survey processing error:', e.message);
    }
}

async function extractFromResponses(responses, questions) {
    if (!_aiSettings?.lusya_openrouter_key && !_aiSettings?.api_key) return {};
    const apiKey = _aiSettings.lusya_openrouter_key || _aiSettings.api_key;
    const model = _aiSettings.lusya_simple_model || 'google/gemini-flash-1.5';

    const prompt = `Проанализируй ответы пациента на опрос и извлеки структурированные данные.

Вопросы и поля для извлечения:
${questions.map(q => `- "${q.text}" → поле: ${q.extract_field} (тип: ${q.type})`).join('\n')}

Ответы пациента: ${JSON.stringify(responses)}

Верни JSON объект с извлечёнными полями. Допустимые поля и типы: has_children (boolean), children_ages (array of {age: number}), profession_verified (string).
Только JSON, без пояснений.`;

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            })
        });
        const data = await res.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error('AI extraction error:', e.message);
        return {};
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

// ─── Procedure follow-up scheduling ──────────────────────────────────────────

async function scheduleProceduralFollowUps(invoice, patientMap) {
    if (!_supabase) return;
    const patientId = patientMap ? patientMap[String(invoice.patient_id)] : null;
    if (!patientId) return;

    const items = invoice.invoice_items || invoice.items || [];
    const itemNames = items.map(i => (i.plan_item_name || '').toLowerCase()).join(' ');
    const invoiceTime = new Date(invoice.date_created || invoice.date || Date.now()).getTime();

    for (const rule of PROCEDURE_FLOWS) {
        const matched = rule.keywords.some(kw => itemNames.includes(kw.toLowerCase()));
        if (!matched) continue;

        // Check not already scheduled for this invoice
        const { data: existing } = await _supabase.from('flow_executions')
            .select('id')
            .eq('patient_id', patientId)
            .filter('result->>invoice_cc_id', 'eq', String(invoice.id || invoice.cc_id))
            .maybeSingle();
        if (existing) continue;

        // Schedule each follow-up message
        for (const followup of rule.followups) {
            const scheduledAt = new Date(invoiceTime + followup.delay_hours * 3600000).toISOString();
            try {
                await _supabase.from('flow_executions').insert({
                    patient_id: patientId,
                    triggered_at: new Date().toISOString(),
                    scheduled_at: scheduledAt,
                    status: 'pending',
                    result: {
                        type: 'procedure_followup',
                        message: followup.message,
                        invoice_cc_id: String(invoice.id || invoice.cc_id)
                    }
                });
            } catch(_) {}
        }
        break; // only first matched rule per invoice
    }
}

async function runScheduledFollowUps() {
    if (!_supabase || !_patientBot) return;
    try {
        const { data: pending } = await _supabase.from('flow_executions')
            .select('*')
            .eq('status', 'pending')
            .not('scheduled_at', 'is', null)
            .lte('scheduled_at', new Date().toISOString())
            .limit(20);

        for (const exec of (pending || [])) {
            const message = exec.result?.message;
            if (!message) continue;

            const { data: patient } = await _supabase.from('cc_patients')
                .select('*').eq('id', exec.patient_id).single();
            if (!patient) {
                await _supabase.from('flow_executions').update({ status: 'skipped' }).eq('id', exec.id);
                continue;
            }

            let delivery = { success: false };
            try { delivery = await sendToPatient(patient, message); } catch(e) { delivery.error = e.message; }

            await _supabase.from('flow_executions').update({
                executed_at: new Date().toISOString(),
                status: delivery.success ? 'sent' : 'failed',
                channel: delivery.channel
            }).eq('id', exec.id);

            await sleep(500);
        }
    } catch(e) { console.error('runScheduledFollowUps error:', e.message); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { initCampaignRunner, updateSettings, handleComplaintMessage, scheduleProceduralFollowUps };
