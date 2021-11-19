import { setQuote } from './console-shim.js';
import '@agoric/install-ses';

setQuote(assert.quote);

harden(console);
