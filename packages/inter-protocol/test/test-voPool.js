import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { runVOTest } from '@agoric/swingset-liveslots/tools/vo-test-harness.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeParamManager } from '@agoric/governance';
import {
  makeNotifierFromSubscriber,
  makeStoredPublisherKit,
} from '@agoric/notifier';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeFakeMarshaller } from '@agoric/notifier/tools/testSupports.js';
import { objectMap } from '@agoric/internal';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeAmmParams } from '../src/vpool-xyk-amm/params.js';
import { definePoolKind } from '../src/vpool-xyk-amm/pool.js';

/** @typedef {ReturnType<typeof definePoolKind>} MakePoolMulti */
/** @typedef {ReturnType<MakePoolMulti>} PoolMulti */

/**
 * @param {ERef<ZoeService>} zoe
 * @param {bigint} poolFeeBP
 * @param {bigint} protocolFeeBP
 * @param {Amount<'nat'>} minInitialLiquidity
 * @param {Invitation} poserInvitation - invitation for the question poser
 */
const makeAmmParamManager = async (
  zoe,
  poolFeeBP,
  protocolFeeBP,
  minInitialLiquidity,
  poserInvitation,
) => {
  const initial = objectMap(
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
  /** @type {MakePoolMulti | undefined} */
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
  const quoteIssuerKit = makeIssuerKit('Quotes', 'set');
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

    const { rootNode } = makeFakeStorageKit('voPoolTest');
    const marshaller = makeFakeMarshaller();

    /** @type {import('../src/vpool-xyk-amm/multipoolMarketMaker.js').AmmPowers} */
    const ammPowers = {
      zcf,
      // @ts-expect-error test unused
      secondaryBrandToPool: undefined,
      // @ts-expect-error test unused
      secondaryBrandToLiquidityMint: undefined,
      centralBrand,
      timer,
      quoteIssuerKit,
      // @ts-expect-error TS is confused
      params: paramAccessor,
      protocolSeat,
    };

    return definePoolKind(
      makeScalarBigMapStore('virtualPool', { durable: true }),
      ammPowers,
      rootNode,
      marshaller,
    );
  };

  const state = {};
  /** @param {PoolMulti} vobj
   *  @param {'before' | 'after'} phase
   */
  const testVPool = async (vobj, phase) => {
    const { pool, singlePool } = vobj;
    if (phase === 'before') {
      state.notifier = pool.getSubscriber();
      state.toCentralPA = pool.getToCentralPriceAuthority();
      state.singlePool = pool.getVPool();
      state.liquidityIssuer = pool.getLiquidityIssuer();
      await mutation(vobj);
    } else if (phase === 'after') {
      const newNotifier = pool.getSubscriber();
      t.is(state.notifier, newNotifier);
      t.is(state.toCentralPA, pool.getToCentralPriceAuthority());
      t.is(state.singlePool, singlePool);
      t.is(state.liquidityIssuer, pool.getLiquidityIssuer());
      t.truthy(postTest(vobj));
    }
  };

  const prepare = () => {
    makePool = defineVirtualPoolKind();
  };

  const makeTestObject = () => {
    assert(makePool, 'prepare not called');
    return makePool(liquidityZcfMint, poolSeat, secondaryBrand);
  };

  await runVOTest(t, prepare, makeTestObject, testVPool);
};

const noOp = () => {};

test.serial('unchanged', async t => {
  await voPoolTest(t, noOp, () => true);
});

test.serial('one update', async t => {
  /** @type {Notifier<unknown> | undefined} */
  let notifier;
  let initialNotifierCount;
  await voPoolTest(
    t,
    /** @param {PoolMulti} vobj */
    async vobj => {
      notifier = makeNotifierFromSubscriber(await vobj.pool.getSubscriber());
      initialNotifierCount = await notifier.getUpdateSince();
      return vobj.pool.updateState();
    },
    async () => {
      assert(notifier);
      const notification = await notifier.getUpdateSince();
      assert(notification.updateCount);
      t.is(
        BigInt(notification.updateCount),
        BigInt(initialNotifierCount) + 1n,
        `updateCount should increase by one from ${initialNotifierCount}`,
      );
    },
  );
});
