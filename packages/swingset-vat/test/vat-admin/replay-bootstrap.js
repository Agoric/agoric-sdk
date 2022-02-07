import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, vatParameters) {
  const { promise: vatAdminSvc, resolve: gotVatAdminSvc } = makePromiseKit();
  let root;

  return Far('root', {
    async bootstrap(vats, devices) {
      gotVatAdminSvc(E(vats.vatAdmin).createVatAdminService(devices.vatAdmin));
    },

    async createBundle() {
      const { dynamicBundle } = vatParameters;
      const vc = await E(vatAdminSvc).createVat(dynamicBundle);
      root = vc.root;
      const count = await E(root).first();
      return count === 1 ? 'created' : `wrong counter ${count}`;
    },

    async createNamed() {
      const vc = await E(vatAdminSvc).createVatByName('dynamic');
      root = vc.root;
      const count = await E(root).first();
      return count === 1 ? 'created' : `wrong counter ${count}`;
    },

    // if the dynamic vat was not reloaded into the next-generation swingset,
    // root~.second() will fail (there won't be a vat in ephemeral.vats when
    // the message comes to the top of the run queue, and our result promise
    // will never resolve)

    // if the vat exists but its transcript was not replayed, the +=1 will
    // not have happened, and root~.second() will return 20, not 21

    async check() {
      const count = await E(root).second();
      return count === 21 ? 'ok' : `wrong counter ${count}`;
    },
  });
}
