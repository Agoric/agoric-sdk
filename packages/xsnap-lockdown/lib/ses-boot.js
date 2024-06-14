// This file is only used to generate the published bundle, so
// @endo/init is in devDependencies (and this package should have no
// direct dependencies), but eslint doesn't know that, so disable the
// complaint.

/* eslint-disable import/no-extraneous-dependencies */

/// <reference types="ses" />

import { setObjectInspector } from './console-shim.js';
import '@endo/init';
import confinedObjectInspect from './confined-object-inspect.js';

setObjectInspector(confinedObjectInspect);

harden(console);
