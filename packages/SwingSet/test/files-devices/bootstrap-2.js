import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers, vatParameters) {
  const { D, testLog: log } = vatPowers;
  return harden({
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
        const o = harden({});
        const ret = D(devices.d2).method3(o);
        log(`ret ${ret === o}`);
      } else if (argv[0] === '4') {
        log(`calling d2.method4`);
        // now exercise sendOnly on pass-by-presence objects
        const o = harden({
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
      } else if (argv[0] === 'mailbox1') {
        D(devices.mailbox).add('peer1', 1, 'data1');
        D(devices.mailbox).add('peer1', 2, 'data2');
        D(devices.mailbox).add('peer1', 3, 'data3');
        D(devices.mailbox).ackInbound('peer1', 12);
        D(devices.mailbox).ackInbound('peer1', 13);
        D(devices.mailbox).add('peer2', 4, 'data4');
        D(devices.mailbox).add('peer3', 5, 'data5');
        D(devices.mailbox).remove('peer1', 1);
        D(devices.mailbox).remove('peer2', 4, 'data4');
        // should leave peer1: [data2,data3], peer2: [], peer3: [data5]
      } else if (argv[0] === 'mailbox2') {
        const handler = harden({
          deliverInboundMessages(peer, messages) {
            log(`dm-${peer}`);
            messages.forEach(m => {
              log(`m-${m[0]}-${m[1]}`);
            });
          },
          deliverInboundAck(peer, ack) {
            log(`da-${peer}-${ack}`);
          },
        });
        D(devices.mailbox).registerInboundHandler(handler);
      } else if (argv[0] === 'command1') {
        D(devices.command).sendBroadcast({ hello: 'everybody' });
      } else if (argv[0] === 'command2') {
        const handler = harden({
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
        throw new Error(`unknown argv mode '${argv[0]}'`);
      }
    },
    ping() {
      return true;
    },
  });
}
