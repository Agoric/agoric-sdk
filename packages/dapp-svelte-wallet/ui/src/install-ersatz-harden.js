/* global globalThis */

// Fake version of `harden` so agoric-cli can load both SES-demanding and
// SES-incompatible modules until we get around to doing without the latter.

import rawHarden from '@agoric/harden';

globalThis.harden = rawHarden;
