#!/usr/bin/env node
import { spawn } from 'node:child_process';
import {
  getOffFlags,
  loadParsedConfig,
  tscArgsForFlag,
} from './tsconfig-flags-lib.mjs';

const ERROR_RE = /error TS\d+:/g;

/**
 * @param {string} configPath
 * @param {string} flagName
 */
const countErrorsForFlag = (configPath, flagName) =>
  new Promise(resolve => {
    const args = tscArgsForFlag(configPath, flagName);
    const child = spawn('yarn', args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stderrText = '';
    let stdoutText = '';

    child.stdout.on('data', chunk => {
      stdoutText += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderrText += chunk.toString();
    });

    child.on('close', code => {
      const combined = `${stdoutText}\n${stderrText}`;
      const matches = combined.match(ERROR_RE);
      const errorCount = matches ? matches.length : 0;
      resolve({ flagName, code: code ?? 1, errorCount });
    });
  });

const configPath = process.argv[2] || 'tsconfig.check.json';
const { parsed } = loadParsedConfig(configPath);
const offFlags = getOffFlags(parsed.options);

if (offFlags.length === 0) {
  console.log(`No strictness flags are OFF in ${configPath}.`);
  process.exit(0);
}

console.log(`Typecheck strictness report for ${configPath}`);
console.log(
  `Found ${offFlags.length} OFF flags. Running one tsc pass per flag...`,
);

const results = [];
for (const [index, { name, category }] of offFlags.entries()) {
  const label = `[${index + 1}/${offFlags.length}] ${name} (${category})`;
  console.log(label);
  // eslint-disable-next-line no-await-in-loop
  const result = await countErrorsForFlag(configPath, name);
  results.push({ ...result, category });
}

results.sort(
  (a, b) => a.errorCount - b.errorCount || a.flagName.localeCompare(b.flagName),
);

console.log('\nRanked by error count (lower is likely easier):');
for (const [index, result] of results.entries()) {
  const status = result.code === 0 ? 'clean' : `exit ${result.code}`;
  console.log(
    `${String(index + 1).padStart(2, ' ')}. ${result.flagName.padEnd(34)} ${String(result.errorCount).padStart(6, ' ')} errors  (${status})`,
  );
}
