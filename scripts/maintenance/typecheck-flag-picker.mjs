#!/usr/bin/env node
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawn } from 'node:child_process';
import {
  getOffFlags,
  loadParsedConfig,
  tscArgsForFlag,
} from './tsconfig-flags-lib.mjs';

const args = process.argv.slice(2);

const getArg = name => {
  const prefix = `${name}=`;
  const match = args.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
};

const configPath = getArg('--config') || 'tsconfig.check.json';
const explicitFlag = getArg('--flag');
const listOnly = args.includes('--list');

const { parsed } = loadParsedConfig(configPath);
const offFlags = getOffFlags(parsed.options);

if (offFlags.length === 0) {
  console.log(`No strictness flags are OFF in ${configPath}.`);
  process.exit(0);
}

console.log(`OFF strictness flags in ${configPath}:`);
offFlags.forEach(({ name, category }, index) => {
  console.log(`${String(index + 1).padStart(2, ' ')}. ${name} (${category})`);
});

if (listOnly) {
  process.exit(0);
}

let selectedFlag = explicitFlag;
if (!selectedFlag) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(
    '\nPick a flag number to enable for this run: ',
  );
  rl.close();

  const selectedIndex = Number.parseInt(answer, 10) - 1;
  if (!Number.isInteger(selectedIndex) || !offFlags[selectedIndex]) {
    console.error(`Invalid selection: ${answer}`);
    process.exit(1);
  }

  selectedFlag = offFlags[selectedIndex].name;
}

if (!offFlags.some(flag => flag.name === selectedFlag)) {
  console.error(
    `Flag '${selectedFlag}' is not currently OFF in ${configPath} (or is unknown in this tool).`,
  );
  process.exit(1);
}

const tscArgs = tscArgsForFlag(configPath, selectedFlag);
console.log(`\nRunning: yarn ${tscArgs.join(' ')}`);

const child = spawn('yarn', tscArgs, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
});

child.on('close', code => {
  process.exit(code ?? 1);
});
