/**
 * @file openPortfolio flow tests; especially failure modes.
 *
 * @see {@link snapshots/portfolio-open.test.ts.md} for expected call logs.
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { GuestInterface } from '@agoric/async-flow';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import type { Orchestrator } from '@agoric/orchestration';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { type VowTools } from '@agoric/vow';
import type { Proposal, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeHeapZone } from '@agoric/zone';
import { Far, passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import {
  preparePortfolioKit,
  type PortfolioKit,
} from '../src/portfolio.exo.ts';
import { openPortfolio, rebalance } from '../src/portfolio.flows.ts';
import { makeProposalShapes, type ProposalType } from '../src/type-guards.ts';
import { axelarChainsMap, contractAddresses } from './mocks.ts';
import { makeIncomingEvent } from './supports.ts';
import type { TargetApp } from '@agoric/vats/src/bridge-target.js';
import { mustMatch } from '@agoric/internal';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';

const theExit = harden(() => {}); // for ava comparison
const mockZCF = Far('MockZCF', {
  makeEmptySeatKit: () =>
    ({
      zcfSeat: Far('MockZCFSeat', { exit: theExit }),
    }) as unknown as ZCF,
});

const { brand: USDC } = makeIssuerKit('USDC');

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

  // @ts-expect-error simulate async flow boundary
  const vowTools: VowTools = harden({
    makeVowKit: () => {
      const { promise, resolve, reject } = makePromiseKit();
      return harden({
        resolver: harden({ resolve, reject }),
        vow: promise,
      });
    },
  });

  const timer = buildZoeManualTimer();
  const makePortfolioKitHost = preparePortfolioKit(zone, {
    // @ts-expect-error mocked zcf
    zcf: mockZCF,
    vowTools,
    axelarChainsMap,
    timer,
    // @ts-expect-error host/flow - YOLO?
    rebalance: (...args) => rebalance(orch, { zoeTools }, ...args),
    proposalShapes: makeProposalShapes(USDC),
  });
  const makePortfolioKit = (ica, lca) => {
    const kit = makePortfolioKitHost(ica, lca);
    // @ts-expect-error membrane
    const gk = kit as GuestInterface<PortfolioKit>;
    return gk;
  };

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

  const inertSubscriber = {} as ResolvedPublicTopic<never>['subscriber'];

  const chainHubTools = harden({
    getDenom: brand => {
      assert(brand === USDC);
      return 'ibc/TODO what is the right hash?';
    },
  });
  return {
    orch,
    tapPK,
    ctx: {
      makePortfolioKit,
      zoeTools,
      chainHubTools,
      inertSubscriber,
      axelarChainsMap,
      contractAddresses,
    },
    offer: {
      log: buf,
      seat,
      factoryPK,
    },
  };
};

/* eslint-disable no-underscore-dangle */
/* We use _method to get it to sort before other properties. */

test('open portfolio with USDN position', async t => {
  const { orch, ctx, offer } = mocks();
  const { log, seat } = offer;

  const shapes = makeProposalShapes(USDC);
  mustMatch(seat.getProposal(), shapes.openPortfolio);

  const actual = await openPortfolio(
    orch,
    { ...ctx },
    seat,
    // Use Axelar chain identifier instead of CAP-10 ID for cross-chain messaging
    // Axelar docs: https://docs.axelar.dev/dev/reference/mainnet-chain-names
    // Chain names: https://axelarscan.io/resources/chains
    { destinationEVMChain: 'Ethereum' },
  );
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
  t.log(
    'accounts',
    actual.publicTopics.map(t => t.storagePath),
  );
  t.like(actual.publicTopics, [
    { description: 'LCA', storagePath: 'cosmos:agoric-1:agoric11014' },
    { description: 'USDN ICA', storagePath: 'cosmos:noble-3:noble11028' },
  ]);
  t.is(actual.publicTopics.length, 2);
});

test('open portfolio with Aave position', async t => {
  const { orch, tapPK, ctx, offer } = mocks(
    {},
    {
      Aave: AmountMath.make(USDC, 300n),
      Account: AmountMath.make(USDC, 300n),
      Gmp: AmountMath.make(USDC, 100n),
    },
  );

  const [actual] = await Promise.all([
    openPortfolio(orch, { ...ctx }, offer.seat, {
      destinationEVMChain: 'Ethereum',
    }),
    Promise.all([tapPK.promise, offer.factoryPK.promise]).then(([tap, _]) => {
      tap.receiveUpcall(
        makeIncomingEvent('xyz1sdlkfjlsdkj???TODO', 'Ethereum'),
      );
    }),
  ]);
  const { log } = offer;
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'monitorTransfers' },
    { _method: 'localTransfer', amounts: { Account: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'axelar-5' } },
    { _method: 'localTransfer', amounts: { Aave: { value: 300n } } },
    { _method: 'transfer', address: { chainId: 'noble-3' } },
    { _method: 'depositForBurn' },
    { _method: 'transfer', address: { chainId: 'axelar' } },
    { _method: 'exit', _cap: 'seat' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  t.log(
    'accounts',
    actual.publicTopics.map(t => t.storagePath),
  );
  const myAddr = '0x3dA3050208a3F2e0d04b33674aAa7b1A9F9B313C';
  t.like(actual.publicTopics, [
    { description: 'LCA', storagePath: 'cosmos:agoric-1:agoric11014' },
    { description: 'USDN ICA', storagePath: 'cosmos:noble-3:noble11028' },
    { description: 'Aave EVM Addr', storagePath: `eip155:1:${myAddr}` },
  ]);
  t.is(actual.publicTopics.length, 3);
});

test('handle failure in localTransfer from seat to local account', async t => {
  const { orch, ctx, offer } = mocks({
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
  const [{ storagePath: ICAAddr }] = actual.publicTopics;
  t.log('we still get the invitationMakers and ICA address', ICAAddr);
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
});

test('handle failure in IBC transfer', async t => {
  const { orch, ctx, offer } = mocks({
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
});

test('handle failure in executeEncodedTx', async t => {
  const { orch, ctx, offer } = mocks({
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
});
