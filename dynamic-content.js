// ============================================================
// DENTAL STUDIO — Dynamic Content Loader
// Loads site content from Supabase (set via admin panel)
// Falls back to hardcoded HTML if Supabase not configured
// ============================================================

(async function initDynamicContent() {
    // Check if Supabase is configured
    let sbClient = null;
    try {
        const config = localStorage.getItem('ds_supabase');
        if (config) {
            const { url, key } = JSON.parse(config);
            if (url && key && typeof supabase !== 'undefined') {
                sbClient = supabase.createClient(url, key);
            }
        }
    } catch(e) {}

    if (!sbClient) return; // Keep hardcoded content

    // --- Load text content ---
    try {
        const page = detectCurrentPage();
        const { data: content } = await sbClient.from('site_content')
            .select('section_key, value_uk, value_ru, value_en, content_type, media_url')
            .eq('page_slug', page);

        console.log(`Loading ${content.length} items for ${page} page`);
        if (content && content.length > 0) {
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
                            : `<div class="doctor-card__photo-placeholder">👨‍⚕️</div>`
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
                            <p>${doc.bio_uk || ''}</p>
                        </div>
                        <div class="team-member__label">
                            <strong>${doc.name_uk.toUpperCase()}</strong>
                            <small>${doc.specialization_uk || 'Лікар'}</small>
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

    // --- Load dynamic cases (before/after) ---
    try {
        const casesGrid = document.querySelector('.works__grid');
        if (casesGrid) {
            const { data: cases } = await sbClient.from('cases')
                .select('*').eq('is_published', true).order('created_at', { ascending: false });

            if (cases && cases.length > 0) {
                let html = '';
                cases.forEach(c => {
                    if (c.before_photo_url) {
                        html += `<div class="works__item">
                            <img src="${c.before_photo_url}" alt="${c.title_uk || 'Кейс'}">
                            ${c.title_uk ? `<div class="works__item-title">${c.title_uk}</div>` : ''}
                        </div>`;
                    }
                });
                if (html) casesGrid.innerHTML = html;
            }
        }
    } catch(e) {
        console.warn('Cases load error:', e);
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
