'use strict';
const fetch = require('node-fetch');

let _supabase, _aiSettings, _patientBot, _viberBot;
let _initialized = false;

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

            // Get target patients
            const patients = await getPatientsByFilter(campaign.audience_filter || {});
            let sent = 0, failed = 0;

            for (const patient of patients) {
                // Check if already sent to this patient in this campaign
                const { data: existing } = await _supabase.from('campaign_deliveries')
                    .select('id').eq('campaign_id', campaign.id).eq('patient_id', patient.id).single();
                if (existing) continue;

                const vars = getPatientVars(patient);
                const text = renderTemplate(campaign.message_template, vars);

                let delivery;
                try {
                    delivery = await sendToPatient(patient, text);
                } catch (e) {
                    delivery = { channel: null, success: false, error: e.message };
                }

                await _supabase.from('campaign_deliveries').insert({
                    campaign_id: campaign.id,
                    patient_id: patient.id,
                    channel: delivery.channel,
                    status: delivery.success ? 'sent' : 'failed',
                    sent_at: delivery.success ? new Date().toISOString() : null,
                    error: delivery.error || null
                });

                if (delivery.success) sent++; else failed++;
                // Small delay between messages to avoid rate limits
                await sleep(300);
            }

            // Mark campaign as done, update stats
            await _supabase.from('campaigns').update({
                status: 'done',
                stats: { sent, failed, total: patients.length }
            }).eq('id', campaign.id);

            console.log(`✅ Campaign "${campaign.name}" done: ${sent} sent, ${failed} failed.`);
        }
    } catch (e) {
        console.error('Campaign runner error:', e.message);
    }
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
        let text = flow.message_template
            ? renderTemplate(flow.message_template, vars)
            : `${vars.first_name ? vars.first_name + ', как' : 'Как'} прошёл ваш визит к нам${doctorName ? ` (доктор ${doctorName})` : ''}? Мы ценим ваше мнение! 🦷`;

        const inlineKeyboard = [
            [
                { text: '😊 Отлично!', callback_data: `survey_postvisiit_great_${patient.id}` },
                { text: '😐 Нормально', callback_data: `survey_postvisit_ok_${patient.id}` },
                { text: '😞 Плохо', callback_data: `survey_postvisit_bad_${patient.id}` }
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

        if (rating === 'great') {
            const reviewUrl = 'https://g.page/r/CRieZR5gW2LwEAE/review';
            await _patientBot.sendMessage(chatId,
                `Отлично! Мы рады, что вам понравилось! 😊\n\nБудем очень благодарны, если вы оставите отзыв — это очень помогает нам! ⭐\n${reviewUrl}`
            );
            // Update patient's last survey response
            await _supabase.from('cc_patients').update({ notes_lusya: 'post_visit: отлично' }).eq('id', patientId);
        } else if (rating === 'ok') {
            await _patientBot.sendMessage(chatId, 'Спасибо за ответ! Если у вас есть пожелания — мы всегда открыты к обратной связи. 🦷');
        } else if (rating === 'bad') {
            await _patientBot.sendMessage(chatId, 'Нам жаль, что что-то пошло не так. Администратор свяжется с вами в ближайшее время, чтобы разобраться. 🙏');
            // Create admin task
            const { data: patient } = await _supabase.from('cc_patients').select('full_name, phone').eq('id', patientId).single();
            await _supabase.from('admin_tasks').insert({
                type: 'negative_review',
                client_name: patient?.full_name || 'Пациент',
                description: `Пациент ${patient?.full_name} (${patient?.phone}) оставил негативный отзыв после визита. Нужно связаться!`,
                status: 'new',
                priority: 'high',
                payload: { patient_id: patientId, telegram_id: chatId }
            });
        }
    }
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { initCampaignRunner, updateSettings };
