const fs = require('fs');
const path = 'src/app/api/analyze/route.ts';
let content = fs.readFileSync(path, 'utf8');

// The emoji strings in buildFlow() calls are mangled from encoding.
// They contain raw " characters which break the string literals.
// Replace the entire corrupted icon string arguments with safe ASCII equivalents.

// Pattern: the icon argument to buildFlow() is the 4th argument (after the description string)
// They appear as corrupted strings like "ðY",,", or "ðY"", or "â¡"

// Strategy: find each buildFlow() call and fix the icon argument
// We'll use a regex approach to identify corrupted icon strings

// The buildFlow calls look like:
// buildFlow( "id", "title", `desc...`, ICON_STRING, [...])
// where ICON_STRING is the corrupted one

// Map from flow id to clean icon
const iconMap = {
  'request-flow': '\u{1F504}', // 🔄
  'auth-flow': '\u{1F510}',    // 🔐
  'crud-flow': '\u{1F5C4}\uFE0F', // 🗄️
  'boot-flow': '\u26A1',       // ⚡
};

// Fix each buildFlow call - find the pattern and replace the icon
// Pattern: "request-flow" near a corrupted icon string
for (const [id, icon] of Object.entries(iconMap)) {
  // Find the buildFlow call for this id
  const idStr = `"${id}"`;
  const idx = content.indexOf(idStr);
  if (idx === -1) { console.log('Not found:', id); continue; }
  
  // Find the closing backtick of the description (template literal) after the id
  const descStart = content.indexOf('`', idx);
  if (descStart === -1) { console.log('No desc start for', id); continue; }
  
  // Find the matching closing backtick (simple approach: find next ` that's followed by ,)
  let descEnd = descStart + 1;
  while (descEnd < content.length) {
    if (content[descEnd] === '`') break;
    if (content[descEnd] === '$' && content[descEnd+1] === '{') {
      // Skip template expression
      let depth = 1;
      descEnd += 2;
      while (descEnd < content.length && depth > 0) {
        if (content[descEnd] === '{') depth++;
        if (content[descEnd] === '}') depth--;
        descEnd++;
      }
      continue;
    }
    descEnd++;
  }
  // descEnd is now the position of the closing backtick
  
  // Find the next comma after descEnd
  const commaAfterDesc = content.indexOf(',', descEnd);
  if (commaAfterDesc === -1) { console.log('No comma after desc for', id); continue; }
  
  // Find the next open bracket [ for the node types array
  const arrayStart = content.indexOf('[', commaAfterDesc);
  if (arrayStart === -1) { console.log('No array start for', id); continue; }
  
  // The icon arg is between commaAfterDesc+1 and arrayStart-1 (minus any trailing comma/whitespace)
  const iconRegion = content.substring(commaAfterDesc + 1, arrayStart);
  console.log(`Flow ${id}: icon region = ${JSON.stringify(iconRegion)}`);
  
  // Replace the icon region with a cleaned version
  const cleanedIconRegion = `\n      "${icon}",\n      `;
  content = content.substring(0, commaAfterDesc + 1) + cleanedIconRegion + content.substring(arrayStart);
  
  console.log(`Fixed icon for ${id}: ${icon}`);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done. File size:', content.length);
