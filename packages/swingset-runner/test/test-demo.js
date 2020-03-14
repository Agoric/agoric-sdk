import { test } from 'tape-promise/tape';
import { spawn } from 'child_process';

async function innerTest(t, extraFlags) {
  try {
    await new Promise(resolve => {
      const proc = spawn(
        `node -r esm bin/runner --init ${extraFlags} run demo/encouragementBot`,
        {
          cwd: `${__dirname}/..`,
          shell: true,
          stdio: ['ignore', 'pipe', 'inherit'],
        },
      );
      let output = '';
      proc.stdout.addListener('data', data => {
        output += data;
      });
      proc.addListener('exit', code => {
        t.equal(code, 0, 'exits successfully');
        const uMsg = 'user vat is happy';
        t.notEqual(output.indexOf(`\n${uMsg}\n`), -1, uMsg);
        const bMsg = 'bot vat is happy';
        t.notEqual(output.indexOf(`\n${bMsg}\n`), -1, bMsg);
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

test('run encouragmentBot demo with default', async t => {
  innerTest(t, '');
});
