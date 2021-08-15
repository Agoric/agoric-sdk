import test from 'ava';
import { spawn } from 'child_process';
import path from 'path';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

test('make and exec', async t => {
  await new Promise(resolve =>
    spawn('make', ['scenario2-setup'], {
      cwd: `${dirname}/..`,
      stdio: ['ignore', 'ignore', 'inherit'],
    }).addListener('exit', code => {
      t.is(code, 0, 'make scenario2-setup exits successfully');
      resolve();
    }),
  );
  await new Promise(resolve =>
    spawn('bin/ag-chain-cosmos', {
      cwd: `${dirname}/..`,
      stdio: ['ignore', 'ignore', 'inherit'],
    }).addListener('exit', code => {
      t.is(code, 0, 'exec exits successfully');
      resolve();
    }),
  );
  await new Promise(resolve =>
    spawn('make', ['scenario2-run-chain-to-halt'], {
      cwd: `${dirname}/..`,
      stdio: ['ignore', 'ignore', 'inherit'],
    }).addListener('exit', code => {
      t.is(code, 0, 'make scenario2-run-chain-to-halt is successful');
      resolve();
    }),
  );
});
