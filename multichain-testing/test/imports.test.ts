/**
 * @file A simple test that imports work.
 *
 * Sometimes the package deps aren't patched correctly and this can detect quickly.
 */
import test from '@endo/ses-ava/prepare-endo.js';
import { makeStargateClient, LOCAL_CONFIG } from '@agoric/client-utils';

test('Stargate can be instantiated', t => {
  const client = makeStargateClient(LOCAL_CONFIG, { fetch });
  t.truthy(client, 'Stargate instance should be created');
});
