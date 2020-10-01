import { E } from '@agoric/eventual-send';
import { makeIssuerKit } from '@agoric/ertp';
import buildManualTimer from './manualTimer';

import { makePrintLog } from './printLog';

/* eslint-disable import/no-unresolved, import/extensions */
import automaticRefundBundle from './bundle-automaticRefund';
import coveredCallBundle from './bundle-coveredCall';
import secondPriceAuctionBundle from './bundle-secondPriceAuction';
import atomicSwapBundle from './bundle-atomicSwap';
import simpleExchangeBundle from './bundle-simpleExchange';
import autoswapBundle from './bundle-autoswap';
import sellItemsBundle from './bundle-sellItems';
import mintAndSellNFTBundle from './bundle-mintAndSellNFT';
import otcDeskBundle from './bundle-otcDesk';
/* eslint-enable import/no-unresolved, import/extensions */

const setupBasicMints = () => {
  const all = [
    makeIssuerKit('moola'),
    makeIssuerKit('simoleans'),
    makeIssuerKit('bucks'),
  ];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const amountMaths = all.map(objs => objs.amountMath);

  return harden({
    mints,
    issuers,
    amountMaths,
  });
};

const makeVats = (log, vats, zoe, installations, startingValues) => {
  const timer = buildManualTimer(log);
  const { mints, issuers, amountMaths } = setupBasicMints();
  const makePayments = values =>
    mints.map((mint, i) => mint.mintPayment(amountMaths[i].make(values[i])));
  const [aliceValues, bobValues, carolValues, daveValues] = startingValues;

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    issuers,
    makePayments(aliceValues),
    installations,
    timer,
  );

  // Setup Bob
  const bobP = E(vats.bob).build(
    zoe,
    issuers,
    makePayments(bobValues),
    installations,
    timer,
  );

  const result = {
    aliceP,
    bobP,
  };

  if (carolValues) {
    const carolP = E(vats.carol).build(
      zoe,
      issuers,
      makePayments(carolValues),
      installations,
      timer,
    );
    result.carolP = carolP;
  }

  if (daveValues) {
    const daveP = E(vats.dave).build(
      zoe,
      issuers,
      makePayments(daveValues),
      installations,
      timer,
    );
    result.daveP = daveP;
  }

  log(`=> alice, bob, carol and dave are set up`);
  return harden(result);
};

export function buildRootObject(_vatPowers, vatParameters) {
  const obj0 = {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const zoe = await E(vats.zoe).buildZoe(vatAdminSvc);
      const installations = {
        automaticRefund: await E(zoe).install(automaticRefundBundle.bundle),
        coveredCall: await E(zoe).install(coveredCallBundle.bundle),
        secondPriceAuction: await E(zoe).install(
          secondPriceAuctionBundle.bundle,
        ),
        atomicSwap: await E(zoe).install(atomicSwapBundle.bundle),
        simpleExchange: await E(zoe).install(simpleExchangeBundle.bundle),
        autoswap: await E(zoe).install(autoswapBundle.bundle),
        sellItems: await E(zoe).install(sellItemsBundle.bundle),
        mintAndSellNFT: await E(zoe).install(mintAndSellNFTBundle.bundle),
        otcDesk: await E(zoe).install(otcDeskBundle.bundle),
      };

      const testName = vatParameters.argv[0] || 'simpleExchangeOk';
      const startingValuesStr = vatParameters.argv[1];
      let startingValues;
      if (startingValuesStr) {
        startingValues = JSON.parse(startingValuesStr);
      } else if (
        vatParameters.startingValues &&
        vatParameters.startingValues[testName]
      ) {
        startingValues = vatParameters.startingValues[testName];
      } else {
        throw Error(
          `Cannot find startingValues for ${testName} in ${JSON.stringify(
            vatParameters,
          )}`,
        );
      }

      const { aliceP, bobP, carolP, daveP } = makeVats(
        makePrintLog(),
        vats,
        zoe,
        installations,
        startingValues,
      );
      await E(aliceP).startTest(testName, bobP, carolP, daveP);
    },
  };
  return harden(obj0);
}
