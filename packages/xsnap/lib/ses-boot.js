import './deep-freeze-tame.js';
import './console-shim.js';
import './text-shim.js';
import '@agoric/eventual-send/shim.js';
import './lockdown-shim.js';

harden(console);
