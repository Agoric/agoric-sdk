//wip hackery do not merge
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit } from './supports-stripped.js';
import { makeWalletFactoryDriver } from './drivers.js';

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

const makeDefaultTestContext = async t => {
  console.log(`@@ start makeDefaultTestContext`);

  console.log(`@@@ start makeSwingsetTestKit`);
  const swingsetTestKit = await makeSwingsetTestKit(t);
  console.log(`@@@ end makeSwingsetTestKit`);

  const { runUtils, chainStorage } = swingsetTestKit;
  const { EV, go } = runUtils;

  debugger;//
  await go();

  /*
  // Wait for ATOM to make it into agoricNames
  console.log(`@@@ start bootstrap vaultFactoryKit`);
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.log(`@@@ end bootstrap vaultFactoryKit`);
  */

  /*
  // has to be late enough for agoricNames data to have been published
  console.log(`@@@ start makeAgoricNamesRemotesFromFakeStorage`);
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(chainStorage);
  console.log(`@@@ end makeAgoricNamesRemotesFromFakeStorage`);

  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  */

  /*
  console.log(`@@@ start makeWalletFactorDriver`);
  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    chainStorage,
    agoricNamesRemotes,
  );
  console.log(`@@@ end makeWalletFactorDriver`);
  */

  console.log(`@@ end makeDefaultTestContext`);

  return { ...swingsetTestKit /*, agoricNamesRemotes , walletFactoryDriver*/ };
};

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => t.context.shutdown());

test.serial('stress vaults', async t => {
  console.log(`@@ start stress vaults test`);

/*
  const { walletFactoryDriver } = t.context;

  console.log(`@@@ start provideSmartWallet`);
  const wd = await walletFactoryDriver.provideSmartWallet('agoric1open');
  console.log(`@@@ end provideSmartWallet`);

  const openVault = async (i, n) => {
    const offerId = `open-vault-${i}-of-${n}`;
    await wd.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: 5,
      giveCollateral: 1.0,
    });

    t.like(wd.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
  };

  const openN = async (n) => {
    const range = [...Array(n)].map((_, i) => i + 1);
    await Promise.all(range.map(i => openVault(i, n)));
  };

  console.log(`@@@ start openVault calls`);
  await openN(1);
  console.log(`@@@ end openVault calls`);
*/
  await eventLoopIteration();
  console.log(`@@ end stress vaults test`);
  t.pass();
});
