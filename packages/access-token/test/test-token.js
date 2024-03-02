import test from '@endo/ses-ava/prepare-endo.js';
import { tmpDir } from './tmp.js';

import { getAccessToken } from '../src/access-token.js';

test('access tokens', async t => {
  const [sharedStateDir, removeCallback] = await tmpDir('access-token-test');
  const [a, b, c] = await Promise.all([
    getAccessToken(1234, sharedStateDir),
    getAccessToken(1234, sharedStateDir),
    getAccessToken(1234, sharedStateDir),
  ]);

  t.is(a, b);
  t.is(a, c);
  await removeCallback();
});
