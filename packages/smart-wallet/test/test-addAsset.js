// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { buildRootObject as buildBankVatRoot } from '@agoric/vats/src/vat-bank.js';
import { makeIssuerKit } from '@agoric/ertp';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeScalarMapStore } from '@agoric/store';
import { makeDefaultTestContext } from './contexts.js';
import { makeMockTestSpace } from './supports.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>>} */
const test = anyTest;

test.before(async t => {
  const withBankManager = async () => {
    const noBridge = undefined;
    const baggage = makeScalarMapStore('baggage');
    const bankManager = E(
      buildBankVatRoot(undefined, undefined, baggage),
    ).makeBankManager(noBridge);
    const noop = () => {};
    const space0 = await makeMockTestSpace(noop);
    space0.produce.bankManager.reset();
    space0.produce.bankManager.resolve(bankManager);
    return space0;
  };
  t.context = await makeDefaultTestContext(t, withBankManager);
});

const DEBUG = false;
const bigIntReplacer = (_key, val) =>
  typeof val === 'bigint' ? Number(val) : val;

const range = qty => [...Array(qty).keys()];

/**
 * NOTE: this doesn't test all forms of work.
 * A better test would measure inter-vat messages or some such.
 */
test('avoid O(wallets) storage writes for a new asset', async t => {
  const bankManager = t.context.consume.bankManager;

  let chainStorageWrites = 0;

  const startUser = async ix => {
    const address = `agoric1u${ix}`;
    const smartWallet = t.context.simpleProvideWallet(address);

    // stick around waiting for things to happen
    const current = await E(smartWallet).getCurrentSubscriber();
    /** @type {bigint | undefined} */
    let publishCount;
    for (;;) {
      const news = await E(current).subscribeAfter(publishCount);
      publishCount = news.publishCount;
      chainStorageWrites += 1;
      if (DEBUG) {
        console.log(JSON.stringify(news.head, bigIntReplacer, 2));
      }
    }
  };

  const simulate = async (qty, denom, name) => {
    range(qty).forEach(startUser);
    await eventLoopIteration();
    const initialWrites = chainStorageWrites;

    const kit = makeIssuerKit(name);
    await E(bankManager).addAsset(denom, name, name, kit);
    await eventLoopIteration();
    return {
      qty,
      initialWrites,
      addedWrites: chainStorageWrites - initialWrites,
    };
  };
  const base = await simulate(2, 'ibc/dai1', 'DAI_axl');
  const exp = await simulate(6, 'ibc/dai2', 'DAI_grv');

  t.true(
    exp.addedWrites <= (base.addedWrites * exp.qty) / base.qty / 2,
    'actual writes should be less than half of linear growth',
  );

  // a stronger requirement for Cosmos balances, though that's
  // the only kind of balance we have yet.
  t.is(base.addedWrites, 0);
  t.is(exp.addedWrites, 0);
});
