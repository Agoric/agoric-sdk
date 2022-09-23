import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const { zoe, feeMintAccessRetriever } = await E(vats.zoe).buildZoe(
        vatAdminSvc,
      );
      const installations = {};
      const installedPs = vatParameters.contractNames.map(name =>
        E(vatAdminSvc)
          .getNamedBundleCap(name)
          .then(bcap => E(zoe).installBundleID(D(bcap).getBundleID()))
          .then(installation => {
            installations[name] = installation;
          }),
      );
      await Promise.all(installedPs);

      const feeMintAccess = await E(feeMintAccessRetriever).get();
      const aliceP = E(vats.alice).build(zoe, installations, feeMintAccess);
      await E(aliceP).runMintTest();
    },
  });
}
