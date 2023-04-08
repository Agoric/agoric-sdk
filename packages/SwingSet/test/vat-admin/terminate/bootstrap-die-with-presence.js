import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;

  const self = Far('root', {
    async bootstrap(vats, devices) {
      testLog('preparing dynamic vat');
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const dude = await E(vatMaker).createVatByName('dude');
      E(dude.root).dieReturningAPresence(self);
      const doneP = E(dude.adminNode).done();
      try {
        const doneResult = await doneP;
        testLog(`done message: ${doneResult.message}`);
        await E(doneResult.emissary).talkBack('from beyond?');
      } catch (e) {
        testLog(`done exception ${e} (this should not happen)`);
      }
      testLog('done');
    },

    talkBack(arg) {
      testLog(`talkback ${arg}`);
    },
  });
  return self;
}
