import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const messagesDirectory = path.join(root, '..', 'apps', 'web', 'messages');
const catalogs = ['de', 'en'].map((locale) => ({
  locale,
  messages: JSON.parse(
    fs.readFileSync(path.join(messagesDirectory, `${locale}.json`), 'utf8'),
  ),
}));

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'object' && child !== null
      ? flatten(child, nextKey)
      : [nextKey];
  });
}

const expectedKeys = new Set(flatten(catalogs[0].messages));
let hasErrors = false;

for (const catalog of catalogs.slice(1)) {
  const actualKeys = new Set(flatten(catalog.messages));
  const missing = [...expectedKeys].filter((key) => !actualKeys.has(key));
  const extra = [...actualKeys].filter((key) => !expectedKeys.has(key));

  if (missing.length || extra.length) {
    hasErrors = true;
    if (missing.length) console.error(`${catalog.locale}: missing ${missing.join(', ')}`);
    if (extra.length) console.error(`${catalog.locale}: extra ${extra.join(', ')}`);
  }
}

if (hasErrors) process.exitCode = 1;
else console.log(`i18n catalogs complete: ${expectedKeys.size} keys`);
