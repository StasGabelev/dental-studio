from bs4 import BeautifulSoup
import glob
import os
import json

html_files = {
    'home': 'index.html',
    'about': 'about.html',
    'services': 'services.html',
    'cases': 'cases.html',
    'contact': 'contact.html',
    'footer': 'footer.html'
}

schema = {}
sql_inserts = []

for page_slug, file_name in html_files.items():
    if not os.path.exists(file_name):
        continue
    
    with open(file_name, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    
    fields = []
    seen_keys = set()
    
    # 1. Add ID-based media (videos/images)
    # We will pick up elements with id that match naming conventions
    # like *-video or *-img
    for tag in soup.find_all(['video', 'img']):
        id_val = tag.get('id')
        if id_val and ('video' in id_val or 'img' in id_val or 'photo' in id_val):
            if id_val not in seen_keys:
                field_type = 'video' if tag.name == 'video' else 'image'
                fields.append({'key': id_val, 'label': id_val.replace('-', ' ').title(), 'type': field_type})
                seen_keys.add(id_val)
                src = tag.get('src')
                if not src and tag.name == 'video':
                    source = tag.find('source')
                    if source: src = source.get('src')
                if src:
                    esrc = src.replace("'", "''")
                    sql_inserts.append(f"('{page_slug}', '{id_val}', '{field_type}', '{esrc}' )")


    # 2. Add Texts (data-i18n)
    for tag in soup.find_all(attrs={'data-i18n': True}):
        key = tag['data-i18n']
        text = tag.get_text(separator=' ', strip=True)
        if not text:
            # Maybe it's an input/textarea with placeholder or value
            text = tag.get('placeholder', '') or tag.get('value', '')
            
        if key not in seen_keys:
            # Guess field type
            field_type = 'textarea' if len(text) > 60 else 'text'
            fields.append({'key': key, 'label': key.replace('-', ' ').title(), 'type': field_type})
            seen_keys.add(key)
            etext = text.replace("'", "''")
            sql_inserts.append(f"('{page_slug}', '{key}', 'text', '{etext}' )")

    schema[page_slug] = fields

# Format PAGE_SCHEMA object
js_schema = "const PAGE_SCHEMA = " + json.dumps(schema, ensure_ascii=False, indent=4) + ";"

# Format SQL Inserts
sql_output = "INSERT INTO site_content (page_slug, section_key, content_type, value_uk) VALUES\n"
sql_output += ",\n".join(sql_inserts) + "\nON CONFLICT (page_slug, section_key) DO UPDATE SET value_uk = EXCLUDED.value_uk;"

with open('generated_schema.js', 'w', encoding='utf-8') as f:
    f.write(js_schema)

with open('generated_inserts.sql', 'w', encoding='utf-8') as f:
    f.write(sql_output)

print("Generation complete")
