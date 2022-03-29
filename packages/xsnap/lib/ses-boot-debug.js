import { setObjectInspector } from './console-shim.js';
import '@endo/init/debug.js';
import confinedObjectInspect from './confined-object-inspect.js';

setObjectInspector(confinedObjectInspect);

harden(console);
