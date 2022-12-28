// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import {
  makeFakeVatAdmin,
  zcfBundleCap,
} from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSource from '@endo/bundle-source';
import { E, Far, passStyleOf } from '@endo/far';

import { makeZoeKit } from '@agoric/zoe';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { buildRootObject as buildPSMRootObject } from '../src/core/boot-psm.js';
import { buildRootObject } from '../src/core/boot.js';
import { bridgeCoreEval } from '../src/core/chain-behaviors.js';
import { makePromiseSpace } from '../src/core/utils.js';
import { buildRootObject as boardRoot } from '../src/vat-board.js';

import {
  makeMock,
  mockDProxy,
  mockPsmBootstrapArgs,
  vatRoots,
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

    const fakeVatAdmin = makeFakeVatAdmin(() => {}).admin;
    const fakeBundleCaps = new Map(); // {} -> name
    const getNamedBundleCap = name => {
      const bundleCap = harden({});
      fakeBundleCaps.set(bundleCap, name);
      return bundleCap;
    };
    const createVat = (bundleCap, options) => {
      const name = fakeBundleCaps.get(bundleCap);
      assert(name);
      switch (name) {
        case 'zcf':
          return fakeVatAdmin.createVat(zcfBundleCap, options);
        default: {
          const buildRoot = vatRoots[name];
          if (!buildRoot) {
            throw Error(`TODO: load vat ${name}`);
          }
          const vatParameters = { ...options?.vatParameters };
          if (name === 'zoe') {
            // basic-behaviors.js:buildZoe() provides hard-coded zcf BundleName
            // and vat-zoe.js ignores vatParameters, but this would be the
            // preferred way to pass the name.
            vatParameters.zcfBundleName = 'zcf';
          }
          return { root: buildRoot({}, vatParameters), admin: {} };
        }
      }
    };
    const createVatByName = name => {
      const bundleCap = getNamedBundleCap(name);
      return createVat(bundleCap);
    };

    const criticalVatKey = harden({});
    const vats = {
      ...mock.vats,
      vatAdmin: /** @type { any } */ ({
        getCriticalVatKey: () => criticalVatKey,
        createVatAdminService: () =>
          Far('vatAdminSvc', { getNamedBundleCap, createVat, createVatByName }),
      }),
    };
    const actual = await E(root).bootstrap(vats, mock.devices);
    t.deepEqual(actual, undefined);
  });
};

testRole('client', false);
testRole('chain', false);
testRole('chain', true);
testRole('sim-chain', false);
testRole('sim-chain', true);

test('evaluateInstallation is available to core eval', async t => {
  let handler;
  const modulePath = new URL('../src/core/utils.js', import.meta.url).pathname;
  const { produce, consume } = makePromiseSpace(t.log);

  const prepare = async () => {
    const bridgeManager = {
      register: (name, fn) => {
        handler = fn;
      },
    };

    const {
      zoeServices: { zoeService },
    } = makeZoeKit(makeFakeVatAdmin(() => {}).admin);

    const theBoard = boardRoot().getBoard();
    const bundle = await bundleSource(modulePath);

    const installation = await E(zoeService).install(bundle);
    const instId = await E(theBoard).getId(installation);

    produce.zoe.resolve(zoeService);
    produce.board.resolve(theBoard);
    produce.bridgeManager.resolve(bridgeManager);
    return instId;
  };

  const instId = await prepare();

  // @ts-expect-error
  await bridgeCoreEval({ produce, consume });
  t.truthy(handler);

  const produceThing = async ({
    consume: { board },
    produce: { thing },
    evaluateInstallation,
  }) => {
    const id = 'REPLACE_WITH_BOARD_ID';
    const inst = await E(board).getValue(id);
    const ns = await evaluateInstallation(inst);
    thing.resolve(ns);
  };

  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: [
      {
        json_permits: 'true',
        js_code: `${produceThing}`.replace('REPLACE_WITH_BOARD_ID', instId),
      },
    ],
  };
  t.log({ bridgeMessage });

  // @ts-expect-error
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
