// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { makeResolvePaths } from '../../src/resolvePath';

test('resolvePathForPackagedContract', async t => {
  const { resolvePathForPackagedContract } = makeResolvePaths(() => {},
  require.resolve);

  const path = '@agoric/zoe/src/contracts/automaticRefund';

  const result = resolvePathForPackagedContract(path);

  t.truthy(
    result.includes('agoric-sdk/packages/zoe/src/contracts/automaticRefund.js'),
  );
});
