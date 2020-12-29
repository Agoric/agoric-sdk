/* global globalThis, print */

import { makeConsole } from './console';

globalThis.console = makeConsole(print);
