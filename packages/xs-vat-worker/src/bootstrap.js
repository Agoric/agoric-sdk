/* global globalThis, print, harden, onMessage, sysCall */

import './console-shim';
import './text-shim';
import './lockdown-shim';

import { main } from './vatWorker';

harden(console);

console.log(sysCall);

globalThis.onMessage = main(sysCall);
