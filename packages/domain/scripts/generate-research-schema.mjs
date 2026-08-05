import { mkdirSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';

import { researchOutputJsonSchema } from '../dist/research/schema.js';

const outputUrl = new URL('../schemas/research-output.schema.json', import.meta.url);
mkdirSync(new URL('../schemas/', import.meta.url), { recursive: true });
writeFileSync(outputUrl, `${JSON.stringify(researchOutputJsonSchema, null, 2)}\n`, 'utf8');
