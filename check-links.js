const fs = require('fs'), path = require('path');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') walk(p);
    else if (e.name.endsWith('.md')) files.push(p);
  }
})('.');
let broken = 0, checked = 0;
// collect anchors per file (github-style slugs from headings + explicit {#id})
const anchors = {};
function slug(s) {
  return s.toLowerCase().replace(/[^\w\s\u00C0-\u024F-]/g, '').trim().replace(/\s/g, '-');
}
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const set = new Set();
  for (const line of src.split(/\r?\n/)) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      let text = h[1];
      const explicit = text.match(/\{#([^}]+)\}\s*$/);
      if (explicit) { set.add(explicit[1]); text = text.replace(/\{#[^}]+\}\s*$/, '').trim(); }
      set.add(slug(text));
    }
  }
  anchors[path.resolve(f)] = set;
}
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /\]\(([^)\s]+)\)/g; let m;
  while ((m = re.exec(src))) {
    let t = m[1];
    if (/^(https?:|mailto:)/.test(t)) continue;
    checked++;
    const [file, frag] = t.split('#');
    let target = path.resolve(path.dirname(f), decodeURIComponent(file || path.basename(f)));
    if (file && fs.existsSync(target) === false) { console.log('BROKEN FILE:', f, '->', m[1]); broken++; continue; }
    if (!file) target = path.resolve(f);
    if (frag && anchors[target] && anchors[target].has(frag) === false) {
      console.log('BROKEN ANCHOR:', f, '->', m[1]); broken++;
    }
  }
}
console.log(`checked ${checked} internal links across ${files.length} files; ${broken} broken`);
