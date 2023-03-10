// import { kdebug, debugging } from '../lib/kdebug.js';
import { parseKernelSlot } from './parseKernelSlots.js';

export function getKpidsToRetire(kernelKeeper, rootKPID, rootKernelData) {
  const seen = new Set();
  function scanKernelPromise(kpid, kernelData) {
    // debugging() && kdebug(`### scanning ${kpid} ${JSON.stringify(kernelData)}`);
    seen.add(kpid);
    if (kernelData) {
      for (const slot of kernelData.slots) {
        const { type } = parseKernelSlot(slot);
        // debugging() && kdebug(`## examine ${kpid} slot ${slot}`);
        if (type === 'promise') {
          if (!seen.has(slot)) {
            const kp = kernelKeeper.getKernelPromise(slot);
            const { data, state } = kp;
            // debugging() && kdebug(`## state of ${slot} is: ${JSON.stringify(kp)}`);
            if (state !== 'unresolved') {
              if (data) {
                scanKernelPromise(slot, data);
              }
            } else {
              // debugging() && kdebug(`## ${slot} is still unresolved`);
            }
          } else {
            // debugging() && kdebug(`## ${slot} previously seen`);
          }
        } else {
          // debugging() && kdebug(`## ${slot} is not a promise`);
        }
      }
    } else {
      // debugging() && kdebug(`## ${kpid} has no data`);
    }
  }
  // debugging() && kdebug(`## scanning ${rootKPID}`);
  scanKernelPromise(rootKPID, rootKernelData);
  return Array.from(seen);
}
