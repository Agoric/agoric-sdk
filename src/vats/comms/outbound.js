import { makeVatSlot, insistVatType } from '../parseVatSlots';
import {
  flipRemoteSlot,
  insistRemoteType,
  makeRemoteSlot,
} from './parseRemoteSlot';
import { getOutbound, mapOutbound } from './clist';
import { allocatePromiseIndex } from './state';
import { getRemote, insistRemoteID } from './remote';
import { insist } from '../../kernel/insist';

export function deliverToRemote(
  syscall,
  state,
  target,
  method,
  data,
  slots,
  resolverID,
) {
  // this object lives on 'remoteID', so we send messages at them
  const remoteID = state.objectTable.get(target);
  insist(remoteID !== undefined, `oops ${target}`);
  const remote = getRemote(state, remoteID);

  const remoteTargetSlot = getOutbound(state, remoteID, target);
  const remoteMessageSlots = slots.map(s =>
    mapOutbound(state, remoteID, s, syscall),
  );
  let rmss = remoteMessageSlots.join(':');
  if (rmss) {
    rmss = `:${rmss}`;
  }
  let remoteResultSlot = '';
  if (resolverID) {
    insistVatType('resolver', resolverID);
    // outbound: resolverID=r-NN -> rp-NN
    // inbound: rp+NN -> r-NN
    const pIndex = allocatePromiseIndex(state);
    const p = makeVatSlot('promise', true, pIndex); // p+NN
    state.promiseTable.set(p, {
      owner: null,
      resolved: false,
      decider: remoteID,
      subscriber: null,
      resolverID, // r-NN, temporary
    });
    remoteResultSlot = makeRemoteSlot('promise', false, pIndex); // rp-NN
    remote.toRemote.set(p, remoteResultSlot); // p+NN -> rp-NN
    remote.fromRemote.set(flipRemoteSlot(remoteResultSlot), p); // rp+NN -> p+NN
  }

  // now render the transmission. todo: 'method' lives in the transmission
  // for now, but will be moved to 'data'
  const msg = `deliver:${remoteTargetSlot}:${method}:${remoteResultSlot}${rmss};${data}`;
  // console.log(`deliverToRemote(target=${target}/${remoteTargetSlot}, result=${resolverID}/${remoteResultSlot}) leaving state as:`);
  // dumpState(state);
  return [remoteID, msg];
}

export function resolvePromiseToRemote(syscall, state, promiseID, resolution) {
  // console.log(`resolvePromiseToRemote ${promiseID}`, resolution);
  insistVatType('promise', promiseID);
  const p = state.promiseTable.get(promiseID);
  if (!p || !p.subscriber) {
    return [undefined, undefined]; // todo: local promise?
  }
  insist(!p.resolved, `${promiseID} is already resolved`);
  insist(!p.decider, `${p.decider} is the decider for ${promiseID}, not me`);
  const remoteID = p.subscriber;
  insistRemoteID(remoteID);
  // for now, promiseID = p-NN, later will be p+NN
  const target = getOutbound(state, remoteID, promiseID);
  // target should be rp+NN
  insistRemoteType('promise', target);
  // insist(parseRemoteSlot(target).allocatedByRecipient, target); // rp+NN for them
  function mapSlots() {
    const { slots } = resolution;
    const rms = slots.map(s => mapOutbound(state, remoteID, s, syscall));
    let rmss = rms.join(':');
    if (rmss) {
      rmss = `:${rmss}`;
    }
    return rmss;
  }

  let msg;
  if (resolution.type === 'object') {
    const resolutionRef = mapOutbound(
      state,
      remoteID,
      resolution.slot,
      syscall,
    );
    msg = `resolve:object:${target}:${resolutionRef};`;
  } else if (resolution.type === 'data') {
    const rmss = mapSlots();
    msg = `resolve:data:${target}${rmss};${resolution.data}`;
  } else if (resolution.type === 'reject') {
    const rmss = mapSlots();
    msg = `resolve:reject:${target}${rmss};${resolution.data}`;
  } else {
    throw new Error(`unknown resolution type ${resolution.type}`);
  }
  p.resolved = true;
  p.decider = undefined;
  p.subscriber = undefined;
  return [remoteID, msg];
}
