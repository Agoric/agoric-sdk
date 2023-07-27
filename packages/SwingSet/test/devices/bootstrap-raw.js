// @ts-nocheck
import { Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

export function buildRootObject(vatPowers, _vatParameters) {
  const { D } = vatPowers;
  let devices;
  return Far('root', {
    bootstrap(vats, d0) {
      devices = d0;
    },

    step1() {
      return D(devices.dr).one(harden({ toPush: 'pushed', x: 4 }));
    },

    async step2() {
      const pk1 = makePromiseKit();
      const pk2 = makePromiseKit();
      const got = [];
      // give the device an object to return and do sendOnly
      const target = Far('target', {
        ping1(hello, p1) {
          got.push(hello); // should be 'hi ping1'
          got.push(p1 === target);
          pk1.resolve();
        },
        ping2(hello, p2) {
          got.push(hello); // should be 'hi ping2'
          got.push(p2 === target);
          pk2.resolve();
        },
      });
      const ret = D(devices.dr).two(target); // ['got', target]
      got.push(ret[0]);
      got.push(ret[1] === target);
      await pk1.promise;
      await pk2.promise;
      return got; // ['got', true, 'hi ping1', true, 'hi ping2', true]
    },

    step3() {
      const { dn1, dn2 } = D(devices.dr).three(); // returns new device nodes
      const ret1 = D(dn1).threeplus(21, dn1, dn2); // ['dn1', 21, true, true]
      const ret2 = D(dn2).threeplus(22, dn1, dn2); // ['dn2', 22, true, true]
      return [ret1, ret2];
    },

    step4() {
      const got1 = D(devices.dr).fourGet();
      D(devices.dr).fourSet('value1');
      const got2 = D(devices.dr).fourGet();
      D(devices.dr).fourDelete();
      const got3 = D(devices.dr).fourGet();
      return [got1, got2, got3];
    },

    step5() {
      try {
        D(devices.dr).fiveThrow();
        return false;
      } catch (e) {
        return e;
      }
    },

    step6() {
      try {
        D(devices.dr).sixError();
        return false;
      } catch (e) {
        return e;
      }
    },
  });
}
