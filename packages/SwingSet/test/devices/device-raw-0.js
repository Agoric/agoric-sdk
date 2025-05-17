import { assert } from '@endo/errors';
import { buildSerializationTools } from '../../src/devices/lib/deviceTools.js';

export function buildDevice(tools, endowments) {
  const { syscall } = tools;
  const dtools = buildSerializationTools(syscall, 'dr0');
  const { unserialize, returnFromInvoke } = dtools;
  const { slotFromPresence, presenceForSlot } = dtools;
  const { deviceNodeForSlot, slotFromMyDeviceNode } = dtools;

  const ROOT = 'd+0';
  const DN1SLOT = 'd+1';
  const DN2SLOT = 'd+2';

  // invoke() should use unserialize() and returnFromInvoke
  // throwing errors or returning undefined will crash the kernel

  const dispatch = {
    invoke: (dnid, method, argsCapdata) => {
      /** @type {any} */
      const args = unserialize(argsCapdata);

      if (dnid === ROOT) {
        if (method === 'one') {
          // exercise basic invocation, args, return value
          endowments.shared.push(args[0].toPush);
          // need iserialize to make ['ok', capdata]
          return returnFromInvoke({ a: args[0].x, b: [5, 6] });
        }
        if (method === 'two') {
          // exercise Presences, send
          const pres1 = args[0];
          const slot1 = slotFromPresence(pres1); // should be o-1
          pres1.send('ping1', ['hi ping1', pres1]);
          const pres2 = presenceForSlot(slot1);
          pres2.send('ping2', ['hi ping2', pres2]);
          return returnFromInvoke(['got', pres1]);
        }
        if (method === 'three') {
          // create new device nodes
          const dn1 = deviceNodeForSlot(DN1SLOT);
          const dn2 = deviceNodeForSlot(DN2SLOT);
          return returnFromInvoke({ dn1, dn2 });
        }

        // manage state through vatStore
        if (method === 'fourGet') {
          return returnFromInvoke([
            syscall.vatstoreGet('key1'),
            syscall.vatstoreGet('key2'),
          ]);
        }
        if (method === 'fourSet') {
          assert.typeof(args[0], 'string');
          syscall.vatstoreSet('key1', args[0]);
          return returnFromInvoke();
        }
        if (method === 'fourDelete') {
          syscall.vatstoreDelete('key1');
          return returnFromInvoke();
        }

        if (method === 'fiveThrow') {
          throw Error('intentional device error');
        }

        if (method === 'sixError') {
          return harden(['error', 'deliberate raw-device result error']);
        }

        throw TypeError(`target[${method}] does not exist`);
      }

      if (dnid === DN1SLOT) {
        // exercise new device nodes
        if (method === 'threeplus') {
          const [num, dn1b, dn2b] = args;
          const ret = [
            'dn1',
            num,
            slotFromMyDeviceNode(dn1b) === DN1SLOT,
            slotFromMyDeviceNode(dn2b) === DN2SLOT,
          ];
          return returnFromInvoke(ret);
        }
        throw TypeError(`dn1[${method}] does not exist`);
      }

      if (dnid === DN2SLOT) {
        // exercise new device nodes
        if (method === 'threeplus') {
          const [num, dn1b, dn2b] = args;
          const ret = [
            'dn2',
            num,
            slotFromMyDeviceNode(dn1b) === DN1SLOT,
            slotFromMyDeviceNode(dn2b) === DN2SLOT,
          ];
          return returnFromInvoke(ret);
        }
        throw TypeError(`dn2[${method}] does not exist`);
      }

      throw TypeError(`target does not exist`);
    },
  };
  return dispatch;
}
