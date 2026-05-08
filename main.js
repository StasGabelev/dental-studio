/* ============================================================
   MAIN.JS — Dental Studio (REFACTORED FOR STABILITY)
   ============================================================ */

/**
 * 1. CORE CONFIG & CONSTANTS
 */
const CLINIC_CARDS_URL = "https://cliniccards.com/booking/F4GL5d_VJuiZHbRWoE-xIdr86ciDnhBJ";
let _justOpenedModal = false; // Guard for window click listener

/**
 * 2. MODAL HTML TEMPLATES
 */
const contactHubHTML = `
    <div class="contact-modal" id="contactHub">
        <div class="contact-modal-overlay" onclick="window.closeContactHub()"></div>
        <div class="contact-modal-content">
            <button class="contact-modal-close" onclick="window.closeContactHub()">&times;</button>
            <h2 class="contact-hub-title" style="margin-top: 10px;">СВ’ЯЗАТИСЯ З НАМИ</h2>
            <p class="contact-hub-subtitle">Оберіть зручний для Вас месенджер</p>
            <div class="messenger-grid">
                <a href="https://t.me/+380736007800" target="_blank" class="messenger-link">
                    <div class="messenger-icon-box">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 10l-4 4 6 6 4-16-18 7 4 2 2 6 3-4"/></svg>
                    </div>
                    <span>Telegram<br><small style="font-size:10px; color:#999; letter-spacing:1px; margin-top:4px; display:block;">+380 73 600 7800</small></span>
                </a>
                <a href="viber://chat?number=%2B380736007800" class="messenger-link">
                    <div class="messenger-icon-box">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </div>
                    <span>Viber<br><small style="font-size:10px; color:#999; letter-spacing:1px; margin-top:4px; display:block;">+380 73 600 7800</small></span>
                </a>
                <a href="https://www.instagram.com/dental_studio_che/" target="_blank" class="messenger-link">
                    <div class="messenger-icon-box">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </div>
                    <span>Instagram</span>
                </a>
                <a href="https://wa.me/380736007800" target="_blank" class="messenger-link">
                    <div class="messenger-icon-box">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.3 8.38 8.38 0 0 1 3.8.9L21 3.5Z"></path></svg>
                    </div>
                    <span>WhatsApp<br><small style="font-size:10px; color:#999; letter-spacing:1px; margin-top:4px; display:block;">+380 73 600 7800</small></span>
                </a>
            </div>
        </div>
    </div>




    <div id="scrollTopBtn" class="scroll-top-btn" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
    </div>
`;

const bookingModalHTML = `
    <div class="booking-modal" id="bookingModal">
        <div class="booking-modal-overlay" onclick="window.closeOnlineBooking()"></div>
        <div class="booking-modal-content">
            <button class="booking-modal-close" onclick="window.closeOnlineBooking()">&times;</button>
            <div id="bookingLoader" class="booking-loader">
                <div class="spinner-gold"></div>
                <p>Завантажуємо графік...</p>
            </div>
            <iframe id="bookingIframe" src="about:blank" frameborder="0" allow="geolocation; microphone; camera; midi; encrypted-media;" onload="window.hideBookingLoader()"></iframe>
        </div>
    </div>
`;

/**
 * 3. GLOBAL FUNCTIONS (Window Scope)
 */
window.openOnlineBooking = function() {
    console.log("Attempting to open Online Booking...");

    // MOBILE: open in new tab (ClinicCards doesn't support iframe interactions on mobile)
    // Original tab stays open - customer can always return
    if (window.innerWidth <= 1024) {
        window.open(CLINIC_CARDS_URL, '_blank');
        
        // Show floating "return" hint on current page
        let hint = document.getElementById('bookingHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'bookingHint';
            hint.innerHTML = `
                <div style="position:fixed;bottom:0;left:0;right:0;z-index:999999;background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;padding:20px 25px;text-align:center;box-shadow:0 -4px 30px rgba(0,0,0,0.3);font-family:'Montserrat',sans-serif;">
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">📋 Запис відкрито в новій вкладці</p>
                    <button onclick="this.parentElement.parentElement.remove()" style="background:linear-gradient(135deg,#B8924A,#d4a84b);color:#fff;border:none;padding:12px 30px;border-radius:30px;font-size:13px;font-weight:600;letter-spacing:1px;cursor:pointer;font-family:inherit;">ПОВЕРНУТИСЯ НА САЙТ</button>
                </div>
            `;
            document.body.appendChild(hint);
        }
        return;
    }

    // DESKTOP: use the iframe modal as before
    const modal = document.getElementById('bookingModal');
    const iframe = document.getElementById('bookingIframe');
    const loader = document.getElementById('bookingLoader');

    if (!modal || !iframe) {
        console.error("Critical: Booking modal elements not found in DOM!");
        document.body.insertAdjacentHTML('afterbegin', bookingModalHTML);
        return window.openOnlineBooking(); 
    }

    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
        loader.style.pointerEvents = 'auto';
        loader.classList.remove('hidden');
    }

    window.closeContactHub();

    iframe.src = CLINIC_CARDS_URL;
    modal.classList.add('booking-modal--active');
    document.body.style.overflow = 'hidden';
    modal.style.display = 'flex';
    _justOpenedModal = true;
    setTimeout(() => { _justOpenedModal = false; }, 400);
};

window.closeOnlineBooking = function() {
    // Mobile cleanup
    document.getElementById('mobileBookingIframe')?.remove();
    document.getElementById('mobileBookingClose')?.remove();

    // Desktop cleanup
    const modal = document.getElementById('bookingModal');
    const iframe = document.getElementById('bookingIframe');
    if (modal) {
        modal.classList.remove('booking-modal--active');
        setTimeout(() => { modal.style.display = 'none'; }, 400);
    }
    document.body.style.overflow = '';
    setTimeout(() => { if (iframe) iframe.src = "about:blank"; }, 400);
};

window.hideBookingLoader = function() {
    const loader = document.getElementById('bookingLoader');
    const iframe = document.getElementById('bookingIframe');
    if (loader && iframe && iframe.src !== 'about:blank') {
        loader.classList.add('hidden');
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
    }
};

window.openContactHub = function() {
    const hub = document.getElementById('contactHub');
    if (!hub) return;
    
    window.closeOnlineBooking(); // Close booking if open
    
    hub.classList.add('contact-modal--active');
    document.body.style.overflow = 'hidden';
    
    _justOpenedModal = true;
    setTimeout(() => { _justOpenedModal = false; }, 400);
};

window.closeContactHub = function() {
    const hub = document.getElementById('contactHub');
    if (hub) hub.classList.remove('contact-modal--active');
    document.body.style.overflow = '';
};

window.toggleMobileMenu = function() {
    let overlay = document.getElementById('mobileMenuOverlay');
    if (overlay) {
        overlay.classList.remove('mobile-overlay--active');
        setTimeout(() => overlay.remove(), 350);
        document.body.style.overflow = '';
        return;
    }

    const links = [
        { href: 'index.html', label: 'Головна' },
        { href: 'services.html', label: 'Послуги' },
        { href: 'cases.html', label: 'Наші роботи' },
        { href: 'about.html', label: 'Про нас' },
        { href: 'contact.html', label: 'Контакти' },
    ];

    overlay = document.createElement('div');
    overlay.id = 'mobileMenuOverlay';
    overlay.className = 'mobile-menu-overlay'; // Use class for styles
    overlay.innerHTML = `
        <button class="mobile-overlay__close" onclick="window.toggleMobileMenu()">&times;</button>
        <div class="mobile-overlay__logo">
            <a href="index.html" class="logo-link" style="align-items: center;">
                <span class="logo-top" style="font-size:20px; color:#1a1a1a;">DENTAL</span>
                <span class="logo-bottom" style="font-size:10px; color:#B8924A;">Studio</span>
            </a>
        </div>
        <nav class="mobile-overlay__nav">
            ${links.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
        </nav>
        <div class="mobile-overlay__footer">
            <a href="tel:+380776007800" style="font-family:var(--font-serif); font-size:24px; color:#B8924A;">(077) 600 7 800</a>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    setTimeout(() => overlay.classList.add('mobile-overlay--active'), 10);
};

/**
 * 4. EVENT INITIALIZATION
 */
document.addEventListener('DOMContentLoaded', () => {
    // Inject templates at the absolute TOP of body to prevent stacking context issues
    document.body.insertAdjacentHTML('afterbegin', contactHubHTML);
    document.body.insertAdjacentHTML('afterbegin', bookingModalHTML);

    // Scroll Effects
    const header = document.querySelector('.header');
    if (header) {
        const handleScroll = () => {
            header.classList.toggle('header--scrolled', window.scrollY > 60);
            const scrollBtn = document.getElementById('scrollTopBtn');
            if (scrollBtn) scrollBtn.classList.toggle('scroll-top-btn--visible', window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    // Intersection Observer for .reveal
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // CLICK INTERCEPTOR for old links & Header Button
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href="#form"], #btn-book-header');
        if (anchor && !anchor.classList.contains('btn--map-pin')) {
            e.preventDefault();
            window.openOnlineBooking();
        }
    });

    // OUTSIDE CLICK CLOSER
    window.addEventListener('click', (e) => {
        if (_justOpenedModal) return;
        if (e.target.classList.contains('contact-modal') || e.target.classList.contains('booking-modal')) {
             window.closeContactHub();
             window.closeOnlineBooking();
        }
    });

    // Interactive Treatment Plan Switcher
    const planTabs = document.querySelectorAll('.plan-tab-btn');
    const planStages = document.querySelectorAll('.plan-stage');
    
    if (planTabs.length > 0) {
        planTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const stageId = btn.getAttribute('data-stage');
                
                // Toggle Buttons
                planTabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Toggle Stages
                planStages.forEach(stage => {
                    stage.classList.remove('active');
                    if (stage.id === stageId) {
                        stage.classList.add('active');
                    }
                });
            });
        });
    }

    // Refined Cases Filtering (Support for dynamic loading)
    window.initCasesFilters = function() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const caseCards = document.querySelectorAll('.case-card');

        if (filterBtns.length > 0) {
            filterBtns.forEach(btn => {
                // Remove potential duplicate listeners
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);

                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const filterValue = newBtn.getAttribute('data-filter');
                    
                    // Update buttons status
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    newBtn.classList.add('active');
                    
                    // Filter cards with a smooth fade
                    const cards = document.querySelectorAll('.case-card');
                    cards.forEach(card => {
                        const category = card.getAttribute('data-category');
                        if (filterValue === 'all' || category === filterValue) {
                            card.style.display = 'block';
                            setTimeout(() => { card.style.opacity = '1'; }, 10);
                        } else {
                            card.style.opacity = '0';
                            setTimeout(() => { card.style.display = 'none'; }, 300);
                        }
                    });
                });
            });
        }
    };

    // Run once on load for static cases (if any)
    window.initCasesFilters();

    console.log("Dental Studio JS Initialized (v3 - Gold Edition)");

    // Floating callback button
    const fab = document.createElement('button');
    fab.id = 'callback-fab';
    fab.title = 'Замовити дзвінок';
    fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/></svg><span>ДЗВІНОК</span>';
    fab.onclick = function() {
        var section = document.getElementById('callback-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    document.body.appendChild(fab);
});

// Callback form submit (loaded via innerHTML so must be global)
window.submitCallbackForm = async function(e) {
    e.preventDefault();
    var name = document.getElementById('callback-name').value.trim();
    var phone = document.getElementById('callback-phone').value.trim();
    if (!name || !phone) return;

    var btn = document.querySelector('.callback-btn');
    btn.disabled = true;
    btn.textContent = '...';

    try {
        var PUBLIC_SB_URL = 'https://ckldvntrsiacbjpiydmn.supabase.co';
        var PUBLIC_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGR2bnRyc2lhY2JqcGl5ZG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzMzMTUsImV4cCI6MjA5MTY0OTMxNX0.6zxRqTheJDt2BTb1hbAxQHCLZI8wT5xPus2Ad97AuMg';
        var sbClient = supabase.createClient(PUBLIC_SB_URL, PUBLIC_SB_KEY);
        var result = await sbClient.from('site_content')
            .select('section_key, value_uk')
            .in('section_key', ['telegram-bot-token', 'telegram-chat-id'])
            .eq('page_slug', 'social');

        var botToken = '', chatId = '';
        if (result.data) result.data.forEach(function(row) {
            if (row.section_key === 'telegram-bot-token') botToken = row.value_uk;
            if (row.section_key === 'telegram-chat-id') chatId = row.value_uk;
        });

        if (botToken && chatId) {
            var text = 'Замовлення дзвінка\nIм\'я: ' + name + '\nТелефон: ' + phone + '\nСайт: ' + window.location.hostname;
            await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: text })
            });
        }

        document.getElementById('callbackForm').style.display = 'none';
        document.getElementById('callbackSuccess').style.display = 'block';
    } catch (err) {
        console.warn('Callback form error:', err);
        btn.disabled = false;
        btn.textContent = 'ПЕРЕДЗВОНІТЬ МЕНІ';
    }
};
