// @ts-check
import { makeNotifierKit } from '@agoric/notifier';
import {
  loadDapp as load,
  loadDapps as loadAll,
  removeDapp as remove,
  upsertDapp as upsert,
  watchDapps as watch,
} from '../store/Dapps.js';

/** @typedef {import("../store/Dapps.js").Dapp} Dapp */

/**
 * @typedef {{
 *  enable: () => void;
 *  disable: () => void;
 *  setPetname: (petname: string) => void;
 * }} DappActions
 */

/** @typedef {Dapp & {actions: DappActions}} DappWithActions */

export const getDappService = (
  /** @type {string} */ chainId,
  /** @type {string} */ address,
) => {
  /** @type {NotifierRecord<DappWithActions[]>} */
  const { notifier, updater } = makeNotifierKit();

  const broadcastUpdates = (
    /** @type {Map<string, DappWithActions>} */ dapps,
  ) => updater.updateState([...dapps.values()]);

  const upsertDapp = (/** @type {Dapp} */ dapp) =>
    upsert(chainId, address, dapp);

  const deleteDapp = (
    /** @type {string} */ origin,
    /** @type { () => void } */ updateDapps,
  ) => {
    remove({ chainId, address, origin });
    updateDapps();
  };

  const setDappPetname = (
    /** @type {string} */ origin,
    /** @type {any} */ petname,
    /** @type {{ (): void; (): void; }} */ updateDapps,
  ) => {
    const dapp = load({ chainId, address, origin });
    assert(dapp, `Tried to set petname on undefined dapp ${origin}`);
    upsertDapp({ ...dapp, petname });
    updateDapps();
  };

  const enableDapp = (
    /** @type {string} */ origin,
    /** @type { () => void } */ updateDapps,
  ) => {
    const dapp = load({ chainId, address, origin });
    assert(dapp, `Tried to enable undefined dapp ${origin}`);
    upsertDapp({ ...dapp, isEnabled: true });
    updateDapps();
  };

  const updateDapps = () => {
    const dapps = new Map();
    const storedDapps = loadAll(chainId, address);
    storedDapps.forEach((/** @type {{origin: string}} */ d) => {
      dapps.set(d.origin, {
        ...d,
        actions: {
          enable: () => enableDapp(d.origin, updateDapps),
          setPetname: petname => setDappPetname(d.origin, petname, updateDapps),
          delete: () => deleteDapp(d.origin, updateDapps),
        },
      });
    });
    broadcastUpdates(dapps);
  };

  watch(chainId, address, updateDapps);
  updateDapps();

  return {
    notifier,
    addDapp: upsertDapp,
    setDappPetname,
    deleteDapp,
    enableDapp,
  };
};
