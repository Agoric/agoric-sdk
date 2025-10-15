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
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  denomHash,
  type Bech32Address,
  type Orchestrator,
} from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { buildGasPayload } from '@agoric/orchestration/src/utils/gmp.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import {
  RebalanceStrategy,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { type VowTools } from '@agoric/vow';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeHeapZone } from '@agoric/zone';
import { Far, passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import {
  executePlan,
  onAgoricTransfer,
  openPortfolio,
  rebalance,
  wayFromSrcToDesc,
  type OnTransferContext,
  type PortfolioInstanceContext,
} from '../src/portfolio.flows.ts';
import {
  makeSwapLockMessages,
  makeUnlockSwapMessages,
} from '../src/pos-usdn.flows.ts';
import { TxStatus } from '../src/resolver/constants.js';
import { prepareResolverKit } from '../src/resolver/resolver.exo.js';
import {
  PENDING_TXS_NODE_KEY,
  type PublishedTx,
} from '../src/resolver/types.ts';
import {
  makeOfferArgsShapes,
  type MovementDesc,
  type OfferArgsFor,
} from '../src/type-guards-steps.ts';
import { makeProposalShapes, type ProposalType } from '../src/type-guards.ts';
import { makePortfolioSteps } from '../tools/plan-transfers.ts';
import { decodeFunctionCall } from './abi-utils.ts';
import {
  axelarIdsMock,
  contractsMock,
  evmNamingDistinction,
  gmpAddresses,
  planUSDNDeposit,
} from './mocks.ts';
import {
  axelarCCTPConfig,
  makeIncomingEVMEvent,
  makeIncomingVTransferEvent,
  makeStorageTools,
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

const makeMockSeat = <M extends keyof ProposalType>(
  give: ProposalType[M]['give'] = {},
  want: ProposalType[M]['want'] = {},
  buf: any[] = [],
) => {
  const proposal = harden({ give, want });
  let hasExited = false;
  return {
    getProposal: () => proposal,
    hasExited: () => hasExited,
    exit(completion) {
      if (hasExited) throw Error('already exited');
      hasExited = true;
      buf.push({ _cap: 'seat', _method: 'exit', completion });
    },
    fail(reason) {
      if (hasExited) throw Error('already exited');
      hasExited = true;
      buf.push({ _cap: 'seat', _method: 'fail', reason });
    },
  } as any as ZCFSeat;
};

// XXX move to mocks.ts for readability?
const mocks = (
  errs: Record<string, Error | Map<string, Error>> = {},
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
          const { makeAccount: makeAcctErr } = errs;
          if (makeAcctErr) {
            if (makeAcctErr instanceof Map) {
              const err = makeAcctErr.get(name);
              if (err) throw err;
            } else {
              throw makeAcctErr;
            }
          }

          const addr = harden({
            chainId,
            value: `${name}1${1000 + 7 * (nonce += 2)}`,
          });
          const account = {
            getAddress() {
              return addr;
            },
            async send(toAccount, amount) {
              const { send: sendErr } = errs;
              if (sendErr && amount?.value === 13n) throw sendErr;
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
              if (
                err &&
                !(err instanceof Map) &&
                !err.message.includes(address.chainId)
              )
                throw err;
              if (opts?.memo && address.value.startsWith('axelar1')) {
                factoryPK.resolve(opts.memo);
              }
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

                const localDenom = denomOrTrace.match(/^([^/]+)(\/[^/]+)?$/)
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

  const denom = `ibc/${denomHash({ channelId: 'channel-123', denom: 'uusdc' })}`;

  const inertSubscriber = {} as ResolvedPublicTopic<never>['subscriber'];

  const resolverZone = zone.subZone('Resolver');
  const { client: resolverClient, service: resolverService } =
    prepareResolverKit(resolverZone, mockZCF, {
      vowTools,
      pendingTxsNode,
      marshaller,
    })();

  const transferChannels = {
    noble: fetchedChainInfo.agoric.connections['noble-1'].transferChannel,
    axelar:
      fetchedChainInfo.agoric.connections['axelar-dojo-1'].transferChannel,
  } as const;

  const txfrCtx: OnTransferContext = {
    axelarIds: axelarIdsMock,
    gmpAddresses,
    resolverService,
    transferChannels,
  };

  const onAgoricTransferHost = (event, kit) =>
    onAgoricTransfer(orch, txfrCtx, event, kit);

  const ctx1: PortfolioInstanceContext = {
    axelarIds: axelarIdsMock,
    contracts: contractsMock,
    gmpAddresses,
    usdc: { brand: USDC, denom },
    gmpFeeInfo: { brand: BLD, denom: 'uaxl' },
    inertSubscriber,
    zoeTools,
    resolverClient,
    contractAccount: orch.getChain('agoric').then(ch => ch.makeAccount()),
    transferChannels,
  };

  const rebalanceHost = (seat, offerArgs, kit) =>
    rebalance(orch, ctx1, seat, offerArgs, kit);

  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf: mockZCF,
    axelarIds: axelarIdsMock,
    gmpAddresses,
    vowTools,
    transferChannels,
    rebalance: rebalanceHost as any,
    onAgoricTransfer: onAgoricTransferHost as any,
    proposalShapes: makeProposalShapes(USDC, BLD),
    offerArgsShapes: makeOfferArgsShapes(USDC),
    marshaller,
    portfoliosNode,
    usdcBrand: USDC,
    ...(null as any),
  });
  const makePortfolioKitGuest = () =>
    makePortfolioKit({
      portfolioId: 1,
    }) as unknown as GuestInterface<PortfolioKit>;

  const seat = makeMockSeat(give, undefined, buf);

  /**
   * Read pure data (CapData that has no slots) from the storage path
   */
  const getDeserialized = (path: string): unknown[] => {
    return storage.getValues(path).map(defaultSerializer.parse);
  };

  const txResolver = harden({
    findPending: async () => {
      await eventLoopIteration();
      const paths = [...storage.data.keys()].filter(k =>
        k.includes('.pendingTxs.'),
      );
      const txIds: `tx${number}`[] = [];
      for (const p of paths) {
        const info = getDeserialized(p).at(-1) as PublishedTx;
        if (info.status !== 'pending') continue;
        const txId = p.split('.').at(-1) as `tx${number}`;

        if (info.type === 'CCTP_TO_AGORIC') {
          // console.debug('CCTP_TO_AGORIC', txId, info);
          const { amount, destinationAddress: cctpDest } = info;
          const { accountAddress: target } = parseAccountId(cctpDest);
          const tap = await tapPK.promise;
          const fwdEvent = makeIncomingVTransferEvent({
            sender: 'noble1fwd',
            sourceChannel: 'channel-99999',
            destinationChannel: transferChannels.noble.channelId,
            target,
            receiver: target as Bech32Address,
            amount,
            memo: '{"noteWell":"abc"}',
          });
          await tap.receiveUpcall(fwdEvent);
          continue;
        }

        txIds.push(txId);
      }
      return harden(txIds);
    },
    drainPending: async (status: Exclude<TxStatus, 'pending'> = 'success') => {
      for (;;) {
        const txIds = await txResolver.findPending();
        if (!txIds.length) break;
        for (const txId of txIds) {
          resolverService.settleTransaction({ txId, status });
        }
      }
    },
  });

  return {
    orch,
    tapPK,
    ctx: { ...ctx1, makePortfolioKit: makePortfolioKitGuest },
    offer: { log: buf, seat, factoryPK },
    storage: {
      ...storage,
      getDeserialized,
    },
    vowTools,
    txResolver,
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

  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'exit' },
  ]);
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
      { value: 'noble1test', chainId: 'grand-1', encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1 },
    );
    t.snapshot(actual, 'swap 5K USDC at parity');
  }

  {
    const actual = makeUnlockSwapMessages(
      { value: 'noble1test', chainId: 'grand-1', encoding: 'bech32' },
      5_000n * 1_000_000n,
      { vault: 1, usdnOut: 4_900n * 1_000_000n },
    );
    t.snapshot(actual, 'un-swap 5K USDN < parity');
  }
});

test('makePortfolioSteps for USDN position', async t => {
  const actual = await makePortfolioSteps({
    USDN: make(USDC, 50n * 1_000_000n),
  });

  const amount = make(USDC, 50n * 1_000_000n);
  const detail = { usdnOut: 49499999n };
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
  const { give, steps } = await makePortfolioSteps({
    USDN: make(USDC, 50_000_000n),
  });
  const { orch, ctx, offer, storage } = mocks({}, give);
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, { flow: steps });
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'executeEncodedTx', _cap: 'noble11056' },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);

  const { getPortfolioStatus } = makeStorageTools(storage);
  const { flowsRunning = {} } = await getPortfolioStatus(1);
  t.deepEqual(flowsRunning, {}, 'all flows are done by now');
});

const openAndTransfer = test.macro(
  async (
    t,
    goal: Partial<Record<YieldProtocol, NatAmount>>,
    makeEvents: () => VTransferIBCEvent[],
  ) => {
    const { give, steps } = await makePortfolioSteps(goal, { feeBrand: BLD });
    const { orch, ctx, offer, storage, tapPK, txResolver } = mocks({}, give);
    const { log, seat } = offer;

    const [actual] = await Promise.all([
      openPortfolio(orch, ctx, seat, { flow: steps }),
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
        async ([tap, _]) => {
          for (const event of makeEvents()) {
            t.log(`tap.receiveUpcall(${event})`);
            await tap.receiveUpcall(event);
          }
          await txResolver.drainPending();
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
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, ctx, offer.seat, {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct, detail },
        { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
      ],
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
      async ([tap]) => {
        // Complete GMP transaction
        await txResolver.drainPending();
        await tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain }));
        // Complete CCTP transaction
        await txResolver.drainPending();
      },
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: 'noble-5' } },

    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 300n } },
    },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);

  t.like(
    JSON.parse(log[3].opts.memo),
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
  const { give, steps } = await makePortfolioSteps(
    { Compound: make(USDC, 300n) },
    { fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } } },
  );
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks({}, give);

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      flow: steps,
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
      async ([tap, _]) => {
        await tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain }));
        await txResolver.drainPending();
      },
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'localTransfer', amounts: { Deposit: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
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
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'fail' },
  ]);
  t.log('we still get the invitationMakers and ICA address');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

// IBC failure causes NFA set-up to fail
test.skip('handle failure in IBC transfer', async t => {
  const { give, steps } = await makePortfolioSteps({ USDN: make(USDC, 100n) });
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
    { _method: 'transfer', address: { chainId: 'noble-5' } },
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
  const { give, steps } = await makePortfolioSteps({ USDN: make(USDC, 100n) });
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
    { _method: 'transfer', address: { chainId: 'noble-5' } },
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
    { _method: 'transfer', address: { chainId: 'noble-5' } },
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
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

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
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
      async ([tap, _]) => {
        await tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain }));
        await txResolver.drainPending();
      },
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
  const { orch, tapPK, ctx, offer, storage, txResolver } = mocks(
    {},
    { Deposit: amount },
  );

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
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
      async ([tap, _]) => {
        await tap.receiveUpcall(
          makeIncomingEVMEvent({ sourceChain: 'Avalanche' }),
        );

        await txResolver.drainPending();
      },
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    {
      _method: 'localTransfer',
      amounts: { Deposit: { value: 300n } },
    },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);

  const rawMemo = log[8].opts.memo;
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
  const { give, steps } = await makePortfolioSteps(
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
  // XXX resolution of tapPK entails that reg = await monitorTransfers() has been called,
  // but not that resolveAccount({... lca, reg }) has been called
  await eventLoopIteration();

  const upcallProcessed = await tap.receiveUpcall(
    makeIncomingEVMEvent({ sourceChain, sender: makeTestAddress() }),
  );

  t.is(upcallProcessed, false, 'upcall indicates bad GMP sender');
});

test('handle failure in provideCosmosAccount makeAccount', async t => {
  const amount = make(USDC, 100n);
  const chainToErr = new Map([['noble', Error('timeout creating ICA')]]);

  const { give, steps } = await makePortfolioSteps({ USDN: amount });
  const { orch, ctx, offer, storage } = mocks(
    { makeAccount: chainToErr },
    give,
  );
  const { log } = offer;

  // Create portfolio once for both attempts
  const kit = await ctx.makePortfolioKit();

  // First attempt - will fail creating noble account
  const seat1 = makeMockSeat({ Deposit: amount }, undefined, log);

  const attempt1 = rebalance(orch, ctx, seat1, { flow: steps }, kit);

  await t.throwsAsync(
    attempt1,
    { message: 'timeout creating ICA' },
    'rebalance should fail when noble account creation fails',
  );

  // Check failure evidence
  const failCall = log.find(entry => entry._method === 'fail');
  t.truthy(
    failCall,
    'seat.fail() should be called when noble account creation fails',
  );

  const { getPortfolioStatus } = makeStorageTools(storage);

  // Check portfolio status shows limited accounts (only agoric, no noble due to failure)
  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.true('agoric' in byChain, 'agoric account should be present');
    t.false(
      'noble' in byChain,
      'noble account should not be present due to failure',
    );
  }

  // Recovery attempt - clear the error and use same portfolio
  chainToErr.delete('noble');

  const seat2 = makeMockSeat({ Deposit: amount }, undefined, log);

  await rebalance(orch, ctx, seat2, { flow: steps }, kit);

  const exitCall = log.find(entry => entry._method === 'exit');
  t.truthy(exitCall, 'seat.exit() should be called on successful recovery');

  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.deepEqual(
      Object.keys(byChain),
      ['agoric', 'noble'],
      'portfolio includes noble account',
    );
  }
});

test('handle failure in provideEVMAccount sendMakeAccountCall', async t => {
  const unlucky = make(BLD, 13n);
  const { give, steps } = await makePortfolioSteps(
    { Compound: make(USDC, 300n) },
    {
      fees: { Compound: { Account: unlucky, Call: make(BLD, 100n) } },
      evm: 'Arbitrum',
    },
  );
  const { orch, ctx, offer, storage, tapPK, txResolver } = mocks(
    { send: Error('Insufficient funds - piggy bank sprang a leak') },
    give,
  );
  const { log } = offer;

  // Create portfolio once for both attempts
  const pKit = await ctx.makePortfolioKit();

  // First attempt - will fail when trying to send 13n BLD (unlucky amount)
  const seat1 = makeMockSeat(give, undefined, log);

  const attempt1P = rebalance(orch, ctx, seat1, { flow: steps }, pKit);

  await t.throwsAsync(
    attempt1P,
    { message: 'Insufficient funds - piggy bank sprang a leak' },
    'rebalance should fail when EVM account creation fails',
  );
  t.truthy(log.find(entry => entry._method === 'fail'));

  const { getPortfolioStatus, getFlowStatus } = makeStorageTools(storage);

  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    // limited accounts (no EVM account due to failure)
    t.deepEqual(Object.keys(byChain), ['agoric']);

    // TODO: "Insufficient funds" error should be visible in vstorage
    const fs = await getFlowStatus(1, 1);
    t.log(fs);
    t.deepEqual(fs, {
      state: 'fail',
      step: 0,
      how: 'makeAccount: Arbitrum',
      error: 'Insufficient funds - piggy bank sprang a leak',
    });
  }

  // Recovery attempt - avoid the unlucky 13n fee using same portfolio
  const { give: giveGood, steps: stepsGood } = await makePortfolioSteps(
    { Compound: make(USDC, 300n) },
    { fees: { Compound: { Account: make(BLD, 300n), Call: make(BLD, 100n) } } },
  );
  const seat2 = makeMockSeat(giveGood, undefined, log);
  const attempt2P = rebalance(orch, ctx, seat2, { flow: stepsGood }, pKit);

  await Promise.all([
    attempt2P,
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
      async ([tap, _]) => {
        await tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain }));

        await txResolver.drainPending();
      },
    ),
  ]);
  t.truthy(log.find(entry => entry._method === 'exit'));

  {
    const { accountIdByChain: byChain } = await getPortfolioStatus(1);
    t.deepEqual(Object.keys(byChain), ['Arbitrum', 'agoric', 'noble']);
  }
});

test.todo('recover from send step');

test('withdraw in coordination with planner', async t => {
  const { orch, ctx, offer, storage, tapPK, txResolver } = mocks({});

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  {
    const amount = make(USDC, 50_000_000n);
    const seat = makeMockSeat({ Aave: amount }, {}, offer.log);
    const feeAcct = AmountMath.make(BLD, 50n);
    const detail = { evmGas: 50n };
    const feeCall = AmountMath.make(BLD, 100n);
    const depositP = rebalance(
      orch,
      ctx,
      seat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount },
          { src: '@agoric', dest: '@noble', amount },
          { src: '@noble', dest: '@Arbitrum', amount, fee: feeAcct, detail },
          { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount, fee: feeCall },
        ],
      },
      kit,
    );
    await Promise.all([
      depositP,
      Promise.all([tapPK.promise, offer.factoryPK.promise]).then(
        async ([tap]) => {
          await tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain }));
          await txResolver.drainPending();
        },
      ),
    ]);
  }

  const webUiDone = (async () => {
    const Cash = make(USDC, 300n);
    const wSeat = makeMockSeat({}, { Cash }, offer.log);
    await executePlan(orch, ctx, wSeat, {}, kit, {
      type: 'withdraw',
      amount: Cash,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'withdraw') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);
    const feeCall = AmountMath.make(BLD, 100n);
    const steps: MovementDesc[] = [
      { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount, fee: feeCall },
      { src: '@Arbitrum', dest: '@agoric', amount },
      { src: '@agoric', dest: '<Cash>', amount },
    ];

    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();
  await Promise.all([webUiDone, plannerP, txResolver.drainPending()]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    // deposit calls
    { _method: 'monitorTransfers' },
    { _method: 'send', _cap: 'agoric11014' }, // from fee account
    { _method: 'transfer' }, // makeAccount
    { _method: 'localTransfer', amounts: { Deposit: { value: 50000000n } } },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'depositForBurn' },
    { _method: 'send' },
    { _method: 'transfer' }, // supply call
    { _method: 'exit' },

    // withdraw calls
    { _method: 'send' },
    {
      _cap: 'agoric11028',
      _method: 'transfer',
      address: { chainId: 'axelar-6' },
      amount: { value: 100n },
    },
    { _method: 'send', _cap: 'agoric11014' },
    { _method: 'transfer' }, // depositForBurn
    { _method: 'withdrawToSeat', amounts: { Cash: { value: 300n } } },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  await documentStorageSchema(t, storage, docOpts);
});

test('deposit in coordination with planner', async t => {
  const { orch, ctx, offer, storage } = mocks({});

  const { getPortfolioStatus } = makeStorageTools(storage);

  const kit = await ctx.makePortfolioKit();
  const portfolioId = kit.reader.getPortfolioId();

  const webUiDone = (async () => {
    const Deposit = make(USDC, 1_000_000n);
    const dSeat = makeMockSeat({ Deposit }, {}, offer.log);
    return executePlan(orch, ctx, dSeat, {}, kit, {
      type: 'deposit',
      amount: Deposit,
    });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'deposit') throw t.fail(detail.type);
    // XXX brand from vstorage isn't suitable for use in call to kit
    const amount = make(USDC, detail.amount.value);

    const steps = planUSDNDeposit(amount);
    kit.planner.resolveFlowPlan(Number(flowId.replace('flow', '')), steps);
  })();

  const [result] = await Promise.all([webUiDone, plannerP]);
  t.log('result', result);
  t.is(result, 'flow1');

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.like(log, [
    // deposit calls
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Deposit: { value: 1000000n } } },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { msgs: [{ typeUrl: '/noble.swap.v1.MsgSwap' }] },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details

  await documentStorageSchema(t, storage, docOpts);
});

test('simple rebalance in coordination with planner', async t => {
  const { orch, ctx, offer, storage, tapPK, txResolver } = mocks({});

  const { getPortfolioStatus } = makeStorageTools(storage);

  // Create portfolio with initial allocation
  const initialKit = await ctx.makePortfolioKit();
  const portfolioId = initialKit.reader.getPortfolioId();

  // First deposit funds into USDN position
  {
    const depositAmount = make(USDC, 10_000n);
    const depositSeat = makeMockSeat({ Deposit: depositAmount }, {}, offer.log);
    await rebalance(
      orch,
      ctx,
      depositSeat,
      {
        flow: [
          { src: '<Deposit>', dest: '@agoric', amount: depositAmount },
          { src: '@agoric', dest: '@noble', amount: depositAmount },
          { src: '@noble', dest: 'USDN', amount: depositAmount },
        ],
      },
      initialKit,
    );
  }

  // Set initial allocation (100% USDN in basis points)
  {
    const initialAllocation = { USDN: 10000n }; // 100% = 10000 basis points
    const seat = makeMockSeat({}, {}, offer.log);
    await rebalance(
      orch,
      ctx,
      seat,
      { targetAllocation: initialAllocation },
      initialKit,
    );
  }

  // Now test simpleRebalance flow with different allocation
  const webUiDone = (async () => {
    const newAllocation = { USDN: 5000n, Aave_Arbitrum: 5000n }; // 50% each = 5000 basis points each
    const srSeat = makeMockSeat({}, {}, offer.log);
    initialKit.manager.setTargetAllocation(newAllocation);
    await executePlan(orch, ctx, srSeat, {}, initialKit, { type: 'rebalance' });
  })();

  const plannerP = (async () => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    const [[flowId, detail]] = Object.entries(flowsRunning);
    t.log('planner found', { portfolioId, flowId, detail });

    if (detail.type !== 'rebalance') throw t.fail(detail.type);

    // Planner provides steps to move from USDN to mixed allocation
    const steps: MovementDesc[] = [
      { src: 'USDN', dest: '@noble', amount: make(USDC, 5000n) },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: make(USDC, 5000n),
        fee: make(BLD, 100n),
      },
      {
        src: '@Arbitrum',
        dest: 'Aave_Arbitrum',
        amount: make(USDC, 5000n),
        fee: make(BLD, 50n),
      },
    ];

    initialKit.planner.resolveFlowPlan(
      Number(flowId.replace('flow', '')),
      steps,
    );
  })();

  // Simulate external system responses for cross-chain operations
  const simulationP = (async () => {
    // Wait for the tap to be set up, then simulate Axelar GMP response for Arbitrum account creation
    const tap = await tapPK.promise;
    await tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain }));

    await txResolver.drainPending();
  })();

  await Promise.all([webUiDone, plannerP, simulationP]);

  const { log } = offer;
  t.log('calls:', log.map(msg => msg._method).join(', '));
  t.snapshot(log, 'call log');

  await documentStorageSchema(t, storage, docOpts);
});
