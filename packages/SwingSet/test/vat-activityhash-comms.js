import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

export const buildRootObject = _vatPowers => {
  let comms;

  const addNewRemote = async name => {
    const transmitter = Far('tx', {});
    const setReceiver = Far('sr', {
      setReceiver: () => {},
    });
    await E(comms).addRemote(name, transmitter, setReceiver);
  };

  return Far('root', {
    bootstrap: async vats => {
      comms = vats.comms;
      await addNewRemote('remote1');
    },
    addRemote: async name => {
      await addNewRemote(name);
    },
  });
};
