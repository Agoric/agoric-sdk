// @ts-check
/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test('makeAccount via axelarGmp', async t => {
  const { walletFactoryDriver, buildProposal, evalProposal, storage } =
    t.context;

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
    id: 'axelarMakeAccountCall',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['axelarGmp'],
      callPipe: [['createAndMonitorLCA']],
    },
    proposal: {},
  });

  const getLogged = () =>
    JSON.parse(storage.data.get('published.axelarGmp.log')!).values;

  // Flow started but IBC Transfer promise not resolved
  t.deepEqual(getLogged(), [
    'Inside createAndMonitorLCA',
    'localAccount created successfully',
    'tap created successfully',
    'Monitoring transfers setup successfully',
  ]);

  t.log('Execute offers via the LCA');

  const previousOfferId =
    wallet.getCurrentWalletRecord().offerToUsedInvitation[0][0];

  await wallet.executeOffer({
    id: 'makeAccountCall',
    invitationSpec: {
      invitationMakerName: 'makeEvmTransactionInvitation',
      previousOffer: previousOfferId,
      source: 'continuing',
      invitationArgs: harden(['Rabi', 'Siddique']),
    },
    proposal: {},
  });

  t.like(wallet.getLatestUpdateRecord(), {
    status: { id: 'makeAccountCall', numWantsSatisfied: 1 },
  });

  await wallet.executeOffer({
    id: 'makeAccountCall',
    invitationSpec: {
      invitationMakerName: 'makeEvmTransactionInvitation',
      previousOffer: previousOfferId,
      source: 'continuing',
      invitationArgs: harden(['Fraz', 'Arshad']),
    },
    proposal: {},
  });

  t.like(wallet.getLatestUpdateRecord(), {
    status: { id: 'makeAccountCall', numWantsSatisfied: 1 },
  });
});
