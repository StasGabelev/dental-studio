const fs = require('fs');
let src = fs.readFileSync('admin/admin.js', 'utf8');

// Update loadDoctors to be extremely defensive and log details
const loadDoctorsDefensive = `async function loadDoctors() {
    console.log('DEFENSIVE LOAD DOCTORS START');
    if (!sb) {
        console.warn('Supabase not connected, showing defaults');
        doctors = [
            { id: 'l1', name: 'Др. Іванов А.В.', spec: 'Терапевт', photo: '' },
            { id: 'l2', name: 'Др. Петрова О.М.', spec: 'Хірург-імплантолог', photo: '' },
        ];
        renderDoctors();
        return;
    }

    try {
        const area = document.getElementById('doctorsArea');
        if (area) area.innerHTML = '<p class="editor-placeholder">Завантаження з бази даних...</p>';

        const { data, error } = await sb.from('doctors').select('*').order('sort_order');
        
        if (error) {
            console.error('DB ERROR:', error);
            showToast('❌ Помилка БД: ' + error.message);
            // Don't clear current doctors if error
        } else if (data) {
            console.log('DB SUCCESS, items:', data.length);
            doctors = data.map(d => ({
                id: d.id,
                name: d.name_uk || d.name || '',
                spec: d.specialization_uk || d.specialization || d.spec || '',
                photo: d.photo_url || d.photo || '',
                is_active: d.is_active !== false
            }));
            
            if (doctors.length === 0) {
                console.warn('DB returned 0 doctors');
            }
        }
    } catch (e) {
        console.error('CRITICAL JS ERROR in loadDoctors:', e);
        showToast('❌ JS Error: ' + e.message);
    }

    renderDoctors();
}`;

src = src.replace(/async function loadDoctors\(\) \{.*?\n\}/s, loadDoctorsDefensive);

fs.writeFileSync('admin/admin.js', src, 'utf8');
console.log('Applied defensive loadDoctors.');
