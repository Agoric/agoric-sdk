// @ts-check

import { runVOTest, test } from '@agoric/swingset-vat/tools/vo-test-harness.js';

import { makeParamManager } from '@agoric/governance';
import { makeStoredPublisherKit } from '@agoric/notifier';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { definePoolKind } from '../src/vpool-xyk-amm/pool.js';
import { makeAmmParams } from '../src/vpool-xyk-amm/params.js';
import { mapValues } from '../src/collect.js';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {bigint} poolFeeBP
 * @param {bigint} protocolFeeBP
 * @param {Amount} minInitialLiquidity
 * @param {Invitation} poserInvitation - invitation for the question poser
 */
const makeAmmParamManager = async (
  zoe,
  poolFeeBP,
  protocolFeeBP,
  minInitialLiquidity,
  poserInvitation,
) => {
  const initial = mapValues(
    makeAmmParams(
      poserInvitation,
      protocolFeeBP,
      poolFeeBP,
      minInitialLiquidity,
    ),
    v => [v.type, v.value],
  );
  // @ts-expect-error loose
  return makeParamManager(makeStoredPublisherKit(), initial, zoe);
};

const voPoolTest = async (t, mutation, postTest) => {
  let makePool;
  const { zoe, zcf } = await setupZCFTest();
  const invitation = await zcf.makeInvitation(() => {}, 'fake invitation');
  const { brand: centralBrand, issuer: centralI } = makeIssuerKit('central');
  const paramManager = await makeAmmParamManager(
    zoe,
    25n,
    5n,
    AmountMath.make(centralBrand, 100n),
    invitation,
  );

  const { brand: secondaryBrand, issuer: secondaryI } =
    makeIssuerKit('secondary');
  const quoteIssuerKit = makeIssuerKit('Quotes');
  const liquidityZcfMint = await zcf.makeZCFMint('Liquidity');
  const { zcfSeat: poolSeatP } = zcf.makeEmptySeatKit();
  const { zcfSeat: protocolSeatP } = zcf.makeEmptySeatKit();
  const [poolSeat, protocolSeat] = await Promise.all([
    poolSeatP,
    protocolSeatP,
  ]);

  await zcf.saveIssuer(centralI, 'Central');
  await zcf.saveIssuer(secondaryI, 'Secondary');

  const defineVirtualPoolKind = () => {
    const timer = buildManualTimer(t.log);

    const paramAccessor = paramManager.readonly();

    return definePoolKind(
      zcf,
      centralBrand,
      timer,
      quoteIssuerKit,
      // @ts-expect-error loose
      paramAccessor,
      protocolSeat,
    );
  };

  const state = {};
  const testVPool = async (context, phase) => {
    const { pool, singlePool } = context;
    if (phase === 'before') {
      state.notifier = pool.getNotifier();
      state.toCentralPA = pool.getToCentralPriceAuthority();
      state.singlePool = pool.getVPool();
      state.liquidityIssuer = pool.getLiquidityIssuer();
      await mutation(context);
    } else if (phase === 'after') {
      const newNotifier = pool.getNotifier();
      t.is(state.notifier, newNotifier);
      t.is(state.toCentralPA, pool.getToCentralPriceAuthority());
      t.is(state.singlePool, singlePool);
      t.is(state.liquidityIssuer, pool.getLiquidityIssuer());
      t.truthy(postTest(context));
    }
  };

  const prepare = () => {
    makePool = defineVirtualPoolKind();
  };

  const makeTestObject = () => {
    return makePool(liquidityZcfMint, poolSeat, secondaryBrand);
  };

  await runVOTest(t, prepare, makeTestObject, testVPool);
};

const noOp = () => {};

test.serial('unchanged', async t => {
  await voPoolTest(t, noOp, () => true);
});

test.serial('one update', async t => {
  let initialNotifierCount;
  await voPoolTest(
    t,
    async context => {
      initialNotifierCount = await context.pool.getNotifier().getUpdateSince();
      return context.pool.updateState();
    },
    async context => {
      const notification = await context.pool.getNotifier().getUpdateSince();
      t.is(
        BigInt(notification.updateCount),
        BigInt(initialNotifierCount) + 1n,
        `updateCount should increase by one from ${initialNotifierCount}`,
      );
    },
  );
});
