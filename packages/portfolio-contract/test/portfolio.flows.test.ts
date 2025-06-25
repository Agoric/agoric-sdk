/**
 * @file openPortfolio flow tests; especially failure modes.
 *
 * @see {@link snapshots/portfolio-open.test.ts.md} for expected call logs.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { GuestInterface } from '@agoric/async-flow';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { mustMatch } from '@agoric/internal';
import {
  defaultSerializer,
  documentStorageSchema,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { denomHash, type Orchestrator } from '@agoric/orchestration';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import type { VowTools } from '@agoric/vow';
import type { Proposal, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeHeapZone } from '@agoric/zone';
import { Far, passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import {
  openPortfolio,
  rebalance,
  type PortfolioInstanceContext,
} from '../src/portfolio.flows.ts';
import { makeProposalShapes, type ProposalType } from '../src/type-guards.ts';
import { axelarChainsMap } from './mocks.ts';
import { makeIncomingEVMEvent } from './supports.ts';

const theExit = harden(() => {}); // for ava comparison
// @ts-expect-error mock
const mockZCF: ZCF = Far('MockZCF', {
  makeEmptySeatKit: () =>
    ({
      zcfSeat: Far('MockZCFSeat', { exit: theExit }),
    }) as unknown as ZCF,
});

const { brand: USDC } = makeIssuerKit('USDC');

// XXX move to mocks.ts for readability?
const mocks = (
  errs: Record<string, Error> = {},
  give: ProposalType['openPortfolio']['give'] = {
    USDN: AmountMath.make(USDC, 100n),
  },
) => {
  const buf = [] as any[];
  const log = ev => {
    buf.push(ev);
  };
  let nonce = 0;
  const tapPK = makePromiseKit<TargetApp>();
  const factoryPK = makePromiseKit();
  const orch = harden({
    async getChain(name: string) {
      const chainId = `${name}-${(nonce += 1)}`;
      const stakingTokens = {
        noble: undefined,
        axelar: [{ denom: 'uaxl' }],
      }[name];
      return harden({
        getChainInfo() {
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
              if (err) throw err;
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

  const vowTools: VowTools = harden({
    makeVowKit: () => {
      const { promise, resolve, reject } = makePromiseKit();
      return harden({
        resolver: harden({ resolve, reject }),
        vow: promise,
      }) as any; // mock
    },
    watch: _promise => {
      const taggedVow = {
        payload: {
          vowV0: Far('VowV0', {
            shorten: () => Promise.resolve('mock resolved value'),
          }),
        },
      };
      Object.defineProperty(taggedVow, Symbol.for('passStyle'), {
        value: 'tagged',
        enumerable: false,
      });
      Object.defineProperty(taggedVow, Symbol.toStringTag, {
        value: 'Vow',
        enumerable: false,
      });
      return harden(taggedVow);
    },
    asVow: thunk => {
      return thunk() as any;
    },
  }) as any; // mock

  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();

  const storage = makeFakeStorageKit('published', { sequence: true });
  const portfoliosNode = storage.rootNode
    .makeChildNode('ymax0')
    .makeChildNode('portfolios');
  const timer = buildZoeManualTimer();

  const denom = `ibc/${denomHash({ channelId: 'channel-123', denom: 'uusdc' })}`;
  const chainHubTools = harden({
    getDenom: brand => {
      assert(brand === USDC);
      return denom;
    },
  });

  const inertSubscriber = {} as ResolvedPublicTopic<never>['subscriber'];
  const ctx1: PortfolioInstanceContext = {
    zoeTools,
    chainHubTools,
    axelarChainsMap,
    inertSubscriber,
  };

  const rebalanceHost = (seat, offerArgs, kit) =>
    rebalance(orch, ctx1, seat, offerArgs, kit);
  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf: mockZCF,
    vowTools,
    axelarChainsMap,
    timer,
    rebalance: rebalanceHost as any,
    proposalShapes: makeProposalShapes(USDC),
    marshaller,
    portfoliosNode,
    usdcBrand: USDC,
  });
  const makePortfolioKitGuest = (lca, ica) =>
    makePortfolioKit({
      portfolioId: 1,
      localAccount: lca,
      nobleAccount: ica,
    }) as unknown as GuestInterface<PortfolioKit>;

  const proposal: Proposal = harden({ give });
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
  const { orch, ctx, offer, storage } = mocks({}, {});
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, {});
  t.log(log.map(msg => msg._method).join(', '));

  t.like(log, [{ _method: 'monitorTransfers' }, { _method: 'exit' }]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  t.log(
    'portfolio',
    actual.publicTopics.map(t => t.storagePath),
  );
  t.like(actual.publicTopics, [
    {
      description: 'Portfolio',
      storagePath: 'published.ymax0.portfolios.portfolio1',
    },
  ]);
  t.is(actual.publicTopics.length, 1);
  await documentStorageSchema(t, storage, docOpts);
});

test('open portfolio with USDN position', async t => {
  const { orch, ctx, offer, storage } = mocks();
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(orch, ctx, seat, { usdnOut: 97n });
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
  t.like(actual.publicTopics, [
    {
      description: 'Portfolio',
      storagePath: 'published.ymax0.portfolios.portfolio1',
    },
  ]);
  t.log(
    'accounts',
    actual.publicTopics.map(t => t.storagePath),
  );
  t.is(actual.publicTopics.length, 1);
  await documentStorageSchema(t, storage, docOpts);
});

// TODO: and , Compound,
test('open portfolio with Aave and USDN positions', async t => {
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
      destinationEVMChain: 'Ethereum',
      Aave: { acctRatio: [1n, 2n], gmpRatio: [1n, 2n] },
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) => {
      tap.receiveUpcall(makeIncomingEVMEvent());
    }),
  ]);
  t.log(log.map(msg => msg._method).join(', '));

  t.snapshot(log, 'call log'); // see snapshot for call log
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  t.log(
    'portfolio',
    actual.publicTopics.map(t => t.storagePath),
  );
  t.like(actual.publicTopics, [
    {
      description: 'Portfolio',
      storagePath: 'published.ymax0.portfolios.portfolio1',
    },
  ]);
  t.is(actual.publicTopics.length, 1);
  await documentStorageSchema(t, storage, docOpts);
});

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
      destinationEVMChain: 'Ethereum',
      Aave: { acctRatio: [1n, 2n], gmpRatio: [1n, 2n] },
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) => {
      tap.receiveUpcall(makeIncomingEVMEvent());
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { AaveAccount: { value: 50n } } },
    { _method: 'transfer', address: { chainId: 'axelar-5' } },
    { _method: 'localTransfer', amounts: { Aave: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'noble-3' } },
    { _method: 'depositForBurn' },
    { _method: 'localTransfer', amounts: { AaveGmp: { value: 100n } } },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  t.log(
    'accounts',
    actual.publicTopics.map(t => t.storagePath),
  );
  t.is(actual.publicTopics.length, 1);
  await documentStorageSchema(t, storage, docOpts);
  t.is(actual.publicTopics.length, 1);
});

test('open portfolio with Compound position', async t => {
  const { orch, tapPK, ctx, offer, storage } = mocks(
    {},
    {
      Compound: AmountMath.make(USDC, 300n),
      CompoundAccount: AmountMath.make(USDC, 300n),
      CompoundGmp: AmountMath.make(USDC, 100n),
    },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      destinationEVMChain: 'Ethereum',
      Compound: { acctRatio: [1n, 2n], gmpRatio: [1n, 2n] },
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) => {
      tap.receiveUpcall(makeIncomingEVMEvent());
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { CompoundAccount: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'axelar-5' } },
    { _method: 'localTransfer', amounts: { Compound: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'noble-3' } },
    { _method: 'depositForBurn' },
    { _method: 'localTransfer', amounts: { CompoundGmp: { value: 100n } } },
    { _method: 'transfer', address: { chainId: 'axelar-6' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  t.log(
    'accounts',
    actual.publicTopics.map(t => t.storagePath),
  );
  t.is(actual.publicTopics.length, 1);
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in localTransfer from seat to local account', async t => {
  const { orch, ctx, offer, storage } = mocks({
    localTransfer: Error('localTransfer from seat failed'),
  });
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    destinationEVMChain: 'Ethereum',
  });
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'fail' },
  ]);
  // TODO: fix ICAAddr stuff
  const [{ storagePath: ICAAddr }] = actual.publicTopics;
  t.log('we still get the invitationMakers and ICA address', ICAAddr);
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in IBC transfer', async t => {
  const { orch, ctx, offer, storage } = mocks({
    transfer: Error('IBC transfer failed'),
  });
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    destinationEVMChain: 'Ethereum',
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
  const [{ storagePath: ICAAddr }] = actual.publicTopics;
  t.log('we still get the invitationMakers and ICA address', ICAAddr);
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});

test('handle failure in executeEncodedTx', async t => {
  const { orch, ctx, offer, storage } = mocks({
    executeEncodedTx: Error('Swap or Lock failed'),
  });
  const { log, seat } = offer;

  const actual = await openPortfolio(orch, { ...ctx }, seat, {
    destinationEVMChain: 'Ethereum',
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
  const [{ storagePath: ICAAddr }] = actual.publicTopics;
  t.log('we still get the invitationMakers and ICA address', ICAAddr);
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
    destinationEVMChain: 'Ethereum',
  });

  // Ensure the upcall happens to resolve getGMPAddress(), then let the transfer fail
  // the failure is expected before offer.factoryPK resolves, so don't wait for it.
  const tap = await tapPK.promise;
  tap.receiveUpcall(makeIncomingEVMEvent());

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
  const [{ storagePath: ICAAddr }] = actual.publicTopics;
  t.log('we still get the invitationMakers and ICA address', ICAAddr);
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  await documentStorageSchema(t, storage, docOpts);
});
