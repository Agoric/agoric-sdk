/* eslint-env node */
import { execFileSync } from 'child_process';
import { LOCAL_CONFIG as networkConfig } from '@agoric/client-utils';
import { makeWalletUtils } from './wallet.js';

export { networkConfig };

/**
 * Resolve after a delay in milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

export const walletUtils = await makeWalletUtils(
  { execFileSync, delay, fetch },
  networkConfig,
);
