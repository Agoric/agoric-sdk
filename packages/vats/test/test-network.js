// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import { buildRootObject as ibcBuildRootObject } from '../src/vat-ibc.js';
import { buildRootObject as networkBuildRootObject } from '../src/vat-network.js';

test('network - ibc', async t => {
  t.plan(2);

  const networkVat = E(networkBuildRootObject)();
  const ibcVat = E(ibcBuildRootObject)();

  const callbacks = Far('ibcCallbacks', {
    downcall: (method, params) => {
      t.is(method, 'bindPort');
      t.deepEqual(params, { packet: { source_port: 'port-1' } });
    },
  });

  const ibcHandler = await E(ibcVat).createInstance(callbacks);
  await E(networkVat).registerProtocolHandler(
    ['/ibc-port', '/ibc-hop'],
    ibcHandler,
  );

  // Actually test the ibc port binding.
  // TODO: Do more tests on the returned Port object.
  await E(networkVat).bind('/ibc-port/');
});
