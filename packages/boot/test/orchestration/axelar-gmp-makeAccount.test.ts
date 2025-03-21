// @ts-check
/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import type { ScopedBridgeManager } from '@agoric/vats';
import { BridgeId } from '@agoric/internal';
import { VTRANSFER_IBC_EVENT } from '@agoric/internal/src/action-types.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test('makeAccount via axelarGmp', async t => {
  const {
    walletFactoryDriver,
    bridgeUtils: { getOutboundMessages },
    buildProposal,
    evalProposal,
    storage,
    runUtils,
  } = t.context;

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

  // t.log('monitor transfers');

  // // @ts-ignore
  // const { status } = wallet.getLatestUpdateRecord();

  // const { EV } = runUtils;
  // const vtransferBridgeManager = (await EV.vat('bootstrap').consumeItem(
  //   'vtransferBridgeManager',
  // )) as ScopedBridgeManager<'vtransfer'>;
  // t.truthy(vtransferBridgeManager);

  // const target = status.result;
  // const packet = 'helloFromRabi';
  // const expectedAckData = {
  //   event: 'writeAcknowledgement',
  //   packet: 'helloFromRabi',
  //   target,
  //   type: VTRANSFER_IBC_EVENT,
  // };

  // await EV(vtransferBridgeManager).fromBridge(expectedAckData);

  // const messages = getOutboundMessages(BridgeId.VTRANSFER);
  // t.deepEqual(messages, [
  //   {
  //     target,
  //     type: 'BRIDGE_TARGET_REGISTER',
  //   },
  //   {
  //     ack: btoa(JSON.stringify(expectedAckData)),
  //     method: 'receiveExecuted',
  //     packet,
  //     type: 'IBC_METHOD',
  //   },
  // ]);
});
