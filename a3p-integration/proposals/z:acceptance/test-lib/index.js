/* eslint-env node */
import { makeWalletUtils, LOCAL_CONFIG } from '@agoric/client-utils';
import { execFileSync } from 'child_process';
import { makeAgdWalletUtils } from './wallet.js';

export const networkConfig = LOCAL_CONFIG;

/**
 * Resolve after a delay in milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

export const walletUtils = await makeWalletUtils(
  { delay, fetch },
  networkConfig,
);

export const agdWalletUtils = await makeAgdWalletUtils(
  { execFileSync, setTimeout, walletUtils },
  networkConfig,
);
