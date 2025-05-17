import test from 'ava';
import tmp from 'tmp';
import { makeTempDirFactory } from '@agoric/internal/src/tmpDir.js';
import { getAccessToken } from '../src/access-token.js';

const tmpDir = makeTempDirFactory(tmp);

test('access tokens', async t => {
  const [sharedStateDir, removeCallback] = tmpDir('access-token-test');
  const [a, b, c] = await Promise.all([
    getAccessToken(1234, sharedStateDir),
    getAccessToken(1234, sharedStateDir),
    getAccessToken(1234, sharedStateDir),
  ]);

  t.is(a, b);
  t.is(a, c);
  await removeCallback();
});
