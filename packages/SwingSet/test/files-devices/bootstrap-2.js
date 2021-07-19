import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers, vatParameters) {
  const { D, testLog: log } = vatPowers;
  return Far('root', {
    async bootstrap(vats, devices) {
      const { argv } = vatParameters;
      if (argv[0] === '1') {
        log(`calling d2.method1`);
        const ret = D(devices.d2).method1('hello');
        log(ret);
      } else if (argv[0] === '2') {
        log(`calling d2.method2`);
        const [d2, d3] = D(devices.d2).method2(); // [d2,d3]
        const ret2 = D(d3).method3(d2);
        log(ret2.key);
      } else if (argv[0] === '3') {
        log(`calling d2.method3`);
        // devices can't yet do sendOnly on pass-by-presence objects, but
        // they should still be able to accept and return them
        const o = Far('iface', {});
        const ret = D(devices.d2).method3(o);
        log(`ret ${ret === o}`);
      } else if (argv[0] === '4') {
        log(`calling d2.method4`);
        // now exercise sendOnly on pass-by-presence objects
        const o = Far('o', {
          foo(obj) {
            log(`d2.m4 foo`);
            D(obj).bar('hello');
            log(`d2.m4 did bar`);
          },
        });
        const ret = D(devices.d2).method4(o);
        log(`ret ${ret}`);
      } else if (argv[0] === '5') {
        log(`calling v2.method5`);
        const p = E(vats.left).left5(devices.d2);
        log(`called`);
        const ret = await p;
        log(`ret ${ret}`);
      } else if (argv[0] === 'state1') {
        log(`calling setState`);
        D(devices.d2).setState('state2');
        log(`called`);
      } else if (argv[0] === 'state2') {
        log(`calling getState`);
        const s = D(devices.d2).getState();
        log(`got ${s}`);
      } else if (argv[0] === 'command1') {
        D(devices.command).sendBroadcast({ hello: 'everybody' });
      } else if (argv[0] === 'command2') {
        const handler = Far('handler', {
          inbound(count, body) {
            log(`handle-${count}-${body.piece}`);
            D(devices.command).sendResponse(count, body.doReject, {
              response: 'body',
            });
          },
        });
        D(devices.command).registerInboundHandler(handler);
      } else if (argv[0] === 'promise1') {
        const p = Promise.resolve();
        log('sending Promise');
        try {
          // this will be rejected by liveslots before the device is involved
          D(devices.d0).send({ p });
          // shouldn't get here
          log('oops: survived sending Promise');
        } catch (e) {
          log('good: callNow failed');
        }
      } else {
        assert.fail(X`unknown argv mode '${argv[0]}'`);
      }
    },
    ping() {
      return true;
    },
  });
}
