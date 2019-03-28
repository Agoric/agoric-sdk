import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function makeVatManager(vatID, syscallManager) {
  const {
    kdebug,
    mapOutbound,
    mapInbound,
    createPromiseWithDecider,
    send,
    kernelPromises,
    runQueue,
    fulfillToData,
    fulfillToTarget,
    reject,
    log,
  } = syscallManager;

  function syscallForVatID(fromVatID) {
    return harden({
      send(targetSlot, method, argsString, vatSlots) {
        if (targetSlot.type === undefined) {
          throw new Error(
            `targetSlot isn't really a slot ${JSON.stringify(targetSlot)}`,
          );
        }
        const target = mapOutbound(fromVatID, targetSlot);
        if (!target) {
          throw Error(
            `unable to find target for ${fromVatID}/${targetSlot.type}-${
              targetSlot.id
            }`,
          );
        }
        kdebug(
          `syscall[${fromVatID}].send(vat:${JSON.stringify(
            targetSlot,
          )}=ker:${JSON.stringify(target)}).${method}`,
        );
        const slots = vatSlots.map(slot => mapOutbound(fromVatID, slot));
        // who will decide the answer? If the message is being queued for a
        // promise, then the kernel will decide (when the answer gets
        // resolved). If it is going to a specific export, the exporting vat
        // gets to decide.
        let decider;
        if (target.type === 'export') {
          decider = target.vatID;
        }
        kdebug(`  ^target is ${JSON.stringify(target)}`);
        const kernelPromiseID = createPromiseWithDecider(decider);
        const msg = {
          method,
          argsString,
          slots,
          kernelResolverID: kernelPromiseID,
        };
        send(target, msg);
        const p = mapInbound(fromVatID, {
          type: 'promise',
          id: kernelPromiseID,
        });
        return p.id; // relative to caller
      },

      createPromise() {
        const kernelPromiseID = createPromiseWithDecider(fromVatID);
        const p = mapInbound(fromVatID, {
          type: 'promise',
          id: kernelPromiseID,
        });
        const r = mapInbound(fromVatID, {
          type: 'resolver',
          id: kernelPromiseID,
        });
        kdebug(
          `syscall[${fromVatID}].createPromise -> (vat:p${p.id}/r${
            r.id
          }=ker:${kernelPromiseID})`,
        );
        return harden({ promiseID: p.id, resolverID: r.id });
      },

      subscribe(promiseID) {
        const { id } = mapOutbound(fromVatID, {
          type: 'promise',
          id: promiseID,
        });
        kdebug(`syscall[${fromVatID}].subscribe(vat:${promiseID}=ker:${id})`);
        if (!kernelPromises.has(id)) {
          throw new Error(`unknown kernelPromise id '${id}'`);
        }
        const p = kernelPromises.get(id);
        /*
        kdebug(`  decider is ${p.decider} in ${JSON.stringify(p)}`);
        if (p.subscribers.size === 0 && p.decider !== undefined) {
          runQueue.push({
            type: 'subscribe',
            vatID: p.decider,
            kernelPromiseID: id,
          });
        } */

        if (p.state === 'unresolved') {
          p.subscribers.add(fromVatID);
          // otherwise it's already resolved, you probably want to know how
        } else if (p.state === 'fulfilledToTarget') {
          runQueue.push({
            type: 'notifyFulfillToTarget',
            vatID: fromVatID,
            kernelPromiseID: id,
          });
        } else if (p.state === 'fulfilledToData') {
          runQueue.push({
            type: 'notifyFulfillToData',
            vatID: fromVatID,
            kernelPromiseID: id,
          });
        } else if (p.state === 'rejected') {
          runQueue.push({
            type: 'notifyReject',
            vatID: fromVatID,
            kernelPromiseID: id,
          });
        } else {
          throw new Error(`unknown p.state '${p.state}'`);
        }
      },

      /*
      redirect(resolverID, targetPromiseID) {
        const { id } = mapOutbound(fromVatID, { type: 'resolver', id: resolverID });
        if (!kernelPromises.has(id)) {
          throw new Error(`unknown kernelPromise id '${id}'`);
        }
        const p = kernelPromises.get(id);
        if (p.state !== 'unresolved') {
          throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
        }

        let { id: targetID } = mapOutbound(fromVatID, { type: 'promise', id: targetPromiseID });
        if (!kernelPromises.has(targetID)) {
          throw new Error(`unknown kernelPromise id '${targetID}'`);
        }

        targetID = chaseRedirections(targetID);
        const target = kernelPromises.get(targetID);

        for (let s of p.subscribers) {
          // TODO: we need to remap their subscriptions, somehow
        }

        p.state = 'redirected';
        delete p.decider;
        const subscribers = p.subscribers;
        delete p.subscribers;
        p.redirectedTo = targetID;
        if (p.state !== 'unresolved') {
          throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
        }
      },
      */

      fulfillToData(resolverID, fulfillData, vatSlots) {
        Nat(resolverID);
        const { id } = mapOutbound(fromVatID, {
          type: 'resolver',
          id: resolverID,
        });
        if (!kernelPromises.has(id)) {
          throw new Error(`unknown kernelPromise id '${id}'`);
        }
        const slots = vatSlots.map(slot => mapOutbound(fromVatID, slot));
        kdebug(
          `syscall[${fromVatID}].fulfillData(vatid=${resolverID}/kid=${id}) = ${fulfillData} v=${JSON.stringify(
            vatSlots,
          )}/k=${JSON.stringify(slots)}`,
        );
        fulfillToData(id, fulfillData, slots);
      },

      fulfillToTarget(resolverID, slot) {
        Nat(resolverID);
        const { id } = mapOutbound(fromVatID, {
          type: 'resolver',
          id: resolverID,
        });
        if (!kernelPromises.has(id)) {
          throw new Error(`unknown kernelPromise id '${id}'`);
        }

        const targetSlot = mapOutbound(fromVatID, slot);
        kdebug(
          `syscall[${fromVatID}].fulfillToTarget(vatid=${resolverID}/kid=${id}) = vat:${JSON.stringify(
            targetSlot,
          )}=ker:${id})`,
        );
        fulfillToTarget(id, targetSlot);
      },

      reject(resolverID, rejectData, vatSlots) {
        Nat(resolverID);
        const { id } = mapOutbound(fromVatID, {
          type: 'resolver',
          id: resolverID,
        });
        if (!kernelPromises.has(id)) {
          throw new Error(`unknown kernelPromise id '${id}'`);
        }
        const slots = vatSlots.map(slot => mapOutbound(fromVatID, slot));
        kdebug(
          `syscall[${fromVatID}].reject(vatid=${resolverID}/kid=${id}) = ${rejectData} v=${JSON.stringify(
            vatSlots,
          )}/k=${JSON.stringify(slots)}`,
        );
        reject(id, rejectData, slots);
      },

      log(str) {
        log.push(`${str}`);
      },
    });
    // TODO: since we pass this in on each deliver() call, consider
    // destroying this object after each delivery, to discourage vat code
    // from retaining it. OTOH if we don't expect to ever change it, that's
    // wasteful and limiting.
  }

  const syscall = syscallForVatID(vatID);
  const manager = { syscall };
  return manager;
}
