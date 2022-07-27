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
    assert(dapp, `Tried to set petname on undefined dapp ${origin}`);
    upsertDapp({ ...dapp, petname });
  };

  const enableDapp = origin => {
    const dapp = dapps.get(origin);
    assert(dapp, `Tried to enable undefined dapp ${origin}`);
    upsertDapp({ ...dapp, enable: true });
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

  return harden({
    dapps,
    notifier,
    addDapp: upsertDapp,
    setDappPetname,
    deleteDapp,
    enableDapp,
  });
};
