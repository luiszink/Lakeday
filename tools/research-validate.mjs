import { existsSync, globSync, readFileSync, statSync } from 'node:fs';

import { validateResearchRecord } from '../packages/domain/dist/research/validation.js';

const rawArguments = process.argv.slice(2);
const jsonOutput = rawArguments.includes('--json');
const inputs = rawArguments.filter((argument) => argument !== '--json');

function usage() {
  return 'Usage: pnpm research:validate [--json] <file|directory|glob> [...more inputs]';
}

function expandInput(input) {
  if (existsSync(input)) {
    if (statSync(input).isDirectory()) {
      return globSync(`${input.replace(/[\\/]$/u, '')}/**/*.json`, { nodir: true });
    }
    return input.endsWith('.json') ? [input] : [];
  }
  return globSync(input, { nodir: true });
}

function issueForJsonParse(file, error) {
  return {
    valid: false,
    file,
    issues: [
      {
        path: '$',
        code: 'json.parse',
        message: error instanceof Error ? error.message : 'Invalid JSON.',
      },
    ],
  };
}

function validateFile(file) {
  try {
    const input = JSON.parse(readFileSync(file, 'utf8'));
    const result = validateResearchRecord(input, file);
    return { valid: result.valid, file, issues: result.issues };
  } catch (error) {
    return issueForJsonParse(file, error);
  }
}

const files = [...new Set(inputs.flatMap(expandInput))].sort();
if (files.length === 0) {
  const result = {
    valid: false,
    files: [],
    issues: [{ path: '$', code: 'cli.no_files', message: usage() }],
  };
  if (jsonOutput) console.log(JSON.stringify(result, null, 2));
  else console.error(result.issues[0].message);
  process.exitCode = 2;
} else {
  const results = files.map(validateFile);
  const invalidCount = results.filter((result) => !result.valid).length;
  const output = {
    valid: invalidCount === 0,
    files: results,
    summary: { files: results.length, valid: results.length - invalidCount, invalid: invalidCount },
  };

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const result of results) {
      const marker = result.valid ? 'PASS' : 'FAIL';
      console.log(`${marker} ${result.file}`);
      for (const issue of result.issues) {
        console.log(`  ${issue.path} [${issue.code}] ${issue.message}`);
      }
    }
    console.log(
      `Validated ${results.length} file(s): ${output.summary.valid} valid, ${output.summary.invalid} invalid.`,
    );
  }
  process.exitCode = invalidCount === 0 ? 0 : 1;
}
