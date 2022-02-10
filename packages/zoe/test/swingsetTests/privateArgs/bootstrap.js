import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  const { contractBundles: cb } = vatParameters;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const zcfBundlecap = D(devices.bundle).getNamedBundleCap('zcf');
      const zoe = await E(vats.zoe).buildZoe(vatAdminSvc, zcfBundlecap);
      const installations = {
        privateArgsUsageContract: await E(zoe).install(
          cb.privateArgsUsageContract,
        ),
      };

      const aliceP = E(vats.alice).build(zoe, installations);
      await E(aliceP).privateArgsUsageTest();
    },
  });
}
