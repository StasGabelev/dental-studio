import os, re

for root, _, files in os.walk('.'):
    for f in files:
        if f.endswith('.html'):
            path = os.path.join(root, f)
            content = None
            encoding_used = 'utf-8'
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
            except UnicodeDecodeError:
                encoding_used = 'windows-1251'
                with open(path, 'r', encoding='windows-1251') as file:
                    content = file.read()
            
            # Replace old static timestamp queries
            new_content = re.sub(r'\?v=(1776\d+|v1\.3\d+\.\d+)', '?v=v1.31.13', content)
            
            if new_content != content:
                with open(path, 'w', encoding=encoding_used) as file:
                    file.write(new_content)
                print(f"Updated {path}")
