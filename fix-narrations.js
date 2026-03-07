const fs = require('fs');
const path = 'src/app/api/analyze/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace buildNarrations function - find it by its signature and replace up to the closing brace
// Also remove analogyToHindi, typeToTamil, typeToTelugu helper functions

const buildNarrationsReplacement = `function buildNarrations(
  step: number,
  total: number,
  nodeLabel: string,
  _nodeType: NodeType,
  description: string,
  _analogy: string
): Record<string, string> {
  const base = \`Step \${step} of \${total} -- \${nodeLabel}. \${description}\`;
  return { en: base, hi: base, ta: base, te: base };
}`;

// Find and replace the buildNarrations function + the three helper functions after it
// These run from "function buildNarrations" to the end of "function typeToTelugu { ... }"
const startMarker = 'function buildNarrations(';
const endMarker = 'function buildDataShapes(';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers. startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

content = before + buildNarrationsReplacement + '\n\n' + after;
fs.writeFileSync(path, content, 'utf8');
console.log('Done. Replaced buildNarrations + removed helper functions.');
console.log('New file size:', content.length, 'bytes');
