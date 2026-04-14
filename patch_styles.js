const fs = require('fs');
let css = fs.readFileSync('styles.css', 'utf8');

const oldP = `.team-member__info p {
    font-size: 14px;
    letter-spacing: 1.2px;
    color: rgba(255,255,255,0.75);
    max-width: 450px;
    line-height: 1.8;
}`;

const newP = `.team-member__info p {
    font-size: 14px;
    letter-spacing: 1.2px;
    color: rgba(255,255,255,0.75);
    max-width: 450px;
    line-height: 1.8;
}

.team-member__info .specialist-tag {
    color: #ff3b3b;
    font-weight: 500;
    font-size: 13px;
    margin: 5px 0 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
}

.team-member__info h3 {
    font-size: 24px;
    letter-spacing: 2px;
    margin-bottom: 5px;
    color: #fff;
}`;

// Normalize line endings for replacement
const normalize = (s) => s.replace(/\r?\n/g, '\n');

if (normalize(css).includes(normalize(oldP))) {
    css = normalize(css).replace(normalize(oldP), normalize(newP));
    fs.writeFileSync('styles.css', css, 'utf8');
    console.log('Successfully patched styles.css');
} else {
    console.log('Could not find .team-member__info p block');
}
