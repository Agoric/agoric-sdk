// @ts-check
/**
 * @file Bootstrap test integration vaults with smart-wallet
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail, NonNullish } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { Far, makeMarshal } from '@endo/marshal';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t, 'bundles/vaults');

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  const { readLatest } = swingsetTestKit;
  const readRewardPoolBalance = () => {
    return readLatest('published.vaultFactory.metrics').rewardPoolAllocation
      .Minted?.value;
  };
  const readCollateralMetrics = vaultManagerIndex =>
    readLatest(
      `published.vaultFactory.managers.manager${vaultManagerIndex}.metrics`,
    );

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    readCollateralMetrics,
    readRewardPoolBalance,
    walletFactoryDriver,
  };
};

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => t.context.shutdown());

test.serial('audit bootstrap exports', async t => {
  const expected = {
    maxExports: 5,
    maxNonDurable: 5,
    ifaces: {
      // in bridgeCoreEval()
      coreHandler: true,
      // in bridgeProvisioner()
      provisioningHandler: true,
      'prioritySenders manager': true,
      // TODO? move to provisioning vat?
      clientCreator: true,
    },
  };

  const { controller } = t.context;
  const kState = controller.dump();

  const myVatID = 'v1';

  const myPromises = kState.promises.filter(
    // @ts-expect-error kernel.dump() .promises type is wrong
    p => p.decider === myVatID,
  );
  t.true(myPromises.length <= 1, 'bootstrap is the decider of only its return');

  const myExports = kState.kernelTable.filter(
    o => o[1] === myVatID && o[2].startsWith('o+'),
  );
  const v1VatTable =
    kState.vatTables.find(vt => vt.vatID === myVatID) || assert.fail();
  const { transcript } = v1VatTable.state;

  const oids = new Set(myExports.map(o => o[2]));
  const oidsDurable = [...oids].filter(o => o.startsWith('o+d'));
  t.log(
    'bootstrap exports:',
    oidsDurable.length,
    'durable',
    oids.size - oidsDurable.length,
    'non-durable',
    oids.size,
    'total',
  );
  t.true(oids.size <= expected.maxExports, 'too many exports');
  t.true(
    oids.size - oidsDurable.length <= expected.maxNonDurable,
    'too many non-durable',
  );

  // Map oid to iface by poring over transcript syscalls
  const toIface = new Map();
  const anObj = Far('obj', {});
  const aPromise = harden(new Promise(() => {}));
  const saveBootstrapIface = (slot, iface) => {
    if (slot.startsWith('p')) return aPromise;
    if (oids.has(slot)) {
      toIface.set(slot, iface);
    }
    return anObj;
  };
  const m = makeMarshal(undefined, saveBootstrapIface);
  oids.forEach(oid => {
    for (const [_ix, ev] of transcript) {
      for (const sc of ev.sc) {
        if (sc.s[0] === 'send') {
          const { methargs } = sc.s[2];
          if (!methargs.slots.includes(oid)) continue;
          m.fromCapData(methargs);
          return;
        } else if (sc.s[0] === 'resolve') {
          for (const res of sc.s[1]) {
            const capdata = res[2];
            if (!capdata.slots.includes(oid)) continue;
            m.fromCapData(capdata);
            return;
          }
        }
      }
    }
  });

  const exportedInterfaces = Object.fromEntries(
    [...toIface.values()].map(iface => [iface.replace(/^Alleged: /, ''), true]),
  );

  t.deepEqual(exportedInterfaces, expected.ifaces, 'expected interfaces');
});

test.serial('open vault', async t => {
  console.time('open vault');

  t.falsy(t.context.readRewardPoolBalance());

  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1a');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open1',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });
  console.timeLog('open vault', 'executed offer');

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open1', numWantsSatisfied: 1 },
  });

  t.is(t.context.readRewardPoolBalance(), 25000n);
  t.like(t.context.readCollateralMetrics(0), {
    numActiveVaults: 1,
    totalCollateral: { value: 9000000n },
    totalDebt: { value: 5025000n },
  });
  console.timeEnd('open vault');
});

test.serial('restart', async t => {
  const { EV } = t.context.runUtils;
  /** @type {Awaited<import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace['consume']['vaultFactoryKit']>} */
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  // @ts-expect-error cast XXX missing from type
  const { privateArgs } = vaultFactoryKit;
  console.log('reused privateArgs', privateArgs, vaultFactoryKit);

  const vfAdminFacet = await EV(
    vaultFactoryKit.governorCreatorFacet,
  ).getAdminFacet();

  const keyMetrics = {
    numActiveVaults: 1,
    totalCollateral: { value: 9000000n },
    totalDebt: { value: 5025000n },
  };
  t.like(t.context.readCollateralMetrics(0), keyMetrics);
  t.log('awaiting restartContract');
  const upgradeResult = await EV(vfAdminFacet).restartContract(privateArgs);
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
  t.like(t.context.readCollateralMetrics(0), keyMetrics); // unchanged
});

test.serial('open vault 2', async t => {
  t.is(t.context.readRewardPoolBalance(), 25000n);

  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1a');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open2',
    collateralBrandKey,
    // small, won't be liquidated
    wantMinted: 5.0,
    giveCollateral: 100.0,
  });
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'open2',
      numWantsSatisfied: 1,
    },
  });

  // balance goes up as before restart (doubles because same wantMinted)
  t.is(t.context.readRewardPoolBalance(), 50000n);
});

test.serial('adjust balance of vault opened before restart', async t => {
  const { walletFactoryDriver } = t.context;
  t.is(t.context.readRewardPoolBalance(), 50000n);

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1a');

  // unchanged since before restart
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open2', numWantsSatisfied: 1 },
  });

  t.log('adjust to brink of liquidation');
  await wd.executeOfferMaker(
    Offers.vaults.AdjustBalances,
    {
      offerId: 'adjust1',
      collateralBrandKey,
      // collateralization ratio allows: 63462857n
      wantMinted: 63.0 - 5.0,
    },
    'open1',
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'adjust1',
      numWantsSatisfied: 1,
    },
  });
  // sanity check
  t.like(t.context.readCollateralMetrics(0), {
    numActiveVaults: 2,
    numLiquidatingVaults: 0,
  });
});

// charge interest to force a liquidation and verify the shortfall is transferred
test.serial('force liquidation', async t => {
  const { advanceTime } = t.context;

  // advance a year to drive interest charges
  advanceTime(365, 'days');
  t.is(t.context.readRewardPoolBalance(), 340000n);
  t.like(t.context.readCollateralMetrics(0), {
    totalDebt: { value: 68340000n },
  });

  // liquidation will have been skipped because time skipped ahead
  // so now advance slowly
  await advanceTime(1, 'hours');
  await advanceTime(1, 'hours');
  // wait for it...
  t.like(t.context.readCollateralMetrics(0), {
    liquidatingCollateral: { value: 0n },
    liquidatingDebt: { value: 0n },
    numLiquidatingVaults: 0,
  });

  // POW
  await advanceTime(1, 'hours');
  t.like(t.context.readCollateralMetrics(0), {
    liquidatingCollateral: { value: 9000000n },
    liquidatingDebt: { value: 696421994n },
    numLiquidatingVaults: 1,
  });
});

test.serial(
  'upgrade facet for all contracts, vats are saved durably',
  async t => {
    const {
      controller,
      runUtils: { EV },
      swingStore,
    } = t.context;
    const kState = controller.dump();
    const { kernelTable, vatTables } = kState;

    t.log('find contracts, vats known to SwingSet');
    // see comment atop kernelKeeper.js for schema
    const vatOptions = vatID =>
      JSON.parse(
        NonNullish(
          swingStore.kernelStorage.kvStore.get(`${vatID}.options`),
          vatID,
        ),
      );
    const vatNames = Object.fromEntries(
      vatTables.map(vt => [vt.vatID, vatOptions(vt.vatID).name]),
    );
    const vatNamed = name =>
      Object.keys(vatNames).find(vatID => vatNames[vatID] === name) ||
      assert.fail();
    const zoeVat = vatNamed('zoe');

    t.log('discharge obligations by finding upgrade powers');
    const todo = Object.fromEntries(Object.entries(vatNames));
    // vats created by swingset before bootstrap starts
    const swingsetVats = [
      'bootstrap',
      'comms',
      'vatAdmin',
      'vattp',
      'timer',
    ].map(vatNamed);
    swingsetVats.forEach(vatID => {
      delete todo[vatID];
    });

    // TODO? test that powerStore is in baggage?
    // by inspection, we see that it is:
    // [ "v1.vs.vc.1.sBootstrap Powers", "{\"body\":\"#\\\"$0.Alleged: mapStore\\\"\",\"slots\":[\"o+d6/5\"]}",]

    /** @type {MapStore} */
    const powerStore = await EV.vat('bootstrap').consumeItem('powerStore');

    /** @type {(n: string) => Promise<Array<[*, *]>>} */
    const getStoreSnapshot = async name =>
      EV.vat('bootstrap').snapshotStore(await EV(powerStore).get(name));

    const contractKits = await getStoreSnapshot('contractKits');
    const psmKit = await getStoreSnapshot('psmKit');
    const governedContractKits = await getStoreSnapshot('governedContractKits');
    const vatStore = await getStoreSnapshot('vatStore');

    /**
     * Map refs to objects and find a vat containing one of them.
     *
     * @param {Record<string, unknown>} refs
     * @param {string[]} exclude don't report hits from these vatIDs
     */
    const findVat = async (refs, exclude = [zoeVat]) => {
      const mapped = {};
      for await (const [prop, presence] of Object.entries(refs)) {
        if (!presence) {
          continue;
        }
        const obj = await EV.rawBoot.awaitVatObject({
          presence,
          rawOutput: true,
        });
        mapped[prop] = obj;
      }
      for (const obj of Object.values(mapped)) {
        const [_k, vatID, _oid] = kernelTable.find(
          row => row[0] === obj.getKref() && row[2].startsWith('o+'),
        );
        if (!exclude.includes(vatID)) {
          return { vatID, mapped };
        }
      }
      console.warn(`no vat found for`, refs);
      return { vatID: undefined, mapped: {} };
    };

    for await (const [_instance, kit] of [
      ...contractKits,
      ...governedContractKits,
      ...psmKit,
    ]) {
      t.truthy(kit.adminFacet || kit.psmAdminFacet, kit.label);
      const { creatorFacet, publicFacet, psmCreatorFacet } = kit;
      const { vatID, mapped } = await findVat({
        creatorFacet,
        publicFacet,
        psmCreatorFacet,
      });
      console.log(
        'kit',
        { ...kit, ...mapped },
        'has adminFacet of contract vat:',
        vatID,
        vatNames[vatID],
      );
      delete todo[vatID];
    }

    for await (const [_instance, kit] of [...governedContractKits, ...psmKit]) {
      t.truthy(kit.adminFacet || kit.psmAdminFacet, kit.label);
      const { governorCreatorFacet, psmGovernorCreatorFacet } = kit;
      const { vatID, mapped } = await findVat({
        governorCreatorFacet,
        psmGovernorCreatorFacet,
      });
      console.log(
        'kit',
        { ...kit, ...mapped },
        'has adminFacet of contract governor vat:',
        vatID,
        vatNames[vatID],
      );
      delete todo[vatID];
    }

    for await (const [name, info] of vatStore) {
      t.truthy(info.adminNode, name);
      const { root } = info;
      const { vatID, mapped } = await findVat({ root }, swingsetVats);
      if (vatID) {
        console.log(
          'kit',
          { name, ...info, ...mapped },
          'has adminNode of non-contract vat:',
          vatID,
          vatNames[vatID],
        );
        delete todo[vatID];
      }
    }

    t.deepEqual(todo, {});
  },
);

// Will be part of https://github.com/Agoric/agoric-sdk/issues/5200
// For now upon restart the values are reset to the terms under which the contract started.
// When it comes time to upgrade the vaultFactory contract we'll have at least these options:
// 1. Make the new version allow some privateArgs to specify the parameter state.
// 2. Have EC disable offers until they can update parameters as needed.
test.todo('governance changes maintained after restart');
