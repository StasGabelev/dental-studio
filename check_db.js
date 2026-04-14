const { createClient } = require('@supabase/supabase-js');
const url = process.env.SB_URL || 'https://ntghqnywzvqykqytvuvw.supabase.co'; // I'll get it from the env or previous runs
const key = process.env.SB_KEY || '%SB_KEY%'; // I'll use the one I know

const sb = createClient(url, key);

async function check() {
    const { data, error } = await sb.from('site_content').select('*').eq('page_slug', 'home');
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

check();
