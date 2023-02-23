// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSourceAmbient from '@endo/bundle-source';
import { E, passStyleOf } from '@endo/far';

import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { buildRootObject as buildPSMRootObject } from '../src/core/boot-psm.js';
import { buildRootObject } from '../src/core/boot.js';
import { bridgeCoreEval } from '../src/core/chain-behaviors.js';
import { makePromiseSpace } from '../src/core/utils.js';

import {
  makeMock,
  mockDProxy,
  mockPsmBootstrapArgs,
  mockSwingsetVats,
} from '../tools/boot-test-utils.js';

const argvByRole = {
  chain: {
    ROLE: 'chain',
  },
  'sim-chain': {
    ROLE: 'sim-chain',
    FIXME_GCI: 'fake GCI',
    hardcodedClientAddresses: ['a1'],
  },
  client: {
    ROLE: 'client',
    FIXME_GCI: 'fake GCI',
    hardcodedClientAddresses: ['a1'],
  },
};
const testRole = (ROLE, governanceActions) => {
  test(`test manifest permits: ${ROLE} gov: ${governanceActions}`, async t => {
    const mock = makeMock(t.log);
    const root = buildRootObject(
      { D: mockDProxy, logger: t.log },
      {
        argv: argvByRole[ROLE],
        // @ts-expect-error XXX
        governanceActions,
      },
    );
    const vats = mockSwingsetVats(mock);
    const actual = await E(root).bootstrap(vats, mock.devices);
    t.deepEqual(actual, undefined);
  });
};

testRole('client', false);
testRole('chain', false);
testRole('chain', true);
testRole('sim-chain', false);
testRole('sim-chain', true);

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
  const root = buildRootObject(
    { D: mockDProxy, logger: t.log },
    {
      argv: argvByRole.chain,
      // @ts-expect-error XXX
      governanceActions: false,
    },
  );

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
