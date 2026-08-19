/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * Installs Hardened JS (and does lockdown), plus adds mocks for virtual objects
 * and stores.
 */
/* global globalThis */

import '@agoric/internal/src/install-ses-debug.js';

import { reincarnate } from './setup-vat-data.js';

// Install the VatData globals.
reincarnate();

// In-process ('local' manager type) vats already share this process's own
// debug (`errorTaming: 'unsafe'`) lockdown, installed above, so their
// assertion messages are unredacted. Real xsnap workers otherwise always get
// the production (safe/redacted) lockdown, since they boot in their own
// process with their own independent lockdown call -- see
// `packages/SwingSet/src/controller/bundle-handler.js`'s `makeXsnapBundleData`.
// Set this so xsnap workers spawned by this test process match, instead of
// only being informative under 'local'.
// eslint-disable-next-line no-underscore-dangle -- conventional marker for an internal-use-only global
globalThis.__XSNAP_LOCKDOWN_DEBUG__ = true;
