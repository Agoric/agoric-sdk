// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSourceAmbient from '@endo/bundle-source';
import { E, passStyleOf } from '@endo/far';

import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import {
  buildRootObject as buildPSMRootObject,
  MANIFEST as PSM_MANIFEST,
} from '../src/core/boot-psm.js';
import { buildRootObject } from '../src/core/boot-chain.js';
import { buildRootObject as buildSimRootObject } from '../src/core/boot-sim.js';
import { buildRootObject as buildSoloRootObject } from '../src/core/boot-solo.js';
import { bridgeCoreEval } from '../src/core/chain-behaviors.js';
import { makePromiseSpace } from '../src/core/promise-space.js';

import {
  makeMock,
  mockDProxy,
  mockPsmBootstrapArgs,
  mockSwingsetVats,
} from '../tools/boot-test-utils.js';

// #region ambient authority limited to test set-up
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
// #endregion

/** @type {<X>(a: X[], b: X[]) => X[]} */
const setDiff = (a, b) => a.filter(x => !b.includes(x));

test('PSM manifest consumes 2 more things than it produces! oops!@@@', t => {
  const { entries } = Object;
  /** @typedef {import('../src/core/lib-boot.js').BootstrapManifestPermit} Permit */

  /** @type {(p: Permit) => string[]} */
  const paths = permit => {
    /** @type {(pfx: string[], part: Permit) => string[][]} */
    const recur = (prefix, part) =>
      typeof part === 'object'
        ? entries(part).flatMap(([p, v]) => recur([...prefix, p], v))
        : [prefix];
    return recur([], permit).map(p => p.join('.'));
  };

  const all = entries(PSM_MANIFEST).flatMap(([_fn, p]) => paths(p));
  const consumed = all
    .filter(p => p.includes('consume'))
    .map(p => p.replace('consume.', ''));
  const produced = all
    .filter(p => p.includes('produce'))
    .map(p => p.replace('produce.', ''));
  const missing = [...new Set(setDiff(consumed, produced))].filter(
    p =>
      !(
        p.startsWith('namedVat.') ||
        ['agoricNames', 'agoricNamesAdmin', 'vatAdminSvc'].includes(p)
      ),
  );
  t.deepEqual(missing, [
    'installation.walletFactory',
    'installation.provisionPool',
  ]);
});

/**
 * @callback BuildRootObject
 * @param {{}} vatPowers
 * @param {{}} vatParameters
 * @param {import('@agoric/vat-data').Baggage} [baggage]
 */

/**
 *
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
    const vatPowers = { D: mockDProxy, logger: t.log };
    const root = entryPoint(vatPowers, vatParameters);
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
  const root = buildRootObject({ D: mockDProxy, logger: t.log }, {});

  await E(root).produceItem('swissArmyKnife', [1, 2, 3]);
  t.deepEqual(await E(root).consumeItem('swissArmyKnife'), [1, 2, 3]);
  await E(root).resetItem('swissArmyKnife');
  await E(root).produceItem('swissArmyKnife', 4);
  t.deepEqual(await E(root).consumeItem('swissArmyKnife'), 4);
});

const psmParams = {
  anchorAssets: [{ denom: 'ibc/toyusdc' }],
  economicCommitteeAddresses: {},
  argv: { bootMsg: {} },
};

test(`PSM-only bootstrap`, async t => {
  const root = buildPSMRootObject({ D: mockDProxy, logger: t.log }, psmParams);

  void E(root).bootstrap(...mockPsmBootstrapArgs(t.log));
  await eventLoopIteration();

  const agoricNames =
    /** @type {Promise<import('../src/types.js').NameHub>} */ (
      E(root).consumeItem('agoricNames')
    );
  const instance = await E(agoricNames).lookup('instance', 'psm-IST-AUSD');
  t.is(passStyleOf(instance), 'remotable');
});

test('PSM-only bootstrap provides a way to pass items to CORE_EVAL', async t => {
  const root = buildPSMRootObject({ D: mockDProxy, logger: t.log }, psmParams);

  await E(root).produceItem('swissArmyKnife', [1, 2, 3]);
  t.deepEqual(await E(root).consumeItem('swissArmyKnife'), [1, 2, 3]);
  await E(root).resetItem('swissArmyKnife');
  await E(root).produceItem('swissArmyKnife', 4);
  t.deepEqual(await E(root).consumeItem('swissArmyKnife'), 4);
});
