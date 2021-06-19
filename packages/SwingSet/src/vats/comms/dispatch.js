import { assert, details as X } from '@agoric/assert';
import {
  makeVatSlot,
  insistVatType,
  parseVatSlot,
} from '../../parseVatSlots.js';
import { insistMessage } from '../../message.js';
import { makeState } from './state.js';
import { deliverToController } from './controller.js';
import { insistCapData } from '../../capdata.js';

import { makeCListKit } from './clist.js';
import { makeDeliveryKit } from './delivery.js';
import { cdebug } from './cdebug.js';

export const debugState = new WeakMap();

export function buildCommsDispatch(
  syscall,
  _state,
  _helpers,
  _vatPowers,
  vatParameters = {},
) {
  const { identifierBase = 0, sendExplicitSeqNums = true } = vatParameters;
  const state = makeState(syscall, identifierBase);
  const clistKit = makeCListKit(state, syscall);

  function transmit(remoteID, msg) {
    const remote = state.getRemote(remoteID);
    // the vat-tp "integrity layer" is a regular vat, so it expects an argument
    // encoded as JSON
    const seqNum = sendExplicitSeqNums ? remote.nextSendSeqNum() : '';
    remote.advanceSendSeqNum();
    const ackSeqNum = remote.lastReceivedSeqNum();
    const args = harden({
      body: JSON.stringify([`${seqNum}:${ackSeqNum}:${msg}`]),
      slots: [],
    });
    syscall.send(remote.transmitterID(), 'transmit', args); // sendOnly
  }

  const deliveryKit = makeDeliveryKit(state, syscall, transmit, clistKit);

  const { sendFromKernel, resolveFromKernel, messageFromRemote } = deliveryKit;

  // our root object (o+0) is the Comms Controller
  const controller = makeVatSlot('object', true, 0);

  let needToInitializeState = true;

  function initializeState() {
    state.initialize();
    state.addMetaObject(controller);
    cdebug(`comms controller is ${controller}`);
    needToInitializeState = false;
  }

  function doDeliver(target, method, args, result) {
    if (needToInitializeState) {
      initializeState();
    }
    // console.debug(`comms.deliver ${target} r=${result}`);
    insistCapData(args);

    if (target === controller) {
      return deliverToController(
        state,
        clistKit,
        method,
        args,
        result,
        syscall,
      );
    }

    const remoteID = state.getRemoteReceiver(target);
    if (remoteID) {
      // XXX TODO DANGER DANGER WARNING DANGER VERY BAD BADNESS FIX ASAP OH NOES
      // The following try/catch intercepts errors triggered by badly
      // constructed or badly parameterized messages from the remote, and logs
      // them instead of allowing them to propagate upward and kill the vat.
      // Ideally, such conditions should just kill the connection to the remote,
      // but we don't yet have the means set up to do that kind of selective
      // disablement.  MORE IMPORTANTLY, HOWEVER, this try/catch will actually
      // intercept ALL errors generated in the processing of the remote message,
      // including ones that aren't the remote's fault and including ones that
      // really should kill the vat.  Unfortunately, pretty much all such error
      // checking is currently done via calls to `assert` or one of its
      // siblings, which doesn't distinguish the appropriate scope of punishment
      // for any transgression.  This blind sledgehammer approach needs to be
      // replaced with a more discriminating mechanism.  Until that is done, the
      // comms vat remains at risk of inconsistency due to internal errors.
      // Moreover, if an individual remote connection gets into an inconsistent
      // state due to misbehavior on the other end, we have no way to kill that
      // connection and thus we risk whatever weirdness may ensue from the
      // remote continuing to think everything's ok (and behaving accordingly)
      // when it's not.  All of this should be fixed soon as practicable.
      // DANGER WILL ROBINSON CASE NIGHTMARE GREEN ELDRITCH HORRORS OH THE HUMANITY
      try {
        assert(method === 'receive', X`unexpected method ${method}`);
        // the vat-tp integrity layer is a regular vat, so when they send the
        // received message to us, it will be embedded in a JSON array
        const message = JSON.parse(args.body)[0];
        return messageFromRemote(remoteID, message, result);
      } catch (err) {
        console.log('WARNING: delivery from remote triggered error:', err);
        console.log(`Error happened while processing "${args.body}"`);
        return undefined;
      }
    }

    // If we get to this point, the message is not being delivered to a
    // meta-object and so `sendFromKernel()` can proceed with translating the
    // message into local space and processing it.  However, since a message to
    // a meta-object never reaches this translation step, it means that neither
    // a PromiseTable entry nor a local promise ID are ever allocated for such a
    // message's `result` parameter.  If the kernel were to pipeline a
    // subsequent message to that result, that message could, in principle,
    // arrive at this point in the code without there being any local entity to
    // deliver it *to*.  If this were to happen, `sendFromKernel()` would throw
    // an exception when it fails to translate the message target, and
    // consequently kill the vat.  Fortunately, we don't believe any special
    // handling is required for this eventuality because it should never happen:
    // (1) `messageFromRemote()` does not make use of the result parameter at
    // all, and (2) `deliverToController()` always resolves the result with a
    // direct `syscall.resolve()` call in the same crank, short-circuiting the
    // kernel's pipeline delivery mechanism.  If such a case *does* happen, it
    // can only be the result of a kernel bug (i.e., the pipeline short-circuit
    // logic malfunctioned) or a bug in one of the comms controller object's
    // method handlers (i.e., it failed to resolve the result in the same
    // crank).  The resulting abrupt comms vat termination should serve as a
    // diagnostic signal that we have a bug that must be corrected.

    args.slots.map(s =>
      assert(
        !state.hasMetaObject(s),
        X`comms meta-object ${s} not allowed in message args`,
      ),
    );
    return sendFromKernel(target, method, args, result);
  }

  function deliver(target, method, args, resultP) {
    const result = doDeliver(target, method, args, resultP);
    state.processMaybeFree();
    return result;
  }

  function notify(resolutions) {
    resolveFromKernel(resolutions);
    state.processMaybeFree();
  }

  function dropExports(vrefs) {
    assert(Array.isArray(vrefs));
    vrefs.map(vref => insistVatType('object', vref));
    vrefs.map(vref => assert(parseVatSlot(vref).allocatedByVat));
    // console.log(`-- comms ignoring dropExports`);
  }

  function retireExports(vrefs) {
    assert(Array.isArray(vrefs));
    vrefs.map(vref => insistVatType('object', vref));
    vrefs.map(vref => assert(parseVatSlot(vref).allocatedByVat));
    // console.log(`-- comms ignoring retireExports`);
  }

  function retireImports(vrefs) {
    assert(Array.isArray(vrefs));
    vrefs.map(vref => insistVatType('object', vref));
    vrefs.map(vref => assert(!parseVatSlot(vref).allocatedByVat));
    // console.log(`-- comms ignoring retireImports`);
  }

  function dispatch(vatDeliveryObject) {
    const [type, ...args] = vatDeliveryObject;
    switch (type) {
      case 'message': {
        const [targetSlot, msg] = args;
        insistMessage(msg);
        deliver(targetSlot, msg.method, msg.args, msg.result);
        return;
      }
      case 'notify': {
        const [resolutions] = args;
        notify(resolutions);
        return;
      }
      case 'dropExports': {
        const [vrefs] = args;
        dropExports(vrefs);
        return;
      }
      case 'retireExports': {
        const [vrefs] = args;
        retireExports(vrefs);
        break;
      }
      case 'retireImports': {
        const [vrefs] = args;
        retireImports(vrefs);
        break;
      }
      default:
        assert.fail(X`unknown delivery type ${type}`);
    }
  }
  harden(dispatch);

  debugState.set(dispatch, { state, clistKit });

  return dispatch;
}
