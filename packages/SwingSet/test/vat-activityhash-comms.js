import { Far, E } from '@endo/far';

export function buildRootObject() {
  let comms;

  async function addNewRemote(name) {
    const transmitter = makeExo(
      'tx',
      M.interface('tx', {}, { defaultGuards: 'passable' }),
      {},
    );
    const setReceiver = makeExo(
      'sr',
      M.interface('sr', {}, { defaultGuards: 'passable' }),
      {
        setReceiver() {},
      },
    );
    await E(comms).addRemote(name, transmitter, setReceiver);
  }

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async bootstrap(vats) {
        comms = vats.comms;
        await addNewRemote('remote1');
      },
      async addRemote(name) {
        await addNewRemote(name);
      },
    },
  );
}
