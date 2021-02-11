/* eslint-disable no-use-before-define */

import { assert, details as X } from '@agoric/assert';
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
    markPromiseAsResolvedInKernel,
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

  // dispatch.notify from kernel lands here (local vat resolving some
  // Promise, we need to notify remote machines): translate to local, join
  // with handleResolutions
  function resolveFromKernel(resolutions, doNotSubscribeSet) {
    const localResolutions = [];
    for (const resolution of resolutions) {
      const [vpid, value] = resolution;

      // I *think* we should never get here for local promises, since the
      // controller only does sendOnly. But if we change that, we need to catch
      // locally-generated promises and deal with them.
      // if (promiseID in localPromises) {
      //  resolveLocal(promiseID, { rejected: false, data });
      // }

      // todo: if we previously held resolution authority for this promise, then
      // transferred it to some local vat, we'll have subscribed to the kernel
      // to hear about it. If we then get the authority back again, we no longer
      // want to hear about its resolution (since we're the ones doing the
      // resolving), but the kernel still thinks of us as subscribing, so we'll
      // get a bogus dispatch.notify. Currently we throw an error, which is
      // currently ignored but might prompt a vat shutdown in the future.

      insistPromiseIsUnresolved(vpid);
      insistDeciderIsKernel(vpid);
      changeDeciderFromKernelToComms(vpid);
      localResolutions.push([
        vpid,
        mapResolutionFromKernel(value, doNotSubscribeSet),
      ]);
    }
    handleResolutions(localResolutions);
    // XXX question: do we need to call retirePromiseIDIfEasy (or some special
    // comms vat version of it) here?
  }

  // dispatch.deliver with msg from vattp lands here, containing a message
  // from some remote machine. figure out whether it's a deliver or a
  // resolve, parse, merge with handleSend/handleResolutions
  function messageFromRemote(remoteID, message) {
    const command = message.split(':', 1)[0];
    if (command === 'deliver') {
      return sendFromRemote(remoteID, message);
    }
    if (command === 'resolve') {
      return resolveFromRemote(remoteID, message);
    }
    assert.fail(X`unrecognized '${command}' in received message ${message}`);
  }

  function sendFromRemote(remoteID, message) {
    // deliver:$target:$method:[$result][:$slots..];body
    const sci = message.indexOf(';');
    assert(sci !== -1, X`missing semicolon in deliver ${message}`);
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
    // message is created by resolveToRemote.  It consists of 1 or more
    // resolutions, separated by newlines, each taking the form of either:
    // `resolve:fulfill:${target}${rmss};${resolution.body}`
    // or
    // `resolve:reject:${target}${rmss};${resolution.body}`
    const subMessages = message.split('\n');
    const resolutions = [];
    for (const submsg of subMessages) {
      const sci = submsg.indexOf(';');
      assert(sci !== -1, X`missing semicolon in resolve ${submsg}`);

      const pieces = submsg.slice(0, sci).split(':');
      assert(pieces[0] === 'resolve');
      const rejected = pieces[1] === 'reject';
      assert(rejected || pieces[1] === 'fulfill');
      const remoteTarget = pieces[2];
      const remoteSlots = pieces.slice(3);
      insistRemoteType('promise', remoteTarget); // slots[0] is 'rp+NN`.
      const vpid = getLocalForRemote(remoteID, remoteTarget);
      // rp+NN maps to target=p-+NN and we look at the promiseTable to make
      // sure it's in the right state.
      insistPromiseIsUnresolved(vpid);
      insistDeciderIsRemote(vpid, remoteID);

      const slots = remoteSlots.map(s => provideLocalForRemote(remoteID, s));
      const body = submsg.slice(sci + 1);
      const data = harden({ body, slots });
      changeDeciderFromRemoteToComms(vpid, remoteID);
      resolutions.push([vpid, { rejected, data }]);
    }
    handleResolutions(harden(resolutions));
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
      const resolutions = harden([
        [localDelivery.result, { rejected: true, data: where.reject }],
      ]);
      handleResolutions(resolutions);
      return;
    }

    assert.fail(X`unknown where ${where}`);
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
    assert(remoteID, X`oops ${target}`);
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

  function handleResolutions(resolutions) {
    const [[primaryVpid]] = resolutions;
    const { subscribers, kernelIsSubscribed } = getPromiseSubscribers(
      primaryVpid,
    );
    for (const resolution of resolutions) {
      const [vpid, value] = resolution;
      // value: { rejected: boolean, data: capdata }
      insistCapData(value.data);
      insistVatType('promise', vpid);
      insistPromiseIsUnresolved(vpid);
      insistDeciderIsComms(vpid);

      // mark it as resolved in the promise table, so later messages to it will
      // be handled properly
      markPromiseAsResolved(vpid, value);
    }

    // what remotes need to know?
    for (const remoteID of subscribers) {
      insistRemoteID(remoteID);
      resolveToRemote(remoteID, resolutions);
      // TODO: what happens when we tell them about the promise again someday?
      // do we need to remember who we've notified, and never notify them
      // again?
    }

    if (kernelIsSubscribed) {
      resolveToKernel(resolutions);
      // the kernel now forgets this vpid: the p.resolved flag in
      // promiseTable reminds provideKernelForLocal to use a fresh VPID if we
      // ever reference it again in the future
    }
    for (const resolution of resolutions) {
      const [vpid] = resolution;
      markPromiseAsResolvedInKernel(vpid);
    }
  }

  function resolveToRemote(remoteID, resolutions) {
    const msgs = [];
    for (const resolution of resolutions) {
      const [vpid, value] = resolution;

      const rpid = getRemoteForLocal(remoteID, vpid);
      // rpid should be rp+NN
      insistRemoteType('promise', rpid);
      // assert(parseRemoteSlot(rpid).allocatedByRecipient, rpid); // rp+NN for them
      function mapSlots() {
        const { slots } = value.data;
        let ss = slots.map(s => provideRemoteForLocal(remoteID, s)).join(':');
        if (ss) {
          ss = `:${ss}`;
        }
        return ss;
      }

      const rejected = value.rejected ? 'reject' : 'fulfill';
      // prettier-ignore
      msgs.push(`resolve:${rejected}:${rpid}${mapSlots()};${value.data.body}`);
    }
    transmit(remoteID, msgs.join('\n'));
  }

  function resolveToKernel(localResolutions) {
    const resolutions = [];
    for (const localResolution of localResolutions) {
      const [vpid, value] = localResolution;
      resolutions.push([vpid, value.rejected, mapDataToKernel(value.data)]);
    }
    syscall.resolve(resolutions);
  }

  return harden({
    sendFromKernel,
    resolveFromKernel,
    messageFromRemote,
    resolveToRemote,
    resolveToKernel,
  });
}
