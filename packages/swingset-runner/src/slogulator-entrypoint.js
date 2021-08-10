#!/usr/bin/env -S node

/**
 * Simple boilerplate program providing linkage to launch an application written using modules within the
 * as yet not-entirely-ESM-supporting version of NodeJS.
 */
import '@agoric/install-ses';
import { main } from './slogulator.js';

main();
