// @ts-check
/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { BridgeId } from '@agoric/internal';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test('start axelarGmp and perform a successful token transfer', async t => {
  const {
    walletFactoryDriver,
    bridgeUtils: { runInbound },
    buildProposal,
    evalProposal,
    storage,
  } = t.context;

  const { BLD } = t.context.agoricNamesRemotes.brand;

  t.log('start axelarGmp');

  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/init-axelar-gmp.js', [
      '--chainInfo',
      JSON.stringify({
        agoric: fetchedChainInfo.agoric,
        axelar: fetchedChainInfo.axelar,
      }),
      '--assetInfo',
      JSON.stringify([
        [
          'ubld',
          {
            baseDenom: 'ubld',
            brandKey: 'BLD',
            baseName: 'agoric',
            chainName: 'agoric',
          },
        ],
      ]),
    ]),
  );

  t.log('making offer');
  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');
  await wallet.sendOffer({
    id: 'invokeEVMContract',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['gmpInvitation']],
    },
    proposal: {
      // @ts-expect-error XXX BoardRemote
      give: { BLD: { brand: BLD, value: 1n } },
    },
    offerArgs: {
      destAddr: '0x20E68F6c276AC6E297aC46c84Ab260928276691D',
      type: 3,
      destinationEVMChain: 'Ethereum',
    },
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

  // Flow started but IBC Transfer promise not resolved
  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Local transfer successful',
    'Payload: null',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
  ]);

  // Simulate resolving IBC Transfer promise
  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '1',
    }),
  );

  // Logs when IBC transfer promise is resolved
  t.deepEqual(getLogged(), [
    'Inside sendGmp',
    'Local transfer successful',
    'Payload: null',
    'Initiating IBC Transfer...',
    'DENOM of token:ubld',
    'Offer successful',
  ]);
});
