import test from 'ava';
import { spawn } from 'child_process';

test('make', async t => {
  try {
    await new Promise(resolve =>
      spawn('make', {
        cwd: `${__dirname}/..`,
        stdio: ['ignore', 'ignore', 'inherit'],
      }).addListener('exit', code => {
       t.is(code, 0, 'exits successfully');
        resolve();
      }),
    );
  } catch (e) {
   t.not(e, e, 'unexpected exception');
  } finally {
   return; // t.end();
  }
});
