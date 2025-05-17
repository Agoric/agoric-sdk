import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject() {
  let dude;
  const hold = [];

  const self = Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);

      // Create a dynamic vat, send it a message and let it respond,
      // to make sure everything is working. Give them a promise to
      // follow, to check that its refcount is cleaned up.
      dude = await E(vatMaker).createVatByName('dude');
      await E(dude.root).foo(1);
      const p = makePromiseKit().promise;
      await E(dude.root).holdPromise(p);
      const p2 = E(dude.root).never();
      p2.catch(_err => 'hush');
      hold.push(p2);
      return 'bootstrap done';
    },
    async phase2() {
      // terminate as a second phase, so we can capture the kernel state in between
      E(dude.adminNode).terminateWithFailure('phase 2');
      await E(dude.adminNode).done();
    },
  });
  return self;
}
