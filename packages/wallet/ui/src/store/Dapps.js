// @ ts-check
import {
  maybeLoad,
  maybeSave,
  watchKey,
  DAPPS_STORAGE_KEY,
} from '../util/storage.js';

/**
 * @typedef {{ chainId: string, address: string }} SmartWalletKey
 */

/**
 * @typedef {{ origin: string, smartWalletKey: SmartWalletKey}} DappKey
 */

/**
 * @typedef {{ origin: string, isEnabled?: boolean, petname: string }} Dapp
 */

/**
 * @param {SmartWalletKey} smartWalletKey
 * @returns {Dapp[]}
 */
export const loadDapps = ({ chainId, address }) =>
  maybeLoad([DAPPS_STORAGE_KEY, chainId, address]) ?? [];

export const loadDapp = (/** @type {DappKey} */ { smartWalletKey, origin }) =>
  loadDapps(smartWalletKey).find(d => d.origin === origin);

export const upsertDapp = (
  /** @type {SmartWalletKey} */ { chainId, address },
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
  /** @type {DappKey} */ { smartWalletKey: { chainId, address }, origin },
) => {
  const dapps = loadDapps({ chainId, address });
  maybeSave(
    [DAPPS_STORAGE_KEY, chainId, address],
    dapps.filter(d => d.origin !== origin),
  );
};

export const watchDapps = (
  /** @type {SmartWalletKey} */ { chainId, address },
  /** @type {(newDapps: Dapp[]) => void} */ onChange,
) => {
  watchKey([DAPPS_STORAGE_KEY, chainId, address], newDapps =>
    onChange(newDapps ?? []),
  );
};
