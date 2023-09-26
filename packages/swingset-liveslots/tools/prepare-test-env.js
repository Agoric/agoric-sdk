/**
 * Prepare Agoric SwingSet vat global environment for testing.
 *
 * Installs Hardened JS (and does lockdown), plus adds mocks for virtual objects
 * and stores.
 */

import '@agoric/internal/src/install-ses-debug.js';

import { reincarnate } from './setup-vat-data.js';

// Install the VatData globals.
reincarnate();
