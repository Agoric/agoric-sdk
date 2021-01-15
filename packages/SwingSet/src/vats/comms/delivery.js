/* eslint-disable no-use-before-define */

import { assert, details } from '@agoric/assert';
import { insistVatType, parseVatSlot } from '../../parseVatSlots';
import { makeUndeliverableError } from '../../makeUndeliverableError';
import { insistCapData } from '../../capdata';
import { insistRemoteType } from './parseRemoteSlot';
import { insistRemoteID } from './remote';

export function makeDeliveryKit(state, syscall, transmit, clistKit, stateKit) {
  const {
    getRemoteForLocal,
    provideRemoteForLocal,
    provideRemoteForLocalResult,

    getLocalForRemote,
    provideLocalForRemote,
    provideLocalForRemoteResult,

    provideKernelForLocal,
    provideKernelForLocalResult,
    provideLocalForKernel,
    provideLocalForKernelResult,
  } = clistKit;

  const {
    deciderIsRemote,
    insistDeciderIsRemote,
    insistDeciderIsComms,
    insistDeciderIsKernel,
    insistPromiseIsUnresolved,
    changeDeciderFromKernelToComms,
    changeDeciderFromRemoteToComms,
    getPromiseSubscribers,
    markPromiseAsResolved,
  } = stateKit;

  function mapDataToKernel(data) {
    insistCapData(data);
    const kernelSlots = data.slots.map(s => provideKernelForLocal(s));
    const kernelData = harden({ body: data.body, slots: kernelSlots });
    return kernelData;
  }

  function mapDataFromKernel(kdata, doNotSubscribeSet) {
    insistCapData(kdata);
    const slots = kdata.slots.map(slot =>
      provideLocalForKernel(slot, doNotSubscribeSet),
    );
    return harden({ body: kdata.body, slots });
  }

  // dispatch.deliver from kernel lands here (with message from local vat to
  // remote machine): translate to local, join with handleSend
  function sendFromKernel(target, method, kargs, kresult) {
    const result = provideLocalForKernelResult(kresult);
    const args = mapDataFromKernel(kargs, null);
    const localDelivery = harden({ target, method, result, args });
    handleSend(localDelivery);
  }

  function mapResolutionFromKernel(resolution, doNotSubscribeSet) {
    return harden({
      ...resolution,
      data: mapDataFromKernel(resolution.data, doNotSubscribeSet),
    });
  }

  // dispatch.notifyResolve* from kernel lands here (local vat resolving some
  // Promise, we need to notify remote machines): translate to local, join
  // with handleResolution
  function resolveFromKernel(vpid, resolution, doNotSubscribeSet) {
    insistPromiseIsUnresolved(vpid);
    insistDeciderIsKernel(vpid);
    changeDeciderFromKernelToComms(vpid);
    handleResolution(
      vpid,
      mapResolutionFromKernel(resolution, doNotSubscribeSet),
    );
  }

  // dispatch.deliver with msg from vattp lands here, containing a message
  // from some remote machine. figure out whether it's a deliver or a
  // resolve, parse, merge with handleSend/handleResolution
  function messageFromRemote(remoteID, message) {
    const command = message.split(':', 1)[0];
    if (command === 'deliver') {
      return sendFromRemote(remoteID, message);
    }
    if (command === 'resolve') {
      return resolveFromRemote(remoteID, message);
    }
    throw Error(`unrecognized '${command}' in received message ${message}`);
  }

  function sendFromRemote(remoteID, message) {
    // deliver:$target:$method:[$result][:$slots..];body
    const sci = message.indexOf(';');
    assert(sci !== -1, details`missing semicolon in deliver ${message}`);
    const fields = message
      .slice(0, sci)
      .split(':')
      .slice(1);
    // fields: [$target, $method, $result, $slots..]
    const remoteTarget = fields[0];
    const target = getLocalForRemote(remoteID, remoteTarget);
    const method = fields[1];
    const remoteResult = fields[2]; // 'rp-NN' or empty string
    let result;
    if (remoteResult.length) {
      result = provideLocalForRemoteResult(remoteID, remoteResult);
    }
    const slots = fields.slice(3).map(s => provideLocalForRemote(remoteID, s));
    const body = message.slice(sci + 1);
    const args = harden({ body, slots });
    const localDelivery = harden({ target, method, result, args });
    handleSend(localDelivery);
  }

  function resolveFromRemote(remoteID, message) {
    const sci = message.indexOf(';');
    assert(sci !== -1, details`missing semicolon in resolve ${message}`);
    // message is created by resolveToRemote, taking the form:
    // `resolve:${rejected}:${target}${rmss};${resolution.body}`

    const pieces = message.slice(0, sci).split(':');
    // pieces[0] is 'resolve'
    const rejected = pieces[1] === 'reject';
    assert(rejected || pieces[1] === 'fulfill');
    const remoteTarget = pieces[2];
    const remoteSlots = pieces.slice(3); // length=1 for resolve:object
    insistRemoteType('promise', remoteTarget); // slots[0] is 'rp+NN`.
    const vpid = getLocalForRemote(remoteID, remoteTarget);
    // rp+NN maps to target=p-+NN and we look at the promiseTable to make
    // sure it's in the right state.
    insistPromiseIsUnresolved(vpid);
    insistDeciderIsRemote(vpid, remoteID);

    const slots = remoteSlots.map(s => provideLocalForRemote(remoteID, s));
    const body = message.slice(sci + 1);
    const data = harden({ body, slots });
    changeDeciderFromRemoteToComms(vpid, remoteID);

    handleResolution(vpid, harden({ rejected, data }));
  }

  function extractPresenceIfPresent(data) {
    insistCapData(data);

    const body = JSON.parse(data.body);
    if (
      body &&
      typeof body === 'object' &&
      body['@qclass'] === 'slot' &&
      body.index === 0
    ) {
      if (data.slots.length === 1) {
        const slot = data.slots[0];
        const { type } = parseVatSlot(slot);
        if (type === 'object') {
          return slot;
        }
      }
    }
    return null;
  }

  // helper function for handleSend(): for each message, either figure out
  // the destination (remote machine or kernel), or reject the result because
  // the destination is a brick wall (undeliverable target)
  function resolveTarget(target, method) {
    const { type, allocatedByVat } = parseVatSlot(target);

    if (type === 'object') {
      const remoteID = state.objectTable.get(target);
      if (remoteID) {
        assert(allocatedByVat);
        // the target lives on a remote machine
        return { send: target, kernel: false, remoteID };
      } else {
        assert(!allocatedByVat);
        // target lives in some other vat on this machine, send into the kernel
        return { send: target, kernel: true };
      }
    }

    assert(type === 'promise');
    // the promise might be resolved already
    const p = state.promiseTable.get(target);
    assert(p);

    if (p.resolved) {
      if (p.resolution.rejected) {
        return { reject: p.resolution.data };
      }
      const targetPresence = extractPresenceIfPresent(p.resolution.data);
      if (targetPresence) {
        return resolveTarget(targetPresence, method);
      } else {
        return { reject: makeUndeliverableError(method) };
      }
    }

    // unresolved
    const remoteID = deciderIsRemote(target);
    if (remoteID) {
      return { send: target, kernel: false, remoteID };
    }

    insistDeciderIsKernel(target);
    return { send: target, kernel: true };
  }

  function handleSend(localDelivery) {
    // { target, method, result, args }
    // where does it go?
    const where = resolveTarget(localDelivery.target, localDelivery.method);

    if (where.send) {
      if (where.kernel) {
        sendToKernel(where.send, localDelivery);
      } else {
        sendToRemote(where.send, where.remoteID, localDelivery);
      }
      return;
    }

    if (where.reject) {
      if (!localDelivery.result) {
        return; // sendOnly, nowhere to send the rejection
      }
      const resolution = harden({ rejected: true, data: where.reject });
      handleResolution(localDelivery.result, resolution);
      return;
    }

    throw Error(`unknown where ${where}`);
  }

  function sendToKernel(target, delivery) {
    const { method, args: localArgs, result: localResult } = delivery;
    const kernelArgs = mapDataToKernel(localArgs);
    const kernelResult = provideKernelForLocalResult(localResult);
    syscall.send(target, method, kernelArgs, kernelResult);
    if (kernelResult) {
      syscall.subscribe(kernelResult);
    }
  }

  function sendToRemote(target, remoteID, localDelivery) {
    assert(remoteID, details`oops ${target}`);
    insistCapData(localDelivery.args);

    const {
      method,
      args: { body, slots: localSlots },
      result: localResult,
    } = localDelivery;

    const remoteTarget = getRemoteForLocal(remoteID, target);
    let remoteResult = '';
    if (localResult) {
      insistVatType('promise', localResult);
      remoteResult = provideRemoteForLocalResult(remoteID, localResult);
    }
    const remoteSlots = localSlots.map(s => provideRemoteForLocal(remoteID, s));
    let ss = remoteSlots.join(':');
    if (ss) {
      ss = `:${ss}`;
    }

    // now render the transmission. todo: 'method' lives in the transmission
    // for now, but will be moved to 'data'
    const msg = `deliver:${remoteTarget}:${method}:${remoteResult}${ss};${body}`;
    transmit(remoteID, msg);
  }

  function handleResolution(vpid, resolution) {
    // resolution: { rejected: boolean, data: capdata }
    insistCapData(resolution.data);
    insistVatType('promise', vpid);
    insistPromiseIsUnresolved(vpid);
    insistDeciderIsComms(vpid);

    const { subscribers, kernelIsSubscribed } = getPromiseSubscribers(vpid);

    // mark it as resolved in the promise table, so later messages to it will
    // be handled properly
    markPromiseAsResolved(vpid, resolution);

    // what remotes need to know?
    for (const remoteID of subscribers) {
      insistRemoteID(remoteID);
      resolveToRemote(remoteID, vpid, resolution);
      // TODO: what happens when we tell them about the promise again someday?
      // do we need to remember who we've notified, and never notify them
      // again?
    }

    if (kernelIsSubscribed) {
      resolveToKernel(vpid, resolution);
      // the kernel now forgets this vpid: the p.resolved flag in
      // promiseTable reminds provideKernelForLocal to use a fresh VPID if we
      // ever reference it again in the future
    }
  }

  function resolveToRemote(remoteID, vpid, resolution) {
    const rpid = getRemoteForLocal(remoteID, vpid);
    // rpid should be rp+NN
    insistRemoteType('promise', rpid);
    // assert(parseRemoteSlot(rpid).allocatedByRecipient, rpid); // rp+NN for them
    function mapSlots() {
      const { slots } = resolution.data;
      let ss = slots.map(s => provideRemoteForLocal(remoteID, s)).join(':');
      if (ss) {
        ss = `:${ss}`;
      }
      return ss;
    }

    const rejected = resolution.rejected ? 'reject' : 'fulfill';
    // prettier-ignore
    const msg =
      `resolve:${rejected}:${rpid}${mapSlots()};${resolution.data.body}`;

    transmit(remoteID, msg);
  }

  function resolveToKernel(vpid, resolution) {
    syscall.resolve(
      vpid,
      resolution.rejected,
      mapDataToKernel(resolution.data),
    );
  }

  return harden({
    sendFromKernel,
    resolveFromKernel,
    messageFromRemote,
    resolveToRemote,
    resolveToKernel,
  });
}
