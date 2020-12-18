import { assert, details } from '@agoric/assert';
import { QCLASS } from '@agoric/marshal';
import { insistVatType, makeVatSlot } from '../../parseVatSlots';
import { getRemote } from './remote';
import { makeState, makeStateKit } from './state';
import { deliverToController } from './controller';
import { insistCapData } from '../../capdata';

import { makeCListKit } from './clist';
import { makeDeliveryKit } from './delivery';

export const debugState = new WeakMap();

export function buildCommsDispatch(syscall) {
  const state = makeState();
  const stateKit = makeStateKit(state);
  const clistKit = makeCListKit(state, syscall, stateKit);

  function transmit(remoteID, msg) {
    const remote = getRemote(state, remoteID);
    // the vat-tp "integrity layer" is a regular vat, so it expects an argument
    // encoded as JSON
    const args = harden({ body: JSON.stringify([msg]), slots: [] });
    syscall.send(remote.transmitterID, 'transmit', args); // sendOnly
  }

  const deliveryKit = makeDeliveryKit(
    state,
    syscall,
    transmit,
    clistKit,
    stateKit,
  );
  clistKit.setDeliveryKit(deliveryKit);

  const { sendFromKernel, resolveFromKernel, messageFromRemote } = deliveryKit;

  // our root object (o+0) is the Comms Controller
  const controller = makeVatSlot('object', true, 0);

  function deliver(target, method, args, result) {
    insistCapData(args);
    if (target === controller) {
      return deliverToController(
        state,
        clistKit,
        method,
        args,
        result,
        syscall,
      );
    }
    // console.debug(`comms.deliver ${target} r=${result}`);
    // dumpState(state);
    if (state.objectTable.has(target) || state.promiseTable.has(target)) {
      assert(
        method.indexOf(':') === -1 && method.indexOf(';') === -1,
        details`illegal method name ${method}`,
      );
      return sendFromKernel(target, method, args, result);
    }
    if (state.remoteReceivers.has(target)) {
      assert(method === 'receive', details`unexpected method ${method}`);
      // the vat-tp integrity layer is a regular vat, so when they send the
      // received message to us, it will be embedded in a JSON array
      const remoteID = state.remoteReceivers.get(target);
      const message = JSON.parse(args.body)[0];
      return messageFromRemote(remoteID, message);
    }

    // TODO: if promise target not in PromiseTable: resolve result to error
    //   this will happen if someone pipelines to our controller/receiver
    throw Error(`unknown target ${target}`);
  }

  function notifyOnePromise(promiseID, rejected, data) {
    insistCapData(data);
    // console.debug(`comms.notifyOnePromise(${promiseID}, ${rejected}, ${data})`);
    // dumpState(state);

    // I *think* we should never get here for local promises, since the
    // controller only does sendOnly. But if we change that, we need to catch
    // locally-generated promises and deal with them.
    // if (promiseID in localPromises) {
    //  resolveLocal(promiseID, { type: 'data', data });
    // }

    // todo: if we previously held resolution authority for this promise, then
    // transferred it to some local vat, we'll have subscribed to the kernel
    // to hear about it. If we then get the authority back again, we no longer
    // want to hear about its resolution (since we're the ones doing the
    // resolving), but the kernel still thinks of us as subscribing, so we'll
    // get a bogus dispatch.notify. Currently we throw an error, which is
    // currently ignored but might prompt a vat shutdown in the future.

    // TODO: The following goofiness, namely taking apart the capdata object
    // and looking at it to see if it's a single presence reference and then
    // treating it in a special way if it is, is a consequence of an impedance
    // mismatch that has grown up between the comms protocol and the
    // evolutionary path that the kernel/vat interface has taken.  In the
    // future we should clean this up and unify presences and data in the
    // comms protocol the way the kernel/vat interface has.
    const unser = JSON.parse(data.body);
    let resolution;
    if (rejected) {
      resolution = harden({ type: 'reject', data });
    } else if (
      Object(unser) === unser &&
      QCLASS in unser &&
      unser[QCLASS] === 'slot'
    ) {
      const slot = data.slots[unser.index];
      insistVatType('object', slot);
      resolution = harden({ type: 'object', slot });
    } else {
      resolution = harden({ type: 'data', data });
    }
    resolveFromKernel(promiseID, resolution);
    // XXX question: do we need to call retirePromiseIDIfEasy (or some special
    // comms vat version of it) here?
  }

  function notify(resolutions) {
    for (const vpid of Object.keys(resolutions)) {
      const vp = resolutions[vpid];
      notifyOnePromise(vpid, vp.rejected, vp.data);
    }
  }

  const dispatch = harden({ deliver, notify });
  debugState.set(dispatch, { state, clistKit });

  return dispatch;
}
