document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav__list a, .btn--outline, .btn--link, .header__right .icon.pin, .footer__col a[href="#form"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Offset for header
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Form submission mock
    const bookingForm = document.querySelector('.booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(bookingForm);
            const name = formData.get('input[type="text"]');
            
            alert('Дякуємо! Ваша заявка прийнята. Ми зв\'яжемося з вами найближчим часом.');
            bookingForm.reset();
        });
    }


});


document.addEventListener('DOMContentLoaded', () => {
    // Services Tabs Logic
    const tabs = document.querySelectorAll('.services-nav li');
    const panes = document.querySelectorAll('.service-tabpane');
    
    if(tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => { p.classList.remove('active'); });
                
                // Add active to clicked
                tab.classList.add('active');
                const targetId = tab.getAttribute('data-target');
                const targetPane = document.getElementById(targetId);
                if(targetPane) targetPane.classList.add('active');
            });
        });
    }
});
