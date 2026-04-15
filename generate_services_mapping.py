import re
import json

with open('services.html', 'r', encoding='utf-8') as f:
    html = f.read()

out_schema = []
blocks = html.split('class="accordion-item-box">')

new_html = blocks[0]

for i, block in enumerate(blocks[1:]):
    m_title = re.search(r'<span class="accordion-title" data-i18n="([^"]+)">([^<]+)</span>', block)
    if m_title:
        title_key = m_title.group(1)
        title_text = m_title.group(2)
        # Add heading to schema
        out_schema.append({ "type": "heading", "label": title_text.strip() })
        
        # Also let's extract the description text in case they want to edit it! Wait, the desc is already mapped in admin.
        # Check if description has data-i18n
        m_desc = re.search(r'<div class="accordion-content-text" data-i18n="([^"]+)">', block)
        if m_desc:
            desc_key = m_desc.group(1)
            out_schema.append({ "key": desc_key, "label": f"{title_text.strip()} — Опис", "type": "textarea" })
    
    # Process price items in this block
    # We will regex replace the price items in HTML to add data-i18n="..."
    
    def replace_price_item(match):
        full_match = match.group(0)
        
        # We need to find the data-i18n="" key for the name
        # It could be on the wrapper or on a span
        m_key = re.search(r'data-i18n="([^"]+)"', full_match)
        if not m_key:
            return full_match # No data-i18n found
            
        name_key = m_key.group(1)
        
        if name_key == 'btn-book-short':
            # That's the button, we need the OTHER data-i18n
            m_keys = re.findall(r'data-i18n="([^"]+)"', full_match)
            if len(m_keys) > 1 and m_keys[0] != 'btn-book-short':
                name_key = m_keys[0]
            else:
                return full_match
                
        price_key = name_key + '-val'
        
        # Inject data-i18n="{price_key}" into the .price-item-value span
        # Find exactly: <span class="price-item-value">SOMEPRICE</span>
        # Replace with: <span class="price-item-value" data-i18n="{price_key}">SOMEPRICE</span>
        if 'data-i18n=' not in full_match.split('class="price-item-value"')[-1].split('span>')[0]:
            updated_match = re.sub(r'class="price-item-value"([^>]*)>', r'class="price-item-value" data-i18n="' + price_key + r'"\1>', full_match)
        else:
            updated_match = full_match
            
        
        # Also clean up the label for the schema
        # Name
        # remove HTML tags from name for label
        clean_name_match = re.search(r'<div class="price-item-name"[^>]*>(.*?)</div>', full_match, re.DOTALL)
        clean_name = "Послуга"
        if clean_name_match:
            raw_text = re.sub(r'<[^>]+>', '', clean_name_match.group(1)).strip()
            clean_name = raw_text
            
        out_schema.append({
            "key": name_key,
            "label": f"Назва: {clean_name}",
            "type": "text"
        })
        out_schema.append({
            "key": price_key,
            "label": f"Ціна: {clean_name}",
            "type": "text"
        })
        
        return updated_match

    # Replace in block
    new_block = re.sub(r'<div class="accordion-price-item">.*?</div>\s*</div>\s*</div>', replace_price_item, block, flags=re.DOTALL)
    # The regex above is too greedy or not greedy enough. Let's find exactly the price items.
    
    # Actually, simpler: find `<div class="accordion-price-item">` to its closing `</div>`
    # We can split by `<div class="accordion-price-item">`
    price_splits = block.split('<div class="accordion-price-item">')
    new_block = price_splits[0]
    for p_split in price_splits[1:]:
        # Find where this price item ends
        end_idx = p_split.find('<div class="accordion-price-item">')
        if end_idx == -1: 
            # We are at the last or only price item. We just replace until the end?
            # It's better to just process the whole string.
            pass
            
        full_html = '<div class="accordion-price-item">' + p_split
        processed = replace_price_item(re.match(r'.*', full_html, re.DOTALL))
        new_block += processed[len('<div class="accordion-price-item">'):]
    
new_html = blocks[0]
for block in blocks[1:]:
    price_splits = block.split('<div class="accordion-price-item">')
    new_b = price_splits[0]
    for p_split in price_splits[1:]:
        # reconstructed single item loosely
        temp_item = '<div class="accordion-price-item">' + p_split
        
        m_key = re.findall(r'data-i18n="([^"]+)"', temp_item)
        name_key = None
        for k in m_key:
            if k != 'btn-book-short' and not k.endswith('-val'):
                name_key = k
                break
                
        if name_key:
            price_key = name_key + "-val"
            temp_item = temp_item.replace('class="price-item-value">', f'class="price-item-value" data-i18n="{price_key}">')
            
            clean_name_match = re.search(r'<div class="price-item-name"[^>]*>(.*?)</div>', temp_item, re.DOTALL)
            clean_name = "Послуга"
            if clean_name_match:
                clean_name = re.sub(r'<[^>]+>', '', clean_name_match.group(1)).strip()
                
            out_schema.append({
                "key": name_key,
                "label": f"Назва: {clean_name}",
                "type": "text"
            })
            out_schema.append({
                "key": price_key,
                "label": f"Ціна: {clean_name}",
                "type": "text"
            })
            
        new_b += temp_item[len('<div class="accordion-price-item">'):]
    
    new_html += 'class="accordion-item-box">' + new_b

# However, the schema logic above creates duplicates in out_schema because we have multiple tabs!
# We must correctly structure the schema logic including Top-Level Tabs.
# Right now, `admin_v3.js` groups by top-level like `Естетична стоматологія` and `Лікування зубів`.
# Let's just generate a clean JSON file and do manual JS injection.

with open('services_schema.json', 'w', encoding='utf-8') as f:
    json.dump(out_schema, f, ensure_ascii=False, indent=2)

with open('services_new.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
