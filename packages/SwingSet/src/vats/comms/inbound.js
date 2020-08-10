/* global harden */

import { assert, details } from '@agoric/assert';
import { insistRemoteType } from './parseRemoteSlot';
import { getInbound, mapInbound, mapInboundResult } from './clist';
import {
  insistPromiseIsUnresolved,
  insistPromiseDeciderIs,
  markPromiseAsResolved,
} from './state';

function getInboundFor(state, remoteID, remoteTarget) {
  const target = getInbound(state, remoteID, remoteTarget);
  // That might point to o-NN or a promise. Check if the promise was resolved
  // already.
  if (state.promiseTable.has(target)) {
    const p = state.promiseTable.get(target);
    if (p.state === 'unresolved') {
      return target;
    }
    if (p.state === 'resolved') {
      if (p.resolution.type === 'object') {
        return p.resolution.slot;
      }
      if (p.resolution.type === 'data') {
        throw Error(`todo: error for fulfilledToData`);
      }
      if (p.resolution.type === 'reject') {
        throw Error(`todo: error for rejected`);
      }
      throw Error(`unknown res type ${p.resolution.type}`);
    }
    throw Error(`unknown p.state ${p.state}`);
  }
  return target;
}

export function deliverFromRemote(syscall, state, remoteID, message) {
  if (state.debug) {
    console.log(`-- msg ${message.slice(0, 80)}`);
  }
  const command = message.split(':', 1)[0];

  if (command === 'deliver') {
    // deliver:$target:$method:[$result][:$slots..];body
    const sci = message.indexOf(';');
    assert(sci !== -1, details`missing semicolon in deliver ${message}`);
    const slots = message
      .slice(0, sci)
      .split(':')
      .slice(1);
    // slots: [$target, $method, $result, $slots..]
    const target = getInboundFor(state, remoteID, slots[0]);
    const method = slots[1];
    const result = slots[2]; // 'rp-NN' or empty string
    const msgSlots = slots.slice(3).map(s => mapInbound(state, remoteID, s));
    const body = message.slice(sci + 1);
    const args = harden({ body, slots: msgSlots });
    let r; // send() if result promise is provided, else sendOnly()
    if (result.length) {
      r = mapInboundResult(state, remoteID, result);
    }
    if (state.debug) {
      console.log(`-- syscall.send(${target}).${method}, r=${r}`);
    }
    syscall.send(target, method, args, r);
    if (r) {
      // syscall.subscribe() happens after the send(), so it doesn't have to
      // deal with allocating promises too
      syscall.subscribe(r);
    }
    // dumpState(state);
    return;
  }

  if (command === 'resolve') {
    // console.debug(`-- deliverFromRemote.resolve, ${message}, pre-state is:`);
    // dumpState(state);
    const sci = message.indexOf(';');
    assert(sci !== -1, details`missing semicolon in resolve ${message}`);
    // message is created by resolvePromiseToRemote, so one of:
    // `resolve:object:${target}:${resolutionRef};`
    // `resolve:data:${target}${rmss};${resolution.body}`
    // `resolve:reject:${target}${rmss};${resolution.body}`

    const pieces = message.slice(0, sci).split(':');
    // pieces[0] is 'resolve'
    const type = pieces[1];
    const remoteTarget = pieces[2];
    const remoteSlots = pieces.slice(3); // length=1 for resolve:object
    insistRemoteType('promise', remoteTarget); // slots[0] is 'rp+NN`.
    const target = getInbound(state, remoteID, remoteTarget);
    const slots = remoteSlots.map(s => mapInbound(state, remoteID, s));
    const body = message.slice(sci + 1);
    const data = harden({ body, slots });

    // rp+NN maps to target=p-+NN and we look at the promiseTable to make
    // sure it's in the right state.
    insistPromiseIsUnresolved(state, target);
    insistPromiseDeciderIs(state, target, remoteID);

    if (state.debug) {
      console.log(
        `-- syscall.resolve(${target}) ${type}}, ${slots[0]} ${data}`,
      );
    }
    if (type === 'object') {
      const slot = slots[0];
      const resolution = harden({ type: 'object', slot });
      markPromiseAsResolved(state, target, resolution);
      syscall.fulfillToPresence(target, slot);
    } else if (type === 'data') {
      const resolution = harden({ type: 'data', data });
      markPromiseAsResolved(state, target, resolution);
      syscall.fulfillToData(target, data);
    } else if (type === 'reject') {
      const resolution = harden({ type: 'reject', data });
      markPromiseAsResolved(state, target, resolution);
      syscall.reject(target, data);
    } else {
      throw new Error(`unknown resolution type ${type} in ${message}`);
    }
    return;
  }

  throw new Error(
    `unrecognized command ${command} in received message ${message}`,
  );
}
