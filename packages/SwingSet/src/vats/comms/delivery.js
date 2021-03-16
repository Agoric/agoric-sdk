/* eslint-disable no-use-before-define */

import { assert, details as X } from '@agoric/assert';
import { parseLocalSlot, insistLocalType } from './parseLocalSlots';
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
    retireKernelPromiseID,
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
    return harden({ ...kdata, slots });
  }

  // dispatch.deliver from kernel lands here (with message from local vat to
  // remote machine): translate to local, join with handleSend
  function sendFromKernel(ktarget, method, kargs, kresult) {
    const target = provideLocalForKernel(ktarget);
    const args = mapDataFromKernel(kargs, null);
    assert(
      state.objectTable.has(target) || state.promiseTable.has(target),
      X`unknown message target ${target}/${ktarget}`,
    );
    assert(
      method.indexOf(':') === -1 && method.indexOf(';') === -1,
      X`illegal method name ${method}`,
    );
    // TODO: if promise target not in PromiseTable: resolve result to error
    //   this will happen if someone pipelines to our controller/receiver
    const result = provideLocalForKernelResult(kresult);
    const localDelivery = harden({ target, method, result, args });
    handleSend(localDelivery);
  }

  // dispatch.notify from kernel lands here (local vat resolving some
  // Promise, we need to notify remote machines): translate to local, join
  // with handleResolutions
  function resolveFromKernel(resolutions) {
    const willBeResolved = new Set();
    const localResolutions = [];
    for (const resolution of resolutions) {
      willBeResolved.add(resolution[0]);
    }
    for (const resolution of resolutions) {
      const [kfpid, rejected, data] = resolution;
      insistCapData(data);
      const lpid = provideLocalForKernel(kfpid, willBeResolved);

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

      insistPromiseIsUnresolved(lpid);
      insistDeciderIsKernel(lpid);
      changeDeciderFromKernelToComms(lpid);
      localResolutions.push([
        lpid,
        rejected,
        mapDataFromKernel(data, willBeResolved),
      ]);
    }
    for (const kfpid of willBeResolved) {
      retireKernelPromiseID(kfpid);
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
      const lpid = getLocalForRemote(remoteID, remoteTarget);
      // rp+NN maps to target=p-+NN and we look at the promiseTable to make
      // sure it's in the right state.
      insistPromiseIsUnresolved(lpid);
      insistDeciderIsRemote(lpid, remoteID);

      const slots = remoteSlots.map(s => provideLocalForRemote(remoteID, s));
      const body = submsg.slice(sci + 1);
      const data = harden({ body, slots });
      changeDeciderFromRemoteToComms(lpid, remoteID);
      resolutions.push([lpid, rejected, data]);
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
        const { type } = parseLocalSlot(slot);
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
    const { type } = parseLocalSlot(target);

    if (type === 'object') {
      const remoteID = state.objectTable.get(target);
      if (remoteID === 'kernel' || !remoteID) {
        // XXX TODO: set up remoteID 'kernel' for non-remote objects
        // target lives in some other vat on this machine, send into the kernel
        return { send: target, kernel: true };
      } else {
        // the target lives on a remote machine
        return { send: target, kernel: false, remoteID };
      }
    }

    assert(type === 'promise');
    // the promise might be resolved already
    const p = state.promiseTable.get(target);
    assert(p);

    if (p.resolved) {
      if (p.rejected) {
        return { reject: p.data };
      }
      const targetPresence = extractPresenceIfPresent(p.data);
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

  function resolutionCollector() {
    const resolutions = [];
    const doneResolutions = new Set();

    function scanSlots(slots) {
      for (const slot of slots) {
        const { type } = parseLocalSlot(slot);
        if (type === 'promise') {
          const p = state.promiseTable.get(slot);
          assert(p, X`should have a value for ${slot} but didn't`);
          if (p.resolved && !doneResolutions.has(slot)) {
            collect(slot);
          }
        }
      }
    }

    function collect(lpid) {
      doneResolutions.add(lpid);
      const p = state.promiseTable.get(lpid);
      resolutions.push([lpid, p.rejected, p.data]);
      scanSlots(p.data.slots);
    }

    function forPromise(lpid) {
      collect(lpid);
      return resolutions;
    }

    function forSlots(slots) {
      scanSlots(slots);
      return resolutions;
    }

    return {
      forPromise,
      forSlots,
    };
  }

  function handleSend(localDelivery) {
    // { target, method, result, args }
    // where does it go?
    const where = resolveTarget(localDelivery.target, localDelivery.method);

    if (where.send) {
      const auxResolutions = resolutionCollector().forSlots(
        localDelivery.args.slots,
      );
      if (where.kernel) {
        sendToKernel(where.send, localDelivery);
        if (auxResolutions.length > 0) {
          resolveToKernel(auxResolutions);
        }
      } else {
        sendToRemote(where.send, where.remoteID, localDelivery);
        if (auxResolutions.length > 0) {
          resolveToRemote(where.remoteID, auxResolutions);
        }
      }
      return;
    }

    if (where.reject) {
      if (!localDelivery.result) {
        return; // sendOnly, nowhere to send the rejection
      }
      const resolutions = harden([[localDelivery.result, true, where.reject]]);
      handleResolutions(resolutions);
      return;
    }

    assert.fail(X`unknown where ${where}`);
  }

  function sendToKernel(target, delivery) {
    const { method, args: localArgs, result: localResult } = delivery;
    const kernelTarget = provideKernelForLocal(target);
    const kernelArgs = mapDataToKernel(localArgs);
    const kernelResult = provideKernelForLocalResult(localResult);
    syscall.send(kernelTarget, method, kernelArgs, kernelResult);
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
      insistLocalType('promise', localResult);
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
    const [[primaryLpid]] = resolutions;
    const { subscribers, kernelIsSubscribed } = getPromiseSubscribers(
      primaryLpid,
    );
    for (const resolution of resolutions) {
      const [lpid, rejected, data] = resolution;
      // rejected: boolean, data: capdata
      insistCapData(data);
      insistLocalType('promise', lpid);
      insistPromiseIsUnresolved(lpid);
      insistDeciderIsComms(lpid);

      // mark it as resolved in the promise table, so later messages to it will
      // be handled properly
      markPromiseAsResolved(lpid, rejected, data);
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
      // the kernel now forgets this lpid: the p.resolved flag in
      // promiseTable reminds provideKernelForLocal to use a fresh LPID if we
      // ever reference it again in the future
    }
  }

  function resolveToRemote(remoteID, resolutions) {
    const msgs = [];
    for (const resolution of resolutions) {
      const [lpid, rejected, data] = resolution;

      const rpid = getRemoteForLocal(remoteID, lpid);
      // rpid should be rp+NN
      insistRemoteType('promise', rpid);
      // assert(parseRemoteSlot(rpid).allocatedByRecipient, rpid); // rp+NN for them
      function mapSlots() {
        const { slots } = data;
        let ss = slots.map(s => provideRemoteForLocal(remoteID, s)).join(':');
        if (ss) {
          ss = `:${ss}`;
        }
        return ss;
      }

      const rejectedTag = rejected ? 'reject' : 'fulfill';
      // prettier-ignore
      msgs.push(`resolve:${rejectedTag}:${rpid}${mapSlots()};${data.body}`);
    }
    transmit(remoteID, msgs.join('\n'));
  }

  function resolveToKernel(localResolutions) {
    const resolutions = [];
    for (const localResolution of localResolutions) {
      const [lpid, rejected, data] = localResolution;
      const kfpid = provideKernelForLocal(lpid);
      resolutions.push([kfpid, rejected, mapDataToKernel(data)]);
    }
    syscall.resolve(resolutions);
  }

  return harden({
    sendFromKernel,
    resolveFromKernel,
    messageFromRemote,
    mapDataFromKernel,
    resolveToRemote,
  });
}
