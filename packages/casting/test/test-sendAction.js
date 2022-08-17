// @ts-check
/* eslint-disable import/order */

import { test as unknownTest } from './prepare-test-env-ava.js';

import { E } from '@endo/far';

import { makeLeader } from '../src/main.js';

import { startFakeServer } from './fake-rpc-server.js';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';

// XXX move into this package
// eslint-disable-next-line import/no-extraneous-dependencies
import { bech32Config } from '@agoric/wallet-ui/src/util/chainInfo.js';

/** @type {import('ava').TestFn<{cleanups: Function[], startServer: typeof startFakeServer}>} */
const test = unknownTest;

test.before(t => {
  t.context.cleanups = [];
  t.context.startServer = startFakeServer;
});

test.after(t => {
  t.context.cleanups.map(cleanup => cleanup());
});

/**
 * Key material determines a Cosmos address (e.g. agoric1blahblahblah). Here the address is of a wallet from the smartWallet factory.
 * Test that we can produce a transaction that CosmJS can send without error.
 */
test.failing('CosmJS integration', async t => {
  const PORT = await t.context.startServer(t, []);
  const leader = makeLeader(`http://localhost:${PORT}/network-config`, {
    retryCallback: null,
    // jitter: null,
  });
  const signer = await DirectSecp256k1Wallet.fromKey(
    // key material the client can use to access the previously signed offer result
    // e.g. offerResult:3 was signed with this key…
    new Uint8Array([
      0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0,
      1, 2, 3, 3, 2, 1, 0,
    ]),
    bech32Config.bech32PrefixAccAddr,
  );

  t.log('awaiting makeSigningClient');
  const signingClient = await E(leader).makeSigningClient(signer);
  t.log('awaiting makeCastingClient');
  const [account] = await signer.getAccounts();
  const castingClient = await E(leader).makeCastingClient(
    signingClient,
    account,
  );
  t.log('awaiting sendAction');
  // FIXME make fake-rpc-server return a valid response for abci_query /cosmos.auth.v1beta1.Query/Account
  // which currently results in "Account does not exist on chain. Send some tokens there before trying to query sequence."
  await castingClient.sendAction({
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
  /**
   * HTTP traffic performed within sendAction by CosmJS: https://v1.cosmos.network/rpc/v0.44.5
   * - GET account state
   * - POST txs
   */
  // TODO make sure the CosmJS succeeded in POSTing (shallow validation of payload b/c deep is next test)
});

// Skip networks. Instead sign a transaction and then have it load through a fake bridgemanager to reach the "on-chain" handler logic.
// Make sure exactly the right bytes come out of signing, validated by them being read out and handled.
test.todo('Transaction message');
// will need an offer in order to make the offer result
// second thought… don't try to test the two ends in test suite. test transaction production here
// and test transaction handling in lib-wallet
// NOTE: offer result should never get into the board, so putting it the Cap table
// so makeExportContext needs 'offerResult'
