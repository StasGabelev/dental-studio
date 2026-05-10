// ============================================================
// DENTAL STUDIO — Dynamic Content Loader
// Loads site content from Supabase (set via admin panel)
// Falls back to hardcoded HTML if Supabase not configured
// ============================================================

(async function initDynamicContent() {
    const PUBLIC_SB_URL = 'https://ckldvntrsiacbjpiydmn.supabase.co';
    const PUBLIC_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGR2bnRyc2lhY2JqcGl5ZG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzMzMTUsImV4cCI6MjA5MTY0OTMxNX0.6zxRqTheJDt2BTb1hbAxQHCLZI8wT5xPus2Ad97AuMg';
    let sbClient = null;

    // Helper to wait for global supabase to be ready (CDN load)
    const waitForSupabase = (timeout = 5000) => {
        return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
                if (typeof supabase !== 'undefined') {
                    resolve(true);
                } else if (Date.now() - start > timeout) {
                    resolve(false);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    };

    const isReady = await waitForSupabase();
    
    // FAIL-SAFE: If still loading after 7 seconds, clear the loader anyway
    setTimeout(() => {
        const loader = document.getElementById('cases-loading');
        if (loader && loader.innerHTML.includes('ЗАВАНТАЖЕННЯ')) {
            loader.innerHTML = '<p style="color:#999;">Перевищено час очікування. Спробуйте оновити сторінку.</p>';
        }
    }, 7000);

    if (isReady && typeof supabase !== 'undefined') {
        sbClient = supabase.createClient(PUBLIC_SB_URL, PUBLIC_SB_KEY);
    }

    if (!sbClient) {
        console.warn('Supabase not initialized - keeping fallback content');
        // If we are on cases grid, we must at least hide the loader
        const loader = document.getElementById('cases-loading');
        if (loader) loader.innerHTML = '<p style="color:#888;">Помилка завантаження бібліотеки. Спробуйте оновити сторінку.</p>';
        return; 
    }

    // --- Load text content ---
    try {
        const page = detectCurrentPage();
        const { data: content } = await sbClient.from('site_content')
            .select('section_key, value_uk, value_ru, value_en, content_type, media_url')
            .in('page_slug', [page, 'footer', 'header', 'global', 'social']);

        console.log(`Checking content for ${page} page... Items:`, content ? content.length : 0);
        if (Array.isArray(content) && content.length > 0) {
            content.forEach(item => {
                if (item.content_type === 'text' && item.section_key.endsWith('-visible') && item.value_uk === 'false') {
                    const sectionId = 'section-' + item.section_key.slice(0, -8);
                    const el = document.getElementById(sectionId);
                    if (el) el.style.display = 'none';
                } else if (item.content_type === 'text' && item.value_uk) {
                    // Find elements with matching data-i18n or data-cms attribute
                    const elements = document.querySelectorAll(
                        `[data-i18n="${item.section_key}"], [data-cms="${item.section_key}"], [data-cms-href="${item.section_key}"]`
                    );
                    elements.forEach(el => {
                        // 1. If it's a data-cms-href target, update the href
                        if (el.hasAttribute('data-cms-href') && el.getAttribute('data-cms-href') === item.section_key) {
                            el.href = item.value_uk;
                        } else {
                            // 2. Standard innerHTML update
                            el.innerHTML = item.value_uk;
                            
                            // 3. Auto-update tel: links if this is a phone number
                            if (el.tagName === 'A' && (el.innerHTML.includes('(') || el.innerHTML.includes('+'))) {
                                let cleanPhone = el.innerHTML.replace(/\D/g, '');
                                // Normalize Ukrainian local format: 0XXXXXXXXX (10 digits) → 380XXXXXXXXX
                                if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
                                    cleanPhone = '380' + cleanPhone.slice(1);
                                }
                                el.href = `tel:+${cleanPhone}`;
                            }
                        }
                    });
                } else if (item.content_type === 'image' || item.content_type === 'video') {
                    // Update media sources
                    let mediaEl = document.getElementById(item.section_key);
                    if (mediaEl) {
                        // Check if this is a video container (ID on DIV wrapping a VIDEO)
                        const internalVideo = mediaEl.tagName === 'DIV' ? mediaEl.querySelector('video') : (mediaEl.tagName === 'VIDEO' ? mediaEl : null);
                        
                        if (mediaEl.tagName === 'IMG') {
                            if (item.media_url) mediaEl.src = item.media_url;
                        } else if (internalVideo) {
                            const source = internalVideo.querySelector('source');
                            if (source && item.media_url) {
                                // Show the container (in case it was display:none)
                                if (mediaEl.tagName === 'DIV') {
                                    mediaEl.style.display = '';
                                } else {
                                    const wrapper = mediaEl.closest('.accordion-content-media');
                                    if (wrapper) wrapper.style.display = '';
                                }
                                source.src = item.media_url;
                                internalVideo.load();
                                internalVideo.play().catch(e => console.warn('Autoplay prevented:', e));
                            }
                        } else if ((mediaEl.tagName === 'DIV' || mediaEl.tagName === 'SECTION') && item.media_url) {
                            mediaEl.style.backgroundImage = `url('${item.media_url}')`;
                        }
                    }
                }
            });
        }
    } catch(e) {
        console.warn('Dynamic content load error:', e);
    }

    // Content loaded — reveal the page

    // --- Load dynamic service prices (accordion specific) ---
    try {
        // Fetch all prices ordered by sort_order
        const { data: prices } = await sbClient.from('service_prices')
            .select('*')
            .order('sort_order', { ascending: true });

        if (prices && prices.length > 0) {
            // Group by service_group
            const groupedPrices = {};
            prices.forEach(p => {
                if (!groupedPrices[p.service_group]) groupedPrices[p.service_group] = [];
                groupedPrices[p.service_group].push(p);
            });

            // Find all matching price lists on the page
            Object.entries(groupedPrices).forEach(([group, items]) => {
                const listEl = document.getElementById(`prices-${group}`);
                if (listEl) {
                    let html = '';
                    items.forEach(item => {
                        html += `<div class="price-item">
                                    <div class="price-name">${item.name_uk}</div>
                                    <div class="price-dots"></div>
                                    <div class="price-value">${item.price_display}</div>
                                    <a href="#contacts" class="price-item-btn" onclick="if(window.openContactHub) { openContactHub(); return false; }">Записатися</a>
                                 </div>`;
                    });
                    
                    listEl.innerHTML = html;
                }
            });
        }
    } catch(e) {
        console.warn('Service prices load error:', e);
    }

    // --- Load dynamic doctors ---
    try {
        const doctorsContainer = document.getElementById('dynamic-doctors');
        if (doctorsContainer) {
            const { data: docs } = await sbClient.from('doctors')
                .select('*').eq('is_active', true).order('sort_order');

            if (docs && docs.length > 0) {
                let html = '';
                docs.forEach(doc => {
                    html += `<div class="doctor-card">
                        ${doc.photo_url
                            ? `<img src="${doc.photo_url}" alt="${doc.name_uk}" class="doctor-card__photo">`
                            : `<div class="doctor-card__photo-placeholder">&#x1F9D1;&#x200D;&#x2695;&#xFE0F;</div>`
                        }
                        <h3 class="doctor-card__name">${doc.name_uk}</h3>
                        <p class="doctor-card__spec">${doc.specialization_uk || ''}</p>
                        ${doc.bio_uk ? `<p class="doctor-card__bio">${doc.bio_uk}</p>` : ''}
                    </div>`;
                });
                doctorsContainer.innerHTML = html;
            }
        }

        // About page specific team accordion
        const accordionContainer = document.querySelector('.team-accordion');
        if (accordionContainer) {
            const { data: docs } = await sbClient.from('doctors')
                .select('*').eq('is_active', true).order('sort_order');

            if (docs && docs.length > 0) {
                let html = '';
                docs.forEach((doc, idx) => {
                    const activeClass = idx === 0 ? 'active' : '';
                    const photo = doc.photo_url || 'assets/doctor.png';
                    html += `<div class="team-member ${activeClass}">
                        <div class="team-member__img" style="background-image: url('${photo}')"></div>
                        <div class="team-member__info">
                            <h3>${doc.name_uk.toUpperCase()}</h3>
                            <p class="specialist-label-gold">${doc.specialization_uk || 'Лікар'}</p>
                            <p>${doc.bio_uk || ''}</p>
                        </div>
                        <div class="team-member__label">
                            <strong>${doc.name_uk.toUpperCase()}</strong>
                            <small class="specialist-label-gold">${doc.specialization_uk || 'Лікар'}</small>
                        </div>
                    </div>`;
                });
                accordionContainer.innerHTML = html;

                // Rebind accordion events
                document.querySelectorAll('.team-member').forEach(member => {
                    member.addEventListener('mouseenter', () => {
                        const active = document.querySelector('.team-member.active');
                        if (active) active.classList.remove('active');
                        member.classList.add('active');
                    });
                    member.addEventListener('click', () => {
                        const isMobile = window.innerWidth <= 1024;
                        if (!isMobile) return;
                        const alreadyActive = member.classList.contains('active');
                        document.querySelectorAll('.team-member.active').forEach(a => a.classList.remove('active'));
                        if (!alreadyActive) {
                            member.classList.add('active');
                            setTimeout(() => {
                                member.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 50);
                        }
                    });
                });
            }
        }
    } catch(e) {
        console.warn('Doctors load error:', e);
    }

    // --- Load trust counters (index.html) ---
    try {
        const countersGrid = document.getElementById('trust-counters-grid');
        if (countersGrid) {
            const { data: counters } = await sbClient.from('trust_counters')
                .select('*').eq('is_active', true).order('sort_order');
            if (counters && counters.length > 0) {
                countersGrid.innerHTML = counters.map(c => `
                    <div class="trust-counter">
                        <span class="trust-counter__num" data-target="${c.value}">0</span>${c.suffix ? '<span class="trust-counter__plus">' + c.suffix + '</span>' : ''}
                        <p class="trust-counter__label">${c.label_uk}</p>
                    </div>
                `).join('');
                // Re-trigger counter animation if observer already fired
                if (window._trustCountersAnimated) animateTrustCounters();
            }
        }
    } catch(e) {
        console.warn('Trust counters load error:', e);
    }

    // --- Load reviews (index.html) ---
    try {
        const reviewsGrid = document.getElementById('reviews-grid');
        if (reviewsGrid) {
            const { data: reviews } = await sbClient.from('reviews')
                .select('*').eq('is_active', true).order('sort_order');
            if (reviews && reviews.length > 0) {
                const googleLogoSvg = '<svg width="14" height="14" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
                const avatarColors = ['#1a73e8','#ea4335','#34a853','#fbbc05','#8430ce','#e37400','#137333','#c5221f'];
                function getAvatarColor(name) {
                    let h = 0;
                    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
                    return avatarColors[Math.abs(h) % avatarColors.length];
                }
                function relativeDate(dateStr) {
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return dateStr;
                    const days = Math.floor((Date.now() - d) / 86400000);
                    if (days < 2) return 'вчора';
                    if (days < 7) return days + ' дні тому';
                    const weeks = Math.floor(days / 7);
                    if (weeks < 5) return weeks === 1 ? 'тиждень тому' : weeks + ' тижні тому';
                    const months = Math.floor(days / 30);
                    if (months < 12) {
                        if (months === 1) return 'місяць тому';
                        if (months < 5) return months + ' місяці тому';
                        return months + ' місяців тому';
                    }
                    const years = Math.floor(months / 12);
                    return years === 1 ? 'рік тому' : years + ' роки тому';
                }
                reviewsGrid.innerHTML = reviews.map(r => {
                    const stars = '★'.repeat(Math.min(5, Math.max(1, r.stars || 5)));
                    const color = r.avatar_url ? '' : ' style="background:' + getAvatarColor(r.author_name || 'A') + ';"';
                    const avatarContent = r.avatar_url
                        ? '<img src="' + r.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">'
                        : (r.author_initial || r.author_name.charAt(0));
                    const displayDate = r.created_at ? relativeDate(r.created_at) : (r.review_date || '');
                    return '<div class="review-card">' +
                        '<div class="rc-top"><div class="review-avatar"' + color + '>' + avatarContent + '</div>' +
                        '<div><p class="review-name">' + r.author_name + '</p><p class="review-date">' + displayDate + '</p></div></div>' +
                        '<div class="review-stars">' + stars + '</div>' +
                        '<p class="review-text">"' + r.review_text + '"</p>' +
                        '<button class="review-read-more" onclick="var t=this.previousElementSibling;t.classList.toggle(\'expanded\');this.textContent=t.classList.contains(\'expanded\')?\'Згорнути\':\'Читати далі\'">Читати далі</button>' +
                        '<div class="rc-google-logo">' + googleLogoSvg + '<span>Google</span></div>' +
                    '</div>';
                }).join('');
                // Show expand buttons only where text is actually clamped
                reviewsGrid.querySelectorAll('.review-text').forEach(el => {
                    if (el.scrollHeight > el.clientHeight + 2) {
                        const btn = el.nextElementSibling;
                        if (btn && btn.classList.contains('review-read-more')) btn.style.display = 'block';
                    }
                });
            }
        }
    } catch(e) {
        console.warn('Reviews load error:', e);
    }

    // --- Load dynamic cases ---
    try {
        // Homepage preview (works__grid on index.html)
        const worksGrid = document.getElementById('works-grid-dynamic');
        if (worksGrid) {
            // Try fetching featured cases first, fallback to first 4 published
            let homeCases = null;
            try {
                const { data } = await sbClient.from('treatment_cases')
                    .select('*').eq('is_published', true).eq('show_on_homepage', true).order('sort_order').limit(4);
                if (data && data.length > 0) homeCases = data;
            } catch(e) { /* show_on_homepage column might not exist yet */ }

            if (!homeCases) {
                const { data } = await sbClient.from('treatment_cases')
                    .select('*').eq('is_published', true).order('sort_order').limit(4);
                homeCases = data;
            }

            if (homeCases && homeCases.length > 0) {
                let html = '';
                homeCases.forEach(c => {
                    const img = c.main_image_url || c.before_image_url || '';
                    if (img) {
                        html += `<div class="works__item" onclick="location.href='case.html?id=${c.slug || c.id}'" style="cursor:pointer;">
                            <img src="${img}" alt="${c.title_uk || 'Кейс'}">
                        </div>`;
                    }
                });
                if (html) worksGrid.innerHTML = html;
            } else {
                worksGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">Роботи скоро з\'являться...</p>';
            }
        }

        // Full cases page — render from Supabase
        const casesGridFull = document.querySelector('.cases-grid');
        if (casesGridFull) {
            // First, get the data
            const { data: allCases, error: casesError } = await sbClient.from('treatment_cases')
                .select('*').eq('is_published', true).order('sort_order');

            // Now, clear and handle
            casesGridFull.innerHTML = ''; 

            if (casesError || !allCases) {
                console.error('Supabase error:', casesError);
                casesGridFull.innerHTML = '<p style="text-align:center; padding: 40px; color: #cc0000;">Помилка завантаження даних. Будь ласка, оновіть сторінку.</p>';
                return;
            }

            if (allCases.length === 0) {
                casesGridFull.innerHTML = '<p style="text-align:center; padding: 40px; color: #999;">Роботи скоро з\'являться...</p>';
                return;
            }

            const categoryLabels = {
                'veneers': 'ВІНІРИ',
                'implants': 'ІМПЛАНТАЦІЯ',
                'ortho': 'ОРТОДОНТІЯ',
                'restoration': 'РЕСТАВРАЦІЯ',
                'therapy': 'ТЕРАПІЯ',
                'hygiene': 'ГІГІЄНА',
                'military': 'ДЛЯ ВІЙСЬКОВИХ',
                'complex': 'КОМПЛЕКСНЕ ЛІКУВАННЯ',
                'whitening': 'ВІДБІЛЮВАННЯ',
                'aligners': 'ЕЛАЙНЕРИ'
            };

            allCases.forEach(c => {
                const img = c.main_image_url || c.before_image_url || '';
                const label = categoryLabels[c.category] || c.category || '';
                const card = document.createElement('div');
                card.className = 'case-card';
                card.dataset.category = c.category || '';
                card.style.cursor = 'pointer';
                card.onclick = () => { location.href = `case.html?id=${c.id}`; };
                card.innerHTML = `
                    <div class="case-card__img" style="background-image: url('${img}');"></div>
                    <div class="case-card__overlay"><span>${label.toUpperCase()}</span></div>`;
                casesGridFull.appendChild(card);
            });
        }
    } catch(e) {
        console.error('Critical Cases load error:', e);
        const casesGridFull = document.querySelector('.cases-grid');
        if (casesGridFull) {
            casesGridFull.innerHTML = '<p style="text-align:center; padding: 40px; color: #cc0000;">Критична помилка завантаження.</p>';
        }
    }

})();

// --- Detect which page we're on ---
function detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('about')) return 'about';
    if (path.includes('services') || path.includes('service')) return 'services';
    if (path.includes('case') || path.includes('work')) return 'cases';
    if (path.includes('contact')) return 'contact';
    return 'home';
}
