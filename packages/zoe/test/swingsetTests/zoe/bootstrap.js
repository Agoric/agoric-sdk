// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import buildManualTimer from '../../../tools/manualTimer.js';

const setupBasicMints = () => {
  const all = [
    makeIssuerKit('moola'),
    makeIssuerKit('simoleans'),
    makeIssuerKit('bucks'),
  ];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const brands = all.map(objs => objs.brand);

  return harden({
    mints,
    issuers,
    brands,
  });
};

const makeVats = (log, vats, zoe, installations, startingValues) => {
  const timer = buildManualTimer(log);
  const { mints, issuers, brands } = setupBasicMints();
  const makePayments = values =>
    mints.map((mint, i) =>
      mint.mintPayment(AmountMath.make(brands[i], BigInt(values[i]))),
    );
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

export function buildRootObject(vatPowers, vatParameters) {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const zoe = await E(vats.zoe).buildZoe(vatAdminSvc);
      const installations = {
        automaticRefund: await E(zoe).install(cb.automaticRefund),
        coveredCall: await E(zoe).install(cb.coveredCall),
        secondPriceAuction: await E(zoe).install(cb.secondPriceAuction),
        atomicSwap: await E(zoe).install(cb.atomicSwap),
        simpleExchange: await E(zoe).install(cb.simpleExchange),
        autoswap: await E(zoe).install(cb.autoswap),
        sellItems: await E(zoe).install(cb.sellItems),
        mintAndSellNFT: await E(zoe).install(cb.mintAndSellNFT),
        otcDesk: await E(zoe).install(cb.otcDesk),
      };

      const [testName, startingValues] = argv;

      const { aliceP, bobP, carolP, daveP } = makeVats(
        vatPowers.testLog,
        vats,
        zoe,
        installations,
        startingValues,
      );
      await E(aliceP).startTest(testName, bobP, carolP, daveP);
    },
  });
}
