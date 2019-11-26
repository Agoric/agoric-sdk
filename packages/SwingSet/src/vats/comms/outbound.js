import { insistVatType } from '../../parseVatSlots';
import { insistRemoteType } from './parseRemoteSlot';
import { getOutbound, mapOutbound, mapOutboundResult } from './clist';
import {
  getPromiseSubscriber,
  insistPromiseDeciderIsMe,
  insistPromiseIsUnresolved,
  markPromiseAsResolved,
} from './state';
import { insistRemoteID } from './remote';
import { insist } from '../../insist';
import { insistCapData } from '../../capdata';

function getRemoteFor(state, target) {
  if (state.objectTable.has(target)) {
    return state.objectTable.get(target);
  }
  if (state.promiseTable.has(target)) {
    const p = state.promiseTable.get(target);
    if (p.state === 'unresolved') {
      return p.decider;
    }
    if (p.state === 'resolved') {
      if (p.resolution.type === 'object') {
        return getRemoteFor(state, p.resolution.slot);
      }
      if (p.resolution.type === 'data') {
        throw new Error(`todo: error for fulfilledToData`);
      }
      if (p.resolution.type === 'reject') {
        throw new Error(`todo: error for rejected`);
      }
      if (p.resolution.type === 'forwarded') {
        // todo
        return getRemoteFor(state, p.resolution.slot);
      }
      throw new Error(`unknown res type ${p.resolution.type}`);
    }
    throw new Error(`unknown p.state ${p.state}`);
  }
  throw new Error(`unknown target type ${target}`);
}

export function deliverToRemote(
  syscall,
  state,
  target,
  method,
  args,
  result,
  transmit,
) {
  // this object lives on 'remoteID', so we send messages at them
  const remoteID = getRemoteFor(state, target);
  insist(remoteID, `oops ${target}`);
  insistCapData(args);

  const remoteTargetSlot = getOutbound(state, remoteID, target);
  const remoteMessageSlots = args.slots.map(s =>
    mapOutbound(state, remoteID, s, syscall),
  );
  let rmss = remoteMessageSlots.join(':');
  if (rmss) {
    rmss = `:${rmss}`;
  }
  let remoteResultSlot = '';
  if (result) {
    insistVatType('promise', result);
    // outbound: promiseID=p-NN -> rp-NN
    // inbound: rp+NN -> p-NN
    remoteResultSlot = mapOutboundResult(state, remoteID, result);
  }

  // now render the transmission. todo: 'method' lives in the transmission
  // for now, but will be moved to 'data'
  const msg = `deliver:${remoteTargetSlot}:${method}:${remoteResultSlot}${rmss};${args.body}`;
  // console.log(`deliverToRemote(target=${target}/${remoteTargetSlot}, result=${result}/${remoteResultSlot}) leaving state as:`);
  // dumpState(state);
  transmit(syscall, state, remoteID, msg);
}

export function resolvePromiseToRemote(
  syscall,
  state,
  promiseID,
  resolution,
  transmit,
) {
  // console.log(`resolvePromiseToRemote ${promiseID}`, resolution);
  insistVatType('promise', promiseID);
  insistPromiseIsUnresolved(state, promiseID);
  insistPromiseDeciderIsMe(state, promiseID);
  const remoteID = getPromiseSubscriber(state, promiseID);
  insistRemoteID(remoteID);

  // mark it as resolved in the promise table, so later messages to it will
  // be handled properly
  markPromiseAsResolved(state, promiseID, resolution);

  // for now, promiseID = p-NN, later will be p+NN
  const target = getOutbound(state, remoteID, promiseID);
  // target should be rp+NN
  insistRemoteType('promise', target);
  // insist(parseRemoteSlot(target).allocatedByRecipient, target); // rp+NN for them
  function mapSlots() {
    const { slots } = resolution.data;
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
    msg = `resolve:data:${target}${mapSlots()};${resolution.data.body}`;
  } else if (resolution.type === 'reject') {
    msg = `resolve:reject:${target}${mapSlots()};${resolution.data.body}`;
  } else {
    throw new Error(`unknown resolution type ${resolution.type}`);
  }

  transmit(syscall, state, remoteID, msg);
}
