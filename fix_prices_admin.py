import re

# =============================================
# STEP 1: Fix admin_v3.js - add -val fields
# =============================================
# Currently the schema only has price-consult-general etc. which stores the NAME.
# We need to also add price-consult-general-val etc. which stores the actual price value.
# We'll insert a -val field after every existing price-xxx field in the services schema.

with open('admin/admin_v3.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Find the services schema block
start = code.find('"services": [')
end = code.find('"contact": [')

old_services_block = code[start:end]

# Mapping of key -> label (short clean label for the price)
price_val_labels = {
    'price-consult-general': 'Загальна консультація',
    'price-consult-modjaw': 'Діагностика MODJAW',
    'price-consult-checkup': 'CHECK-UP',
    'price-frontal-restoration': 'Реставрація фронт. зуба',
    'price-art-restoration': 'Художня реставрація',
    'price-veneer-digital': 'Вінір (digital)',
    'price-veneer-layering': 'Вінір (digital + нашарування)',
    'price-veneer-handmade': 'Вінір (hand made)',
    'price-veneer-rework': 'Переробка вініра',
    'price-veneer-single': 'Вінір одиночний',
    'price-crown-digital': 'Коронка (digital)',
    'price-crown-layering': 'Коронка (digital + нашарування)',
    'price-crown-handmade': 'Коронка (hand made)',
    'price-endo-incisor': 'Канали (різці, ікла)',
    'price-endo-premolar': 'Канали (премоляри)',
    'price-endo-molar': 'Канали (моляри)',
    'price-caries-2': 'Карієс II рівень',
    'price-caries-3': 'Карієс III рівень',
    'price-periodont-1': 'Пародонтит I ступінь',
    'price-periodont-2': 'Пародонтит II ступінь',
    'price-periodont-3': 'Пародонтит III ступінь',
    'price-hygiene': 'Гігієна',
    'price-hygiene-smoker': 'Гігієна (нальот курця)',
    'price-whitening': 'Відбілювання',
    'price-implant-neodent': 'Імплант NEODENT',
    'price-implant-sla': 'Імплант STRAUMANN SLA',
    'price-implant-slactive': 'Імплант STRAUMANN SLACTIVE',
    'price-crown-monolit': 'Коронка (monolit)',
    'price-crown-aesthetic': 'Коронка (ceramic + абатмент)',
    'price-extraction': 'Видалення зуба',
    'price-extraction-atypical-1': 'Атипове видалення (просте)',
    'price-extraction-atypical-2': 'Атипове видалення (складне)',
    'price-sedation': 'Седація (1 година)',
    'price-gum-smile': 'Усунення ясенної посмішки',
    'price-recession': 'Закриття рецесій',
    'price-gum-extension': 'Видовження ясен',
    'price-braces-metal': 'Брекети (метал)',
    'price-braces-ceramic': 'Брекети (кераміка)',
    'price-braces-self-metal': 'Самолігуючі (метал)',
    'price-braces-self-ceramic': 'Самолігуючі (кераміка)',
    'price-ortho-visit': 'Контрольний візит ортодонта',
    'price-aligners': 'Лікування елайнерами',
}

# Build the new services block by inserting a -val entry after each price-xxx entry
new_services_block = old_services_block

for key, label in price_val_labels.items():
    val_key = key + '-val'
    val_entry = f'        {{ "key": "{val_key}", "label": "💰 Ціна: {label}", "type": "text" }},\n'
    
    # Skip if already exists
    if val_key in new_services_block:
        continue
    
    # Find all occurrences of the key line and insert after the first one
    pattern = rf'(\{{ "key": "{re.escape(key)}", "label": "[^"]+", "type": "[^"]+" \}},\n)'
    match = re.search(pattern, new_services_block)
    if match:
        insert_pos = match.end()
        new_services_block = new_services_block[:insert_pos] + val_entry + new_services_block[insert_pos:]

code = code[:start] + new_services_block + code[end:]

with open('admin/admin_v3.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Step 1 done: admin_v3.js services schema updated with -val fields")

# =============================================
# STEP 2: services.html - add data-i18n to price spans
# =============================================

with open('services.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Map: the data-i18n key on the price-item-name -> the -val key for the price span
# We'll process each accordion-price-item block
def add_val_to_price_spans(html):
    parts = html.split('<div class="accordion-price-item">')
    result = parts[0]
    
    for part in parts[1:]:
        full_block = '<div class="accordion-price-item">' + part
        
        # Find the data-i18n key on the name element
        m_keys = re.findall(r'data-i18n="([^"]+)"', full_block)
        name_key = None
        for k in m_keys:
            if k != 'btn-book-short' and not k.endswith('-val'):
                name_key = k
                break
        
        if name_key:
            val_key = name_key + '-val'
            # Add data-i18n to price-item-value span ONLY if it doesn't already have one
            def add_i18n(m):
                existing = m.group(0)
                if 'data-i18n=' in existing:
                    return existing
                return existing.replace(
                    'class="price-item-value"',
                    f'class="price-item-value" data-i18n="{val_key}"'
                )
            full_block = re.sub(r'<span class="price-item-value"[^>]*>', add_i18n, full_block)
        
        result += full_block[len('<div class="accordion-price-item">'):]
    
    return result

html = add_val_to_price_spans(html)

with open('services.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Step 2 done: services.html price spans have data-i18n attributes")

# Verify
count = html.count('class="price-item-value" data-i18n=')
print(f"  -> Found {count} price spans with data-i18n")

# =============================================
# STEP 3: Add defaults for -val keys in admin PAGE_DEFAULTS
# =============================================

with open('admin/admin_v3.js', 'r', encoding='utf-8') as f:
    code = f.read()

default_prices = {
    'price-consult-general-val': '2000 ₴',
    'price-consult-modjaw-val': '400 €',
    'price-consult-checkup-val': '4900 ₴',
    'price-frontal-restoration-val': '230 €',
    'price-art-restoration-val': '350 €',
    'price-veneer-digital-val': '600 €',
    'price-veneer-layering-val': '750 €',
    'price-veneer-handmade-val': '850 €',
    'price-veneer-rework-val': '1200 €',
    'price-veneer-single-val': '1500 €',
    'price-crown-digital-val': '680 €',
    'price-crown-layering-val': '850 €',
    'price-crown-handmade-val': '950 €',
    'price-endo-incisor-val': '285 €',
    'price-endo-premolar-val': '320 €',
    'price-endo-molar-val': '440 €',
    'price-caries-2-val': '150 €',
    'price-caries-3-val': '170 €',
    'price-periodont-1-val': '140 €',
    'price-periodont-2-val': '280 €',
    'price-periodont-3-val': '400 €',
    'price-hygiene-val': '100 €',
    'price-hygiene-smoker-val': '140 €',
    'price-whitening-val': '150 €',
    'price-implant-neodent-val': '550 €',
    'price-implant-sla-val': '780 €',
    'price-implant-slactive-val': '980 €',
    'price-crown-monolit-val': '650 €',
    'price-crown-aesthetic-val': '850 €',
    'price-extraction-val': '100 €',
    'price-extraction-atypical-1-val': '150 €',
    'price-extraction-atypical-2-val': '220 €',
    'price-sedation-val': '140 €',
    'price-gum-smile-val': '1950 €',
    'price-recession-val': '290 €',
    'price-gum-extension-val': '160 €',
    'price-braces-metal-val': '2600 €',
    'price-braces-ceramic-val': '3100 €',
    'price-braces-self-metal-val': '3900 €',
    'price-braces-self-ceramic-val': '4640 €',
    'price-ortho-visit-val': '65 €',
    'price-aligners-val': '3900 €',
}

# Find the "services" key in PAGE_DEFAULTS and add the default price values
# The services default block ends with "form-btn": ...
services_defaults_anchor = '"form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"\n        },'

if services_defaults_anchor in code:
    default_entries = '\n'.join([
        f'            "{k}": "{v}",' for k, v in default_prices.items()
    ])
    
    # Insert before the closing of services defaults
    new_anchor = default_entries + '\n            ' + '"form-btn": "ЗАПИСАТИСЯ НА КОНСУЛЬТАЦІЮ"\n        },'
    code = code.replace(services_defaults_anchor, new_anchor, 1)
    
    with open('admin/admin_v3.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Step 3 done: PAGE_DEFAULTS.services updated with price defaults")
else:
    print("Step 3 WARNING: Could not find services defaults anchor to insert defaults")

print("\n✅ All done! Commit and push services.html + admin/admin_v3.js")
