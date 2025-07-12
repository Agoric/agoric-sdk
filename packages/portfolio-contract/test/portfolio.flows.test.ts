/**
 * @file openPortfolio flow tests; especially failure modes.
 *
 * @see {@link snapshots/portfolio-open.test.ts.md} for expected call logs.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { GuestInterface } from '@agoric/async-flow';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { mustMatch } from '@agoric/internal';
import {
  defaultSerializer,
  documentStorageSchema,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { denomHash, type Orchestrator } from '@agoric/orchestration';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import type { VowTools } from '@agoric/vow';
import type { Proposal, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeHeapZone } from '@agoric/zone';
import { Far, passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import { AxelarChain, RebalanceStrategy } from '../src/constants.js';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import {
  openPortfolio,
  rebalance,
  rebalanceFromTransfer,
  type PortfolioInstanceContext,
} from '../src/portfolio.flows.ts';
import { makeSwapLockMessages } from '../src/pos-usdn.flows.ts';
import { makeProposalShapes, type ProposalType } from '../src/type-guards.ts';
import { axelarIdsMock, contractsMock } from './mocks.ts';
import {
  axelarCCTPConfig,
  makeIncomingEVMEvent,
  makeIncomingVTransferEvent,
} from './supports.ts';

/**
 * Use Arbitrum or any other EVM chain whose Axelar chain ID (`axelarId`) differs
 * from the chain name. For example, Arbitrum's `axelarId` is "arbitrum", while
 * Ethereum’s is "Ethereum" (case-sensitive). The challenge is that if a mismatch
 * occurs, it may go undetected since the `axelarId` is passed via the IBC memo
 * and not validated automatically.
 *
 * To ensure proper testing, it's best to use a chain where the `chainName` and
 * `axelarId` are not identical. This increases the likelihood of catching issues
 * with misconfigured or incorrectly passed `axelarId` values.
 *
 * To see the `axelarId` for a given chain, refer to:
 * @see {@link https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts | supported-chains-list.ts}
 */
const destinationEVMChain: AxelarChain = 'Arbitrum';
// Must be axelarId of destinationEVMChain
const sourceChain = 'arbitrum';

const theExit = harden(() => {}); // for ava comparison
// @ts-expect-error mock
const mockZCF: ZCF = Far('MockZCF', {
  makeEmptySeatKit: () =>
    ({
      zcfSeat: Far('MockZCFSeat', { exit: theExit }),
    }) as unknown as ZCF,
});

const { brand: USDC } = makeIssuerKit('USDC');
const { make } = AmountMath;

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
      const chainId = `${name}-${(nonce += 1)}`;
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
            value: `${name}1${1000 + 7 * (nonce += 1)}`,
          });
          const account = {
            getAddress() {
              return addr;
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
                // TODO: errors
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
  const portfoliosNode = storage.rootNode
    .makeChildNode('ymax0')
    .makeChildNode('portfolios');
  const timer = buildZoeManualTimer();

  const denom = `ibc/${denomHash({ channelId: 'channel-123', denom: 'uusdc' })}`;

  const inertSubscriber = {} as ResolvedPublicTopic<never>['subscriber'];
  const ctx1: PortfolioInstanceContext = {
    zoeTools,
    usdc: { denom, brand: USDC },
    axelarIds: axelarIdsMock,
    contracts: contractsMock,
    inertSubscriber,
  };

  const getChainInfo = chainName => {
    if (!(chainName in axelarCCTPConfig)) {
      throw Error(`unable to get chainInfo for ${chainName}`);
    }
    return axelarCCTPConfig[chainName];
  };

  const rebalanceHost = (seat, offerArgs, kit) =>
    rebalance(orch, ctx1, seat, offerArgs, kit);
  const rebalanceFromTransferHost = (packet, kit) =>
    rebalanceFromTransfer(orch, ctx1, packet, kit);
  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf: mockZCF,
    axelarIds: axelarIdsMock,
    vowTools,
    timer,
    chainHubTools: { getChainInfo },
    rebalance: rebalanceHost as any,
    rebalanceFromTransfer: rebalanceFromTransferHost as any,
    proposalShapes: makeProposalShapes(USDC),
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
  node: 'ymax0.portfolios',
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

test('Noble Dollar Swap, Lock messages', t => {
  const signer =
    'noble1reheu4ym85k9gktyf9vzhzt0zvqym9txwejsj4vaxdrw98wm4emsddarrd' as const;

  const actual = makeSwapLockMessages(
    { value: signer, chainId: 'grand-1', encoding: 'bech32' },
    1200000n,
    { usdnOut: 1188000n },
  );
  const bigintStringifier = (_p, v) => (typeof v === 'bigint' ? `${v}` : v);
  t.log(JSON.stringify(actual, bigintStringifier));
  t.deepEqual(actual, {
    msgSwap: {
      signer:
        'noble1reheu4ym85k9gktyf9vzhzt0zvqym9txwejsj4vaxdrw98wm4emsddarrd',
      amount: { denom: 'uusdc', amount: '1200000' },
      routes: [{ poolId: 0n, denomTo: 'uusdn' }],
      min: { denom: 'uusdn', amount: '1188000' },
    },
    msgLock: {
      signer:
        'noble1reheu4ym85k9gktyf9vzhzt0zvqym9txwejsj4vaxdrw98wm4emsddarrd',
      vault: 1,
      amount: '1188000',
    },
    protoMessages: [
      {
        typeUrl: '/noble.swap.v1.MsgSwap',
        value:
          'CkBub2JsZTFyZWhldTR5bTg1azlna3R5Zjl2emh6dDB6dnF5bTl0eHdlanNqNHZheGRydzk4d200ZW1zZGRhcnJkEhAKBXV1c2RjEgcxMjAwMDAwGgcSBXV1c2RuIhAKBXV1c2RuEgcxMTg4MDAw',
      },
      {
        typeUrl: '/noble.dollar.vaults.v1.MsgLock',
        value:
          'CkBub2JsZTFyZWhldTR5bTg1azlna3R5Zjl2emh6dDB6dnF5bTl0eHdlanNqNHZheGRydzk4d200ZW1zZGRhcnJkEAEaBzExODgwMDA=',
      },
    ],
  });
});

test('open portfolio with USDN position', async t => {
  const { orch, ctx, offer, storage } = mocks(
    {},
    { USDN: make(USDC, 50_000_000n), NobleFees: make(USDC, 100n) },
  );
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, {
    usdnOut: (50_000_000n * 99n) / 100n,
  });
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-3' } },
    { _method: 'executeEncodedTx', _cap: 'noble11028' },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

// TODO: and , Compound,
const openAndTransfer: import('ava').Macro<[() => VTransferIBCEvent[]]> =
  test.macro(async (t, makeEvents) => {
    const { make } = AmountMath;
    const oneThird = make(USDC, 3_333_000_000n);

    const { orch, ctx, offer, storage, tapPK } = mocks(
      {},
      {
        USDN: oneThird,
        Aave: oneThird,
        AaveGmp: make(USDC, 100n),
        AaveAccount: make(USDC, 150n),
        // Compound: oneThird,
        // CompoundGmp: make(USDC, 100n),
        // CompoundAccount: make(USDC, 150n),
      },
    );
    const { log, seat } = offer;

    const shapes = makeProposalShapes(USDC);
    mustMatch(seat.getProposal(), shapes.openPortfolio);

    const [actual] = await Promise.all([
      openPortfolio(orch, ctx, seat, {
        destinationEVMChain,
      }),
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
  });

test(
  'open portfolio with Aave and USDN positions then inbound GMP',
  openAndTransfer,
  () => [makeIncomingEVMEvent({ sourceChain })],
);

test('open portfolio with Aave position', async t => {
  const { orch, tapPK, ctx, offer, storage } = mocks(
    {},
    {
      Aave: AmountMath.make(USDC, 300n),
      AaveAccount: AmountMath.make(USDC, 50n),
      AaveGmp: AmountMath.make(USDC, 100n),
    },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      destinationEVMChain,
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) =>
      tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain })),
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { AaveAccount: { value: 50n } } },
    { _method: 'transfer', address: { chainId: 'axelar-3' } },
    { _method: 'localTransfer', amounts: { Aave: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'depositForBurn' },
    { _method: 'localTransfer', amounts: { AaveGmp: { value: 100n } } },
    { _method: 'transfer', address: { chainId: 'axelar-3' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('open portfolio with Compound position', async t => {
  const { orch, tapPK, ctx, offer, storage } = await mocks(
    {},
    {
      Compound: AmountMath.make(USDC, 300n),
      CompoundAccount: AmountMath.make(USDC, 300n),
      CompoundGmp: AmountMath.make(USDC, 100n),
    },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      destinationEVMChain,
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) =>
      tap.receiveUpcall(makeIncomingEVMEvent({ sourceChain })),
    ),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { CompoundAccount: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'axelar-3' } },
    { _method: 'localTransfer', amounts: { Compound: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'noble-5' } },
    { _method: 'depositForBurn' },
    { _method: 'localTransfer', amounts: { CompoundGmp: { value: 100n } } },
    { _method: 'transfer', address: { chainId: 'axelar-3' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in localTransfer from seat to local account', async t => {
  const { orch, ctx, offer, storage } = mocks(
    { localTransfer: Error('localTransfer from seat failed') },
    { USDN: make(USDC, 100n) },
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    destinationEVMChain,
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
  const { orch, ctx, offer, storage } = mocks(
    { transfer: Error('IBC transfer failed') },
    { USDN: make(USDC, 100n) },
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    destinationEVMChain,
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-3' } }, // failed
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in executeEncodedTx', async t => {
  const { orch, ctx, offer, storage } = mocks(
    { executeEncodedTx: Error('Swap or Lock failed') },
    { USDN: make(USDC, 100n) },
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    destinationEVMChain,
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-3' } },
    { _method: 'executeEncodedTx', _cap: 'noble11028' }, // fail
    { _method: 'transfer', address: { chainId: 'agoric-1' } }, // unwind
    { _method: 'withdrawToSeat' }, // unwind
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in recovery from executeEncodedTx', async t => {
  const {
    orch,
    ctx,
    offer,
    storage,
    vowTools: { when },
  } = mocks(
    {
      executeEncodedTx: Error('Swap or Lock failed'),
      transfer: Error('IBC transfer from noble-3 failed'),
    },
    { USDN: make(USDC, 100n) },
  );
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    destinationEVMChain,
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-3' } },
    { _method: 'executeEncodedTx', _cap: 'noble11028' }, // fail
    { _method: 'transfer', address: { chainId: 'agoric-1' } }, // fail to recover
    { _method: 'fail' },
  ]);
  t.snapshot(log, 'call log');
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test.skip('handle failure in sendGmp with Aave position', async t => {
  const { orch, tapPK, ctx, offer, storage } = mocks(
    { transfer: Error('Axelar GMP transfer failed') },
    {
      Aave: AmountMath.make(USDC, 300n),
      AaveAccount: AmountMath.make(USDC, 300n),
      AaveGmp: AmountMath.make(USDC, 100n),
    },
  );

  // Start the openPortfolio flow
  const portfolioPromise = openPortfolio(orch, { ...ctx }, offer.seat, {
    destinationEVMChain,
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

test.failing(
  'open portfolio with Compound and USDN positions then rebalanceFromTransfer',
  openAndTransfer,
  () => [
    makeIncomingEVMEvent({ sourceChain }),
    makeIncomingVTransferEvent({
      hookQuery: { rebalance: RebalanceStrategy.Preset },
      amount: 1_000_000_000n,
      denom: `transfer/channel-1/uusdc`,
    }),
  ],
);
