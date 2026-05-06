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
            .in('page_slug', [page, 'footer', 'header', 'global']);

        console.log(`Checking content for ${page} page... Items:`, content ? content.length : 0);
        if (Array.isArray(content) && content.length > 0) {
            content.forEach(item => {
                if (item.content_type === 'text' && item.value_uk) {
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
                                const cleanPhone = el.innerHTML.replace(/\D/g, '');
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
                        html += `<div class="price-item" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 15px;">
                                    <div class="price-name" style="flex: 1; min-width: 150px;">${item.name_uk}</div>
                                    <div class="price-dots" style="flex-grow: 1; border-bottom: 1px dashed #e8ddd0; margin: 0 10px;"></div>
                                    <div class="price-value" style="font-weight: 500; white-space: nowrap;">${item.price_display}</div>
                                    <a href="#contacts" class="btn-primary" style="padding: 8px 16px; font-size: 13px; text-decoration: none; border-radius: 4px; white-space: nowrap; flex-shrink: 0;" onclick="if(window.openContactModal) { openContactModal(); return false; }">Записатися</a>
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
                reviewsGrid.innerHTML = reviews.map(r => {
                    const stars = '★'.repeat(Math.min(5, Math.max(1, r.stars || 5)));
                    const avatarContent = r.avatar_url
                        ? '<img src="' + r.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">'
                        : (r.author_initial || r.author_name.charAt(0));
                    return '<div class="review-card">' +
                        '<div class="review-stars">' + stars + '</div>' +
                        '<p class="review-text">"' + r.review_text + '"</p>' +
                        '<div class="review-author">' +
                            '<div class="review-avatar">' + avatarContent + '</div>' +
                            '<div>' +
                                '<p class="review-name">' + r.author_name + '</p>' +
                                '<p class="review-date">' + (r.review_date || '') + '</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }
        }
    } catch(e) {
        console.warn('Reviews load error:', e);
    }

    // --- Load dynamic cases ---
    try {
        // Homepage preview (works__grid on index.html)
        /* 
        const worksGrid = document.querySelector('.works__grid');
        if (worksGrid) {
            const { data: homeCases } = await sbClient.from('treatment_cases')
                .select('*').eq('is_published', true).order('sort_order').limit(4);

            if (homeCases && homeCases.length > 0) {
                let html = '';
                homeCases.forEach(c => {
                    const img = c.hero_image_url || c.before_image_url || '';
                    if (img) {
                        html += `<div class="works__item" onclick="location.href='case-db.html?id=${c.id}'" style="cursor:pointer;">
                            <img src="${img}" alt="${c.title_uk || 'Кейс'}">
                        </div>`;
                    }
                });
                if (html) worksGrid.innerHTML = html;
            }
        }
        */

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
