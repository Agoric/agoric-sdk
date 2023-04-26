#! /usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const parent = new URL('..', import.meta.url).pathname;
const yarnCmd = ['yarn', '--silent', 'workspaces', 'info'];
console.log('Getting', yarnCmd.join(' '));
const workspacesInfo = execFileSync(yarnCmd[0], yarnCmd.slice(1), {
  cwd: parent,
  encoding: 'utf8',
});
const workspacesInfoJson = JSON.parse(workspacesInfo);

const testYaml = path.resolve(
  parent,
  '.github/workflows/test-all-packages.yml',
);
console.log('Reading', testYaml);
const testYamlContent = fs.readFileSync(testYaml, 'utf-8');

console.log('Searching for "cd <location> && yarn test"...');
let status = 0;
for (const [pkg, { location }] of Object.entries(workspacesInfoJson)) {
  const cmd = `cd ${location} && yarn \${{ steps.vars.outputs.test }}`;
  if (!testYamlContent.includes(cmd)) {
    console.error(`Cannot find ${location} (${pkg})`);
    status = 1;
  }
}

console.log(status ? 'Failed!' : 'Succeeded!');
process.exit(status);
