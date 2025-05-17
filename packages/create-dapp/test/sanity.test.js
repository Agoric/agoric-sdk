import test from 'ava';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const binname = fileURLToPath(
  new URL('../src/create-dapp.js', import.meta.url),
);

test('sanity', async t => {
  await null;
  const myMain = args => {
    return spawnSync(binname, args, { stdio: 'ignore' }).status;
  };

  t.is(await myMain(['--help']), 0, '--help exits zero');
  t.is(await myMain(['--version']), 0, '--version exits zero');
  t.is(await myMain(['--zorgar']), 1, 'unknown flag fails');
  t.is(await myMain(['demo']), 0, 'create-dapp demo exits 0');
});
