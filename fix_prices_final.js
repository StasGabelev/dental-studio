const fs = require('fs');

// ==============================
// STEP 1: Fix EUR -> € and hrn -> ₴ in admin_v3.js defaults
// ==============================
let code = fs.readFileSync('admin/admin_v3.js', 'utf8');

// Replace all the broken currency symbols in the -val defaults
code = code.replace(/ EUR"/g, ' €"');
code = code.replace(/ hrn"/g, ' ₴"');

fs.writeFileSync('admin/admin_v3.js', code, 'utf8');
console.log('Step 1 done: Fixed currency symbols in admin_v3.js');

// Verify a few
const checkGeneral = code.includes('"price-consult-general-val": "2000 ₴"');
const checkModjaw = code.includes('"price-consult-modjaw-val": "400 €"');
console.log('  price-consult-general-val is "2000 ₴":', checkGeneral);
console.log('  price-consult-modjaw-val is "400 €":', checkModjaw);

// ==============================
// STEP 2: Add data-i18n to price spans in services.html
// Approach: carefully match each accordion-price-item block
// and inject data-i18n ONLY on the price-item-value span
// ==============================
let html = fs.readFileSync('services.html', 'utf8');

// Extract the name->key mapping from all accordion items
// Strategy: for each price-item block, find data-i18n on the name, then inject -val on the price span
// We use a careful regex that:
//   1. Finds a data-i18n="key" somewhere in the price block (on the name div)
//   2. Followed eventually by <span class="price-item-value">
// and ONLY replaces the price span if there's no data-i18n already on it

// Process block by block - find each accordion-price-item start
const priceItemRegex = /<div class="accordion-price-item">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;

let match;
let newHtml = html;
let offset = 0;

// Reset
const results = [];
const re = /<div class="accordion-price-item">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;

while ((match = re.exec(html)) !== null) {
    const fullBlock = match[0];
    const blockStart = match.index;
    const blockEnd = match.index + fullBlock.length;
    
    // Find data-i18n key on the name element (NOT btn-book-short, NOT -val)
    const keyMatches = [...fullBlock.matchAll(/data-i18n="([^"]+)"/g)];
    const nameKey = keyMatches.find(m => m[1] !== 'btn-book-short' && !m[1].endsWith('-val'));
    
    if (!nameKey) continue;
    
    const key = nameKey[1];
    const valKey = key + '-val';
    
    // Check if price-item-value already has data-i18n
    if (fullBlock.includes('class="price-item-value" data-i18n=')) continue;
    
    // Replace ONLY this block's price-item-value span
    const updatedBlock = fullBlock.replace(
        'class="price-item-value">',
        `class="price-item-value" data-i18n="${valKey}">`
    );
    
    results.push({ start: blockStart, end: blockEnd, original: fullBlock, updated: updatedBlock, key, valKey });
}

// Apply replacements in reverse order to preserve offsets
results.reverse().forEach(r => {
    newHtml = newHtml.slice(0, r.start) + r.updated + newHtml.slice(r.end);
});

fs.writeFileSync('services.html', newHtml, 'utf8');

const count = (newHtml.match(/class="price-item-value" data-i18n=/g) || []).length;
console.log(`Step 2 done: Added data-i18n to ${count} price spans in services.html`);

// Show a sample to verify
const sampleIdx = newHtml.indexOf('class="price-item-value" data-i18n=');
if (sampleIdx >= 0) {
    console.log('  Sample:', newHtml.substring(sampleIdx, sampleIdx + 80));
}
