import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  let comms;

  async function addNewRemote(name) {
    const transmitter = Far('tx', {});
    const setReceiver = Far('sr', {
      setReceiver() {},
    });
    await E(comms).addRemote(name, transmitter, setReceiver);
  }

  return Far('root', {
    async bootstrap(vats) {
      comms = vats.comms;
      await addNewRemote('remote1');
    },
    async addRemote(name) {
      await addNewRemote(name);
    },
  });
}
