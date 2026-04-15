import json
import re

with open('admin/admin_v3.js', 'r', encoding='utf-8') as f:
    code = f.read()

start = code.find('        "services": [')
end = code.find('        "contact": [')

services_str = code[start:end]
services_str = services_str.strip()[:-1]  # remove trailing comma inside the block

try:
    with open('services_schema.js', 'w', encoding='utf-8') as f:
        f.write(services_str)
except Exception as e:
    print(e)
