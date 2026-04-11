import os
import glob

# -- CSS CONVERTER --
css_file = 'styles.css'
with open(css_file, 'r', encoding='utf-8') as f:
    css_content = f.read()

# Define CSS Variables
root_vars = """
:root {
    --bg-main: #FFFFFF;
    --bg-alt: #F7F7F7;
    --text-main: #111111;
    --text-muted: #555555;
    --accent: #C49A5C;
    --accent-hover: #b88a4e;
    --border-light: rgba(0, 0, 0, 0.1);
    --border-heavy: rgba(0, 0, 0, 0.2);
}
"""

if ":root {" not in css_content:
    css_content = root_vars + css_content

# Safe replacements for Light Theme
replacements = {
    # Backgrounds
    "background-color: #000;": "background-color: var(--bg-main);",
    "background: #000;": "background: var(--bg-main);",
    "background-color: #0A0A0A;": "background-color: var(--bg-alt);",
    "background-color: #0c0c0c;": "background-color: var(--bg-alt);",
    "background: #0c0c0c;": "background: var(--bg-alt);",
    "background-color: #0f0f0f;": "background-color: var(--bg-alt);",
    "background: #111;": "background: var(--bg-alt);",
    
    # Texts
    "color: #fff;": "color: var(--text-main);",
    "color: #ffffff;": "color: var(--text-main);",
    "color: #FFF;": "color: var(--text-main);",
    "color: #888;": "color: var(--text-muted);",
    "color:#fff;": "color: var(--text-main);",
    "color: rgba(255,255,255,0.7);": "color: rgba(0,0,0,0.6);",
    "color: rgba(255, 255, 255, 0.7);": "color: rgba(0, 0, 0, 0.6);",
    
    # Old beige/nude stuff -> Gold
    "#EFDCD1": "var(--accent)",
    "#e5cbbe": "var(--accent-hover)",
    "color: #111;": "color: #fff;", # Specifically for button text inside the old nude buttons
    
    # Overlays/Borders (White to Black inversion)
    "rgba(255,255,255,": "rgba(0,0,0,",
    "rgba(255, 255, 255,": "rgba(0, 0, 0,",
    
    # Specific edge cases for hero overlay
    "rgba(0,0,0,0.5)": "rgba(255,255,255,0.6)", 
    "rgba(0, 0, 0, 0.5)": "rgba(255, 255, 255, 0.6)",
    "rgba(0,0,0,0.7)": "rgba(255,255,255,0.8)",
    
    # Linear gradient masks on images
    "rgba(0,0,0,1)": "#000", # keep mask alpha logic intact, but we standardise the string first so it doesn't get messed up
}

# Apply replacements
for old_val, new_val in replacements.items():
    css_content = css_content.replace(old_val, new_val)

# Fix video masks explicitly so they fade to white instead of black!
# Old mask: mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 20%);
# Wait, mask-image ALWAYS uses transparent to black (alpha channel) for opacity. Black means "visible" in masks. 
# So rgba(0,0,0,1) is correct for the mask! We don't need to change it to white.

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css_content)
print(f"Updated {css_file}")

# -- HTML/JS CONVERTER --
# Remove 'bg-black' classes
files_to_check = glob.glob("*.html") + ["components.js"]

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace background classes
    if 'class="bg-black"' in content or "class='bg-black'" in content:
        content = content.replace('class="bg-black"', 'class="bg-white"')
        content = content.replace("class='bg-black'", "class='bg-white'")
    
    # If there are any black styling attributes
    content = content.replace('background-color: #000', 'background-color: #fff')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

print("Light theme conversion script executed successfully.")
