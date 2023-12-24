import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSourceAmbient from '@endo/bundle-source';
import { E } from '@endo/far';

import { buildRootObject } from '../src/core/boot-chain.js';
import { buildRootObject as buildSimRootObject } from '../src/core/boot-sim.js';
import { buildRootObject as buildSoloRootObject } from '../src/core/boot-solo.js';
import { bridgeCoreEval } from '../src/core/chain-behaviors.js';
import { makePromiseSpace } from '../src/core/promise-space.js';

import {
  makeMock,
  mockDProxy,
  mockSwingsetVats,
} from '../tools/boot-test-utils.js';

//#region ambient authority limited to test set-up
/** @typedef {import('ava').ExecutionContext<ReturnType<makeTestContext>>} ECtx */

const makeTestContext = () => {
  const bundleSource = bundleSourceAmbient;
  const loadBundle = async specifier => {
    const modulePath = new URL(specifier, import.meta.url).pathname;
    /** @type {import('@agoric/swingset-vat').Bundle} */
    const bundle = await bundleSource(modulePath);
    return bundle;
  };

  return { loadBundle };
};
test.before(t => {
  t.context = makeTestContext();
});
//#endregion

/**
 * @callback BuildRootObject
 * @param {{}} vatPowers
 * @param {{}} vatParameters
 * @param {import('@agoric/vat-data').Baggage} baggage
 */

/**
 * @param {string} label
 * @param {BuildRootObject} entryPoint
 * @param {boolean} doCoreProposals
 */
const testBootstrap = (label, entryPoint, doCoreProposals) => {
  const vatParameters = {
    argv: {
      FIXME_GCI: 'fake GCI',
      hardcodedClientAddresses: ['a1'],
    },
  };

  test(`test manifest permits: ${label} gov: ${doCoreProposals}`, async t => {
    const mock = makeMock(t.log);
    const vatPowers = {
      D: mockDProxy,
      logger: t.log,
      exitVatWithFailure: err => {
        console.error(err);
        throw err;
      },
    };
    const baggage = makeScalarBigMapStore('test-baggage', { durable: true });
    const root = entryPoint(vatPowers, vatParameters, baggage);
    const vats = mockSwingsetVats(mock);
    await t.notThrowsAsync(E(root).bootstrap(vats, mock.devices));
  });
};

testBootstrap('client', buildSoloRootObject, false);
testBootstrap('chain', buildRootObject, false);
testBootstrap('chain', buildRootObject, true);
testBootstrap('sim', buildSimRootObject, false);
testBootstrap('sim', buildSimRootObject, true);

test('evaluateBundleCap is available to core eval', async (/** @type {ECtx} */ t) => {
  const { loadBundle } = t.context;
  /** @type {undefined | import('../src/types.js').BridgeHandler} */
  let handler;
  const { produce, consume } = makePromiseSpace(t.log);
  const { admin, vatAdminState } = makeFakeVatAdmin();
  const vatPowers = vatAdminState.getVatPowers();

  const prepare = async () => {
    const bundle = await loadBundle('../src/core/utils.js');
    if (bundle.moduleFormat !== 'endoZipBase64') throw t.fail();
    const bundleID = bundle.endoZipBase64Sha512;
    vatAdminState.installBundle(bundleID, bundle);
    const bridgeManager = {
      register: (name, fn) => {
        handler = fn;
      },
    };
    produce.vatAdminSvc.resolve(admin);
    produce.bridgeManager.resolve(bridgeManager);
    return bundleID;
  };

  const bundleID = await prepare();

  // @ts-expect-error
  await bridgeCoreEval({ vatPowers, produce, consume });
  if (!handler) throw t.fail();

  const produceThing = async ({
    consume: { vatAdminSvc },
    produce: { thing },
    evaluateBundleCap,
  }) => {
    const myBundleID = 'REPLACE_WITH_BUNDLE_ID';
    const bcap = await E(vatAdminSvc).getBundleCap(myBundleID);
    const ns = await evaluateBundleCap(bcap);
    thing.resolve(ns);
  };

  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: [
      {
        json_permits: 'true',
        js_code: `${produceThing}`.replace('REPLACE_WITH_BUNDLE_ID', bundleID),
      },
    ],
  };
  t.log({ bridgeMessage });

  await E(handler).fromBridge(bridgeMessage);
  const actual = await consume.thing;

  // @ts-expect-error
  t.deepEqual(typeof actual.extract, 'function');
});

test('bootstrap provides a way to pass items to CORE_EVAL', async t => {
  const baggage = makeScalarBigMapStore('test-baggage', { durable: true });
  const root = buildRootObject(
    /** @type {VatPowers} */ /** @type {any} */ ({
      D: mockDProxy,
      logger: t.log,
    }),
    {},
    baggage,
  );

  await E(root).produceItem('swissArmyKnife', [1, 2, 3]);
  t.deepEqual(await E(root).consumeItem('swissArmyKnife'), [1, 2, 3]);
  await E(root).resetItem('swissArmyKnife');
  await E(root).produceItem('swissArmyKnife', 4);
  t.deepEqual(await E(root).consumeItem('swissArmyKnife'), 4);
});
