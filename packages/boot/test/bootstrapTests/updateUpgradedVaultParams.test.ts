/**
 * @file The goal of this test is to show that #9982 is fixed
 * We change a parameter so that provideParamGovernance() is called once, and
 * paramGoverance has been set. Then upgrade vaultFactory, so any ephemeral
 * objects from the contract held by the governor are gone, then try to change
 * param again, to show that the bug is fixed.
 */

import type { TestFn } from 'ava';

import { updateVaultManagerParams } from '@aglocal/boot/test/tools/changeVaultParams.js';
import {
  makeGovernanceDriver,
  makeWalletFactoryDriver,
} from '@aglocal/boot/tools/drivers.js';
import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import {
  boardSlottingMarshaller,
  makeAgoricNamesRemotesFromFakeStorage,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Fail } from '@endo/errors';

const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

const makeDefaultTestContext = async () => {
  console.time('DefaultTestContext');

  const storage = makeFakeStorageKit('bootstrapTests');
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json',
    handleBridgeSend: makeMockBridgeKit({ storageKit: storage })
      .handleBridgeSend,
  });

  const { EV, queueAndRun } = swingsetTestKit;

  const readLatestEntryFromStorage = (path: string) => {
    let data;
    try {
      data = unmarshalFromVstorage(storage.data, path, fromCapData, -1);
    } catch {
      // fall back to regular JSON
      const raw = storage.getValues(path).at(-1);
      assert(raw, `No data found for ${path}`);
      data = JSON.parse(raw);
    }
    return data;
  };

  console.timeLog('DefaultTestContext', 'swingsetTestKit');

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    { EV, queueAndRun },
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  const gd = await makeGovernanceDriver(
    // @ts-expect-error
    {
      ...swingsetTestKit,
      readPublished: (subPath: string) =>
        readLatestEntryFromStorage(`published.${subPath}`),
    },
    agoricNamesRemotes,
    walletFactoryDriver,
    [
      'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
      'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    ],
  );

  return { ...swingsetTestKit, agoricNamesRemotes, gd };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => (t.context = await makeDefaultTestContext()));
test.after.always(t => t.context.shutdown?.());

test('restart vaultFactory, change params', async t => {
  const { agoricNamesRemotes, EV, gd } = t.context;
  const vaultFactoryKit =
    await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  const { ATOM } = agoricNamesRemotes.brand;
  ATOM || Fail`ATOM missing from agoricNames`;

  const reserveKit = await EV.vat('bootstrap').consumeItem('reserveKit');
  const bootstrapVat = EV.vat('bootstrap');
  const electorateCreatorFacet = await bootstrapVat.consumeItem(
    'economicCommitteeCreatorFacet',
  );

  const poserInvitation = await EV(electorateCreatorFacet).getPoserInvitation();
  const creatorFacet1 = await EV.get(reserveKit).creatorFacet;
  const shortfallInvitation =
    await EV(creatorFacet1).makeShortfallReportingInvitation();

  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  const brands = await EV(zoe).getBrands(vaultFactoryKit.instance);
  const getDebtLimitValue = async () => {
    const params = await EV(vaultFactoryKit.publicFacet).getGovernedParams({
      collateralBrand: brands.ATOM,
    });

    return params.DebtLimit.value.value;
  };

  // Change the value of a param before the upgrade so paramGovernance is set
  t.is(await getDebtLimitValue(), 1_000_000_000n);
  await updateVaultManagerParams(t, gd, ATOM, 50_000_000n);

  t.is(await getDebtLimitValue(), 50_000_000n);

  const privateArgs = {
    ...vaultFactoryKit.privateArgs,
    initialPoserInvitation: poserInvitation,
    initialShortfallInvitation: shortfallInvitation,
  };

  const vfAdminFacet = await EV(
    vaultFactoryKit.governorCreatorFacet,
  ).getAdminFacet();

  console.log('awaiting VaultFactory restartContract');
  const upgradeResult = await EV(vfAdminFacet).restartContract(privateArgs);
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });

  await updateVaultManagerParams(t, gd, ATOM, 150_000_000n);
  t.is(await getDebtLimitValue(), 150_000_000n);
});
