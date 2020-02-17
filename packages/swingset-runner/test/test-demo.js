import { test } from 'tape-promise/tape';
import { spawn } from 'child_process';

async function innerTest(t, extraFlags) {
  try {
    await new Promise(resolve => {
      const proc = spawn(`bin/runner --init ${extraFlags} run demo/encouragementBot`, {
        cwd: `${__dirname}/..`,
        shell: true,
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      let output = '';
      proc.stdout.addListener('data', data => {
        output += data;
      });
      proc.addListener('exit', code => {
        t.equal(code, 0, 'exits successfully');
        t.notEqual(output.indexOf('\nuser vat is happy\n'), -1, 'user vat is happy');
        t.notEqual(output.indexOf('\nbot vat is happy\n'), -1, 'bot vat is happy');
        resolve();
      });
    });
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
}

test('run encouragmentBot demo with memdb', async t => {
  innerTest(t, '--memdb');
});

test('run encouragmentBot demo with filedb', async t => {
  innerTest(t, '--filedb');
});

test('run encouragmentBot demo with lmdb', async t => {
  innerTest(t, '--lmdb');
});

test('run encouragmentBot demo without SES', async t => {
  innerTest(t, '--no-ses');
});
