import type { TestFn } from 'ava';

import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '@aglocal/boot/test/bootstrapTests/walletFactory.js';
import { minimalChainInfos } from '@aglocal/boot/test/tools/chainInfo.js';
import {
  IBC_METHODS,
  icaMocks,
  protoMsgMockMap,
  protoMsgMocks,
} from '@aglocal/boot/tools/ibc/mocks.js';
import {
  insistManagerType,
  makeSwingsetHarness,
} from '@aglocal/boot/tools/supports.js';
import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { BridgeId } from '@agoric/internal';
import { QueuedActionType } from '@agoric/internal/src/action-types.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import {
  withChainCapabilities,
  type CosmosValidatorAddress,
} from '@agoric/orchestration';
import type { start as startStakeIca } from '@agoric/orchestration/src/examples/stake-ica.contract.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { makeSlogSender } from '@agoric/telemetry';
import type { IBCMethod } from '@agoric/vats';
import { SIMULATED_ERRORS } from '@agoric/vats/tools/fake-bridge.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Fail, q } from '@endo/errors';

const test: TestFn<
  WalletFactoryTestContext & {
    flushInboundQueue: () => Promise<void>;
    harness?: ReturnType<typeof makeSwingsetHarness>;
  }
> = anyTest;

const validatorAddress: CosmosValidatorAddress = {
  value: 'cosmosvaloper1test',
  chainId: 'gaiatest',
  encoding: 'bech32',
};

const ATOM_DENOM = 'uatom';

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

test.before(async t => {
  insistManagerType(defaultManagerType);

  let ibcSequenceNonce = 0;

  const ackImmediately = (
    ack: string,
    destinationPort: BridgeId,
    message: IBCMethod<'sendPacket'>,
  ) => {
    ibcSequenceNonce += 1;
    const msg = icaMocks.ackPacketEvent(message, ibcSequenceNonce, ack);
    setTimeout(() =>
      context.swingsetTestKit.bridgeInbound(destinationPort, msg),
    );
    return msg.packet;
  };

  const ackLater = (ack: string, message: IBCMethod<'sendPacket'>) => {
    ibcSequenceNonce += 1;
    const msg = icaMocks.ackPacketEvent(message, ibcSequenceNonce, ack);
    // @ts-expect-error
    inboundQueue.push(msg);
    return msg.packet;
  };

  const ibcMessageHandler = (
    destinationPort: BridgeId,
    message:
      | IBCMethod<'bindPort'>
      | IBCMethod<'sendPacket'>
      | IBCMethod<'startChannelOpenInit'>,
  ) => {
    switch (message.method) {
      case IBC_METHODS.BIND_PORT: {
        return String(undefined);
      }
      case IBC_METHODS.SEND_PACKET: {
        const mockAckMapHasData = message.packet.data in protoMsgMockMap;
        if (mockAckMapHasData)
          return ackLater(protoMsgMockMap[message.packet.data], message);
        else
          return ackImmediately(
            protoMsgMocks.error.ack,
            destinationPort,
            message,
          );
      }
      case IBC_METHODS.START_CHANNEL_OPEN_INIT: {
        inboundQueue.push(icaMocks.channelOpenAck(message));
        return String(undefined);
      }
      default:
        Fail`Bridge port ${q(destinationPort)} not implemented for ibc message ${q(message)}`;
    }
  };

  const harness =
    defaultManagerType === 'xsnap' ? makeSwingsetHarness() : undefined;
  const inboundQueue: Array<{ type: QueuedActionType } & Record<string, any>> =
    [];
  const slogSender = slogFile
    ? makeSlogSender({
        env: {
          ...process.env,
          SLOGFILE: slogFile,
          SLOGSENDER: '',
        },
        stateDir: '.',
      })
    : undefined;
  const storage = makeFakeStorageKit('bootstrapTests');

  const { handleBridgeSend } = makeMockBridgeKit({
    ibcKit: { handleOutboundMessage: ibcMessageHandler },
    storageKit: storage,
  });

  const context = await makeWalletFactoryContext({
    configSpecifier:
      '@agoric/vm-config/decentral-itest-orchestration-config.json',
    handleBridgeSend,
    runHarness: harness,
    slogSender,
    storage,
  });

  t.context = {
    ...context,
    flushInboundQueue: async () => {
      await null;

      while (inboundQueue.length) {
        const args = inboundQueue.shift();
        if (!args) break;
        else context.swingsetTestKit.pushQueueRecord(args);

        await context.swingsetTestKit.runUntilQueuesEmpty();
      }
    },
    harness,
  };
});

test.after.always(t => t.context.swingsetTestKit.shutdown?.());

test.skip('stakeOsmo - queries', async t => {
  const {
    swingsetTestKit: { EV, evaluateCoreProposal },
  } = t.context;
  await evaluateCoreProposal(
    await buildProposal(
      '@agoric/builders/scripts/orchestration/init-stakeOsmo.js',
      ['--chainInfo', JSON.stringify(withChainCapabilities(minimalChainInfos))],
    ),
  );

  const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
  const instance: Instance<typeof startStakeIca> = await EV(agoricNames).lookup(
    'instance',
    'stakeOsmo',
  );
  t.truthy(instance, 'stakeOsmo instance is available');

  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  const publicFacet = await EV(zoe).getPublicFacet(instance);
  t.truthy(publicFacet, 'stakeOsmo publicFacet is available');

  const account = await EV(publicFacet).makeAccount();
  t.log('account', account);
  t.truthy(account, 'makeAccount returns an account on OSMO connection');

  const queryRes = await EV(account).getBalance(ATOM_DENOM);
  t.deepEqual(queryRes, { value: 0n, denom: ATOM_DENOM });

  const queryUnknownDenom = await EV(account).getBalance('some-invalid-denom');
  t.deepEqual(
    queryUnknownDenom,
    { value: 0n, denom: 'some-invalid-denom' },
    'getBalance for unknown denom returns value: 0n',
  );
});

test.serial('stakeAtom - smart wallet', async t => {
  const {
    agoricNamesRemotes,
    flushInboundQueue,
    harness,
    storage,
    swingsetTestKit: { evaluateCoreProposal, runUntilQueuesEmpty },
    walletFactoryDriver,
  } = t.context;

  await evaluateCoreProposal(
    await buildProposal(
      '@agoric/builders/scripts/orchestration/init-stakeAtom.js',
      ['--chainInfo', JSON.stringify(withChainCapabilities(minimalChainInfos))],
    ),
  );

  const wd = await walletFactoryDriver.provideSmartWallet(
    'agoric1testStakAtom',
  );

  harness?.useRunPolicy(true);
  await wd.sendOffer({
    id: 'request-account',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['stakeAtom'],
      callPipe: [['makeAccountInvitationMaker']],
    },
    proposal: {},
  });
  await runUntilQueuesEmpty();

  harness && t.log('makeAccount computrons', harness.totalComputronCount());
  harness?.useRunPolicy(false);

  await flushInboundQueue();
  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      [
        'request-account',
        {
          account: 'published.stakeAtom.accounts.cosmos1test',
        },
      ],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-account', numWantsSatisfied: 1 },
  });
  t.deepEqual(storage.readLatest('published.stakeAtom.accounts.cosmos1test'), {
    localAddress:
      '/ibc-port/icacontroller-1/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-1',
    remoteAddress:
      '/ibc-hop/connection-8/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-1',
  });

  const { ATOM } = agoricNamesRemotes.brand;
  ATOM || Fail`ATOM missing from agoricNames`;

  // Cannot await executeOffer because the offer won't resolve until after the bridge's inbound queue is flushed.
  // But this test doesn't require that.
  await wd.sendOffer({
    id: 'request-delegate-success',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-account',
      invitationMakerName: 'Delegate',
      invitationArgs: [validatorAddress, { denom: ATOM_DENOM, value: 10n }],
    },
    proposal: {},
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-delegate-success', numWantsSatisfied: 1 },
  });

  const validatorAddressFail: CosmosValidatorAddress = {
    value: 'cosmosvaloper1fail',
    chainId: 'gaiatest',
    encoding: 'bech32',
  };

  // This will trigger the immediate ack of the mock bridge
  await t.throwsAsync(
    wd.executeOffer({
      id: 'request-delegate-fail',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: [
          validatorAddressFail,
          { denom: ATOM_DENOM, value: 10n },
        ],
      },
      proposal: {},
    }),
    {
      message: 'ABCI code: 5: error handling packet: see events for details',
    },
    'delegate fails with invalid validator',
  );

  // This will trigger the immediate ack of the mock bridge
  await t.throwsAsync(
    wd.executeOffer({
      id: 'request-delegate-brand',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-account',
        invitationMakerName: 'Delegate',
        invitationArgs: [validatorAddress, { brand: ATOM, value: 10n }],
      },
      proposal: {},
    }),
    {
      // TODO #10449
      message:
        "'amountToCoin' not working for \"[Alleged: ATOM brand]\" until #10449; use 'DenomAmount' for now",
    },
  );
});

test.todo('undelegate wallet offer');
test.todo('undelegate with multiple undelegations wallet offer');
test.todo('redelegate wallet offer');
test.todo('withdraw reward wallet offer');

// TODO: fix
test.serial.skip('basic-flows', async t => {
  const {
    flushInboundQueue,
    storage,
    swingsetTestKit: { evaluateCoreProposal, pushQueueRecord },
    walletFactoryDriver,
  } = t.context;

  await evaluateCoreProposal(
    await buildProposal(
      '@agoric/builders/scripts/orchestration/init-basic-flows.js',
      [
        '--chainInfo',
        JSON.stringify(withChainCapabilities(minimalChainInfos)),
        '--assetInfo',
        JSON.stringify([
          [
            'ibc/uusdconagoric',
            {
              chainName: 'agoric',
              baseName: 'noble',
              baseDenom: 'uusdc',
            },
          ],
          // not tested until #10006. consider renaming to ibc/uusdconcosmos
          // and updating boot/tools/ibc/mocks.ts
          [
            'ibc/uusdchash',
            {
              chainName: 'cosmoshub',
              baseName: 'noble',
              baseDenom: 'uusdc',
            },
          ],
        ]),
      ],
    ),
  );

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1test');

  // create a cosmos orchestration account
  await wd.sendOffer({
    id: 'request-coa',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makeOrchAccountInvitation']],
    },
    offerArgs: {
      chainName: 'cosmoshub',
    },
    proposal: {},
  });
  await flushInboundQueue();

  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      [
        'request-coa',
        {
          account: 'published.basicFlows.cosmos1test1',
        },
      ],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-coa', numWantsSatisfied: 1 },
  });
  t.deepEqual(storage.readLatest('published.basicFlows.cosmos1test1'), {
    localAddress:
      '/ibc-port/icacontroller-2/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test1","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-2',
    remoteAddress:
      '/ibc-hop/connection-8/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"cosmos1test1","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-2',
  });

  // create a local orchestration account
  await wd.executeOffer({
    id: 'request-loa',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makeOrchAccountInvitation']],
    },
    offerArgs: {
      chainName: 'agoric',
    },
    proposal: {},
  });
  await flushInboundQueue();

  const publicSubscriberPaths = Object.fromEntries(
    wd.getCurrentWalletRecord().offerToPublicSubscriberPaths,
  );
  const expectedAddress = makeTestAddress();
  t.deepEqual(publicSubscriberPaths['request-loa'], {
    account: `published.basicFlows.${expectedAddress}`,
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-loa', numWantsSatisfied: 1 },
  });

  await wd.sendOffer({
    id: 'transfer-to-noble-from-cosmos',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-coa',
      invitationMakerName: 'Transfer',
    },
    proposal: {},
    offerArgs: {
      amount: { denom: 'ibc/uusdchash', value: 10n },
      destination: {
        chainId: 'noble-1',
        value: 'noble1test',
        encoding: 'bech32',
      },
    },
  });
  await flushInboundQueue();

  t.like(wd.getLatestUpdateRecord(), {
    status: {
      id: 'transfer-to-noble-from-cosmos',
      error: undefined,
    },
  });

  await wd.sendOffer({
    id: 'transfer-to-noble-from-cosmos-timeout',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-coa',
      invitationMakerName: 'Transfer',
    },
    proposal: {},
    offerArgs: {
      amount: { denom: 'ibc/uusdchash', value: SIMULATED_ERRORS.TIMEOUT },
      destination: {
        chainId: 'noble-1',
        value: 'noble1test',
        encoding: 'bech32',
      },
    },
  });
  await flushInboundQueue();

  t.like(wd.getLatestUpdateRecord(), {
    status: {
      id: 'transfer-to-noble-from-cosmos-timeout',
      error:
        'Error: ABCI code: 5: error handling packet: see events for details',
    },
  });

  await wd.sendOffer({
    id: 'transfer-to-noble-from-agoric',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-loa',
      invitationMakerName: 'Transfer',
    },
    proposal: {},
    offerArgs: {
      amount: { denom: 'ibc/uusdconagoric', value: 10n },
      destination: {
        chainId: 'noble-1',
        value: 'noble1test',
        encoding: 'bech32',
      },
    },
  });

  pushQueueRecord(
    buildVTransferEvent({
      sender: expectedAddress,
      target: expectedAddress,
      sourceChannel: 'channel-62',
      sequence: '1',
    }),
  );
  await flushInboundQueue();

  const latestOfferStatus = () => {
    const curr = wd.getLatestUpdateRecord();
    if (curr.updated === 'offerStatus') {
      return curr.status;
    }
    throw new Error('expected updated to be "offerStatus"');
  };

  const offerResult = latestOfferStatus();
  t.like(offerResult, {
    id: 'transfer-to-noble-from-agoric',
    error: undefined,
  });
  t.true('result' in offerResult, 'transfer vow settled');

  await t.throwsAsync(
    wd.executeOffer({
      id: 'transfer-to-noble-from-agoric-timeout',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-loa',
        invitationMakerName: 'Transfer',
      },
      proposal: {},
      offerArgs: {
        amount: { denom: 'ibc/uusdconagoric', value: SIMULATED_ERRORS.TIMEOUT },
        destination: {
          chainId: 'noble-1',
          value: 'noble1test',
          encoding: 'bech32',
        },
      },
    }),
  );
  await flushInboundQueue();
});

test.serial('auto-stake-it - proposal', async t => {
  const {
    swingsetTestKit: { evaluateCoreProposal },
  } = t.context;

  await t.notThrowsAsync(
    evaluateCoreProposal(
      await buildProposal(
        '@agoric/builders/scripts/testing/init-auto-stake-it.js',
        [
          '--chainInfo',
          JSON.stringify(withChainCapabilities(minimalChainInfos)),
        ],
      ),
    ),
  );
});

// TODO: fix
test.serial.skip('basic-flows - portfolio holder', async t => {
  const {
    agoricNamesRemotes,
    flushInboundQueue,
    storage,
    swingsetTestKit: { evaluateCoreProposal },
    walletFactoryDriver,
  } = t.context;

  await evaluateCoreProposal(
    await buildProposal(
      '@agoric/builders/scripts/orchestration/init-basic-flows.js',
      [
        '--chainInfo',
        JSON.stringify(withChainCapabilities(minimalChainInfos)),
        '--assetInfo',
        JSON.stringify([
          [
            'ubld',
            {
              baseDenom: 'ubld',
              baseName: 'agoric',
              chainName: 'agoric',
              brandKey: 'BLD',
            },
          ],
        ]),
      ],
    ),
  );

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1test2');

  // create a cosmos orchestration account
  await wd.sendOffer({
    id: 'request-portfolio-acct',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makePortfolioAccountInvitation']],
    },
    offerArgs: {
      chainNames: ['agoric', 'cosmoshub', 'osmosis'],
    },
    proposal: {},
  });
  t.like(
    wd.getLatestUpdateRecord(),
    {
      status: { id: 'request-portfolio-acct', numWantsSatisfied: 1 },
    },
    'trivially satisfied',
  );
  await flushInboundQueue();
  t.like(wd.getCurrentWalletRecord(), {
    offerToPublicSubscriberPaths: [
      [
        'request-portfolio-acct',
        {
          agoric:
            'published.basicFlows.agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g',
          cosmoshub: 'published.basicFlows.cosmos1test2',
          osmosis: 'published.basicFlows.cosmos1test3',
        },
      ],
    ],
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'request-portfolio-acct', numWantsSatisfied: 1 },
  });

  t.deepEqual(storage.readLatest('published.basicFlows.cosmos1test3'), {
    localAddress:
      '/ibc-port/icacontroller-4/ordered/{"version":"ics27-1","controllerConnectionId":"connection-1","hostConnectionId":"connection-1649","address":"cosmos1test3","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-4',
    remoteAddress:
      '/ibc-hop/connection-1/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-1","hostConnectionId":"connection-1649","address":"cosmos1test3","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-4',
  });
  t.is(
    storage.readLatest(
      'published.basicFlows.agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g',
    ),
    '',
  );

  const { BLD } = agoricNamesRemotes.brand;
  BLD || Fail`BLD missing from agoricNames`;

  await wd.sendOffer({
    id: 'delegate-cosmoshub',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-portfolio-acct',
      invitationMakerName: 'Proxying',
      invitationArgs: [
        'cosmoshub',
        'Delegate',
        [validatorAddress, { denom: ATOM_DENOM, value: 10n }],
      ],
    },
    proposal: {},
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'delegate-cosmoshub', numWantsSatisfied: 1 },
  });

  await wd.sendOffer({
    id: 'delegate-agoric',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'request-portfolio-acct',
      invitationMakerName: 'Proxying',
      invitationArgs: [
        'agoric',
        'Delegate',
        // XXX use ChainAddress for LocalOrchAccount
        ['agoric1validator1', { brand: BLD, value: 10n }],
      ],
    },
    proposal: {},
  });
  t.like(wd.getLatestUpdateRecord(), {
    status: { id: 'delegate-agoric', numWantsSatisfied: 1 },
  });

  await t.throwsAsync(
    wd.executeOffer({
      id: 'delegate-2-cosmoshub',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-portfolio-acct',
        invitationMakerName: 'Proxying',
        invitationArgs: [
          'cosmoshub',
          'Delegate',
          [
            validatorAddress,
            { denom: ATOM_DENOM, value: SIMULATED_ERRORS.TIMEOUT },
          ],
        ],
      },
      proposal: {},
    }),
  );

  await t.throwsAsync(
    wd.executeOffer({
      id: 'delegate-2-agoric',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'request-portfolio-acct',
        invitationMakerName: 'Proxying',
        invitationArgs: [
          'agoric',
          'Delegate',
          [
            'agoric1validator1',
            { brand: BLD, value: SIMULATED_ERRORS.TIMEOUT },
          ],
        ],
      },
      proposal: {},
    }),
  );
});
