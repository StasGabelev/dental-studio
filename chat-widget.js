// ============================================================
// DENTAL STUDIO - PREMIUM AI CHAT WIDGET v2.1
// ============================================================

(function() {
    let chatHistory = [];
    let isThinking = false;
    let widgetSb = null;
    let chatSessionId = null;

    const SUPABASE_URL = 'https://ckldvntrsiacbjpiydmn.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGR2bnRyc2lhY2JqcGl5ZG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzMzMTUsImV4cCI6MjA5MTY0OTMxNX0.6zxRqTheJDt2BTb1hbAxQHCLZI8wT5xPus2Ad97AuMg';

    // --- 1. Supabase Init (with retry) ---
    function getSb() {
        if (!widgetSb && typeof supabase !== 'undefined') {
            try { widgetSb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch(e) {}
        }
        return widgetSb;
    }
    getSb();

    // --- 2. Contact Validation ---
    function validateContact(val) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        const phoneRe = /^[\+]?[\d\s\-\(\)]{7,15}$/;
        return emailRe.test(val) || phoneRe.test(val);
    }

    // --- 3. Styles Injection ---
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap');

            :root {
                --ds-gold: #c5a882;
                --ds-gold-dark: #b39670;
                --ds-white: #ffffff;
                --ds-black: #1a1a1a;
                --ds-gray: #f2f2f2;
                --ds-radius: 18px;
                --ds-shadow: 0 12px 40px rgba(0,0,0,0.12);
            }

            .ds-chat-launcher {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 65px;
                height: 65px;
                background: var(--ds-gold);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 8px 25px rgba(197, 168, 130, 0.4);
                z-index: 99999;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .ds-chat-launcher:hover { transform: scale(1.08) rotate(5deg); background: var(--ds-gold-dark); }
            .ds-chat-launcher svg { width: 30px; height: 30px; color: white; }

            .ds-chat-window {
                position: fixed;
                bottom: 110px;
                right: 30px;
                width: 400px;
                height: 650px;
                max-height: calc(100vh - 140px);
                background: var(--ds-white);
                border-radius: var(--ds-radius);
                box-shadow: var(--ds-shadow);
                display: none;
                flex-direction: column;
                overflow: hidden;
                z-index: 99998;
                font-family: 'Montserrat', sans-serif;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateY(20px);
                border: 1px solid rgba(0,0,0,0.05);
            }
            .ds-chat-window.open { display: flex; opacity: 1; transform: translateY(0); }

            .ds-chat-header {
                background: var(--ds-white);
                padding: 24px;
                display: flex;
                align-items: center;
                gap: 15px;
                border-bottom: 1px solid #f0f0f0;
            }
            .ds-avatar { width: 45px; height: 45px; background: var(--ds-gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px; }
            .ds-header-info { flex: 1; }
            .ds-header-info h4 { margin: 0; font-size: 16px; font-weight: 600; color: var(--ds-black); }
            .ds-header-info p { margin: 0; font-size: 12px; color: #2ecc71; font-weight: 500; display: flex; align-items: center; gap: 4px; }
            .ds-header-info p::before { content: ''; width: 6px; height: 6px; background: #2ecc71; border-radius: 50%; display: inline-block; }
            .ds-close-btn { cursor: pointer; color: #ccc; transition: color 0.2s; background: none; border: none; padding: 5px; }
            .ds-close-btn:hover { color: var(--ds-black); }

            .ds-chat-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; background: #fafafa; }

            .ds-msg { max-width: 85%; padding: 12px 18px; border-radius: 18px; font-size: 14px; line-height: 1.5; position: relative; animation: msgFade 0.3s ease-out forwards; opacity: 0; transform: translateY(10px); }
            @keyframes msgFade { to { opacity: 1; transform: translateY(0); } }

            .ds-msg.bot { background: var(--ds-white); color: var(--ds-black); align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); }
            .ds-msg.user { background: var(--ds-gold); color: var(--ds-white); align-self: flex-end; border-bottom-right-radius: 4px; }

            .ds-input-area { padding: 20px; background: var(--ds-white); border-top: 1px solid #f0f0f0; display: flex; gap: 10px; align-items: center; }
            .ds-input-wrapper { flex: 1; background: #f5f5f5; border-radius: 25px; padding: 4px 18px; display: flex; align-items: center; border: 1px solid transparent; transition: border-color 0.2s; }
            .ds-input-wrapper:focus-within { border-color: var(--ds-gold); background: #fff; }
            .ds-input-area input { flex: 1; background: none; border: none; outline: none; padding: 10px 0; font-family: inherit; font-size: 14px; }
            .ds-send-btn { background: var(--ds-gold); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
            .ds-send-btn:hover { background: var(--ds-gold-dark); }

            .ds-selection-screen { padding: 30px; text-align: center; }
            .ds-selection-screen h3 { font-size: 18px; margin-bottom: 25px; color: var(--ds-black); }
            .ds-platform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .ds-platform-btn { padding: 15px; border: 1px solid #eee; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; }
            .ds-platform-btn:hover { border-color: var(--ds-gold); background: rgba(197, 168, 130, 0.05); transform: translateY(-2px); }
            .ds-platform-btn span { font-size: 24px; }

            .ds-form-screen { padding: 30px; display: none; }
            .ds-form-screen h3 { margin-bottom: 8px; font-size: 18px; }
            .ds-form-hint { font-size: 12px; color: #999; margin-bottom: 20px; }
            .ds-input-group { margin-bottom: 15px; }
            .ds-input-group label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; font-weight: 500; }
            .ds-form-screen input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #ddd; outline: none; transition: border-color 0.2s; font-family: inherit; box-sizing: border-box; }
            .ds-form-screen input:focus { border-color: var(--ds-gold); }
            .ds-form-screen input.ds-input-error { border-color: #e74c3c; }
            .ds-submit-btn { width: 100%; padding: 14px; background: var(--ds-gold); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; margin-top: 10px; font-family: inherit; transition: background 0.2s; }
            .ds-submit-btn:hover { background: var(--ds-gold-dark); }
            .ds-submit-btn:disabled { background: #ccc; cursor: not-allowed; }
            .ds-form-error { color: #e74c3c; font-size: 12px; margin-bottom: 10px; display: none; }
            .ds-form-success { color: #2ecc71; font-size: 12px; margin-bottom: 10px; display: none; }

            .ds-thinking { display: flex; gap: 4px; padding: 4px 0; }
            .ds-thinking span { width: 6px; height: 6px; background: #ccc; border-radius: 50%; animation: think 1s infinite alternate; }
            .ds-thinking span:nth-child(2) { animation-delay: 0.2s; }
            .ds-thinking span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes think { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1.1); } }

            @media (max-width: 480px) {
                .ds-chat-window { bottom: 0; right: 0; width: 100%; height: 100%; max-height: 100%; border-radius: 0; }
                .ds-chat-launcher { bottom: 20px; right: 20px; width: 55px; height: 55px; }
                .ds-chat-header { padding: 20px; }
            }
        `;
        document.head.appendChild(style);
    }

    // --- 4. UI Construction ---
    function buildUI() {
        const launcher = document.createElement('div');
        launcher.className = 'ds-chat-launcher';
        launcher.id = 'dsLauncher';
        launcher.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
        document.body.appendChild(launcher);

        const win = document.createElement('div');
        win.className = 'ds-chat-window';
        win.id = 'dsChatWindow';
        win.innerHTML = `
            <div class="ds-chat-header">
                <div class="ds-avatar">D</div>
                <div class="ds-header-info">
                    <h4>Dental Studio AI</h4>
                    <p>В мережі • Допоможемо за 1 хв</p>
                </div>
                <button class="ds-close-btn" onclick="window.dsToggleChat()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div id="dsSelectionScreen" class="ds-selection-screen">
                <h3>Оберіть зручний канал зв'язку</h3>
                <div class="ds-platform-grid">
                    <div class="ds-platform-btn" onclick="window.dsStartWebChat()"><span>🌐</span>На сайті</div>
                    <div class="ds-platform-btn" onclick="window.dsOpenMessenger('telegram')"><span>✈️</span>Telegram</div>
                    <div class="ds-platform-btn" onclick="window.dsOpenMessenger('viber')"><span>💜</span>Viber</div>
                    <div class="ds-platform-btn" onclick="window.dsOpenMessenger('whatsapp')"><span>🟢</span>WhatsApp</div>
                </div>
            </div>

            <div id="dsFormScreen" class="ds-form-screen">
                <h3>Давайте познайомимось</h3>
                <p class="ds-form-hint">Вкажіть Email або номер телефону. Наступного разу вас одразу впізнаємо.</p>
                <div class="ds-input-group">
                    <label>Email або номер телефону</label>
                    <input type="text" id="dsContactInput" placeholder="+380... або example@mail.com" autocomplete="email">
                </div>
                <div id="dsFormError" class="ds-form-error">Вкажіть коректний Email або номер телефону</div>
                <button class="ds-submit-btn" id="dsSubmitBtn" onclick="window.dsSubmitContact()">Почати спілкування</button>
            </div>

            <div id="dsChatBody" class="ds-chat-body" style="display:none;"></div>

            <div id="dsInputArea" class="ds-input-area" style="display:none;">
                <div class="ds-input-wrapper">
                    <input type="text" id="dsChatInput" placeholder="Ваше запитання..." onkeypress="if(event.key==='Enter') window.dsSendMessage()">
                </div>
                <button class="ds-send-btn" onclick="window.dsSendMessage()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
        `;
        document.body.appendChild(win);
        launcher.onclick = window.dsToggleChat;
    }

    // --- 5. Session Persistence Helpers ---
    function getSavedSession() {
        return {
            id: localStorage.getItem('ds_chat_session'),
            contact: localStorage.getItem('ds_chat_contact')
        };
    }

    function saveSession(id, contact) {
        localStorage.setItem('ds_chat_session', id);
        localStorage.setItem('ds_chat_contact', contact);
    }

    function clearSession() {
        localStorage.removeItem('ds_chat_session');
        localStorage.removeItem('ds_chat_contact');
    }

    // --- 6. Logic Functions ---
    window.dsToggleChat = function() {
        const win = document.getElementById('dsChatWindow');
        const isOpen = win.classList.toggle('open');
        if (!isOpen) return;

        // Check saved session FIRST — skip all intro screens
        const saved = getSavedSession();
        if (saved.id) {
            chatSessionId = saved.id;
            showChatInterface();
            loadChatHistory(saved.id);
            return;
        }

        // No session — show channel selector
        document.getElementById('dsSelectionScreen').style.display = 'block';
        document.getElementById('dsFormScreen').style.display = 'none';
        document.getElementById('dsChatBody').style.display = 'none';
        document.getElementById('dsInputArea').style.display = 'none';
    };

    window.dsStartWebChat = function() {
        document.getElementById('dsSelectionScreen').style.display = 'none';
        document.getElementById('dsFormScreen').style.display = 'block';
        setTimeout(() => {
            const inp = document.getElementById('dsContactInput');
            if (inp) inp.focus();
        }, 100);
    };

    window.dsSubmitContact = async function() {
        const input = document.getElementById('dsContactInput');
        const errEl = document.getElementById('dsFormError');
        const btn = document.getElementById('dsSubmitBtn');
        const contact = input.value.trim();

        errEl.style.display = 'none';
        input.classList.remove('ds-input-error');

        if (!validateContact(contact)) {
            errEl.style.display = 'block';
            input.classList.add('ds-input-error');
            input.focus();
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Зберігаємо...';

        const sb = getSb();
        if (!sb) {
            // Supabase unavailable — start chat without DB session
            chatSessionId = 'local_' + Date.now();
            saveSession(chatSessionId, contact);
            startNewChat();
            return;
        }

        try {
            const contactType = contact.includes('@') ? 'email' : 'phone';

            // Check if this contact already has a session
            const { data: existing } = await sb.from('chat_sessions')
                .select('id')
                .eq('client_contact', contact)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existing) {
                // Returning user — reuse existing session
                chatSessionId = existing.id;
                saveSession(chatSessionId, contact);
                showChatInterface();
                loadChatHistory(chatSessionId);
                return;
            }

            // New user — create session
            const { data: created, error } = await sb.from('chat_sessions')
                .insert({ client_contact: contact, contact_type: contactType })
                .select('id')
                .single();

            if (error || !created) throw new Error(error?.message || 'Insert failed');

            chatSessionId = created.id;
            saveSession(chatSessionId, contact);
            startNewChat();

        } catch (e) {
            console.error('Widget: session create error', e);
            // Fallback — start chat anyway so user is not stuck
            chatSessionId = 'local_' + Date.now();
            saveSession(chatSessionId, contact);
            startNewChat();
        }
    };

    function startNewChat() {
        showChatInterface();
        appendMessage("Вітаю! Я — AI-асистент Dental Studio. 🦷 Чим можу допомогти?", 'bot');
    }

    async function loadChatHistory(sessionId) {
        if (!sessionId.startsWith('local_')) {
            const sb = getSb();
            if (!sb) return;
            const { data } = await sb.from('chat_messages')
                .select('role, content')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });
            if (data && data.length > 0) {
                data.forEach(m => appendMessage(m.content, m.role));
            } else {
                appendMessage("З поверненням! Чим можу допомогти? 🦷", 'bot');
            }
        } else {
            appendMessage("Вітаю! Я — AI-асистент Dental Studio. 🦷 Чим можу допомогти?", 'bot');
        }
    }

    function showChatInterface() {
        document.getElementById('dsFormScreen').style.display = 'none';
        document.getElementById('dsSelectionScreen').style.display = 'none';
        document.getElementById('dsChatBody').style.display = 'flex';
        document.getElementById('dsInputArea').style.display = 'flex';
        setTimeout(() => {
            const inp = document.getElementById('dsChatInput');
            if (inp) inp.focus();
        }, 300);
    }

    window.dsSendMessage = async function() {
        if (isThinking) return;
        const input = document.getElementById('dsChatInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        appendMessage(text, 'user');
        saveMessageToDb('user', text);

        isThinking = true;
        const thinkingEl = showThinking();

        try {
            const response = await fetch('https://api.rozetka.space/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, sessionId: chatSessionId })
            });

            if (!response.ok) throw new Error('API ' + response.status);
            const data = await response.json();

            thinkingEl.remove();
            isThinking = false;
            appendMessage(data.reply || "Вибачте, сталася помилка.", 'bot');
            saveMessageToDb('bot', data.reply);
        } catch(e) {
            console.error('Chat Error:', e);
            thinkingEl.remove();
            isThinking = false;
            appendMessage("Вибачте, сталася помилка зв'язку. 🔄 Спробуйте пізніше або зателефонуйте нам: (077) 600 7 800.", 'bot');
        }
    };

    function appendMessage(text, role) {
        const body = document.getElementById('dsChatBody');
        const msg = document.createElement('div');
        msg.className = `ds-msg ${role}`;
        msg.innerHTML = text.replace(/\n/g, '<br>');
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
    }

    function showThinking() {
        const body = document.getElementById('dsChatBody');
        const msg = document.createElement('div');
        msg.className = 'ds-msg bot';
        msg.innerHTML = `<div class="ds-thinking"><span></span><span></span><span></span></div>`;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
        return msg;
    }

    async function saveMessageToDb(role, content) {
        if (!chatSessionId || chatSessionId.startsWith('local_')) return;
        const sb = getSb();
        if (sb) {
            await sb.from('chat_messages').insert({ session_id: chatSessionId, role, content });
        }
    }

    window.dsOpenMessenger = function(platform) {
        const links = {
            telegram: 'https://t.me/dentalstudioche',
            viber: 'viber://add?number=380776007800',
            whatsapp: 'https://wa.me/380776007800'
        };
        if (links[platform]) window.open(links[platform], '_blank');
    };

    // --- Start ---
    injectStyles();
    buildUI();

})();
