import os
import re
import time

version = str(int(time.time())) # Using timestamp for absolute cache busting

def apply_cache_busting(directory):
    for root, dirs, files in os.walk(directory):
        if '.git' in dirs: dirs.remove('.git')
        if '.github' in dirs: dirs.remove('.github')
        
        for file in files:
            if file.endswith('.html'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace .js and .css references
                # Find src="file.js" or href="style.css"
                # Avoid external links (http/https)
                
                # Scripts
                content = re.sub(r'src="(?!http|https|//)([^"]+\.js)(\?v=[^"]*)?"', rf'src="\1?v={version}"', content)
                # Styles
                content = re.sub(r'href="(?!http|https|//)([^"]+\.css)(\?v=[^"]*)?"', rf'href="\1?v={version}"', content)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {filepath}")

apply_cache_busting('.')
