#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execSync('rg --files tools -g "*.ts" -g "*.js"', {
  encoding: 'utf-8',
})
  .trim()
  .split('\n')
  .filter(Boolean);

const exportRE = /^export (?:const|function|type) ([A-Za-z0-9_]+)/gm;

/** @type {Array<{file: string, name: string}>} */
const exported = [];

for (const file of files) {
  const source = readFileSync(file, 'utf-8');
  for (const match of source.matchAll(exportRE)) {
    const [, name] = match;
    exported.push({ file, name });
  }
}

/** @type {Array<{file: string, name: string, refs: number}>} */
const maybeUnused = [];

for (const { file, name } of exported) {
  const refs = Number(
    execSync(
      `rg -n "\\\\b${name}\\\\b" packages --glob '!**/dist/**' | wc -l`,
      {
        encoding: 'utf-8',
        cwd: '../..',
      },
    ).trim(),
  );
  if (refs <= 1) {
    maybeUnused.push({ file, name, refs });
  }
}

if (maybeUnused.length) {
  console.error('Likely unused exports in @aglocal/boot:');
  for (const item of maybeUnused) {
    console.error(`- ${item.file}: export ${item.name} (refs=${item.refs})`);
  }
  process.exit(1);
}

console.log(`Checked ${exported.length} exports in ${files.length} files.`);
