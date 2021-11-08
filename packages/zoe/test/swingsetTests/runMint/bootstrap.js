import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

export function buildRootObject(vatPowers, vatParameters) {
  const { contractBundles: cb } = vatParameters;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const { zoe, feeMintAccess } = await E(vats.zoe).buildZoe(vatAdminSvc);
      const installations = {
        runMintContract: await E(zoe).install(cb.runMintContract),
      };

      const aliceP = E(vats.alice).build(zoe, installations, feeMintAccess);
      await E(aliceP).runMintTest();
    },
  });
}
