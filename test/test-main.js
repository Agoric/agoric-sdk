import { test } from 'tape-promise/tape';
import main from '../lib/main';

test('sanity', async t => {
  try {
    const myConsole = {
      error(...args) {},
      log(...args) {},
    };
    const myMain = args => main('foo', args, { console: myConsole, error: myConsole.error });
    t.equal(await myMain(['help']), 0, 'help exits zero');
    t.equal(await myMain(['--help']), 0, '--help exits zero');
    t.equal(await myMain(['--version']), 0, '--version exits zero');
    t.equal(await myMain(['zorgar']), 1, 'unknown command fails');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
