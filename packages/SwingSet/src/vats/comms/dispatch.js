import { assert, details } from '@agoric/assert';
import { makeVatSlot } from '../../parseVatSlots';
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
    console.info(`-- start: deliver ${target} ${method}`);
    try {
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
    // console.info(`comms.deliver ${target} r=${result}`);
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
      } catch (e) {
        console.info(`   error: deliver`, e);
        throw e;
      }
  }

  function notifyFulfillToData(promiseID, data) {
    console.info(`-- start: fulfillToData ${promiseID} ${data}`);
    try {
    insistCapData(data);
    // console.info(`comms.notifyFulfillToData(${promiseID})`);
    // dumpState(state);

    // I *think* we should never get here for local promises, since the
    // controller only does sendOnly. But if we change that, we need to catch
    // locally-generated promises and deal with them.
    // if (promiseID in localPromises) {
    //  resolveLocal(promiseID, { type: 'data', body, slots });
    // }

    // todo: if we previously held resolution authority for this promise, then
    // transferred it to some local vat, we'll have subscribed to the kernel to
    // hear about it. If we then get the authority back again, we no longer
    // want to hear about its resolution (since we're the ones doing the
    // resolving), but the kernel still thinks of us as subscribing, so we'll
    // get a bogus dispatch.notifyFulfill*. Currently we throw an error, which
    // is currently ignored but might prompt a vat shutdown in the future.

    const resolution = harden({ type: 'data', data });
    resolveFromKernel(promiseID, resolution);
      } catch (e) {
        console.info(`   error: fulfillToData`, e);
        throw e;
      }
  }

  function notifyFulfillToPresence(promiseID, slot) {
    console.info(`-- start: fulfillToPresence ${promiseID} ${slot}`);
    try {
    // console.info(`comms.notifyFulfillToPresence(${promiseID}) = ${slot}`);
    const resolution = harden({ type: 'object', slot });
    resolveFromKernel(promiseID, resolution);
      } catch (e) {
        console.info(`   error: fulfillToPresence`, e);
        throw e;
      }
  }

  function notifyReject(promiseID, data) {
    console.info(`-- start: notifyReject ${promiseID} ${data}`);
    try {
    insistCapData(data);
    // console.info(`comms.notifyReject(${promiseID})`);
    const resolution = harden({ type: 'reject', data });
    resolveFromKernel(promiseID, resolution);
      } catch (e) {
        console.info(`   error: reject`, e);
        throw e;
      }
  }

  const dispatch = harden({
    deliver,
    notifyFulfillToData,
    notifyFulfillToPresence,
    notifyReject,
  });
  debugState.set(dispatch, { state, clistKit });

  return dispatch;
}
