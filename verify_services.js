const html = require('fs').readFileSync('services.html','utf8');
const total = (html.match(/class="accordion-price-item"/g)||[]).length;
const tagged = (html.match(/class="price-item-value" data-i18n=/g)||[]).length;
console.log('Total price items:', total, '| Tagged:', tagged);

// Also check layout is intact - look for a known string pair
const intact = html.includes('accordion-content-grid') && html.includes('accordion-price-list');
console.log('Layout intact (key CSS classes present):', intact);
