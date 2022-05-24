// @ts-check

import { runVOTest, test } from '@agoric/swingset-vat/tools/vo-test-harness.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { definePoolKind } from '../src/vpool-xyk-amm/pool.js';
import { makeAmmParamManager } from '../src/vpool-xyk-amm/params.js';

const voPoolTest = async (t, mutation, postTest) => {
  let makePool;
  const { zoe, zcf } = await setupZCFTest();
  const invitation = await zcf.makeInvitation(() => {}, 'fake invitation');
  const { brand: centralBrand } = makeIssuerKit('central');
  const paramManager = await makeAmmParamManager(
    zoe,
    25n,
    5n,
    AmountMath.make(centralBrand, 100n),
    invitation,
  );
  const { brand: secondaryBrand } = makeIssuerKit('secondary');
  const quoteIssuerKit = makeIssuerKit('Quotes');
  const liquidityZcfMint = await zcf.makeZCFMint('Liquidity');
  const { userSeat: poolSeatP } = zcf.makeEmptySeatKit();
  const { zcfSeat: protocolSeatP } = zcf.makeEmptySeatKit();
  const [poolSeat, protocolSeat] = await Promise.all([
    poolSeatP,
    protocolSeatP,
  ]);

  const defineVirtualPoolKind = () => {
    const timer = buildManualTimer(t.log);

    const paramAccessor = paramManager.readonly();

    return definePoolKind(
      zcf,
      centralBrand,
      timer,
      quoteIssuerKit,
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
      mutation(context);
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
  await voPoolTest(
    t,
    context => {
      return context.pool.updateState();
    },
    async context => {
      const notification = await context.pool.getNotifier().getUpdateSince();
      t.is(notification.updateCount, 2);
    },
  );
});
