import { test } from 'tape-promise/tape';
import { spawn } from 'child_process';

test('make build-cosmos', async t => {
  try {
    await new Promise(resolve => spawn('make', ['build-cosmos'], { cwd: `${__dirname}/..`, stdio: ['ignore', 'ignore', 'inherit'] })
     .addListener('exit', code => {
       t.equal(code, 0, 'exits successfully');
       resolve();
     }));
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
