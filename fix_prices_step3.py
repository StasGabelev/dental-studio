import re

with open('admin/admin_v3.js', 'r', encoding='utf-8') as f:
    code = f.read()

default_prices = {
    'price-consult-general-val': '2000 hrn',
    'price-consult-modjaw-val': '400 EUR',
    'price-consult-checkup-val': '4900 hrn',
    'price-frontal-restoration-val': '230 EUR',
    'price-art-restoration-val': '350 EUR',
    'price-veneer-digital-val': '600 EUR',
    'price-veneer-layering-val': '750 EUR',
    'price-veneer-handmade-val': '850 EUR',
    'price-veneer-rework-val': '1200 EUR',
    'price-veneer-single-val': '1500 EUR',
    'price-crown-digital-val': '680 EUR',
    'price-crown-layering-val': '850 EUR',
    'price-crown-handmade-val': '950 EUR',
    'price-endo-incisor-val': '285 EUR',
    'price-endo-premolar-val': '320 EUR',
    'price-endo-molar-val': '440 EUR',
    'price-caries-2-val': '150 EUR',
    'price-caries-3-val': '170 EUR',
    'price-periodont-1-val': '140 EUR',
    'price-periodont-2-val': '280 EUR',
    'price-periodont-3-val': '400 EUR',
    'price-hygiene-val': '100 EUR',
    'price-hygiene-smoker-val': '140 EUR',
    'price-whitening-val': '150 EUR',
    'price-implant-neodent-val': '550 EUR',
    'price-implant-sla-val': '780 EUR',
    'price-implant-slactive-val': '980 EUR',
    'price-crown-monolit-val': '650 EUR',
    'price-crown-aesthetic-val': '850 EUR',
    'price-extraction-val': '100 EUR',
    'price-extraction-atypical-1-val': '150 EUR',
    'price-extraction-atypical-2-val': '220 EUR',
    'price-sedation-val': '140 EUR',
    'price-gum-smile-val': '1950 EUR',
    'price-recession-val': '290 EUR',
    'price-gum-extension-val': '160 EUR',
    'price-braces-metal-val': '2600 EUR',
    'price-braces-ceramic-val': '3100 EUR',
    'price-braces-self-metal-val': '3900 EUR',
    'price-braces-self-ceramic-val': '4640 EUR',
    'price-ortho-visit-val': '65 EUR',
    'price-aligners-val': '3900 EUR',
}

# Find the services defaults block - it ends with form-btn
anchor = '"form-btn": "ZAPISATYSYA NA KONSULTATSIYU"'

# Let's be smarter: find the services PAGE_DEFAULTS block specifically
# It's under "services": { ... }
services_defaults_start = code.find('"services": {', code.find('const PAGE_DEFAULTS'))
services_defaults_end = code.find('},', services_defaults_start) + 2

services_defaults_block = code[services_defaults_start:services_defaults_end]
print("Found services defaults block:", services_defaults_block[:200])

# Check if -val keys are already injected
already_done = 'price-consult-general-val' in services_defaults_block
print("Already done:", already_done)

if not already_done:
    # Build new entries before the closing brace
    new_entries = '\n'.join([
        f'            "{k}": "{v}",' for k, v in default_prices.items()
    ])
    
    # Insert before the `},` closing of services defaults
    new_services_defaults_block = services_defaults_block[:-2] + ',\n' + new_entries + '\n        },'
    code = code[:services_defaults_start] + new_services_defaults_block + code[services_defaults_end:]
    
    with open('admin/admin_v3.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Step 3 done: PAGE_DEFAULTS.services updated with price defaults")
else:
    print("Step 3 already done, skipping")
