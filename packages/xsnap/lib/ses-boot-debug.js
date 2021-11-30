import { setQuote } from './console-shim.js';
import '@agoric/install-ses/debug.js';

setQuote(assert.quote);

harden(console);
