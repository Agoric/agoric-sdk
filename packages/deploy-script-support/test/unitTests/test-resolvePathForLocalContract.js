/* global require */
// @ts-check

import '@agoric/zoe/tools/prepare-test-env-ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

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
