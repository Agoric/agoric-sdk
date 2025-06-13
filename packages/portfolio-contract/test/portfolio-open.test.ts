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
import type { Proposal, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeHeapZone } from '@agoric/zone';
import { Far, passStyleOf } from '@endo/pass-style';
import { preparePortfolioKit } from '../src/portfolio.exo.ts';
import { makeLocalAccount, openPortfolio } from '../src/portfolio.flows.ts';

const mocks = (errs: Record<string, Error> = {}) => {
  const buf = [] as any[];
  const log = ev => {
    buf.push(ev);
  };
  let nonce = 0;
  const orch = harden({
    async getChain(name: string) {
      const chainId = `${name}-${(nonce += 1)}`;
      return harden({
        async makeAccount() {
          const addr = harden({
            chainId,
            value: `${name}1${1000 + 7 * (nonce += 1)}`,
          });
          return Far('Account', {
            getAddress() {
              return addr;
            },
            async transfer(address, amount) {
              log({ _cap: addr.value, _method: 'transfer', address, amount });
              const { transfer: err } = errs;
              if (err) throw err;
            },
            async executeEncodedTx(msgs) {
              log({ _cap: addr.value, _method: 'executeEncodedTx', msgs });
              const { executeEncodedTx: err } = errs;
              if (err) throw err;
              return harden(msgs.map(_ => ({})));
            },
          });
        },
      });
    },
  }) as unknown as Orchestrator;

  const zone = makeHeapZone();
  const makePortfolioKit = preparePortfolioKit(zone);
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

  const { brand: USDC } = makeIssuerKit('USDC');
  const proposal: Proposal = harden({
    give: { USDN: AmountMath.make(USDC, 100n) },
  });
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

  return { orch, log: buf, makePortfolioKit, zoeTools, seat, inertSubscriber };
};

/* eslint-disable no-underscore-dangle */
/* We use _method to get it to sort before other properties. */

test('open portfolio', async t => {
  const { orch, log, makePortfolioKit, zoeTools, seat, inertSubscriber } =
    mocks();

  const localP = makeLocalAccount(orch, {});
  const actual = await openPortfolio(
    orch,
    { zoeTools, makePortfolioKit, inertSubscriber },
    seat,
    undefined,
    localP,
  );
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'transfer', address: { chainId: 'noble-3' } },
    { _method: 'executeEncodedTx', _cap: 'noble11028' },
    { _method: 'exit' },
  ]);
  t.snapshot(log, 'call log'); // see snapshot for remaining arg details
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
  t.like(actual.publicTopics, [
    { description: 'USDN ICA', storagePath: 'cosmos:noble-3:noble11028' },
  ]);
});

test('handle failure in localTransfer from seat to local account', async t => {
  const { orch, log, makePortfolioKit, zoeTools, seat, inertSubscriber } =
    mocks({ localTransfer: Error('localTransfer from seat failed') });

  const localP = makeLocalAccount(orch, {});
  const actual = await openPortfolio(
    orch,
    { zoeTools, makePortfolioKit, inertSubscriber },
    seat,
    undefined,
    localP,
  );
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
    { _method: 'localTransfer', sourceSeat: seat },
    { _method: 'fail' },
  ]);
  const [{ storagePath: ICAAddr }] = actual.publicTopics;
  t.log('we still get the invitationMakers and ICA address', ICAAddr);
  t.is(passStyleOf(actual.invitationMakers), 'remotable');
});

test('handle failure in IBC transfer', async t => {
  const { orch, log, makePortfolioKit, zoeTools, seat, inertSubscriber } =
    mocks({ transfer: Error('IBC transfer failed') });

  const localP = makeLocalAccount(orch, {});
  const actual = await openPortfolio(
    orch,
    { zoeTools, makePortfolioKit, inertSubscriber },
    seat,
    undefined,
    localP,
  );
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
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
  const { orch, log, makePortfolioKit, zoeTools, seat, inertSubscriber } =
    mocks({ executeEncodedTx: Error('Swap or Lock failed') });

  const localP = makeLocalAccount(orch, {});
  const actual = await openPortfolio(
    orch,
    { zoeTools, makePortfolioKit, inertSubscriber },
    seat,
    undefined,
    localP,
  );
  t.log(log.map(msg => msg._method).join(', '));
  t.like(log, [
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
