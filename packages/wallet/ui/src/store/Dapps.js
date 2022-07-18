import { maybeLoad, maybeSave } from '../util/storage.js';

const DAPPS_KEY_PREFIX = 'DAPPS';

export const loadDapps = publicAddress =>
  maybeLoad([DAPPS_KEY_PREFIX, publicAddress]) ?? [];

export const upsertDapp = (publicAddress, dapp) => {
  const { origin, enable, petname } = dapp;

  const dapps = loadDapps(publicAddress) ?? [];
  maybeSave(
    [DAPPS_KEY_PREFIX, publicAddress],
    [
      ...dapps.filter(d => d.origin !== origin),
      { origin, enable, petname, id: origin, meta: { id: origin } },
    ],
  );
};

export const removeDapp = (publicAddress, origin) => {
  const dapps = loadDapps(publicAddress) ?? [];
  maybeSave(
    [DAPPS_KEY_PREFIX, publicAddress],
    dapps.filter(d => d.origin !== origin),
  );
};
