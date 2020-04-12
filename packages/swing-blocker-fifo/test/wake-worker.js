// @ts-check
import { parentPort } from 'worker_threads';
import { register as registerFifo } from '../fifoSwingBlocker.js';
import { registerBlocker, getUnblockerFromMeta } from '@agoric/swing-blocker';

registerFifo(registerBlocker);

parentPort.on('message', ([delay, meta]) => {
  const unblocker = getUnblockerFromMeta(meta);
  parentPort.postMessage('waiting');
  setTimeout(unblocker, delay);
});
