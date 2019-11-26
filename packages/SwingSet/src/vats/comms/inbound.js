import harden from '@agoric/harden';
import { insistRemoteType } from './parseRemoteSlot';
import { getInbound, mapInbound, mapInboundResult } from './clist';
import {
  insistPromiseIsUnresolved,
  insistPromiseDeciderIs,
  markPromiseAsResolved,
} from './state';
import { insist } from '../../insist';

export function deliverFromRemote(syscall, state, remoteID, message) {
  const command = message.split(':', 1)[0];

  if (command === 'deliver') {
    // deliver:$target:$method:[$result][:$slots..];body
    const sci = message.indexOf(';');
    insist(sci !== -1, `missing semicolon in deliver ${message}`);
    const slots = message
      .slice(0, sci)
      .split(':')
      .slice(1);
    // slots: [$target, $method, $result, $slots..]
    const target = getInbound(state, remoteID, slots[0]);
    const method = slots[1];
    const result = slots[2]; // 'rp-NN' or empty string
    const msgSlots = slots.slice(3).map(s => mapInbound(state, remoteID, s));
    const body = message.slice(sci + 1);
    const args = harden({ body, slots: msgSlots });
    let r; // send() if result promise is provided, else sendOnly()
    if (result.length) {
      r = mapInboundResult(state, remoteID, result);
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
    // console.log(`-- deliverFromRemote.resolve, ${message}, pre-state is:`);
    // dumpState(state);
    const sci = message.indexOf(';');
    insist(sci !== -1, `missing semicolon in resolve ${message}`);
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
