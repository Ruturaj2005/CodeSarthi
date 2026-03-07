const fs = require('fs');
const path = 'src/components/flow/ExecutionFlow.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix garbled navigation text: Â< Prev -> << Prev and Next Â> -> Next >>
// The Â (U+00C2) character is a garbled artifact

// Option 1: try U+00C2 + <
const beforeCount1 = (content.match(/\u00c2</g) || []).length;
content = content.replace(/\u00c2</g, '&#8249;'); // single left angle quotation mark

const beforeCount2 = (content.match(/\u00c2>/g) || []).length;
content = content.replace(/\u00c2>/g, '&#8250;'); // single right angle quotation mark

console.log('Fixed Â< occurrences:', beforeCount1);
console.log('Fixed Â> occurrences:', beforeCount2);

// Also check for any other Â artifacts
const remainingA = (content.match(/\u00c2/g) || []).length;
if (remainingA > 0) {
  console.log('Warning: still', remainingA, 'Â characters remaining');
  // Just strip them
  content = content.replace(/\u00c2/g, '');
  console.log('Stripped remaining Â characters');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done. File size:', content.length, 'bytes');
