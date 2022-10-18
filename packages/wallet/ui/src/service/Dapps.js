import { makeNotifierKit } from '@agoric/notifier';
import {
  loadDapp as load,
  loadDapps as loadAll,
  removeDapp as remove,
  upsertDapp as upsert,
  watchDapps as watch,
} from '../store/Dapps.js';

export const getDappService = (chainId, address) => {
  const { notifier, updater } = makeNotifierKit();
  const broadcastUpdates = dapps => updater.updateState([...dapps.values()]);

  const upsertDapp = dapp => upsert(chainId, address, dapp);

  const deleteDapp = (origin, updateDapps) => {
    remove(chainId, address, origin);
    updateDapps();
  };

  const setDappPetname = (origin, petname, updateDapps) => {
    const dapp = load(chainId, address, origin);
    assert(dapp, `Tried to set petname on undefined dapp ${origin}`);
    upsertDapp({ ...dapp, petname });
    updateDapps();
  };

  const enableDapp = (origin, updateDapps) => {
    const dapp = load(chainId, address, origin);
    assert(dapp, `Tried to enable undefined dapp ${origin}`);
    upsertDapp({ ...dapp, isEnabled: true });
    updateDapps();
  };

  const updateDapps = () => {
    const dapps = new Map();
    const storedDapps = loadAll(chainId, address);
    storedDapps.forEach(d => {
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
