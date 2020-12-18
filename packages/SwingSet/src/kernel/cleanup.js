// import { kdebug } from './kdebug';
import { parseKernelSlot } from './parseKernelSlots';

// XXX temporary flags to control features during development
const ENABLE_PROMISE_ANALYSIS = true; // flag to enable/disable check to see if delete clist entry is ok

export function deleteCListEntryIfEasy(
  vatID,
  vatKeeper,
  kernelKeeper,
  kpid,
  vpid,
  kernelData,
) {
  if (ENABLE_PROMISE_ANALYSIS) {
    const visited = new Set();
    let sawPromise;

    function scanKernelPromise(scanKPID, scanKernelData) {
      visited.add(scanKPID);
      // kdebug(`@@@ scan ${scanKPID} ${JSON.stringify(scanKernelData)}`);
      if (scanKernelData) {
        for (const slot of scanKernelData.slots) {
          const { type } = parseKernelSlot(slot);
          if (type === 'promise') {
            sawPromise = slot;
            if (visited.has(slot)) {
              // kdebug(`@@@ ${slot} previously visited`);
              return true;
            } else {
              const { data } = kernelKeeper.getKernelPromise(slot);
              // const { data, state } = kernelKeeper.getKernelPromise(slot);
              if (data) {
                if (scanKernelPromise(slot, data)) {
                  // kdebug(`@@@ scan ${slot} detects circularity`);
                  return true;
                }
              } else {
                // kdebug(`@@@ scan ${slot} state = ${state}`);
              }
            }
          }
        }
      }
      // kdebug(`@@@ scan ${scanKPID} detects no circularity`);
      return false;
    }

    // kdebug(`@@ checking ${vatID} ${kpid} for circularity`);
    if (scanKernelPromise(kpid, kernelData)) {
      // kdebug(
      //  `Unable to delete ${vatID} clist entry ${kpid}<=>${vpid} because it is indirectly self-referential`,
      // );
      return;
    } else if (sawPromise) {
      // kdebug(
      //  `Unable to delete ${vatID} clist entry ${kpid}<=>${vpid} because there was a contained promise ${sawPromise}`,
      // );
      return;
    }
  }
  vatKeeper.deleteCListEntry(kpid, vpid);
}

export function getKpidsToRetire(
  vatID,
  vatKeeper,
  kernelKeeper,
  rootKPID,
  rootKernelData,
) {
  const seen = new Set();
  function scanKernelPromise(kpid, kernelData) {
    // kdebug(`### scanning ${kpid} ${JSON.stringify(kernelData)}`);
    if (vatKeeper.hasCListEntry(kpid)) {
      // kdebug(`## adding ${kpid} to scan results`);
      seen.add(kpid);
      if (kernelData) {
        for (const slot of kernelData.slots) {
          const { type } = parseKernelSlot(slot);
          // kdebug(`## examine ${kpid} slot ${slot}`);
          if (type === 'promise') {
            if (!seen.has(slot)) {
              const kp = kernelKeeper.getKernelPromise(slot);
              const { data, state } = kp;
              // kdebug(`## state of ${slot} is: ${JSON.stringify(kp)}`);
              if (state !== 'unresolved') {
                if (data) {
                  scanKernelPromise(slot, data);
                }
              } else {
                // kdebug(`## ${slot} is still unresolved`);
              }
            } else {
              // kdebug(`## ${slot} previously seen`);
            }
          } else {
            // kdebug(`## ${slot} is not a promise`);
          }
        }
      } else {
        // kdebug(`## ${kpid} has no data`);
      }
    } else {
      // kdebug(`## ${kpid} has no c-list entry for ${vatID}`);
    }
  }

  scanKernelPromise(rootKPID, rootKernelData);
  return Array.from(seen);
}
