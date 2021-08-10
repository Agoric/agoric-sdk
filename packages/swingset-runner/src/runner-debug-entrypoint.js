#!/usr/bin/env -S node --inspect-brk

/**
 * Simple boilerplate program providing linkage to launch an application written using modules within the
 * as yet not-entirely-ESM-supporting version of NodeJS.
 */

// LMDB bindings need to be imported before lockdown.
import 'node-lmdb';

// Now do lockdown.
import './install-optional-metering-and-ses.js';
import { main } from './main.js';

main();
