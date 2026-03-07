const fs = require('fs');
const p = 'src/components/flow/ExecutionFlow.tsx';
let c = fs.readFileSync(p, 'utf8');
const old = 'DataChip label={step.edgeType} type={step.edgeType}';
const newStr = 'DataChip label={step.edgeType ?? "CALL"} type={step.edgeType ?? "FUNCTION_CALL"}';
const count = c.split(old).length - 1;
c = c.split(old).join(newStr);
fs.writeFileSync(p, c, 'utf8');
console.log('Replaced', count, 'occurrences');
