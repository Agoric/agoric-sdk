// @ts-check
/* eslint-disable import/no-extraneous-dependencies -- FIXME */

/* eslint-disable import/order */
import { test as unknownTest } from './prepare-test-env-ava.js';

import { bech32Config } from '@agoric/wallet-ui/src/util/chainInfo.js';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { prepareActionTransaction } from '../src/encoding.js';

// no context (yet)
const test = unknownTest;

const dummyKey = new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2,
  3, 4, 5, 6, 7, 8,
]);

test('fromKey', async t => {
  // key material the client can use to access the previously signed offer result
  // e.g. offerResult:3 must have been signed with this key…
  const signer = await DirectSecp256k1Wallet.fromKey(
    dummyKey,
    bech32Config.bech32PrefixAccAddr,
  );

  const txRaw = await prepareActionTransaction(signer, {
    type: 'applyMethod',
    body: JSON.stringify([
      { '@qclass': 'slot', index: 0 },
      'pushResult',
      [
        {
          numerator: {
            value: { '@qclass': 'bigint', digits: '12345' },
            brand: { '@qclass': 'slot', index: 1 },
          },
          denominator: {
            value: { '@qclass': 'bigint', digits: '67890' },
            brand: { '@qclass': 'slot', index: 2 },
          },
        },
      ],
    ]),
    slots: ['offerResult:3', 'board0133', 'board244'],
  });
  t.snapshot(txRaw);
});
