const fs = require('fs');
const path = 'src/app/api/analyze/route.ts';
let content = fs.readFileSync(path, 'utf8');
// The garbled sequence is: U+00E2 (â) followed by ASCII "EUR" followed by ASCII quote (0x22)
const garbled = '\u00e2EUR"';
const count = (content.match(new RegExp(garbled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
content = content.split(garbled).join('--');
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced', count, 'occurrences');
