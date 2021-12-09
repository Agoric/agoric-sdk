#!/usr/bin/env node

// #!/usr/bin/env -S node --inspect-brk

/**
 * Simple boilerplate program providing linkage to launch an application written using modules within the
 * as yet not-entirely-ESM-supporting version of NodeJS.
 */

import '@agoric/install-ses/pre-bundle-source.js';

// Initialize trasitive dependencies that run afoul of the property override
// after SES lockdown hazard.
import 'node-lmdb';

// Now do lockdown.
import '@agoric/install-ses';
import { main } from './main.js';

main();
