import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

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
  const { mints, issuers, brands } = setupBasicMints();
  const makePayments = values =>
    mints.map((mint, i) => {
      return mint.mintPayment(AmountMath.make(brands[i], BigInt(values[i])));
    });

  // Setup Alice
  const alicePayment = makePayments(startingValues);
  const aliceP = E(vats.alice).build(zoe, issuers, alicePayment, installations);

  log(`=> alice is set up`);
  return harden(aliceP);
};

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      /** @type {{zoeService: ERef<ZoeService>}} */
      const { zoeService: zoe } = await E(vats.zoe).buildZoe(
        vatAdminSvc,
        undefined,
        'zcf',
      );
      const bcap = await E(vatAdminSvc).getNamedBundleCap('crashingAutoRefund');
      const id = D(bcap).getBundleID();
      const installations = {
        crashAutoRefund: await E(zoe).installBundleID(id),
      };

      const [testName, startingValues] = vatParameters.argv;

      const aliceP = makeVats(
        vatPowers.testLog,
        vats,
        zoe,
        installations,
        startingValues,
      );
      await E(aliceP).startTest(testName);
    },
  });
}
