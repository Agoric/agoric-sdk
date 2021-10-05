import { setQuote } from './console-shim.js';
import 'ses';
import '@agoric/eventual-send/shim.js';
import './lockdown-shim-debug.js';

setQuote(assert.quote);

harden(console);
