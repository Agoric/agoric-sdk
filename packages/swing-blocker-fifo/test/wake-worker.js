// @ts-check
import { parentPort } from 'worker_threads';
import { registerBlocker, getUnblockerFromMeta } from '@agoric/swing-blocker';
import { register as registerFifo } from '../fifoSwingBlocker.js';

registerFifo(registerBlocker);

parentPort.on('message', ([delay, meta]) => {
  const unblocker = getUnblockerFromMeta(meta);
  parentPort.postMessage('waiting');
  setTimeout(unblocker, delay);
});
