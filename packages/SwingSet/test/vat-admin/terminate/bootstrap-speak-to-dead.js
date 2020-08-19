/* global harden */
import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;
  let mediumRoot;
  let weatherwaxRoot;

  const self = harden({
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      mediumRoot = vats.medium;

      // create a dynamic vat, then kill it, then try to send it a message

      const weatherwax = await E(vatMaker).createVatByName('weatherwax');
      weatherwaxRoot = weatherwax.root;

      E(weatherwax.adminNode).terminate();
      await E(weatherwax.adminNode).done();

      try {
        await E(mediumRoot).speak(weatherwaxRoot, '1');
      } catch (e) {
        testLog(`speak failed: ${e}`);
      }

      return 'bootstrap done';
    },
    async speakAgain() {
      try {
        await E(mediumRoot).speak(weatherwaxRoot, '2');
      } catch (e) {
        testLog(`respeak failed: ${e}`);
      }
    },
  });
  return self;
}
