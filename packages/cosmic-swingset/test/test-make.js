/* global __dirname */
import test from 'ava';
import { spawn } from 'child_process';

test('make', async t => {
  await new Promise(resolve =>
    spawn('make', {
      cwd: `${__dirname}/..`,
      stdio: ['ignore', 'ignore', 'inherit'],
    }).addListener('exit', code => {
      t.is(code, 0, 'exits successfully');
      resolve();
    }),
  );
});
