import harden from '@agoric/harden';
import { makeVatSlot } from '../parseVatSlots';
import { getRemote } from './remote';
import { makeState } from './state';
import { deliverToRemote, resolvePromiseToRemote } from './outbound';
import { deliverFromRemote } from './inbound';
import { deliverToController } from './controller';
import { insist } from '../../kernel/insist';

function transmit(syscall, state, remoteID, msg) {
  const remote = getRemote(state, remoteID);
  // the vat-tp "integrity layer" is a regular vat, so it expects an argument
  // encoded as JSON
  const body = JSON.stringify({ args: [msg] });
  syscall.send(remote.transmitterID, 'transmit', body, []); // todo: sendOnly
}

export const debugState = new WeakMap();

export function buildCommsDispatch(syscall, _state, _helpers) {
  // TODO: state.activate(), put this data on state.stuff instead of closing
  // over a local object
  const state = makeState();

  // our root object (o+0) is the Comms Controller
  const controller = makeVatSlot('object', true, 0);

  function deliver(target, method, argsbytes, caps, resolverID) {
    if (target === controller) {
      return deliverToController(
        state,
        method,
        argsbytes,
        caps,
        resolverID,
        syscall,
      );
    }
    if (state.objectTable.has(target)) {
      insist(
        method.indexOf(':') === -1 && method.indexOf(';') === -1,
        `illegal method name ${method}`,
      );
      const [remoteID, body] = deliverToRemote(
        syscall,
        state,
        target,
        method,
        argsbytes,
        caps,
        resolverID,
      );
      return transmit(syscall, state, remoteID, body);
    }
    if (state.remoteReceivers.has(target)) {
      insist(method === 'receive', `unexpected method ${method}`);
      // the vat-tp integrity layer is a regular vat, so when they send the
      // received message to us, it will be embedded in a JSON array
      const message = JSON.parse(argsbytes).args[0];
      return deliverFromRemote(
        syscall,
        state,
        state.remoteReceivers.get(target),
        message,
      );
    }
    // TODO: if (target in PromiseTable) : pipelining
    throw new Error(`unknown target ${target}`);
  }

  function notifyFulfillToData(promiseID, data, slots) {
    // if (promiseID in localPromises) {
    //  resolveLocal(promiseID, { type: 'data', data, slots });
    // }
    // console.log(`notifyFulfillToData ${promiseID}`);
    const [remoteID, body] = resolvePromiseToRemote(syscall, state, promiseID, {
      type: 'data',
      data,
      slots,
    });
    if (remoteID) {
      return transmit(syscall, state, remoteID, body);
    }
    throw new Error(`unknown promise ${promiseID}`);
  }

  function notifyFulfillToPresence(promiseID, slot) {
    // console.log(`notifyFulfillToPresence ${promiseID}`);
    const [remoteID, body] = resolvePromiseToRemote(syscall, state, promiseID, {
      type: 'object',
      slot,
    });
    if (remoteID) {
      return transmit(syscall, state, remoteID, body);
    }
    throw new Error(`unknown promise ${promiseID}`);
  }

  function notifyReject(promiseID, data, slots) {
    // console.log(`notifyReject ${promiseID}`);
    const [remoteID, body] = resolvePromiseToRemote(syscall, state, promiseID, {
      type: 'reject',
      data,
      slots,
    });
    if (remoteID) {
      return transmit(syscall, state, remoteID, body);
    }
    throw new Error(`unknown promise ${promiseID}`);
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
