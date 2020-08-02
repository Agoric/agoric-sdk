// add harden; align xs's Compartment with Agoric's
// ISSUE: use a different module name?
import '@agoric/install-ses';

import './console'; // sets globalThis.console. ew.
import './timer-ticks'; // globalThis.setTimeout. ew.

import { main as vatWorker } from './vatWorker';
import { Reader, Writer } from './fdchan';

const INFD = 3;
const OUTFD = 4;

export default async function main() {
  const inStream = new Reader(INFD);
  const outStream = new Writer(OUTFD);

  return vatWorker({
    setImmediate,
    readMessage: () => inStream.read_netstring(),
    writeMessage: message => {
      // ISSUE: should be byte length
      outStream.write(`${message.length}:`, message, ',');
    },
  });
}
