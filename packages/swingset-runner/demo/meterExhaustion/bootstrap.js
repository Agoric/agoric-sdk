import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  const self = Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const boomVat = await E(vatMaker).createVatByName('boomer');
      try {
        const boom = await E(boomVat.root).explode();
        console.log(`explode result '${boom}'`);
      } catch (e) {
        console.log(`explode error '${e}'`);
      }
      try {
        await E(boomVat.adminNode).done();
        console.log(`boomer done ok`);
      } catch (e) {
        console.log(`boomer done with error '${e}'`);
      }
      try {
        const boom = await E(boomVat.root).explode();
        console.log(`second explode result '${boom}'`);
      } catch (e) {
        console.log(`second explode error '${e}'`);
      }
    },
  });
  return self;
}
