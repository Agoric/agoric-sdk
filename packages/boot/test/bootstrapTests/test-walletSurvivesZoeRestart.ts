/** @file Bootstrap test of liquidation across multiple collaterals */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import process from 'process';
import type { ExecutionContext, TestFn } from 'ava';

import { BridgeHandler } from '@agoric/vats';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import {
  LiquidationTestContext,
  makeLiquidationTestContext,
  LiquidationSetup,
} from './liquidation.ts';

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
  t.context = await makeLiquidationTestContext(t);
});

test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

const checkFlow = async (
  t: ExecutionContext<LiquidationTestContext>,
  {
    collateralBrandKey,
    managerIndex,
  }: { collateralBrandKey: string; managerIndex: number },
  _expected: any,
) => {
  // fail if there are any unhandled rejections
  process.on('unhandledRejection', (error: Error) => {
    t.fail(error.message);
  });

  const {
    walletFactoryDriver,
    setupVaults,
    placeBids,
    controller,
    buildProposal,
  } = t.context;

  const { EV } = t.context.runUtils;

  const buyer = await walletFactoryDriver.provideSmartWallet('agoric1buyer');

  const buildAndExecuteProposal = async packageSpec => {
    const proposal = await buildProposal(packageSpec);

    for await (const bundle of proposal.bundles) {
      await controller.validateAndInstallBundle(bundle);
    }

    const bridgeMessage = {
      type: 'CORE_EVAL',
      evals: proposal.evals,
    };

    const coreEvalBridgeHandler: ERef<BridgeHandler> = await EV.vat(
      'bootstrap',
    ).consumeItem('coreEvalBridgeHandler');
    await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
  };

  const metricsPath = `published.vaultFactory.managers.manager${managerIndex}.metrics`;
  await setupVaults(collateralBrandKey, managerIndex, setup);

  // restart Zoe

  // /////// Upgrading ////////////////////////////////
  const zoeUpgradeSpec = {
    package: 'builders',
    packageScriptName: 'build:null-upgrade-zoe-proposal',
  };
  await buildAndExecuteProposal(zoeUpgradeSpec);

  // const zoe = await EV.vat('bootstrap').consumeItem('zoe');
  // const invitationIssuer = await EV(zoe).getInvitationIssuer();
  // const invitationBrand = await EV(invitationIssuer).getBrand()
  t.like(await buyer.getLatestUpdateRecord(), {
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
};

test.serial(
  'wallet survives zoe null upgrade',
  checkFlow,
  { collateralBrandKey: 'ATOM', managerIndex: 0 },
  {},
);
