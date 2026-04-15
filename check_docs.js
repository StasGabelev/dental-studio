const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://ckldvntrsiacbjpiydmn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbGR2bnRyc2lhY2JqcGl5ZG1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzMzMTUsImV4cCI6MjA5MTY0OTMxNX0.6zxRqTheJDt2BTb1hbAxQHCLZI8wT5xPus2Ad97AuMg');

(async () => {
    try {
        const { data, error } = await sb.from('doctors').select('id, name_uk, photo_url, photo').order('sort_order');
        if (error) throw error;
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
