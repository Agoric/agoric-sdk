// @ ts-check
import {
  maybeLoad,
  maybeSave,
  watchKey,
  DAPPS_STORAGE_KEY,
} from '../util/storage.js';

/**
 * @typedef {{ origin: string, chainId: string, address: string }} DappKey
 */

/**
 * @typedef {{ origin: string, isEnabled?: boolean, petname: string }} Dapp
 */

/**
 * @param {string} chainId
 * @param {string} address
 * @returns {Dapp[]}
 */
export const loadDapps = (chainId, address) =>
  maybeLoad([DAPPS_STORAGE_KEY, chainId, address]) ?? [];

export const loadDapp = (/** @type {DappKey} */ { chainId, address, origin }) =>
  loadDapps(chainId, address).find(d => d.origin === origin);

export const upsertDapp = (
  /** @type {string} */ chainId,
  /** @type {string} */ address,
  /** @type {Dapp} */ dapp,
) => {
  const { origin, isEnabled, petname } = dapp;

  const dapps = loadDapps(chainId, address);
  maybeSave(
    [DAPPS_STORAGE_KEY, chainId, address],
    [...dapps.filter(d => d.origin !== origin), { origin, isEnabled, petname }],
  );
};

export const removeDapp = (
  /** @type {DappKey} */ { chainId, address, origin },
) => {
  const dapps = loadDapps();
  maybeSave(
    [DAPPS_STORAGE_KEY, chainId, address],
    dapps.filter(d => d.origin !== origin),
  );
};

export const watchDapps = (
  /** @type {string} */ chainId,
  /** @type {string} */ address,
  /** @type {(newDapps: Dapps[]) => void} */ onChange,
) => {
  watchKey([DAPPS_STORAGE_KEY, chainId, address], newDapps =>
    onChange(newDapps ?? []),
  );
};
