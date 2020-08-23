import test from 'ava';
import { spawn } from 'child_process';

test('make scenario3-setup', async t => {
  await new Promise(resolve =>
    spawn('make', ['scenario3-setup'], {
      cwd: `${__dirname}/..`,
      stdio: ['ignore', 'ignore', 'inherit'],
    }).addListener('exit', code => {
      t.is(code, 0, 'exits successfully');
      resolve();
    }),
  );
});
