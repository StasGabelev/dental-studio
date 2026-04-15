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
            .eq('page_slug', page);

        console.log(`Checking content for ${page} page... Items:`, content ? content.length : 0);
        if (Array.isArray(content) && content.length > 0) {
            content.forEach(item => {
                if (item.content_type === 'text' && item.value_uk) {
                    // Find elements with matching data-i18n or data-cms attribute
                    const elements = document.querySelectorAll(
                        `[data-i18n="${item.section_key}"], [data-cms="${item.section_key}"]`
                    );
                    elements.forEach(el => {
                        el.innerHTML = item.value_uk;
                    });
                } else if ((item.content_type === 'image' || item.content_type === 'video') && item.media_url) {
                    // Update media sources
                    const mediaEl = document.getElementById(item.section_key);
                    if (mediaEl) {
                        if (mediaEl.tagName === 'IMG') {
                            mediaEl.src = item.media_url;
                        } else if (mediaEl.tagName === 'VIDEO') {
                            const source = mediaEl.querySelector('source');
                            if (source) {
                                source.src = item.media_url;
                                mediaEl.load();
                                mediaEl.play().catch(e => console.warn('Autoplay prevented:', e));
                            }
                        } else if (mediaEl.tagName === 'DIV' || mediaEl.tagName === 'SECTION') {
                            mediaEl.style.backgroundImage = `url('${item.media_url}')`;
                        }
                    }
                }
            });
        }
    } catch(e) {
        console.warn('Dynamic content load error:', e);
    }

    // --- Load and display dynamic price list (if on services page) ---
    try {
        const priceContainer = document.getElementById('dynamic-prices');
        if (priceContainer) {
            const { data: prices } = await sbClient.from('price_list')
                .select('*').eq('is_active', true).order('sort_order');

            if (prices && prices.length > 0) {
                // Group by category
                const categories = {};
                prices.forEach(p => {
                    if (!categories[p.category]) categories[p.category] = [];
                    categories[p.category].push(p);
                });

                let html = '';
                Object.entries(categories).forEach(([cat, items]) => {
                    html += `<div class="price-category">
                        <h3 class="price-category-title">${cat}</h3>
                        <div class="price-items">`;
                    items.forEach(item => {
                        html += `<div class="price-item">
                            <span class="price-item-name">${item.service_name_uk}</span>
                            <span class="price-item-dots"></span>
                            <span class="price-item-value">${item.price_display}</span>
                        </div>`;
                    });
                    html += `</div></div>`;
                });

                priceContainer.innerHTML = html;
            }
        }
    } catch(e) {
        console.warn('Price list load error:', e);
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

    // --- Load dynamic cases ---
    try {
        // Homepage preview (works__grid on index.html)
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

            allCases.forEach(c => {
                const img = c.main_image_url || c.before_image_url || '';
                const label = c.title_uk || '';
                const card = document.createElement('div');
                card.className = 'case-card';
                card.dataset.category = c.category || '';
                card.style.cursor = 'pointer';
                card.onclick = () => { location.href = `case.html?id=${c.id}`; };
                card.innerHTML = `
                    <div class="case-card__img" style="background-image: url('${img}');"></div>
                    <div class="case-card__overlay"><span>${label}</span></div>`;
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
