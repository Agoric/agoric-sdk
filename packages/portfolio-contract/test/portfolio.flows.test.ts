/**
 * @file openPortfolio flow tests; especially failure modes.
 *
 * @see {@link snapshots/portfolio-open.test.ts.md} for expected call logs.
 *
 * To facilitate review of snapshot diffs, add new tests *at the end*.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { GuestInterface } from '@agoric/async-flow';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { AmountMath, makeIssuerKit, type NatAmount } from '@agoric/ertp';
import { mustMatch } from '@agoric/internal';
import {
  defaultSerializer,
  documentStorageSchema,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import {
  denomHash,
  type ActualChainInfo,
  type ChainInfo,
  type IBCConnectionInfo,
  type Orchestrator,
} from '@agoric/orchestration';
import { buildGasPayload } from '@agoric/orchestration/src/utils/gmp.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import {
  RebalanceStrategy,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools, type VowTools } from '@agoric/vow';
import type { Proposal, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeHeapZone } from '@agoric/zone';
import { Far, passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import {
  openPortfolio,
  parseInboundTransfer,
  rebalance,
  wayFromSrcToDesc,
  type PortfolioInstanceContext,
} from '../src/portfolio.flows.ts';
import {
  makeSwapLockMessages,
  makeUnlockSwapMessages,
} from '../src/pos-usdn.flows.ts';
import { prepareResolverKit } from '../src/resolver/resolver.exo.js';
import { PENDING_TXS_NODE_KEY } from '../src/resolver/types.ts';
import {
  makeOfferArgsShapes,
  type OfferArgsFor,
} from '../src/type-guards-steps.ts';
import { makeProposalShapes, type ProposalType } from '../src/type-guards.ts';
import { makePortfolioSteps } from '../tools/portfolio-actors.ts';
import { decodeFunctionCall } from './abi-utils.ts';
import {
  axelarIdsMock,
  contractsMock,
  evmNamingDistinction,
  gmpAddresses,
} from './mocks.ts';
import {
  axelarCCTPConfig,
  makeIncomingEVMEvent,
  makeIncomingVTransferEvent,
} from './supports.ts';

// Use an EVM chain whose axelar ID differs from its chain name
const { sourceChain } = evmNamingDistinction;

const theExit = harden(() => {}); // for ava comparison
// @ts-expect-error mock
const mockZCF: ZCF = Far('MockZCF', {
  makeEmptySeatKit: () =>
    ({
      zcfSeat: Far('MockZCFSeat', { exit: theExit }),
    }) as unknown as ZCF,
});

const { brand: USDC } = makeIssuerKit('USDC');
const { brand: BLD } = makeIssuerKit('BLD');
const { make } = AmountMath;

// XXX move to mocks.ts?
const makeVowToolsAreJustPromises = () => {
  const vowTools = harden({
    makeVowKit: () => {
      const { resolve, reject, promise } = makePromiseKit();
      const resolver = Far('FakeVowResolver', { resolve, reject });
      return harden({
        resolver,
        vow: promise,
      });
    },
    when: async (specimen, onFulfilled, onRejected) =>
      Promise.resolve(specimen).then(onFulfilled, onRejected),
    watch: (specimen, watcher, ...watcherArgs) => {
      let onFulfilled;
      if (watcher?.onFulfilled) {
        onFulfilled = value => watcher.onFulfilled(value, ...watcherArgs);
      }
      let onRejected;
      if (watcher?.onRejected) {
        onRejected = err => watcher.onRejected(err, ...watcherArgs);
      }
      return vowTools.when(specimen, onFulfilled, onRejected);
    },
    asVow: async thunk => thunk(),
  }) as any; // mock
  return vowTools as VowTools;
};

// XXX move to mocks.ts for readability?
const mocks = (
  errs: Record<string, Error> = {},
  give: ProposalType['openPortfolio']['give'] = {},
) => {
  const buf = [] as any[];
  const log = ev => {
    buf.push(ev);
  };
  let nonce = 0;
  const tapPK = makePromiseKit<TargetApp>();
  const factoryPK = makePromiseKit();
  const chains = new Map();
  const orch = harden({
    async getChain(name: string) {
      if (chains.has(name)) return chains.get(name);
      const chainId = `${name}-${name.length}`;
      const stakingTokens = {
        noble: undefined,
        axelar: [{ denom: 'uaxl' }],
      }[name];
      const it = harden({
        getChainInfo() {
          if (name in axelarCCTPConfig) {
            return axelarCCTPConfig[name];
          }
          return harden({ chainId, stakingTokens });
        },
        async makeAccount() {
          const addr = harden({
            chainId,
            value: `${name}1${1000 + 7 * (nonce += 2)}`,
          });
          const account = {
            getAddress() {
              return addr;
            },
            async send(toAccount, amount) {
              // XXX simulate errors?
              log({ _cap: addr.value, _method: 'send', toAccount, amount });
            },
            async transfer(address, amount, opts) {
              if (!('denom' in amount)) throw Error('#10449');
              log({
                _cap: addr.value,
                _method: 'transfer',
                address,
                amount,
                opts,
              });
              const { transfer: err } = errs;
              if (err && !err.message.includes(address.chainId)) throw err;
              if (opts?.memo) factoryPK.resolve(opts.memo);
            },
            async executeEncodedTx(msgs) {
              log({ _cap: addr.value, _method: 'executeEncodedTx', msgs });
              const { executeEncodedTx: err } = errs;
              if (err) throw err;
              return harden(msgs.map(_ => ({})));
            },
          };
          if (name === 'agoric') {
            return Far('AgoricAccount', {
              ...account,
              monitorTransfers: async tap => {
                log({ _cap: addr.value, _method: 'monitorTransfers', tap });
                tapPK.resolve(tap);
                const reg = harden({});
                return reg;
              },
              parseInboundTransfer: async (
                packet: VTransferIBCEvent['packet'],
              ) => {
                const ftPacketData = JSON.parse(atob(packet.data));
                const {
                  denom: transferDenom,
                  sender,
                  receiver,
                  amount,
                } = ftPacketData as FungibleTokenPacketData;

                let denomOrTrace;

                const prefix = `${packet.source_port}/${packet.source_channel}/`;
                if (transferDenom.startsWith(prefix)) {
                  denomOrTrace = transferDenom.slice(prefix.length);
                } else {
                  denomOrTrace = `${packet.destination_port}/${packet.destination_channel}/${transferDenom}`;
                }

                const localDenom = denomOrTrace.match(/^([^/]+)(\/[^\/]+)?$/)
                  ? denomOrTrace
                  : `ibc/${denomHash(denomOrTrace.match(/^(?<path>[^/]+\/[^/]+)\/(?<denom>.*)$/)?.groups)}`;

                return harden({
                  amount: {
                    value: BigInt(amount),
                    denom: localDenom,
                  },
                  extra: {
                    ...ftPacketData,
                  },
                  fromAccount: sender,
                  toAccount: receiver,
                });
              },
            });
          }
          if (name === 'noble') {
            return Far('NobleAccount', {
              ...account,
              depositForBurn: (destinationAddress, denomAmount) => {
                if (!('denom' in denomAmount)) throw Error('#10449');
                log({
                  _cap: addr.value,
                  _method: 'depositForBurn',
                  destinationAddress,
                  denomAmount,
                });
              },
            });
          }
          return Far('Account', account);
        },
      });
      chains.set(name, it);
      return it;
    },
  }) as unknown as Orchestrator;

  const zone = makeHeapZone();

  const zoeTools = harden({
    async localTransfer(sourceSeat, localAccount, amounts) {
      log({ _method: 'localTransfer', sourceSeat, localAccount, amounts });
      const { localTransfer: err } = errs;
      if (err) throw err;
    },
    async withdrawToSeat(localAccount, destSeat, amounts) {
      log({ _method: 'withdrawToSeat', localAccount, destSeat, amounts });
    },
  }) as GuestInterface<ZoeTools>;

  const vowTools: VowTools = makeVowToolsAreJustPromises();

  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();

  const storage = makeFakeStorageKit('published', { sequence: true });
  const ymaxNode = storage.rootNode.makeChildNode('ymax0');
  const pendingTxsNode = ymaxNode.makeChildNode(PENDING_TXS_NODE_KEY);
  const portfoliosNode = ymaxNode.makeChildNode('portfolios');
  const timer = buildZoeManualTimer();

  const denom = `ibc/${denomHash({ channelId: 'channel-123', denom: 'uusdc' })}`;

  const inertSubscriber = {} as ResolvedPublicTopic<never>['subscriber'];

  const resolverZone = zone.subZone('Resolver');
  // Use actual vow tools for the resolver to create proper vows, not promises
  const resolverVowTools = prepareVowTools(zone.subZone('vowTools'));
  const { client: resolverClient } = prepareResolverKit(resolverZone, mockZCF, {
    vowTools: resolverVowTools,
    pendingTxsNode,
    marshaller,
  })();

  const ctx1: PortfolioInstanceContext = {
    zoeTools,
    usdc: { denom, brand: USDC },
    axelarIds: axelarIdsMock,
    contracts: contractsMock,
    gmpFeeInfo: { brand: BLD, denom: 'ubld' },
    inertSubscriber,
    gmpAddresses,
    resolverClient: resolverClient as unknown as GuestInterface<
      PortfolioInstanceContext['resolverClient']
    >,
    contractAccount: orch.getChain('agoric').then(ch => ch.makeAccount()),
  };

  const chainHubTools = harden({
    getChainInfo: (chainName: string) => {
      if (chainName === 'agoric' || chainName === 'axelar') {
        return { chainId: chainName } as Partial<ChainInfo>;
      }
      if (!(chainName in axelarCCTPConfig)) {
        throw Error(`unable to get chainInfo for ${chainName}`);
      }
      return axelarCCTPConfig[chainName];
    },
    getChainsAndConnection: <C1 extends string, C2 extends string>(
      primaryChainName: C1,
      secondaryChainName: C2,
    ) =>
      vowTools.asVow(() => {
        const primaryChain = chainHubTools.getChainInfo(primaryChainName);
        const secondaryChain = chainHubTools.getChainInfo(secondaryChainName);
        return [
          primaryChain,
          secondaryChain,
          {
            transferChannel: {
              channelId: 'channel-9',
              counterpartyChannelId: 'channel-41',
            },
          } as unknown,
        ] as [ActualChainInfo<C1>, ActualChainInfo<C2>, IBCConnectionInfo];
      }),
  });

  const rebalanceHost = (seat, offerArgs, kit) =>
    rebalance(orch, ctx1, seat, offerArgs, kit);
  const parseInboundTransferHost = (packet, kit) =>
    parseInboundTransfer(orch, ctx1, packet, kit);
  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf: mockZCF,
    axelarIds: axelarIdsMock,
    gmpAddresses,
    vowTools,
    timer,
    chainHubTools,
    rebalance: rebalanceHost as any,
    parseInboundTransfer: parseInboundTransferHost as any,
    proposalShapes: makeProposalShapes(USDC, BLD),
    offerArgsShapes: makeOfferArgsShapes(USDC),
    marshaller,
    portfoliosNode,
    usdcBrand: USDC,
  });
  const makePortfolioKitGuest = () =>
    makePortfolioKit({
      portfolioId: 1,
    }) as unknown as GuestInterface<PortfolioKit>;

  const proposal: Proposal = harden({ give, want: {} });
  let hasExited = false;
  const seat = {
    getProposal: () => proposal,
    hasExited: () => hasExited,
    exit(completion) {
      if (hasExited) throw Error('already exited');
      log({ _cap: 'seat', _method: 'exit', completion });
      hasExited = true;
    },
    fail(reason) {
      if (hasExited) throw Error('already exited');
      log({ _cap: 'seat', _method: 'fail', reason });
      hasExited = true;
    },
  } as ZCFSeat;

  return {
    orch,
    tapPK,
    ctx: { ...ctx1, makePortfolioKit: makePortfolioKitGuest },
    offer: { log: buf, seat, factoryPK },
    storage,
    vowTools,
  };
};

/* eslint-disable no-underscore-dangle */
/* We use _method to get it to sort before other properties. */

const docOpts = {
  node: 'ymax0',
  owner: 'ymax',
  showValue: defaultSerializer.parse,
};

test('open portfolio with no positions', async t => {
  const { orch, ctx, offer, storage } = mocks();
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, {});
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [{ _method: 'monitorTransfers' }, { _method: 'exit' }]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

// XXX unlock too. use snapshot
test('Noble Dollar Swap, Lock messages', t => {
  const signer =
    'noble1reheu4ym85k9gktyf9vzhzt0zvqym9txwejsj4vaxdrw98wm4emsddarrd' as const;
  {
    const actual = makeSwapLockMessages(
      { value: signer, chainId: 'grand-1', encoding: 'bech32' },
      1200000n,
      { usdnOut: 1188000n, vault: 1 },
    );
    t.snapshot(actual, 'swap 1.2USDC for 1.188USDN');
  }

  {
    const actual = makeSwapLockMessages(
      { value: 'cosmos1test', chainId: 'grand-1', encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1 },
    );
    t.snapshot(actual, 'swap 5K USDC at parity');
  }

  {
    const actual = makeUnlockSwapMessages(
      { value: 'cosmos1test', chainId: 'grand-1', encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1, usdnOut: 4_900n * 1_000_000n },
    );
    t.snapshot(actual, 'un-swap 5K USDN < parity');
  }
});

test('makePortfolioSteps for USDN position', t => {
  const actual = makePortfolioSteps({ USDN: make(USDC, 50n * 1_000_000n) });

  const amount = make(USDC, 50n * 1_000_000n);
  const detail = { usdnOut: 49500000n };
  t.deepEqual(actual, {
    give: { Deposit: { brand: USDC, value: 50_000_000n } },
    steps: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDNVault', amount, detail },
    ],
  });
});

test('open portfolio with USDN position', async t => {
  const { give, steps } = makePortfolioSteps({ USDN: make(USDC, 50_000_000n) });
  const { orch, ctx, offer, storage } = mocks({}, give);
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, { flow: steps });
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

const openAndTransfer = test.macro(
  async (
    t,
    goal: Partial<Record<YieldProtocol, NatAmount>>,
    makeEvents: () => VTransferIBCEvent[],
  ) => {
    const { give, steps } = makePortfolioSteps(goal, { feeBrand: BLD });
    const { orch, ctx, offer, storage, tapPK } = mocks({}, give);
    const { log, seat } = offer;

    const [actual] = await Promise.all([
      openPortfolio(orch, ctx, seat, { flow: steps }),
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
        async ([tap, _]) => {
          for (const event of makeEvents()) {
            t.log(`tap.receiveUpcall(${event})`);
            await tap.receiveUpcall(event);
          }
        },
      ),
    ]);
    t.log(log.map(msg => msg._method).join(', '));

    t.snapshot(log, 'call log'); // see snapshot for call log
    t.is(passStyleOf(actual.invitationMakers), 'remotable');
    await documentStorageSchema(t, storage, docOpts);
  },
);

test(
  'open portfolio with Aave and USDN positions then inbound GMP',
  openAndTransfer,
  { Aave: make(USDC, 3_333_000_000n), USDN: make(USDC, 3_333_000_000n) },
  () => [makeIncomingEVMEvent({ sourceChain })],
);

test('open portfolio with Aave position', async t => {
  const amount = AmountMath.make(USDC, 300n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const detail = { evmGas: 50n };
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage } = mocks({}, { Deposit: amount });

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct, detail },
        { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) =>
      tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain })),
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 300n } },
    },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);

  t.like(
    JSON.parse(log[4].opts.memo),
    { payload: buildGasPayload(50n) },
    '1st transfer to axelar carries evmGas for return message',
  );

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('reject missing fee before committing anything', t => {
  const amount = AmountMath.make(USDC, 300n);
  t.throws(() =>
    wayFromSrcToDesc({ src: '@Arbitrum', dest: 'Compound_Arbitrum', amount }),
  );
});

test('open portfolio with Compound position', async t => {
  const { give, steps } = makePortfolioSteps(
    { Compound: make(USDC, 300n) },
    { fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } } },
  );
  const { orch, tapPK, ctx, offer, storage } = mocks({}, give);

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      flow: steps,
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) =>
      tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain })),
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Deposit: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in localTransfer from seat to local account', async t => {
  const amount = make(USDC, 100n);
  const { orch, ctx, offer, storage } = mocks(
    { localTransfer: Error('localTransfer from seat failed') },
    { Deposit: amount },
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: [{ src: '<Deposit>', dest: '@agoric', amount }],
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'fail' },
  ]);
  t.log('we still get the invitationMakers and ICA address');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in IBC transfer', async t => {
  const { give, steps } = makePortfolioSteps({ USDN: make(USDC, 100n) });
  const { orch, ctx, offer, storage } = mocks(
    { transfer: Error('IBC is on the fritz!!') },
    give,
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: steps,
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-5' } }, // failed
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in executeEncodedTx', async t => {
  const { give, steps } = makePortfolioSteps({ USDN: make(USDC, 100n) });
  const { orch, ctx, offer, storage } = mocks(
    { executeEncodedTx: Error('exec swaplock went kerflewey') },
    give,
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: steps,
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' }, // fail
    { _method: 'transfer', address: { chainId: 'agoric-6' } }, // unwind
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in recovery from executeEncodedTx', async t => {
  const amount = make(USDC, 100n);
  const { orch, ctx, offer, storage } = mocks(
    {
      executeEncodedTx: Error('cannot swap. your money is no good here'),
      transfer: Error('road from noble-5 washed out'),
    },
    { Deposit: amount },
  );
  const { log, seat } = offer;

  const detail = { usdnOut: 100n };
  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDNVault', amount, detail },
    ],
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' }, // fail
    { _method: 'transfer', address: { chainId: 'agoric-6' } }, // fail to recover
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in sendGmp with Aave position', async t => {
  const amount = AmountMath.make(USDC, 300n);
  const feeAcct = AmountMath.make(BLD, 300n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage } = mocks(
    { transfer: Error('ag->axelar: SOS!') },
    { Deposit: amount },
  );

  // Start the openPortfolio flow
  const portfolioPromise = openPortfolio(orch, { ...ctx }, offer.seat, {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
    ],
  });

  // Ensure the upcall happens to resolve getGMPAddress(), then let the transfer fail
  // the failure is expected before offer.factoryPK resolves, so don't wait for it.
  const tap = await tapPK.promise;
  await tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain }));

  const actual = await portfolioPromise;
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Account: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'axelar-5' } }, // fails
    { _method: 'withdrawToSeat' }, // sendGmp recovery
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test(
  'open portfolio with Compound and USDN positions then rebalance',
  openAndTransfer,
  { Aave: make(USDC, 3_333_000_000n), USDN: make(USDC, 3_333_000_000n) },
  () => [
    makeIncomingEVMEvent({ sourceChain }),
    makeIncomingVTransferEvent({
      hookQuery: { rebalance: RebalanceStrategy.Preset },
      amount: 1_000_000_000n,
      denom: `transfer/channel-1/uusdc`,
    }),
  ],
);

test('rebalance handles stepFlow failure correctly', async t => {
  const { orch, ctx, offer } = mocks(
    {
      // Mock a failure in IBC transfer
      transfer: Error('IBC transfer failed'),
    },
    { Deposit: make(USDC, 500n) },
  );

  const { log, seat } = offer;

  const badOfferArgs: OfferArgsFor['rebalance'] = {
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount: make(USDC, 500n) },
      { src: '@agoric', dest: '@noble', amount: make(USDC, 500n) },
      // This will trigger the mocked transfer error
      { src: '@noble', dest: 'USDN', amount: make(USDC, 500n) },
    ],
  };

  await t.throwsAsync(() =>
    rebalance(orch, ctx, seat, badOfferArgs, ctx.makePortfolioKit()),
  );

  // Check that seat.fail() was called, not seat.exit()
  const seatCalls = log.filter(entry => entry._cap === 'seat');
  const failCall = seatCalls.find(call => call._method === 'fail');
  const exitCall = seatCalls.find(call => call._method === 'exit');

  t.truthy(failCall, 'seat.fail() should be called on error');
  t.falsy(exitCall, 'seat.exit() should not be called on error');
  t.snapshot(log, 'call log');
});

test('claim rewards on Aave position', async t => {
  const amount = AmountMath.make(USDC, 300n);
  const emptyAmount = AmountMath.make(USDC, 0n);
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage } = mocks({}, { Deposit: amount });

  const kit = await ctx.makePortfolioKit();
  await Promise.all([
    rebalance(
      orch,
      ctx,
      offer.seat,
      {
        flow: [
          {
            dest: '@Arbitrum',
            src: 'Aave_Arbitrum',
            amount: emptyAmount,
            fee: feeCall,
            claim: true,
          },
        ],
      },
      kit,
    ),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) =>
      tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain })),
    ),
  ]);

  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  const rawMemo = log[4].opts.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'claimAllRewardsToSelf(address[])',
    'withdraw(address,uint256,address)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');

  await documentStorageSchema(t, storage, docOpts);
});

test('open portfolio with Beefy position', async t => {
  const amount = AmountMath.make(USDC, 300n);
  const feeAcct = AmountMath.make(BLD, 50n);
  const detail = { evmGas: 50n };
  const feeCall = AmountMath.make(BLD, 100n);
  const { orch, tapPK, ctx, offer, storage } = mocks({}, { Deposit: amount });

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Avalanche', amount, fee: feeAcct, detail },
        {
          src: '@Avalanche',
          dest: 'Beefy_re7_Avalanche',
          amount,
          fee: feeCall,
        },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) =>
      tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain: 'Avalanche' })),
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 300n } },
    },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);

  const rawMemo = log[7].opts.memo;
  const decodedCalls = decodeFunctionCall(rawMemo, [
    'approve(address,uint256)',
    'deposit(uint256)',
  ]);
  t.snapshot(decodedCalls, 'decoded calls');
});

test('wayFromSrcToDesc handles +agoric -> @agoric', t => {
  const amount = AmountMath.make(USDC, 300n);
  const actual = wayFromSrcToDesc({ src: '+agoric', dest: '@agoric', amount });
  t.deepEqual(actual, { how: 'send' });
});

test('Engine can move deposits +agoric -> @agoric', async t => {
  const { orch, ctx, offer, storage } = mocks({}, {});
  const { log } = offer;

  const amount = AmountMath.make(USDC, 300n);
  const kit = await ctx.makePortfolioKit();

  await rebalance(
    orch,
    ctx,
    offer.seat,
    { flow: [{ src: '+agoric', dest: '@agoric', amount }] },
    kit,
  );

  t.log(log.map(msg => msg._method).join(', '));

  const lca = kit.reader.getLocalAccount();
  t.is(lca.getAddress().value, 'agoric11028');
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'send', toAccount: { value: 'agoric11028' } },
  ]);

  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  await documentStorageSchema(t, storage, docOpts);
});

test('client can move to deposit LCA', async t => {
  const { orch, ctx, offer, storage } = mocks({}, {});
  const { log } = offer;

  const amount = AmountMath.make(USDC, 300n);
  const kit = await ctx.makePortfolioKit();

  await rebalance(
    orch,
    ctx,
    offer.seat,
    { flow: [{ src: '<Deposit>', dest: '+agoric', amount }] },
    kit,
  );
  t.like(log, [{ _method: 'monitorTransfers' }, { _method: 'localTransfer' }]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  await documentStorageSchema(t, storage, docOpts);
});

test('receiveUpcall returns false if sender is not AXELAR_GMP', async t => {
  const { give, steps } = makePortfolioSteps(
    { Compound: make(USDC, 300n) },
    { fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } } },
  );
  const { orch, tapPK, ctx, offer } = mocks({}, give);

  // The portfolio flow will hang waiting for valid GMP, so we don't await it
  // This is expected behavior - the test just needs to verify receiveUpcall validation
  void openPortfolio(orch, { ...ctx }, offer.seat, {
    flow: steps,
  });

  const tap = await tapPK.promise;

  const upcallProcessed = await tap.receiveUpcall(
    makeIncomingEVMEvent({ sourceChain, sender: makeTestAddress() }),
  );

  t.is(upcallProcessed, false, 'upcall indicates bad GMP sender');
});

test.todo('recover from send step');
