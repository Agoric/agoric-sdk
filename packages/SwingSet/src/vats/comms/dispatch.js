/* global harden */

import { assert, details } from '@agoric/assert';
import { makeVatSlot } from '../../parseVatSlots';
import { getRemote } from './remote';
import { makeState } from './state';
import { deliverToRemote, resolvePromiseToRemote } from './outbound';
import { deliverFromRemote } from './inbound';
import { deliverToController } from './controller';
import { insistCapData } from '../../capdata';

function transmit(syscall, state, remoteID, msg) {
  const remote = getRemote(state, remoteID);
  // the vat-tp "integrity layer" is a regular vat, so it expects an argument
  // encoded as JSON
  const args = harden({ body: JSON.stringify([msg]), slots: [] });
  syscall.send(remote.transmitterID, 'transmit', args); // sendOnly
}

export const debugState = new WeakMap();

export function buildCommsDispatch(syscall, _state, _helpers, vatPowers) {
  // TODO: state.activate(), put this data on state.stuff instead of closing
  // over a local object
  const state = makeState();

  const { vatParameters } = vatPowers;
  if (vatParameters.debugComms) {
    state.debug = vatParameters.debugComms;
    console.log(`-- comms[${state.debug}] enableDebug`);
  }

  // our root object (o+0) is the Comms Controller
  const controller = makeVatSlot('object', true, 0);

  function deliver(target, method, args, result) {
    insistCapData(args);
    if (state.debug) {
      console.log(
        `--comms[${state.debug}].deliver ${target} ${method} r=${result}`,
      );
    }
    if (target === controller) {
      if (state.debug) {
        console.log(`-- deliverToController`);
      }
      return deliverToController(state, method, args, result, syscall);
    }
    // dumpState(state);
    if (state.objectTable.has(target) || state.promiseTable.has(target)) {
      assert(
        method.indexOf(':') === -1 && method.indexOf(';') === -1,
        details`illegal method name ${method}`,
      );
      if (state.debug) {
        console.log(`-- deliverToRemote`);
      }
      return deliverToRemote(
        syscall,
        state,
        target,
        method,
        args,
        result,
        transmit,
      );
    }
    if (state.remoteReceivers.has(target)) {
      if (state.debug) {
        console.log(`-- deliverFromRemote`);
      }
      assert(method === 'receive', details`unexpected method ${method}`);
      // the vat-tp integrity layer is a regular vat, so when they send the
      // received message to us, it will be embedded in a JSON array
      const message = JSON.parse(args.body)[0];
      return deliverFromRemote(
        syscall,
        state,
        state.remoteReceivers.get(target),
        message,
      );
    }

    // TODO: if promise target not in PromiseTable: resolve result to error
    //   this will happen if someone pipelines to our controller/receiver
    throw new Error(`unknown target ${target}`);
  }

  function notifyFulfillToData(promiseID, data) {
    if (state.debug) {
      console.log(`--comms[${state.debug}].notifyFulfillToData ${promiseID}`);
    }
    insistCapData(data);
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
    resolvePromiseToRemote(syscall, state, promiseID, resolution, transmit);
  }

  function notifyFulfillToPresence(promiseID, slot) {
    if (state.debug) {
      console.log(
        `--comms[${state.debug}].notifyFulfillToPresence ${promiseID} -> ${slot}`,
      );
    }
    const resolution = harden({ type: 'object', slot });
    resolvePromiseToRemote(syscall, state, promiseID, resolution, transmit);
  }

  function notifyReject(promiseID, data) {
    if (state.debug) {
      console.log(`--comms[${state.debug}].notifyReject ${promiseID}`);
    }
    insistCapData(data);
    const resolution = harden({ type: 'reject', data });
    resolvePromiseToRemote(syscall, state, promiseID, resolution, transmit);
  }

  const dispatch = harden({
    deliver,
    notifyFulfillToData,
    notifyFulfillToPresence,
    notifyReject,
  });
  debugState.set(dispatch, state);

  return dispatch;
}
