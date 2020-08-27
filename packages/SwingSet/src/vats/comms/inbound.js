/* global harden */

import { assert, details } from '@agoric/assert';
import { makeUndeliverableError } from '../../makeUndeliverableError';
import { insistRemoteType } from './parseRemoteSlot';
import {
  getLocalForRemote,
  provideLocalForRemote,
  provideLocalForRemoteResult,
} from './clist';
import {
  insistPromiseIsUnresolved,
  insistPromiseDeciderIs,
  markPromiseAsResolved,
} from './state';

export function deliverFromRemote(syscall, handleDelivery, resolvePromiseToRemote, state, remoteID, message) {
  const command = message.split(':', 1)[0];

  // we deal with three different kinds of slot namespace ("slotspace") here:
  // 1: remote[NAME] : ro+NN/etc
  // 2: local: o+NN/etc
  // 3: kernel: ko+NN/etc

  // we start by translating inbound messages from the remote's slotspace to
  // our own (the comms vat)

  // Then we figure out where the message is headed. Most messages are for a
  // local vat, but they might be destined for a different remote (if we
  // shared a third-party reference for the target), or maybe even the same
  // remote who gave us the message (if the target is a promise that we
  // resolved to them, but they haven't gotten the resolution message yet)

  // if the message is going to our kernel, translate the message from our
  // local vat slotspace into the kernel slotspace

  // otherwise translate it into the destination remote's slotspace

  if (command === 'deliver') {
    // deliver:$target:$method:[$result][:$slots..];body
    const sci = message.indexOf(';');
    assert(sci !== -1, details`missing semicolon in deliver ${message}`);
    const slots = message
      .slice(0, sci)
      .split(':')
      .slice(1);
    // slots: [$target, $method, $result, $slots..]
    const remoteTarget = slots[0];
    const localTarget = getLocalForRemote(state, remoteID, remoteTarget);
    //const target = getInboundFor(state, remoteID, slots[0]);
    const method = slots[1];
    const remoteResult = slots[2]; // 'rp-NN' or empty string
    const localResult = remoteResult.length ? provideLocalForRemoteResult(state, remoteID, remoteResult) : undefined;
    const localSlots = slots
      .slice(3)
      .map(s => provideLocalForRemote(state, remoteID, s));
    const body = message.slice(sci + 1);
    const localArgs = harden({ body, slots: localSlots });
    const localDelivery = harden({ target: localTarget, method, result: localResult, args: localArgs });

    handleDelivery(localDelivery);


    function deliverToKernel(

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
    const target = getLocalForRemote(state, remoteID, remoteTarget);
    const slots = remoteSlots.map(s =>
      provideLocalForRemote(state, remoteID, s),
    );
    const body = message.slice(sci + 1);
    const data = harden({ body, slots });

    // rp+NN maps to target=p-+NN and we look at the promiseTable to make
    // sure it's in the right state.
    insistPromiseIsUnresolved(state, target);
    insistPromiseDeciderIs(state, target, remoteID);

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
