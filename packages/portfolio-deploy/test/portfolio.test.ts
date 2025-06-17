import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { protoMsgMockMap } from '@aglocal/boot/tools/ibc/mocks.ts';
import {
  buildVTransferEvent,
  buildTxPacketString,
  buildMsgResponseString,
} from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { AckBehavior } from '@aglocal/boot/tools/supports.ts';
import { makeUSDNIBCTraffic } from '@aglocal/portfolio-contract/test/mocks.ts';
import { AmountMath } from '@agoric/ertp';
import { BridgeId } from '@agoric/internal';
import type { ChainInfo } from '@agoric/orchestration';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

import type { TestFn } from 'ava';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';
import { trace } from 'console';

const test: TestFn<WalletFactoryTestContext> = anyTest;

// Build the TX packet
const msgSwap: MsgSwap = {
  signer: 'cosmos1test',
  amount: { denom: 'uusdc', amount: '3333000000' },
  routes: [{ poolId: 0n, denomTo: 'uusdn' }],
  min: { denom: 'uusdn', amount: '3333000000' },
};

const txPacketData = buildTxPacketString([
  {
    typeUrl: '/noble.swap.v1.MsgSwap',
    value: MsgSwap.encode(MsgSwap.fromPartial(msgSwap)).finish(),
  },
]);

// Base64 ACK object – success case
const ack = buildMsgResponseString(MsgSwap, {
  // mocked response (usually empty or minimal)
});

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
    '@aglocal/portfolio-deploy/src/portfolio.build.js', // package relative
  );
  await evalProposal(materials);

  // update now that contract is instantiated
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.ymax0);
});

const { make } = AmountMath;

test.serial('open a USDN position', async t => {
  const {
    walletFactoryDriver: wfd,
    agoricNamesRemotes,
    bridgeUtils,
  } = t.context;

  for (const { msg, ack } of Object.values(
    makeUSDNIBCTraffic('agoric1trader1', `${3_333 * 1_000_000}`),
  )) {
    protoMsgMockMap[msg] = ack; // XXX static mutable state
  }

  // bridgeUtils.setAckBehavior(
  //   BridgeId.DIBC,
  //   'sendPacket',
  //   AckBehavior.Immediate,
  // );

  // TODO: should have 10K USDC
  const wallet = await wfd.provideSmartWallet('agoric1trader1');

  const { USDC } = agoricNamesRemotes.brand as unknown as Record<
    string,
    Brand<'nat'>
  >;
  const give = { USDN: make(USDC, 3_333n * 1_000_000n) };
  t.log('opening portfolio', give);

  // await bridgeUtils.runInbound(
  //   BridgeId.VTRANSFER,
  //   buildVTransferEvent({
  //     sender: makeTestAddress(),
  //     target: makeTestAddress(),
  //     sourceChannel: 'channel-0',
  //     sequence: '1',
  //     memo: '{}',
  //   }),
  // );
  // await eventLoopIteration();

  // trace('🧪 Sent txPacketData:', txPacketData);
  // await bridgeUtils.runInbound(BridgeId.DIBC, {
  //   type: 'IBC_EVENT',
  //   event: 'acknowledgementPacket',
  //   blockHeight: 0,
  //   blockTime: 0,
  //   acknowledgement: ack,
  //   packet: {
  //     data: txPacketData,
  //     source_channel: 'channel-1',
  //     source_port: 'icacontroller-1',
  //     destination_channel: 'channel-1',
  //     destination_port: 'icahost',
  //     sequence: '2',
  //     timeout_timestamp: '1712183910866313000',
  //     timeout_height: { revision_number: '0', revision_height: '0' },
  //   },
  // });

  const firstOfferId = `open-${new Date().toISOString()}`;
  await wallet.sendOffer({
    id: firstOfferId, // XXX ambient
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['ymax0'],
      callPipe: [['makeOpenPortfolioInvitation']],
    },
    proposal: { give },
  });

  await eventLoopIteration();

  await bridgeUtils.runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '1',
      memo: '{}',
    }),
  );
  await eventLoopIteration();

  await bridgeUtils.runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: makeTestAddress(),
      target: makeTestAddress(),
      sourceChannel: 'channel-0',
      sequence: '2',
      memo: '{}',
    }),
  );
  await eventLoopIteration();

  let update = wallet.getLatestUpdateRecord(); // XXX remote should be async
  t.log('update', update);
  let current = wallet.getCurrentWalletRecord(); // XXX remote should be async
  t.log('trader1 current', current);
  t.truthy(current);

  await wallet.sendOffer({
    id: `close-${new Date().toISOString()}`, // XXX ambient
    invitationSpec: {
      source: 'continuing',
      previousOffer: firstOfferId,
      invitationMakerName: 'makeWithdrawInvitation',
    },
    proposal: {},
  });

  // await bridgeUtils.runInbound(
  //   BridgeId.VTRANSFER,
  //   buildVTransferEvent({
  //     sender: makeTestAddress(),
  //     target: makeTestAddress(),
  //     sourceChannel: 'channel-0',
  //     sequence: '4',
  //     memo: '{}',
  //   }),
  // );

  update = wallet.getLatestUpdateRecord(); // XXX remote should be async
  t.log('update', update);
  current = wallet.getCurrentWalletRecord(); // XXX remote should be async
  t.log('trader1 current', current);
});
