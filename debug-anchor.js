const fs = require('fs');
const src = fs.readFileSync('docs/product/success-metrics.md', 'utf8');
const lines = src.split('\n');
console.log('total lines:', lines.length);
const hits = lines.filter(l => l.match(/^#{1,6}\s+(.*)$/));
console.log('heading matches:', hits.length);
const hits2 = lines.filter(l => l.match(/^#{1,6}\s+(.*)/));
console.log('heading matches without $:', hits2.length);
console.log('first line JSON:', JSON.stringify(lines[0]));
