// @ts-check
import { parentPort } from 'worker_threads';
import { registerBlocker, getUnblocker } from '@agoric/swing-blocker';
import { register as registerFifo } from '../fifoSwingBlocker.js';

registerFifo(registerBlocker);

parentPort.on('message', ([delay, spec]) => {
  const unblocker = getUnblocker(spec);
  parentPort.postMessage('waiting');
  setTimeout(unblocker, delay);
});
