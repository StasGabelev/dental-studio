const fs = require('fs');
let src = fs.readFileSync('dynamic-content.js', 'utf8');

// Fix the null check for content.length which causes crashes if DB is empty
src = src.replace(/console\.log\(`Loading \${content\.length} items for \${page} page`\);/g, 'console.log(`Checking content for ${page} page... Items:`, content ? content.length : 0);');

// Ensure that we only enter the loop if content exists
src = src.replace(/if \(content && content\.length > 0\) \{/g, 'if (Array.isArray(content) && content.length > 0) {');

fs.writeFileSync('dynamic-content.js', src, 'utf8');
console.log('Fixed potential crash in dynamic-content.js when DB is empty.');
