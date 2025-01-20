/* eslint-env node */
import { makeSmartWalletKit, LOCAL_CONFIG } from '@agoric/client-utils';
import { execFileSync } from 'child_process';
import { makeAgdWalletKit } from './wallet.js';

export const networkConfig = LOCAL_CONFIG;

/**
 * Resolve after a delay in milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

export const smartWalletKit = await makeSmartWalletKit(
  { delay, fetch },
  networkConfig,
);

export const agdWalletUtils = await makeAgdWalletKit(
  { execFileSync, smartWalletKit, delay },
  networkConfig,
);
