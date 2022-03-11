import { setObjectInspector } from './console-shim.js';
import '@endo/init';
import objectInspect from './object-inspect.js';

setObjectInspector(objectInspect);

harden(console);
