import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { protoMsgMockMap } from '@aglocal/boot/tools/ibc/mocks.ts';
import { AckBehavior } from '@aglocal/boot/tools/supports.ts';
import { makeUSDNIBCTraffic } from '@aglocal/portfolio-contract/test/mocks.ts';
import { AmountMath } from '@agoric/ertp';
import { BridgeId } from '@agoric/internal';
import type { ChainInfo } from '@agoric/orchestration';
import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';

const test: TestFn<WalletFactoryTestContext> = anyTest;

/**
 * To facilitate deployment to environments other than devnet,
 * ../src/chain-info.build.js fetches chainInfo dynamically
 * using --net and --peer.
 *
 * This is an example of the sort of chain info that results.
 * Here we're testing that things work without using the static
 * fetched-chain-info.js.
 */
const exampleDynamicChainInfo = {
  agoric: {
    bech32Prefix: 'agoric',
    chainId: 'agoriclocal',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'agoriclocal',
    stakingTokens: [{ denom: 'ubld' }],
    connections: {
      noblelocal: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  noble: {
    bech32Prefix: 'noble',
    chainId: 'noblelocal',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'noblelocal',
    stakingTokens: [{ denom: 'uusdc' }],
    connections: {
      agoriclocal: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
} satisfies Record<string, ChainInfo>;

test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  // TODO: impact testing
  const ctx = await makeWalletFactoryContext(t, config);

  t.context = ctx;
});
test.after.always(t => t.context.shutdown?.());

test.serial('publish chainInfo etc.', async t => {
  const { buildProposal, evalProposal, runUtils } = t.context;
  const materials = buildProposal(
    '@aglocal/portfolio-deploy/src/chain-info.build.js',
    ['--chainInfo', JSON.stringify(exampleDynamicChainInfo)],
  );
  await evalProposal(materials);
  const { EV } = runUtils;
  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  for (const chain of ['agoric', 'noble']) {
    const info = await EV(agoricNames).lookup('chain', chain);
    t.log(info);
    t.truthy(info);
  }
});

test.serial('contract starts; appears in agoricNames', async t => {
  const {
    agoricNamesRemotes,
    bridgeUtils,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
  } = t.context;

  // inbound `startChannelOpenInit` responses immediately.
  // needed since the portfolio creation relies on an ICA being created
  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  // TODO:  bridgeUtils.setBech32Prefix('noble');

  const materials = buildProposal(
    '@aglocal/portfolio-deploy/src/portfolio.build.js',
  );
  await evalProposal(materials);

  // update now that contract is instantiated
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.ymax0);
});

const { make } = AmountMath;

test.serial('open a USDN position', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;

  for (const { msg, ack } of Object.values(
    makeUSDNIBCTraffic('agoric1trader1', `${3_333 * 1_000_000}`),
  )) {
    protoMsgMockMap[msg] = ack; // XXX static mutable state
  }

  // TODO: should have 10K USDC
  const wallet = await wfd.provideSmartWallet('agoric1trader1');

  const { USDC } = agoricNamesRemotes.brand as unknown as Record<
    string,
    Brand<'nat'>
  >;
  const give = { USDN: make(USDC, 3_333n * 1_000_000n) };
  t.log('opening portfolio', give);
  await wallet.sendOffer({
    id: `open-${Date.now()}`, // XXX ambient
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['ymax0'],
      callPipe: [['makeOpenPortfolioInvitation']],
    },
    proposal: { give },
    offerArgs: {},
  });
  const update = wallet.getLatestUpdateRecord(); // XXX remote should be async
  t.log('update', update);
  const current = wallet.getCurrentWalletRecord(); // XXX remote should be async
  t.log('trader1 current', current);
  t.truthy(current);
});
