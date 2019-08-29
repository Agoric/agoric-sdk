import { getRemote } from './remote';
import {
  flipRemoteSlot,
  insistRemoteType,
  parseRemoteSlot,
} from './parseRemoteSlot';
import { mapInbound, getInbound } from './clist';
import { allocatePromise } from './state';
import { insist } from '../../kernel/insist';

export function deliverFromRemote(syscall, state, remoteID, message) {
  const remote = getRemote(state, remoteID);
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
    const msgSlots = slots
      .slice(3)
      .map(s => mapInbound(state, remoteID, s, syscall));
    const body = message.slice(sci + 1);
    let r;
    if (result.length) {
      // todo: replace with mapInboundResult, allow pre-existing promises if
      // the decider is right
      insistRemoteType('promise', result);
      insist(!parseRemoteSlot(result).allocatedByRecipient, result); // temp?
      r = allocatePromise(state);
      state.promiseTable.set(r, {
        owner: remoteID,
        resolved: false,
        decider: null,
        subscriber: remoteID,
      });
      remote.fromRemote.set(result, r);
      remote.toRemote.set(r, flipRemoteSlot(result));
    }
    // else it's a sendOnly()
    syscall.send(target, method, body, msgSlots, r);
    if (r) {
      // todo: can/should we subscribe to this early, before syscall.send()?
      // probably not.
      syscall.subscribe(r);
    }
    // dumpState(state);
  } else if (command === 'resolve') {
    // console.log(`-- deliverFromRemote.resolve, ${message}, pre-state is:`);
    // dumpState(state);
    const sci = message.indexOf(';');
    insist(sci !== -1, `missing semicolon in resolve ${message}`);
    // message is created by resolvePromiseToRemote, so one of:
    // `resolve:object:${target}:${resolutionRef};`
    // `resolve:data:${target}${rmss};${resolution.data}`
    // `resolve:reject:${target}${rmss};${resolution.data}`

    const pieces = message.slice(0, sci).split(':');
    // pieces[0] is 'resolve'
    const type = pieces[1];
    const remoteTarget = pieces[2];
    const remoteSlots = pieces.slice(3); // length=1 for resolve:object
    insistRemoteType('promise', remoteTarget); // slots[0] is 'rp+NN`.
    const target = getInbound(state, remoteID, remoteTarget);
    // rp+NN maps to target=p-+NN and we look at the promiseTable to make
    // sure it's in the right state.
    const p = state.promiseTable.get(target);
    insist(p, `${target} is not in the promiseTable`);
    insist(!p.resolved, `${target} is already resolved`);
    insist(
      p.decider === remoteID,
      `${p.decider} is the decider of ${target}, not ${remoteID}`,
    );
    const slots = remoteSlots.map(s => mapInbound(state, remoteID, s, syscall));
    const body = message.slice(sci + 1);
    if (type === 'object') {
      syscall.fulfillToPresence(target, slots[0]);
    } else if (type === 'data') {
      syscall.fulfillToData(target, body, slots);
    } else if (type === 'reject') {
      syscall.reject(target, body, slots);
    } else {
      throw new Error(`unknown resolution type ${type} in ${message}`);
    }
  } else {
    throw new Error(
      `unrecognized command ${command} in received message ${message}`,
    );
  }
}
