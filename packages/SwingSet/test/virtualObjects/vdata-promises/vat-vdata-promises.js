/* global VatData */
import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

// import { makeScalarBigMapStore } from '@agoric/vat-data';
const { makeScalarBigMapStore } = VatData;

export function buildRootObject() {
  const vc = makeScalarBigMapStore('vc');

  // used to resolve result promises
  const pk4 = makePromiseKit();
  const pk5 = makePromiseKit();
  const pk6 = makePromiseKit();

  // used to store promises
  const pk7 = makePromiseKit();
  const pk8 = makePromiseKit();
  const pk9 = makePromiseKit();
  const pk10 = makePromiseKit();
  const pk11 = makePromiseKit();
  const pk12 = makePromiseKit();
  const pk13 = makePromiseKit();
  const pk14 = makePromiseKit();

  const importStash = [];
  const resultStash = [];

  return Far('root', {
    importPromiseStep1(p1, p2, p3) {
      // imported p1 is resolved without ever being put into vdata
      importStash.push(p1);

      // imported p2 is added to vdata, fetched from vdata, deleted
      // from vdata, then resolved
      vc.init('p2', p2);
      const p2a = vc.get('p2');
      vc.delete('p2');
      importStash.push(p2);
      importStash.push(p2a);

      // imported p3 is added to vdata, resolved, fetched from vdata,
      // then deleted from vdata
      vc.init('p3', p3);
      importStash.push(p3);
    },

    // p1/p2/p3 are resolved before importPromiseStep2 is called

    importPromiseStep2() {
      const p3a = vc.get('p3');
      importStash.push(p3a);
      vc.delete('p3');

      return Promise.all(importStash);
    },

    // these three methods return p4/p5/p6 (note these are not the
    // same as pk4.promise/etc, but pk4.resolve() will cause p4 to be
    // resolved)
    returnPromise4() {
      return pk4.promise;
    },
    returnPromise5() {
      return pk5.promise;
    },
    returnPromise6() {
      return pk6.promise;
    },

    resultPromiseStep1(p4, p5, p6) {
      // result p4 is resolved without ever being put into vdata
      resultStash.push(p4);
      // result p5 is added to vdata, fetched from vdata, deleted
      // from vdata, then resolved
      vc.init('p5', p5);
      const p5a = vc.get('p5');
      vc.delete('p5');
      resultStash.push(p5);
      resultStash.push(p5a);

      // result p6 is added to vdata, resolved, fetched from vdata,
      // then deleted from vdata
      vc.init('p6', p6);
      resultStash.push(p6);
    },

    resultPromiseStep2() {
      pk4.resolve(4);
      pk5.resolve(5);
      pk6.resolve(6);
    },

    resultPromiseStep3() {
      const p6a = vc.get('p6');
      resultStash.push(p6a);
      vc.delete('p6');

      return Promise.all(resultStash);
    },

    async storePromiseStep1(subscriber) {
      const ret = {};

      // p7: basic retrieval: store, fetch, delete, resolve
      ret.p7 = pk7.promise;
      vc.init('p7', pk7.promise);
      ret.p7a = vc.get('p7');
      vc.delete('p7');
      pk7.resolve(7);

      // p8: unexported resolution doesn't unregister, can delete
      // after resolution: store, resolve, (pause), fetch, delete
      ret.p8 = pk8.promise;
      vc.init('p8', pk8.promise);
      pk8.resolve(8);
      await pk8.promise;
      ret.p8a = vc.get('p8'); // unexported resolution doesn't unregister
      vc.delete('p8');

      // p9: can export while stored+unresolved: store, export,
      // resolve, (notify), (pause), fetch, delete
      ret.p9 = pk9.promise;
      vc.init('p9', pk9.promise);
      E(subscriber).subscribe('p9', pk9.promise);
      await Promise.resolve(); // serialize before resolution
      pk9.resolve(9);
      await pk9.promise;
      ret.p9a = vc.get('p9'); // exported resolution doesn't unregister
      vc.delete('p9');

      // p10: can export while stored+resolved: store, resolve,
      // (pause), export, fetch, delete
      ret.p10 = pk10.promise;
      vc.init('p10', pk10.promise);
      pk10.resolve(10);
      await pk10.promise;
      E(subscriber).subscribe('p10', pk10.promise);
      await Promise.resolve(); // allow serialize+send
      ret.p10a = vc.get('p10');
      vc.delete('p10');

      // p11: delete while unresolved: store, export, delete, resolve,
      // (notify)
      ret.p11 = pk11.promise;
      vc.init('p11', pk11.promise);
      E(subscriber).subscribe('p11', pk11.promise);
      await Promise.resolve(); // allow serialize+send
      vc.delete('p11');
      pk11.resolve(11);

      // p12: delete+re-store while unresolved: store, export, delete,
      // store, resolve, (notify), delete
      ret.p12 = pk12.promise;
      vc.init('p12', pk12.promise);
      E(subscriber).subscribe('p12', pk12.promise);
      await Promise.resolve(); // allow serialize+send
      vc.delete('p12');
      vc.init('p12', pk12.promise);
      pk12.resolve(12);
      await pk12.promise;
      vc.delete('p12');

      // p13: basic export: export, resolve, (notify)
      ret.p13 = pk13.promise;
      E(subscriber).subscribe('p13', pk13.promise);
      pk13.resolve(13);
      await pk13.promise;

      // p14: export first: export, store, resolve, (notify), fetch,
      // delete
      ret.p14 = pk14.promise;
      E(subscriber).subscribe('p14', pk14.promise);
      await Promise.resolve(); // allow serialize+send
      vc.init('p14', pk14.promise);
      pk14.resolve(14);
      await pk14.promise;
      ret.p14a = vc.get('p14');
      vc.delete('p14');

      const is = {
        p7is: ret.p7 === ret.p7a,
        p8is: ret.p8 === ret.p8a,
        p9is: ret.p9 === ret.p9a,
        p10is: ret.p10 === ret.p10a,
        p14is: ret.p14 === ret.p14a,
      };
      return { is, ret };
    },
  });
}
