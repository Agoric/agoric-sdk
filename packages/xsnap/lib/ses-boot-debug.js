import { setObjectInspector } from './console-shim.js';
import '@endo/init/debug.js';
import objectInspect from './object-inspect.js';

setObjectInspector(objectInspect);

harden(console);
