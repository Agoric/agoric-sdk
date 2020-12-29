/* global print */

import { makeConsole } from './console';

// eslint-disable-next-line no-restricted-globals
globalThis.console = makeConsole(print);
