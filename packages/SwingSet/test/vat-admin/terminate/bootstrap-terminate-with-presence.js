import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;
  const marker = Far('marker', {});

  const self = Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);

      const dude = await E(vatMaker).createVatByName('dude');
      const count1 = await E(dude.root).foo(1);
      testLog(`vat ready ${count1}`);

      const doneP = E(dude.adminNode).done();
      doneP.then(
        answer => testLog(`doneP.then ${answer}`),
        err => testLog(`doneP.catch ${err.why} ${err.marker === marker}`),
      );
      const foreverP = E(dude.root).never();
      foreverP.then(
        answer => testLog(`foreverP.then ${answer}`),
        err => testLog(`foreverP.catch ${err}`),
      );

      const why = 'because';
      const reason = harden({ why, marker });
      const termP = E(dude.adminNode).terminateWithFailure(reason);
      termP.then(
        answer => testLog(`termP.then ${answer}`),
        err => testLog(`termP.err ${err}`),
      );
      return 'bootstrap done';
    },
  });
  return self;
}
