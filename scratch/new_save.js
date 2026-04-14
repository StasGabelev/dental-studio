async function savePageContent(pageSlug) {
    const sb = getSupabaseClient();
    if (!sb) return;

    const fields = document.querySelectorAll('#pageEditorArea [data-key]');
    const updates = [];

    fields.forEach(f => {
        const val = f.value;
        const key = f.dataset.key;
        const type = f.dataset.type || 'text';
        
        const item = {
            page_slug: pageSlug,
            section_key: key,
            content_type: type,
            value_uk: val,
            media_url: null,
            updated_at: new Date().toISOString()
        };

        if (type === 'image' || type === 'video' || key.endsWith('-img')) {
            item.media_url = val;
            item.content_type = key.endsWith('-video') ? 'video' : 'image';
        }
        updates.push(item);
    });

    if (sb) {
        try {
            if (pageSlug === 'about') {
                const currentKeys = updates.map(u => u.section_key);
                const { data: existingTeam } = await sb.from('site_content')
                    .select('section_key')
                    .eq('page_slug', 'about')
                    .like('section_key', 'team-%');
                
                if (existingTeam) {
                    const keysToDelete = existingTeam
                        .map(row => row.section_key)
                        .filter(key => !currentKeys.includes(key));
                    
                    if (keysToDelete.length > 0) {
                        await sb.from('site_content')
                            .delete()
                            .eq('page_slug', 'about')
                            .in('section_key', keysToDelete);
                    }
                }
            }

            const { error } = await sb.from('site_content').upsert(updates, {
                onConflict: 'page_slug,section_key'
            });
            
            if (error) throw error;
            
            showToast('✅ Зміни успішно збережено!', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            console.error('Save error:', err);
            showToast('❌ Помилка: ' + err.message, 'error');
        }
    }
}
