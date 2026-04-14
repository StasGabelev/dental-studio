const fs = require('fs');

// 1. Rename in styles.css
let styles = fs.readFileSync('styles.css', 'utf8');
styles = styles.replace(/\.team-member__info \.specialist-tag/g, '.team-member__info .specialist-label-gold');
fs.writeFileSync('styles.css', styles, 'utf8');

// 2. Update dynamic-content.js to use the new class
let dynamic = fs.readFileSync('dynamic-content.js', 'utf8');
dynamic = dynamic.replace(/class="specialist-tag"/g, 'class="specialist-label-gold"');
dynamic = dynamic.replace(/<small>\${doc\.specialization_uk \|\| 'Лікар'}<\/small>/g, `<small class="specialist-label-gold">\${doc.specialization_uk || 'Лікар'}</small>`);
fs.writeFileSync('dynamic-content.js', dynamic, 'utf8');

console.log('Renamed specialist-tag to specialist-label-gold for forced cache bust.');
