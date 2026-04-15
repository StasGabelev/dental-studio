import re

with open('services.html', 'r', encoding='utf-8') as f:
    html = f.read()

out = []
blocks = html.split('class="accordion-item-box">')
for i, block in enumerate(blocks[1:]):
    m_title = re.search(r'<span class="accordion-title" data-i18n="([^"]+)">([^<]+)</span>', block)
    if not m_title: continue
    
    title_key = m_title.group(1)
    title_text = m_title.group(2)
    out.append(f"{title_key} : {title_text}")
    
    price_items = re.findall(r'<div class="price-item-name"(?: data-i18n="([^"]+)")?>\s*(?:<span[^>]*data-i18n="([^"]+)"[^>]*>)?([^<]+)(?:</span>)?(.*?)\s*</div>\s*<div class="price-item-right">\s*<span class="price-item-value">([^<]+)</span>', block, re.DOTALL)
    for p in price_items:
        out.append(f"  - {p}")

with open('prices_dump.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
