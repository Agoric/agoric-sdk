/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { BridgeId, typedEntries } from '@agoric/internal';
import {
  type TestStep,
  testInterruptedSteps,
} from '@agoric/internal/src/testing-utils.js';
import {
  withChainCapabilities,
  type CosmosValidatorAddress,
} from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import type { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import { minimalChainInfos } from '../tools/chainInfo.js';

const test: TestFn<
  WalletFactoryTestContext & {
    assertInboundQueueLength: (
      phase: 'before' | 'after',
      label: string,
      stepName: string,
      expected?: number,
    ) => unknown;
    // These nested properties aren't shallow so that the mutable counters are
    // shared between tests.
    num: {
      channel: number;
      ica: number;
    };
  }
> = anyTest;

const wrapSteps = <S extends TestStep[]>(
  assertInvariants: (
    phase: 'before' | 'after',
    label: string,
    stepName: string,
  ) => unknown,
  steps: S,
): S =>
  steps.map(
    ([stepName, stepFn]) =>
      [
        stepName,
        async (opts, label) => {
          try {
            await assertInvariants('before', label, stepName);
            const nextOpts = await stepFn(opts, label);
            return nextOpts;
          } finally {
            await assertInvariants('after', label, stepName);
          }
        },
      ] as const,
  ) as unknown as S;

test.before(async t => {
  const context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );

  const { getInboundQueueLength } = context.bridgeUtils;
  const assertInboundQueueLength = (phase, label, stepName, expected = 0) => {
    const inboundQueueLength = getInboundQueueLength();
    t.is(
      inboundQueueLength,
      expected,
      `${label} ${phase} ${stepName} expected inboundQueueLength=${expected}; got ${inboundQueueLength}`,
    );
  };

  t.context = {
    ...context,
    assertInboundQueueLength,
    num: { channel: 0, ica: 0 },
  };
});
test.after.always(t => t.context.shutdown?.());

test.serial('send-anywhere', async t => {
  const {
    walletFactoryDriver,
    buildProposal,
    evalProposal,
    bridgeUtils: { runInbound, flushInboundQueue },
    assertInboundQueueLength,
  } = t.context;

  const { IST } = t.context.agoricNamesRemotes.brand;

  t.log('start send-anywhere');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/init-send-anywhere.js', [
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
    ]),
  );

  // This test consumes a channel and a test Id.
  t.context.num.channel += 1;
  t.context.num.ica += 1;

  await flushInboundQueue(); // establish baseline

  let lastWalletId = 0;
  let lastSequence = 0;
  const allSteps = wrapSteps(
    assertInboundQueueLength,
    typedEntries({
      makeWallet: async (_opts, label) => {
        lastWalletId += 1;
        const walletId = lastWalletId;
        const wallet = await walletFactoryDriver.provideSmartWallet(
          `agoric1test${walletId}`,
        );
        // no money in wallet to actually send
        const zero = { brand: IST, value: 0n };
        // send because it won't resolve
        t.log(`${label} making offer`);
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
          offerArgs: {
            // meaningless address
            destAddr: 'cosmos1qy352eufjjmc9c',
            chainName: 'cosmoshub',
          },
        });

        t.like(
          wallet.getCurrentWalletRecord(),
          { liveOffers: [['send-somewhere']] },
          `${label} live offer until we simulate the transfer ack`,
        );
        lastSequence += 1;
        return { wallet, sequence: String(lastSequence) };
      },
      checkEmptyBalance: async (opts, label) => {
        t.like(
          opts.wallet.getLatestUpdateRecord(),
          {
            updated: 'balance',
            currentAmount: { value: [] },
          },
          `${label} no offerStatus updates`,
        );
        return opts;
      },
      inboundAck: async (opts, _label) => {
        // simulate ibc/MsgTransfer ack from remote chain, enabling `.transfer()` promise
        // to resolve
        await runInbound(
          BridgeId.VTRANSFER,
          buildVTransferEvent({
            sender: makeTestAddress(),
            target: makeTestAddress(),
            sourceChannel: 'channel-5',
            sequence: opts.sequence,
          }),
        );
        return opts;
      },
      checkTransferSettled: async (opts, label) => {
        const conclusion = opts.wallet.getLatestUpdateRecord();
        t.like(conclusion, {
          updated: 'offerStatus',
          status: {
            id: 'send-somewhere',
            numWantsSatisfied: 1,
            error: undefined,
          },
        });
        t.true('result' in conclusion.status, `${label} transfer vow settled`);

        return opts;
      },
      finalFlush: async (opts, label) => {
        await flushInboundQueue();
        t.like(
          opts.wallet.getLatestUpdateRecord(),
          {
            status: {
              error: undefined,
              result: undefined,
            },
          },
          `${label} no further updates after flush`,
        );
        return opts;
      },
    } as const),
  ) satisfies TestStep[];

  await testInterruptedSteps(t, allSteps, async () => {
    t.log('restart send-anywhere');
    await evalProposal(
      buildProposal(
        '@agoric/builders/scripts/testing/restart-send-anywhere.js',
      ),
    );
  });

  assertInboundQueueLength('after', 'all', 'finalize');
});

const validatorAddress: CosmosValidatorAddress = {
  value: 'cosmosvaloper1test',
  chainId: 'gaiatest',
  encoding: 'bech32',
};
const ATOM_DENOM = 'uatom';

// check for key because the value can be `undefined`
const hasResult = (r: UpdateRecord) => {
  assert(r.updated === 'offerStatus');
  return 'result' in r.status;
};

// Tests restart but not of an orchestration() flow
test.serial('stakeAtom', async t => {
  const {
    buildProposal,
    evalProposal,
    agoricNamesRemotes,
    bridgeUtils: { flushInboundQueue },
    readLatest,
  } = t.context;

  await evalProposal(
    buildProposal('@agoric/builders/scripts/orchestration/init-stakeAtom.js', [
      '--chainInfo',
      JSON.stringify(withChainCapabilities(minimalChainInfos)),
    ]),
  );

  await flushInboundQueue(); // establish baseline

  t.context.assertInboundQueueLength('before', 'all', 'begun');

  type Input = {
    wallet: Awaited<
      ReturnType<typeof t.context.walletFactoryDriver.provideSmartWallet>
    >;
  };

  let nextWalletId = 0;
  const allSteps = wrapSteps(
    t.context.assertInboundQueueLength,
    typedEntries({
      makeOffer: async (_opts, _label) => {
        // These values change depending on previous tests.
        const walletId = nextWalletId;
        nextWalletId += 1;
        const lastIca = t.context.num.ica;
        t.context.num.ica += 1;
        const ica = t.context.num.ica;
        t.context.num.channel += 1;
        const channel = t.context.num.channel;

        const wallet = await t.context.walletFactoryDriver.provideSmartWallet(
          `agoric1testStakeAtom${walletId}`,
        );

        const testAccount = `cosmos1test${lastIca || ''}`;
        const accountPath = `published.stakeAtom.accounts.${testAccount}`;
        t.throws(() => readLatest(accountPath));

        await wallet.sendOffer({
          id: 'request-account',
          invitationSpec: {
            source: 'agoricContract',
            instancePath: ['stakeAtom'],
            callPipe: [['makeAccountInvitationMaker']],
          },
          proposal: {},
        });

        // no result yet because the IBC incoming messages haven't arrived
        // and won't until we flush.
        await flushInboundQueue();
        const latest = readLatest(accountPath);
        t.deepEqual(latest, {
          localAddress: `/ibc-port/icacontroller-${ica}/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"${testAccount}","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-${channel}`,
          remoteAddress: `/ibc-hop/connection-8/ibc-port/icahost/ordered/{"version":"ics27-1","controllerConnectionId":"connection-8","hostConnectionId":"connection-649","address":"${testAccount}","encoding":"proto3","txType":"sdk_multi_msg"}/ibc-channel/channel-${channel}`,
        });

        return { wallet };
      },
      makeOffer2: async (opts, _label) => {
        const { ATOM } = agoricNamesRemotes.brand;
        assert(ATOM);

        await opts.wallet!.sendOffer({
          id: 'request-delegate',
          invitationSpec: {
            source: 'continuing',
            previousOffer: 'request-account',
            invitationMakerName: 'Delegate',
            invitationArgs: [
              validatorAddress,
              { denom: ATOM_DENOM, value: 10n },
            ],
          },
          proposal: {},
        });
        // no result yet because the IBC incoming messages haven't arrived
        // and won't until we flush.
        t.false(hasResult(opts.wallet!.getLatestUpdateRecord()));
        await flushInboundQueue();
        // now the offer has resolved
        t.true(hasResult(opts.wallet!.getLatestUpdateRecord()));
        return opts;
      },
    } satisfies Record<string, TestStep<Input>[1]>),
  );

  await testInterruptedSteps(t, allSteps, async () => {
    t.log('restart stakeAtom');
    await evalProposal(
      buildProposal('@agoric/builders/scripts/testing/restart-stakeAtom.js'),
    );
    await flushInboundQueue();
  });

  t.context.assertInboundQueueLength('after', 'all', 'finished');
});

// Tests restart of an orchestration() flow while an IBC response is pending.
//
// TODO consider testing this pausing during any pending IBC message. It'll need
// to refresh contract state on each iteration, and since this is a bootstrap
// test that means either restarting bootstrap or starting a new contract and
// restarting that one. For them to share bootstrap they'll each need a unique
// instance name, which will require paramaterizing the two builders scripts and
// the two core-eval functions.
test.serial('basicFlows', async t => {
  const {
    walletFactoryDriver,
    buildProposal,
    evalProposal,
    bridgeUtils: { getInboundQueueLength, flushInboundQueue },
  } = t.context;

  t.log('start basicFlows');
  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/orchestration/init-basic-flows.js',
      ['--chainInfo', JSON.stringify(withChainCapabilities(minimalChainInfos))],
    ),
  );

  t.log('making offer');
  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');
  const id1 = 'make-orch-account';
  // send because it won't resolve
  await wallet.sendOffer({
    id: id1,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makeOrchAccountInvitation']],
    },
    proposal: {},
    offerArgs: {
      chainName: 'cosmoshub',
    },
  });
  // no errors and no result yet
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id1,
      error: undefined,
      numWantsSatisfied: 1,
      payouts: {},
      result: undefined, // no property
    },
  });
  // 1x ICQ Channel Open
  t.is(getInboundQueueLength(), 1);
  t.log('flush and verify results');
  const beforeFlush = wallet.getLatestUpdateRecord();
  t.like(beforeFlush, {
    status: {
      result: undefined,
    },
  });
  t.is(await flushInboundQueue(1), 1);
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id1,
      error: undefined,
      result: 'UNPUBLISHED',
    },
  });

  const id2 = 'makePortfolio';
  await wallet.sendOffer({
    id: id2,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['basicFlows'],
      callPipe: [['makePortfolioAccountInvitation']],
    },
    proposal: {},
    offerArgs: {
      chainNames: ['agoric', 'cosmoshub', 'osmosis'],
    },
  });
  // no errors and no result yet
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id2,
      error: undefined,
      numWantsSatisfied: 1,
      payouts: {},
      result: undefined, // no property
    },
  });
  // 3x ICA Channel Opens
  t.is(getInboundQueueLength(), 3);

  t.log('restart basicFlows');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/restart-basic-flows.js'),
  );

  t.is(await flushInboundQueue(3), 3);
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: id2,
      error: undefined,
      result: 'UNPUBLISHED',
    },
  });
});
