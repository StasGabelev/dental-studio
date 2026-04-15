const fs = require('fs');

let html = fs.readFileSync('services.html', 'utf8');

// The structure of each accordion-price-item is:
// <div class="accordion-price-item">
//     <div class="price-item-name" [data-i18n="key"]> ... </div>
//     <div class="price-item-right">
//         <span class="price-item-value">PRICE</span>
//         <a ...>...</a>
//     </div>
// </div>
//
// Strategy: find each <div class="accordion-price-item"> block
// extract the closing index by counting divs
// then find the data-i18n key in that block (if any)
// and inject it as -val on the price-item-value span

function getBlockEnd(html, startIdx) {
    // startIdx points to '<' of '<div class="accordion-price-item">'
    let depth = 0;
    let i = startIdx;
    while (i < html.length) {
        if (html.startsWith('<div', i)) {
            depth++;
            i += 4;
        } else if (html.startsWith('</div>', i)) {
            depth--;
            if (depth === 0) {
                return i + 6; // end of closing tag
            }
            i += 6;
        } else {
            i++;
        }
    }
    return -1;
}

const BLOCK_START = '<div class="accordion-price-item">';
let results = [];
let searchFrom = 0;

while (true) {
    const startIdx = html.indexOf(BLOCK_START, searchFrom);
    if (startIdx === -1) break;
    
    const endIdx = getBlockEnd(html, startIdx);
    if (endIdx === -1) break;
    
    const block = html.slice(startIdx, endIdx);
    
    // Find all data-i18n keys in this block that are NOT btn-book-short and NOT -val
    const keyRe = /data-i18n="([^"]+)"/g;
    let keyMatch;
    let nameKey = null;
    while ((keyMatch = keyRe.exec(block)) !== null) {
        if (keyMatch[1] !== 'btn-book-short' && !keyMatch[1].endsWith('-val')) {
            nameKey = keyMatch[1];
            break;
        }
    }
    
    if (nameKey) {
        const valKey = nameKey + '-val';
        
        // Only inject if not already tagged
        if (!block.includes('class="price-item-value" data-i18n=')) {
            const updatedBlock = block.replace(
                'class="price-item-value">',
                `class="price-item-value" data-i18n="${valKey}">`
            );
            results.push({ start: startIdx, end: endIdx, updated: updatedBlock, nameKey, valKey });
        }
    }
    
    searchFrom = endIdx;
}

// Apply in reverse order to preserve offsets
results.reverse().forEach(r => {
    html = html.slice(0, r.start) + r.updated + html.slice(r.end);
});

fs.writeFileSync('services.html', html, 'utf8');

const totalItems = (html.match(/<div class="accordion-price-item">/g) || []).length;
const taggedItems = (html.match(/class="price-item-value" data-i18n=/g) || []).length;
const layoutIntact = html.includes('accordion-content-grid') && html.includes('accordion-price-list');

console.log('Total price items:', totalItems);
console.log('Tagged with data-i18n:', taggedItems);
console.log('Layout intact:', layoutIntact);
console.log('Newly tagged this run:', results.length);
