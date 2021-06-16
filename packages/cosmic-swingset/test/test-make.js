/* global __dirname */
import test from 'ava';
import { spawn } from 'child_process';

test('make and exec', async t => {
  await new Promise(resolve =>
    spawn('make', {
      cwd: `${__dirname}/..`,
      stdio: ['ignore', 'ignore', 'inherit'],
    }).addListener('exit', code => {
      t.is(code, 0, 'make exits successfully');
      resolve();
    }),
  );
  await new Promise(resolve =>
    spawn('bin/ag-chain-cosmos', {
      cwd: `${__dirname}/..`,
      stdio: ['ignore', 'ignore', 'inherit'],
    }).addListener('exit', code => {
      t.is(code, 0, 'exec exits successfully');
      resolve();
    }),
  );
});
