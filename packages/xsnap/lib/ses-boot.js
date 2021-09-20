import { setQuote } from './console-shim.js';
import '@agoric/eventual-send/shim.js';
import './lockdown-shim.js';

setQuote(assert.quote);

harden(console);
