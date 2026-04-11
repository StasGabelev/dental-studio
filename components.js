document.addEventListener('DOMContentLoaded', () => {
    loadComponent('header-placeholder', 'header.html', highlightActiveLink);
    loadComponent('footer-placeholder', 'footer.html');
});

function loadComponent(id, file, callback) {
    const el = document.getElementById(id);
    if (!el) return;

    fetch(file)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${file}`);
            return response.text();
        })
        .then(data => {
            el.innerHTML = data;
            if (callback) callback();
            
            // Re-initialize elements if needed (if they are in header)
            initMobileMenu();
            initLanguageSwitcher();
            applyTranslations(localStorage.getItem('dental_lang') || 'UA');
        })
        .catch(err => console.error(err));
}

function initMobileMenu() {
    const burger = document.querySelector('.hamburger');
    const nav = document.querySelector('.nav');
    if (burger && nav) {
        burger.onclick = () => nav.classList.toggle('active');
    }
}

function initLanguageSwitcher() {
    const langSpans = document.querySelectorAll('.lang span');
    const currentLang = localStorage.getItem('dental_lang') || 'UA';
    
    langSpans.forEach(span => {
        // Set initial active state from storage
        if (span.textContent.trim() === currentLang) {
            langSpans.forEach(s => s.classList.remove('active'));
            span.classList.add('active');
        }

        span.addEventListener('click', () => {
            langSpans.forEach(s => s.classList.remove('active'));
            span.classList.add('active');
            const newLang = span.textContent.trim();
            localStorage.setItem('dental_lang', newLang);
            console.log(`Language switched to: ${newLang}`);
            applyTranslations(newLang);
        });
    });
}

function applyTranslations(lang) {
    if (!window.translations) {
        console.warn('Translations dictionary not loaded yet.');
        return;
    }

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = window.translations[lang][key];

        if (translation) {
            // Check if it's an input/textarea for placeholder
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                // Use innerHTML to support <br> tags if any
                el.innerHTML = translation;
            }
        }
    });

    // Update document lang attribute
    document.documentElement.lang = lang.toLowerCase();
}

function highlightActiveLink() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || 'index.html';
    
    if (page === 'index.html') document.getElementById('nav-home')?.classList.add('active');
    if (page === 'services.html') document.getElementById('nav-services')?.classList.add('active');
    if (page === 'cases.html') document.getElementById('nav-works')?.classList.add('active');
    if (page === 'about.html') document.getElementById('nav-about')?.classList.add('active');
    if (page === 'contact.html') document.getElementById('nav-contacts')?.classList.add('active');
}
