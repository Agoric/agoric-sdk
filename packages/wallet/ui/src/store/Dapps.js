import {
  maybeLoad,
  maybeSave,
  watchKey,
  DAPPS_STORAGE_KEY,
} from '../util/storage.js';

export const loadDapps = (chainId, address) =>
  maybeLoad([DAPPS_STORAGE_KEY, chainId, address]) ?? [];

export const loadDapp = (chainId, address, origin) =>
  loadDapps(chainId, address).find(d => d.origin === origin);

export const upsertDapp = (chainId, address, dapp) => {
  const { origin, isEnabled, petname } = dapp;

  const dapps = loadDapps(chainId, address);
  maybeSave(
    [DAPPS_STORAGE_KEY, chainId, address],
    [...dapps.filter(d => d.origin !== origin), { origin, isEnabled, petname }],
  );
};

export const removeDapp = (chainId, address, origin) => {
  const dapps = loadDapps();
  maybeSave(
    [DAPPS_STORAGE_KEY, chainId, address],
    dapps.filter(d => d.origin !== origin),
  );
};

export const watchDapps = (chainId, address, onChange) => {
  watchKey([DAPPS_STORAGE_KEY, chainId, address], newDapps =>
    onChange(newDapps ?? []),
  );
};
