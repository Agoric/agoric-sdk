// import { kdebug, onToggleDebug } from '../lib/kdebug.js';
import { parseKernelSlot } from './parseKernelSlots.js';

// let debugEnabled = false;
// onToggleDebug(newEnableDebug => { debugEnabled = newEnableDebug; });

export function getKpidsToRetire(kernelKeeper, rootKPID, rootKernelData) {
  const seen = new Set();
  function scanKernelPromise(kpid, kernelData) {
    // debugEnabled && kdebug(`### scanning ${kpid} ${JSON.stringify(kernelData)}`);
    seen.add(kpid);
    if (kernelData) {
      for (const slot of kernelData.slots) {
        const { type } = parseKernelSlot(slot);
        // debugEnabled && kdebug(`## examine ${kpid} slot ${slot}`);
        if (type === 'promise') {
          if (!seen.has(slot)) {
            const kp = kernelKeeper.getKernelPromise(slot);
            const { data, state } = kp;
            // debugEnabled && kdebug(`## state of ${slot} is: ${JSON.stringify(kp)}`);
            if (state !== 'unresolved') {
              if (data) {
                scanKernelPromise(slot, data);
              }
            } else {
              // debugEnabled && kdebug(`## ${slot} is still unresolved`);
            }
          } else {
            // debugEnabled && kdebug(`## ${slot} previously seen`);
          }
        } else {
          // debugEnabled && kdebug(`## ${slot} is not a promise`);
        }
      }
    } else {
      // debugEnabled && kdebug(`## ${kpid} has no data`);
    }
  }
  // debugEnabled && kdebug(`## scanning ${rootKPID}`);
  scanKernelPromise(rootKPID, rootKernelData);
  return Array.from(seen);
}
