/* global trace */

// eslint-disable-next-line import/no-unresolved
import Timer from '@moddable/timer';
// eslint-disable-next-line import/no-unresolved
import Resource from '@moddable/Resource';
import { makeHandledPromise } from '@agoric/eventual-send';

import { harden } from './src/harden';
import { makeConsole } from './src/console';
import { loadMain } from './src/endo-load';

// eslint-disable-next-line import/named
import { Reader, Writer } from './src-native/fdchan';

const INFD = 3;
const OUTFD = 4;

globalThis.console = harden(makeConsole(trace));

const compartmapROM = new Resource('compartmap.json');
const compartmap0 = JSON.parse(String.fromArrayBuffer(compartmapROM.slice(0)));

export default async function main() {
  const inStream = new Reader(INFD);
  const outStream = new Writer(OUTFD);

  const HandledPromise = makeHandledPromise();

  const c1 = loadMain(compartmap0, HandledPromise);
  console.log('about to import vatWorker');
  const vw = await c1.import('src/vatWorker');

  console.log('about to run vatWorker.main...');
  return vw.main({
    setImmediate: callback => {
      Timer.set(callback);
    },
    readMessage: () => inStream.read_netstring(),
    writeMessage: message => {
      // ISSUE: should be byte length
      outStream.write(`${message.length}:`, message, ',');
    },
  });
}
