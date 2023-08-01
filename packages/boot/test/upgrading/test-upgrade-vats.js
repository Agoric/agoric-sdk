// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { BridgeId } from '@agoric/internal';
import { buildVatController } from '@agoric/swingset-vat';
import { makeRunUtils } from '../bootstrapTests/supports.js';

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<typeof makeTestContext>>
 * >}
 */
const test = anyTest;

const { Fail } = assert;

const importSpec = spec =>
  importMetaResolve(spec, import.meta.url).then(u => new URL(u).pathname);

const makeTestContext = async metaUrl => {
  const bfile = name => new URL(name, metaUrl).pathname;

  return { bfile };
};

const makeCallOutbound = t => (srcID, obj) => {
  t.log(`callOutbound(${srcID}, ${obj})`);
  return obj;
};

/** NOTE: limit ambient authority such as import.meta.url to test.before() */
test.before(async t => {
  t.context = await makeTestContext(import.meta.url);
});

/**
 * @param {any} t
 * @param {Partial<SwingSetConfig>} [kernelConfigOverrides]
 * @param {Record<string, unknown>} [deviceEndowments]
 * @returns {Promise<ReturnType<typeof makeRunUtils>>}
 */
const makeScenario = async (
  t,
  kernelConfigOverrides = {},
  deviceEndowments,
) => {
  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: await importSpec(
          '@agoric/swingset-vat/tools/bootstrap-relay.js',
        ),
      },
    },
    bundleCachePath: 'bundles',
    ...kernelConfigOverrides,
  };

  const c = await buildVatController(
    config,
    undefined,
    undefined,
    deviceEndowments,
  );
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  const runUtils = makeRunUtils(c, t.log);
  return runUtils;
};

test('upgrade vat-board', async t => {
  const bundles = {
    board: {
      sourceSpec: await importSpec('@agoric/vats/src/vat-board.js'),
    },
  };

  const { EV } = await makeScenario(t, { bundles });

  t.log('create initial version');
  const boardVatConfig = {
    name: 'board',
    bundleCapName: 'board',
  };
  await EV.vat('bootstrap').createVat(boardVatConfig);
  const board = await EV.vat('board').getBoard();
  const thing = await EV.rawBoot.makeRemotable('Thing', {});
  const thingId = await EV(board).getId(thing);
  t.regex(thingId, /^board0[0-9]+$/);

  t.log('now perform the null upgrade');
  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    boardVatConfig,
  );
  t.is(incarnationNumber, 1, 'Board vat must be upgraded');
  const board2 = await EV.vat('board').getBoard();
  t.is(board2, board, 'must get the same board reference');
  const actualThing = await EV(board2).getValue(thingId);
  t.is(actualThing, thing, 'must get original value back');
});

test.skip('upgrade bootstrap vat', async t => {
  const bundles = {
    chain: {
      sourceSpec: await importSpec('@agoric/vats/src/core/boot-chain.js'),
    },
  };
  // @ts-expect-error error in skipped test
  const { EV } = await makeScenario(t, bundles);

  t.log('create initial version');
  const chainVatConfig = {
    name: 'chain',
    bundleCapName: 'chain',
  };
  await EV.vat('bootstrap').createVat(chainVatConfig);
  await EV.vat('chain')
    .bootstrap({}, {})
    .catch(problem => t.log('TODO: address problem:', problem));

  t.log('now perform the null upgrade');

  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    chainVatConfig,
  );
  t.is(incarnationNumber, 1, 'vat must be upgraded');
});

test('upgrade vat-bridge', async t => {
  const { bfile } = t.context;
  const bundles = {
    bridge: { sourceSpec: await importSpec('@agoric/vats/src/vat-bridge.js') },
  };
  const devices = {
    bridge: { sourceSpec: bfile('./device-bridge.js') },
  };

  const expectedStorageValues = ['abc', 'def'];
  const { EV } = await makeScenario(
    t,
    { bundles, devices },
    {
      bridge: {
        t,
        callOutbound: makeCallOutbound(t),
        bridgeBackends: {
          [BridgeId.STORAGE](obj) {
            const { method, args } = obj;
            t.is(method, 'set', `storage bridge method must be 'set'`);
            t.deepEqual(args, [['root1', expectedStorageValues.shift()]]);
            return undefined;
          },
        },
      },
    },
  );

  t.log('create initial version');
  const bridgeVatConfig = {
    name: 'bridge',
    bundleCapName: 'bridge',
  };
  await EV.vat('bootstrap').createVat(bridgeVatConfig);

  await t.throwsAsync(
    () => EV.vat('bridge').provideManagerForBridge(1),
    {
      message: /must be given a device node/,
    },
    'rejects non-device node',
  );

  const dev = await EV.vat('bootstrap').getDevice('bridge');
  const bridge1 = await EV.vat('bridge').provideManagerForBridge(dev);
  const bridge2 = await EV.vat('bridge').provideManagerForBridge(dev);
  t.is(bridge1, bridge2, 'must get the same bridge reference');

  const storageBridge = await EV(bridge1).register(BridgeId.STORAGE);
  const storageRoot = await EV.vat('bridge').makeBridgedChainStorageRoot(
    storageBridge,
    'root1',
    { sequence: false },
  );
  const path1 = await EV(storageRoot).getPath();
  t.is(path1, 'root1', 'must get the same path back');

  const ret = await EV(storageRoot).setValue('abc');
  t.is(ret, undefined, 'setValue must return undefined');

  await t.throwsAsync(() => EV(storageBridge).fromBridge('no handler'), {
    message: /No inbound handler for/,
  });

  const storageHandler = await EV.rawBoot.makeRemotable(
    'loggingStorageHandler',
    {
      fromBridge: undefined,
    },
  );
  await EV(storageBridge).initHandler(storageHandler);
  t.deepEqual(
    await EV.rawBoot.getLogForRemotable(storageHandler),
    [],
    'log must start empty',
  );
  await EV(storageBridge).fromBridge('storage handler is good');
  t.deepEqual(
    await EV.rawBoot.getLogForRemotable(storageHandler),
    [['fromBridge', 'storage handler is good']],
    'log must show one handler call',
  );

  t.log('now perform the null upgrade');
  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    bridgeVatConfig,
  );

  t.is(incarnationNumber, 1, 'Bridge vat must be upgraded');

  const path1b = await EV(storageRoot).getPath();
  t.is(path1b, 'root1', 'must get the same path back');

  const bridge1b = await EV.vat('bridge').provideManagerForBridge(dev);
  t.is(bridge1b, bridge1, 'must get the same bridge reference');

  const ret2 = await EV(storageRoot).setValue('def');
  t.is(ret2, undefined, 'setValue must return undefined');

  await EV(storageBridge).fromBridge('storage handler is still good');
  t.deepEqual(
    await EV.rawBoot.getLogForRemotable(storageHandler),
    [
      ['fromBridge', 'storage handler is good'],
      ['fromBridge', 'storage handler is still good'],
    ],
    'log must show next handler call',
  );
});

test('upgrade vat-bank', async t => {
  const { bfile } = t.context;
  const bundles = {
    bank: { sourceSpec: await importSpec('@agoric/vats/src/vat-bank.js') },
    bridge: { sourceSpec: await importSpec('@agoric/vats/src/vat-bridge.js') },
    mint: { sourceSpec: bfile('./vat-mint.js') },
  };
  const devices = {
    bridge: { sourceSpec: bfile('./device-bridge.js') },
  };

  const { EV } = await makeScenario(
    t,
    { bundles, devices },
    {
      bridge: {
        t,
        callOutbound: makeCallOutbound(t),
        bridgeBackends: {
          [BridgeId.BANK](obj) {
            switch (obj.type) {
              case 'VBANK_GET_BALANCE': {
                return '1000';
              }
              default:
                Fail`unexpected call to bank handler ${obj}`;
            }
          },
        },
      },
    },
  );

  t.log('create initial version');
  const bridgeVatConfig = {
    name: 'bridge',
    bundleCapName: 'bridge',
  };
  const bankVatConfig = {
    name: 'bank',
    bundleCapName: 'bank',
  };
  const mintVatConfig = {
    name: 'mint',
    bundleCapName: 'mint',
  };
  await Promise.all([
    EV.vat('bootstrap').createVat(bridgeVatConfig),
    EV.vat('bootstrap').createVat(bankVatConfig),
    EV.vat('bootstrap').createVat(mintVatConfig),
  ]);

  t.log(`create a non-bridged bank manager`);
  /** @type {ERef<BankManager>} */
  const noBridgeMgr = await EV.vat('bank').makeBankManager();

  t.log(`create a bridged bank manager`);
  const dev = await EV.vat('bootstrap').getDevice('bridge');
  const bridge1 = await EV.vat('bridge').provideManagerForBridge(dev);
  const bankBridge = await EV(bridge1).register(BridgeId.BANK);
  /** @type {ERef<BankManager>} */
  const bridgedMgr = await EV.vat('bank').makeBankManager(bankBridge);

  t.log('subscribe to no bridge asset lists');
  const noBridgeAssetSub1 = await EV(noBridgeMgr).getAssetSubscription();
  const noBridgeIterator = await EV(noBridgeAssetSub1)[Symbol.asyncIterator]();

  t.log('add an asset to both');
  const abcKit = await EV.vat('mint').makeIssuerKit('ABC');
  const defKit = await EV.vat('mint').makeIssuerKit('DEF');
  await EV(noBridgeMgr).addAsset('uabc', 'ABC', 'A Bank Coin', abcKit);
  await EV(bridgedMgr).addAsset('uabc', 'ABC', 'A Bank Coin', abcKit);
  await EV(bridgedMgr).addAsset('udef', 'DEF', 'Definitely a coin', defKit);

  const banks = {
    agoric1234: await EV(noBridgeMgr).getBankForAddress('agoric1234'),
    agoric1bbb: await EV(bridgedMgr).getBankForAddress('agoric1bbb'),
  };

  const abcPurse1 = await EV(banks.agoric1234).getPurse(abcKit.brand);
  const abcPurse2 = await EV(banks.agoric1234).getPurse(abcKit.brand);
  t.is(abcPurse1, abcPurse2, 'must get the same purse back');

  const defPurse1 = await EV(banks.agoric1bbb).getPurse(defKit.brand);
  const defPurse2 = await EV(banks.agoric1bbb).getPurse(defKit.brand);
  t.is(defPurse1, defPurse2, 'must get the same purse back');

  const pmt1 = await EV(abcKit.mint).mintPayment({
    brand: abcKit.brand,
    value: 1000n,
  });
  await EV(abcPurse1).deposit(pmt1);
  t.deepEqual(
    await EV(abcPurse1).getCurrentAmount(),
    { brand: abcKit.brand, value: 1000n },
    'purse must have 1000n',
  );

  const abcAsset = harden({
    brand: abcKit.brand,
    denom: 'uabc',
    issuer: abcKit.issuer,
    issuerName: 'ABC',
    proposedName: 'A Bank Coin',
  });
  const defAsset = harden({
    brand: defKit.brand,
    denom: 'udef',
    issuer: defKit.issuer,
    issuerName: 'DEF',
    proposedName: 'Definitely a coin',
  });

  t.log('subscribe to bridged asset list');
  const bridgedAssetSub1 = await EV(bridgedMgr).getAssetSubscription();
  t.not(
    bridgedAssetSub1,
    noBridgeAssetSub1,
    'differently-bridged asset subscriptions must be different',
  );
  const bridgedIterator = await EV(bridgedAssetSub1)[Symbol.asyncIterator]();

  t.deepEqual(await EV(bridgedIterator).next(), {
    value: abcAsset,
    done: false,
  });

  t.log('now perform the null upgrade');
  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    bankVatConfig,
  );

  t.is(incarnationNumber, 1, 'Bank vat must be upgraded');

  await t.throwsAsync(() => EV(noBridgeIterator).next(), {
    message: 'vat terminated',
  });
  await t.throwsAsync(() => EV(bridgedIterator).next(), {
    message: 'vat terminated',
  });

  const abcPurse3 = await EV(banks.agoric1234).getPurse(abcKit.brand);
  t.is(abcPurse3, abcPurse1, 'must get the same purse back');
  t.deepEqual(
    await EV(abcPurse3).getCurrentAmount(),
    { brand: abcKit.brand, value: 1000n },
    'purse must have 1000n',
  );

  const noBridgeAssetSub2 = await EV(noBridgeMgr).getAssetSubscription();
  t.is(
    noBridgeAssetSub1,
    noBridgeAssetSub2,
    'must get the same subscription back',
  );
  const noBridgeIterator2 = await EV(noBridgeAssetSub2)[Symbol.asyncIterator]();
  t.deepEqual(await EV(noBridgeIterator2).next(), {
    value: abcAsset,
    done: false,
  });

  const bridgedAssetSub2 = await EV(bridgedMgr).getAssetSubscription();
  t.is(
    bridgedAssetSub1,
    bridgedAssetSub2,
    'must get the same subscription back',
  );
  const bridgedIteratorpub = await EV(bridgedAssetSub2).subscribeAfter();
  t.deepEqual(bridgedIteratorpub, {
    head: { done: false, value: abcAsset },
    publishCount: 1n,
    tail: bridgedIteratorpub.tail,
  });

  const bridgedIteratorpub2 = await EV.rawBoot.awaitVatObject({
    presence: bridgedIteratorpub.tail,
  });
  t.deepEqual(bridgedIteratorpub2, {
    head: { done: false, value: defAsset },
    publishCount: 2n,
    tail: bridgedIteratorpub2.tail,
  });

  await EV(noBridgeMgr).addAsset('udef', 'DEF', 'Definitely a coin', defKit);
  t.deepEqual(await EV(noBridgeIterator2).next(), {
    value: defAsset,
    done: false,
  });
});

test('upgrade vat-priceAuthority', async t => {
  const bundles = {
    priceAuthority: {
      sourceSpec: await importSpec('@agoric/vats/src/vat-priceAuthority.js'),
    },
  };

  const { EV } = await makeScenario(t, { bundles });

  t.log('create initial version');
  const priceAuthorityVatConfig = {
    name: 'priceAuthority',
    bundleCapName: 'priceAuthority',
  };
  await EV.vat('bootstrap').createVat(priceAuthorityVatConfig);

  /** @type {import('@agoric/zoe/tools/priceAuthorityRegistry.js').PriceAuthorityRegistry} */
  const registry = await EV.vat('priceAuthority').getRegistry();

  // Ideally we'd also test registering a PA and verifying the same one comes out the def end.
  // But we don't have a way to produce one through the kser that EV does here
  // so we'll have to test that elsewhere.

  t.log('now perform the null upgrade');
  const { incarnationNumber } = await EV.vat('bootstrap').upgradeVat(
    priceAuthorityVatConfig,
  );
  t.is(incarnationNumber, 1, 'vat must be reincarnated');

  t.log('get again');
  const reincarnatedRegistry = await EV.vat('priceAuthority').getRegistry();
  // facet holder object changes but the members have the same identity
  t.not(reincarnatedRegistry, registry);
  t.is(reincarnatedRegistry.priceAuthority, registry.priceAuthority);
  t.is(reincarnatedRegistry.adminFacet, registry.adminFacet);
});
