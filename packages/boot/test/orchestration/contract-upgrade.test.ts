/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { BridgeId } from '@agoric/internal';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { withChainCapabilities } from '@agoric/orchestration';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  makeBootTestContext,
  withWalletFactory,
  type WalletFactoryBootTestContext,
} from '../tools/boot-test-context.js';
import { minimalChainInfos } from '../tools/chainInfo.js';

const test: TestFn<WalletFactoryBootTestContext> = anyTest;
test.before(async t => {
  t.context = await withWalletFactory(
    await makeBootTestContext(t, {
      configSpecifier:
        '@agoric/vm-config/decentral-itest-orchestration-config.json',
      fixtureName: 'orchestration-base',
    }),
  );
});
test.after.always(t => t.context.shutdown?.());

/**
 * This test core-evals an installation of the sendAnywhere contract that
 * initiates an IBC Transfer. Since that goes over a bridge and is tracked
 * by a vow, we can restart the contract and see that the vow settles. We
 * can manually trigger a bridge event in the testing context.
 *
 * As such, this demonstrates the ability to resume an async-flow for for which
 * a host vow settles after an upgrade.
 */
test('resume', async t => {
  const {
    applyProposal,
    bridgeUtils: { runInbound },
    provideSmartWallet,
  } = t.context;

  const { IST } = t.context.agoricNamesRemotes.brand;
  const sendAnywhereLog = t.context.makePublishedLog('send-anywhere.log');

  t.log('start sendAnywhere');
  await applyProposal(
    '@agoric/builders/scripts/testing/init-send-anywhere.js',
    [
      '--chainInfo',
      JSON.stringify(withChainCapabilities(minimalChainInfos)),
      '--assetInfo',
      JSON.stringify([
        [
          'uist',
          {
            baseDenom: 'uist',
            brandKey: 'IST',
            baseName: 'agoric',
            chainName: 'agoric',
          },
        ],
      ]),
    ],
  );

  t.log('making offer');
  const wallet = await provideSmartWallet('agoric1test');
  // no money in wallet to actually send
  const zero = { brand: IST, value: 0n };
  // send because it won't resolve
  await wallet.sendOffer({
    id: 'send-somewhere',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['sendAnywhere'],
      callPipe: [['makeSendInvitation']],
    },
    proposal: {
      // @ts-expect-error XXX BoardRemote
      give: { Send: zero },
    },
    offerArgs: { destAddr: 'cosmos1whatever', chainName: 'cosmoshub' },
  });

  // This log shows the flow started, but didn't get past the IBC Transfer settlement
  sendAnywhereLog.expect(t, [
    'sending {0} from cosmoshub to cosmos1whatever',
    'got info for chain: cosmoshub cosmoshub-4',
    'completed transfer to localAccount',
  ]);

  t.log('null upgrading sendAnywhere');
  await applyProposal(
    '@agoric/builders/scripts/testing/upgrade-send-anywhere.js',
  );

  // simulate ibc/MsgTransfer ack from remote chain, enabling `.transfer()` promise
  // to resolve
  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-5',
      sequence: '1',
    }),
  );

  sendAnywhereLog.expect(t, [
    'sending {0} from cosmoshub to cosmos1whatever',
    'got info for chain: cosmoshub cosmoshub-4',
    'completed transfer to localAccount',
    'completed transfer to cosmos1whatever',
    'transfer complete, seat exited',
  ]);
});
