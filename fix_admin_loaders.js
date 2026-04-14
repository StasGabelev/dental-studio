const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// 1. Fix loadDoctors to handle errors and show all doctors (remove is_active filter temporarily to find lost ones)
const newLoadDoctors = `async function loadDoctors() {
    console.log('loading doctors...');
    if (sb) {
        // Try without is_active filter to see if they are hidden
        const { data, error } = await sb.from('doctors')
            .select('*').order('sort_order');
        
        if (error) {
            console.error('Doctors fetch error:', error);
            showToast('❌ Помилка БД: ' + (error.message || 'невідома помилка'));
        }
        
        if (data) {
            console.log('Doctors from DB:', data.length);
            doctors = data.map(d => ({
                id: d.id,
                name: d.name_uk || '',
                spec: d.specialization_uk || '',
                photo: d.photo_url || '',
                is_active: d.is_active
            }));
        }
    }

    if (doctors.length === 0 && !sb) {
        doctors = [
            { id: 'l1', name: 'Др. Іванов А.В.', spec: 'Терапевт', photo: '' },
            { id: 'l2', name: 'Др. Петрова О.М.', spec: 'Хірург-імплантолог', photo: '' },
        ];
    }

    renderDoctors();
}`;

// 2. Fix loadPriceList similarly
const newLoadPriceList = `async function loadPriceList() {
    if (sb) {
        const { data, error } = await sb.from('price_list')
            .select('*').order('sort_order');
        
        if (error) {
            showToast('❌ Помилка БД: ' + error.message);
        }

        if (data) {
            priceItems = data.map(p => ({
                id: p.id,
                category: p.category,
                name: p.service_name_uk,
                price: p.price_display || '',
                sort_order: p.sort_order || 0,
            }));
        }
    }

    if (priceItems.length === 0 && !sb) {
        priceItems = [
            { id: 'l1', category: 'Терапія', name: 'Консультація лікаря', price: '500 грн' },
            { id: 'l2', category: 'Терапія', name: 'Пломбування зуба', price: 'від 1200 грн' },
            { id: 'l3', category: 'Хірургія', name: 'Видалення зуба', price: 'від 800 грн' },
            { id: 'l4', category: 'Хірургія', name: 'Імплантація', price: 'від 15000 грн' },
            { id: 'l5', category: 'Естетика', name: 'Професійне відбілювання', price: 'від 4500 грн' },
            { id: 'l6', category: 'Ортодонтія', name: 'Брекет-система', price: 'від 25000 грн' },
        ];
    }

    renderPriceList();
}`;

// Replaces
src = src.replace(/async function loadDoctors\(\) \{.*?\n\}/s, newLoadDoctors);
src = src.replace(/async function loadPriceList\(\) \{.*?\n\}/s, newLoadPriceList);

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('Replaced loaders with error-handling versions.');
