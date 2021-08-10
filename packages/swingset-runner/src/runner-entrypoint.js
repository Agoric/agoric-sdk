#!/usr/bin/env -S node

// #!/usr/bin/env -S node --inspect-brk

/**
 * Simple boilerplate program providing linkage to launch an application written using modules within the
 * as yet not-entirely-ESM-supporting version of NodeJS.
 */

// Initialize trasitive dependencies that run afoul of the property override
// after SES lockdown hazard.
import 'node-lmdb';
// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';

// Now do lockdown.
import './install-optional-metering-and-ses.js';
import { main } from './main.js';

main();
