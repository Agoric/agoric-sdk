/* global fetch setTimeout */
import { execFileSync } from 'child_process';
import { makeWalletUtils } from './wallet.js';

export const networkConfig = {
  rpcAddrs: ['http://0.0.0.0:26657'],
  chainName: 'agoriclocal',
};

/**
 * Resolve after a delay in milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

// eslint-disable-next-line @jessie.js/safe-await-separator -- buggy version
export const walletUtils = await makeWalletUtils(
  { delay, execFileSync, fetch },
  networkConfig,
);
