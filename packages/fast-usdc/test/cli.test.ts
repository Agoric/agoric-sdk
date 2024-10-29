import test from 'ava';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dir = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(dir, '../src/cli.js');

test('CLI shows help when run without arguments', async t => {
  const output = await new Promise(resolve => {
    const child = spawn('node', [CLI_PATH]);
    let stderr = '';

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', () => {
      resolve(stderr);
    });
  });

  t.snapshot(output);
});

test('CLI shows help for transfer command', async t => {
  const output = await new Promise(resolve => {
    const child = spawn('node', [CLI_PATH, 'transfer', '-h']);
    let stdout = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.on('close', () => {
      resolve(stdout);
    });
  });

  t.snapshot(output);
});
