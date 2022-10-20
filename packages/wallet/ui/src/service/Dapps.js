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
/** @typedef {import('../store/Dapps.js').SmartWalletKey} SmartWalletKey */

/**
 * @typedef {{
 *  enable: () => void;
 *  disable: () => void;
 *  setPetname: (petname: string) => void;
 * }} DappActions
 */

/** @typedef {Dapp & {actions: DappActions}} DappWithActions */

export const getDappService = (
  /** @type {SmartWalletKey} */ smartWalletKey,
) => {
  /** @type {NotifierRecord<DappWithActions[]>} */
  const { notifier, updater } = makeNotifierKit();

  const broadcastUpdates = (
    /** @type {Map<string, DappWithActions>} */ dapps,
  ) => updater.updateState([...dapps.values()]);

  const upsertDapp = (/** @type {Dapp} */ dapp) => upsert(smartWalletKey, dapp);

  const deleteDapp = (
    /** @type {string} */ origin,
    /** @type { () => void } */ updateDapps,
  ) => {
    remove({ smartWalletKey, origin });
    updateDapps();
  };

  const setDappPetname = (
    /** @type {string} */ origin,
    /** @type {string} */ petname,
    /** @type {{ (): void; (): void; }} */ updateDapps,
  ) => {
    const dapp = load({ smartWalletKey, origin });
    assert(dapp, `Tried to set petname on undefined dapp ${origin}`);
    upsertDapp({ ...dapp, petname });
    updateDapps();
  };

  const enableDapp = (
    /** @type {string} */ origin,
    /** @type { () => void } */ updateDapps,
  ) => {
    const dapp = load({ smartWalletKey, origin });
    assert(dapp, `Tried to enable undefined dapp ${origin}`);
    upsertDapp({ ...dapp, isEnabled: true });
    updateDapps();
  };

  const updateDapps = () => {
    const dapps = new Map();
    const storedDapps = loadAll(smartWalletKey);
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

  watch(smartWalletKey, updateDapps);
  updateDapps();

  return {
    notifier,
    addDapp: upsertDapp,
    setDappPetname,
    deleteDapp,
    enableDapp,
  };
};
