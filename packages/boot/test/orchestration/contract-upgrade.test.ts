/** @file Bootstrap test of restarting contracts using orchestration */

import type { TestFn } from 'ava';

import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '@aglocal/boot/test/bootstrapTests/walletFactory.js';
import { minimalChainInfos } from '@aglocal/boot/test/tools/chainInfo.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { BridgeId } from '@agoric/internal';
import { withChainCapabilities } from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

test.before(
  async t =>
    (t.context = await makeWalletFactoryContext({
      configSpecifier:
        '@agoric/vm-config/decentral-itest-orchestration-config.json',
    })),
);
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
    bridgeInbound,
    evaluateProposal,
    runUntilQueuesEmpty,
    storage,
    walletFactoryDriver,
  } = t.context;

  const { IST } = t.context.agoricNamesRemotes.brand;

  t.log('start sendAnywhere');
  await evaluateProposal(
    await buildProposal(
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
    ),
  );

  t.log('making offer');
  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');

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
  await runUntilQueuesEmpty();

  // XXX golden test
  const getLogged = () =>
    JSON.parse(storage.data.get('published.send-anywhere.log')!).values;

  // This log shows the flow started, but didn't get past the IBC Transfer settlement
  t.deepEqual(getLogged(), [
    'sending {0} from cosmoshub to cosmos1whatever',
    'got info for chain: cosmoshub cosmoshub-4',
    'completed transfer to localAccount',
  ]);

  t.log('null upgrading sendAnywhere');
  await evaluateProposal(
    await buildProposal(
      '@agoric/builders/scripts/testing/upgrade-send-anywhere.js',
    ),
  );

  // simulate ibc/MsgTransfer ack from remote chain, enabling `.transfer()` promise
  // to resolve
  bridgeInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-5',
      sequence: '1',
    }),
  );
  await runUntilQueuesEmpty();

  t.deepEqual(getLogged(), [
    'sending {0} from cosmoshub to cosmos1whatever',
    'got info for chain: cosmoshub cosmoshub-4',
    'completed transfer to localAccount',
    'completed transfer to cosmos1whatever',
    'transfer complete, seat exited',
  ]);
});
