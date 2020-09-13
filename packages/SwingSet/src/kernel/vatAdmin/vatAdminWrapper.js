/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must ensure that only data goes in and out. It's also responsible for turning
 * device affordances into objects that can be used by code in other vats.
 */
import { makePromiseKit } from '@agoric/promise-kit';

function producePRR() {
  const { promise, resolve, reject } = makePromiseKit();
  return [promise, { resolve, reject }];
}

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  const pending = new Map(); // vatID -> { resolve, reject } for promise
  const running = new Map(); // vatID -> { resolve, reject } for doneP

  function finishVatCreation(vatAdminNode, vatID) {
    const [promise, pendingRR] = producePRR();
    pending.set(vatID, pendingRR);

    const [doneP, doneRR] = producePRR();
    running.set(vatID, doneRR);
    doneP.catch(() => {}); // shut up false whine about unhandled rejection

    const adminNode = harden({
      terminate() {
        D(vatAdminNode).terminate(vatID);
      },
      adminData() {
        return D(vatAdminNode).adminStats(vatID);
      },
      done() {
        return doneP;
      },
    });
    return promise.then(root => {
      return { adminNode, root };
    });
  }

  function createVatAdminService(vatAdminNode) {
    return harden({
      createVat(code, options) {
        const vatID = D(vatAdminNode).create(code, options);
        return finishVatCreation(vatAdminNode, vatID);
      },
      createVatByName(bundleName, options) {
        const vatID = D(vatAdminNode).createByName(bundleName, options);
        return finishVatCreation(vatAdminNode, vatID);
      },
    });
  }

  // this message is queued to us by createVatDynamically
  function newVatCallback(vatID, results) {
    const { resolve, reject } = pending.get(vatID);
    pending.delete(vatID);
    if (results.rootObject) {
      resolve(results.rootObject);
    } else {
      reject(Error(`Vat Creation Error: ${results.error}`));
    }
  }

  // the kernel sends this when the vat halts
  function vatTerminated(vatID, error) {
    // 'error' is undefined if adminNode.terminate() killed it, else it
    // will be a RangeError from a metering fault
    const { resolve, reject } = running.get(vatID);
    running.delete(vatID);
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  }

  return harden({
    createVatAdminService,
    newVatCallback,
    vatTerminated,
  });
}
