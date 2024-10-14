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

export const walletUtils = await makeWalletUtils(
  { delay, execFileSync, fetch },
  networkConfig,
);

export const waitUntil = async timestamp => {
  const timeDelta = Math.floor(Date.now() / 1000) - Number(timestamp);
  await delay(timeDelta);
};
