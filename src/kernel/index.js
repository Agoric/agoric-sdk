import harden from '@agoric/harden';
import p2 from './p2.js';

export default function buildKernel(kernelEndowments) {
  console.log('in buildKernel', kernelEndowments);
  const foo = p2();

  const runQueue = [];

  const controller = harden({
    dumpSlots() {
      return {};
    },

    run() {
      // process all messages, until syscall.pause() is invoked
      return;
    },

    step() {
      // process a single message
      return;
    },

    queue(vatID, facetID, argsString) {
      // queue a message on the end of the queue. Use 'step' or 'run' to
      // execute it
      runQueue.push({ vatID: `${vatID}`,
                      facetID: `${facetID}`,
                      argsString: `${argsString}`,
                    });
      return;
    },
  });

  return controller;
}
