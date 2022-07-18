import { makeNotifierKit } from '@agoric/notifier';
import {
  loadDapps as load,
  removeDapp as remove,
  upsertDapp as upsert,
} from '../store/Dapps.js';

export const getDappService = publicAddress => {
  const dapps = new Map();
  const { notifier, updater } = makeNotifierKit();
  const broadcastUpdates = () => updater.updateState([...dapps.values()]);

  const upsertDapp = dapp => {
    dapps.set(dapp.origin, dapp);
    upsert(publicAddress, dapp);
    broadcastUpdates();
  };

  const deleteDapp = origin => {
    dapps.delete(origin);
    remove(publicAddress, origin);
    broadcastUpdates();
  };

  const setDappPetname = (origin, petname) => {
    const dapp = dapps.get(origin);
    if (!dapp) return;

    const newValue = { ...dapp, petname };
    upsertDapp(newValue);
  };

  const enableDapp = origin => {
    const dapp = dapps.get(origin);
    if (!dapp) return;

    const newValue = { ...dapp, enable: true };
    upsertDapp(newValue);
  };

  const storedDapps = load(publicAddress);
  storedDapps.forEach(d => {
    let enableAction;
    const approvedP = new Promise(res => {
      enableAction = () => {
        enableDapp(d.origin);
        res();
      };
    });
    if (d.enable) {
      enableAction();
    }

    dapps.set(d.origin, {
      ...d,
      approvedP,
      actions: {
        enable: enableAction,
        setPetname: petname => setDappPetname(d.origin, petname),
        delete: () => deleteDapp(d.origin),
      },
    });
  });
  broadcastUpdates();

  return {
    dapps,
    notifier,
    addDapp: upsertDapp,
    setDappPetname,
    deleteDapp,
    enableDapp,
  };
};
