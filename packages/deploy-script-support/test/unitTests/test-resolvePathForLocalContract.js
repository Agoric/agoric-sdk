/* global require */
// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeResolvePaths } from '../../src/resolvePath';

test('resolvePathForLocalContract', async t => {
  const { resolvePathForLocalContract } = makeResolvePaths(
    path => path,
    require.resolve,
  );

  const path = '../../src/helpers';

  const result = resolvePathForLocalContract(path);

  t.is(result, path);
});
