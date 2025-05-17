import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject() {
  let vatAdmin;
  let testVatRoot;
  let testVatAdmin;
  let doneP;
  let testLog;

  async function runTests(phase) {
    testLog = [];
    doneP = makePromiseKit();
    await E(testVatRoot).runTests(self, phase);
    await doneP.promise;
    return testLog;
  }

  const self = Far('root', {
    async bootstrap(vats, devices) {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    log(message) {
      testLog.push(message);
    },

    testComplete() {
      doneP.resolve(true);
    },

    async buildV1(vatParameters) {
      const bcap = await E(vatAdmin).getNamedBundleCap('testVat');
      const options = { vatParameters };
      const res = await E(vatAdmin).createVat(bcap, options);
      testVatRoot = res.root;
      testVatAdmin = res.adminNode;
      await runTests('before');
      return testLog;
    },

    async upgradeV2(vatParameters) {
      const bcap = await E(vatAdmin).getNamedBundleCap('testVat');
      await E(testVatAdmin).upgrade(bcap, { vatParameters });
      await runTests('after');
      return testLog;
    },
  });
  return self;
}
