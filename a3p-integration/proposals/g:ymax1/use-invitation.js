#!/usr/bin/env node
/** @file redeem ymaxControl invitation as was done on mainnet. */
// @ts-check
import '@endo/init/legacy.js'; // XXX axios

// Detect if this is run as a script.
import url from 'url';
import process from 'process';

import { redeemInvitation } from './ymax-util.js';

/** @param {string} href */
const isEntrypoint = href =>
  String(href) === url.pathToFileURL(process.argv[1] ?? '/').href;

if (isEntrypoint(import.meta.url)) {
  if (process.argv.length < 3) {
    console.log('Usage ./use-invitation.js <from-addr-or-name>');
    process.exitCode = 1;
  } else {
    await redeemInvitation(process.argv[2]);
  }
}
