import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject() {
  let targetvat;
  // imported into target vat
  const pk1 = makePromiseKit();
  const pk2 = makePromiseKit();
  const pk3 = makePromiseKit();
  const [p1, p2, p3] = [pk1.promise, pk2.promise, pk3.promise];

  const subscriberStash = [];
  const subscriber = Far('subscriber', {
    subscribe(name, p) {
      const entryP = p.then(res => [name, res]);
      subscriberStash.push(entryP);
    },
  });

  return Far('root', {
    async bootstrap(vats) {
      targetvat = vats.target;
    },

    // exercised imported promises
    doImportTest1() {
      E(targetvat).importPromiseStep1(p1, p2, p3);
      return [p1, p2, p3];
    },
    doImportTest2() {
      pk1.resolve(1);
      pk2.resolve(2);
      pk3.resolve(3);
    },
    doImportTest3() {
      return E(targetvat).importPromiseStep2();
    },

    doResultTest1() {
      const p4 = E(targetvat).returnPromise4();
      const p5 = E(targetvat).returnPromise5();
      const p6 = E(targetvat).returnPromise6();
      E(targetvat).resultPromiseStep1(p4, p5, p6);
      return harden([p4, p5, p6]);
    },
    doResultTest2() {
      E(targetvat).resultPromiseStep2();
    },
    doResultTest3() {
      return E(targetvat).resultPromiseStep3();
    },

    async doStoreTest1() {
      const data = await E(targetvat).storePromiseStep1(subscriber);
      const subscriberEntries = await Promise.all(subscriberStash);
      const resolutions = {};
      for (const [name, res] of subscriberEntries) {
        resolutions[name] = res;
      }
      return { data, resolutions };
    },
  });
}
