/** @file Bootstrap test of liquidation across multiple collaterals */
import process from 'node:process';

import type { TestFn } from 'ava';

import {
  type LiquidationSetup,
  type LiquidationTestContext,
  makeLiquidationTestContext,
} from '@aglocal/boot/tools/liquidation.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const test = anyTest as TestFn<LiquidationTestContext>;

const setup: LiquidationSetup = {
  vaults: [
    {
      atom: 15,
      ist: 100,
      debt: 100.5,
    },
  ],
  bids: [
    {
      give: '80IST',
      discount: 0.1,
    },
  ],
  price: {
    starting: 12.34,
    trigger: 9.99,
  },
  auction: {
    start: {
      collateral: 45,
      debt: 309.54,
    },
    end: {
      collateral: 9.659301,
      debt: 0,
    },
  },
};

test.before(async t => {
  t.context = await makeLiquidationTestContext(
    { configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json' },
    t,
  );
});

test.after.always(t => t.context.swingsetTestKit.shutdown());

test.serial('wallet survives zoe null upgrade', async t => {
  // fail if there are any unhandled rejections
  process.on('unhandledRejection', (error: Error) => {
    t.fail(error.message);
  });

  const collateralBrandKey = 'ATOM';
  const managerIndex = 0;

  const {
    liquidationTestKit: { setupVaults },
    swingsetTestKit: { evaluateCoreProposal },
    walletFactoryDriver,
  } = t.context;

  const buyer = await walletFactoryDriver.provideSmartWallet('agoric1buyer');

  await setupVaults(collateralBrandKey, managerIndex, setup);

  // restart Zoe

  // /////// Upgrading ////////////////////////////////
  await evaluateCoreProposal(
    await buildProposal('@agoric/builders/scripts/vats/upgrade-zoe.js'),
  );

  t.like(buyer.getLatestUpdateRecord(), {
    currentAmount: {
      // brand from EV() doesn't compare correctly
      // brand: invitationBrand,
      value: [],
    },
    updated: 'balance',
  });

  await buyer.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open1',
    collateralBrandKey: 'ATOM',
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });

  t.like(buyer.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open1', numWantsSatisfied: 1 },
  });
});
