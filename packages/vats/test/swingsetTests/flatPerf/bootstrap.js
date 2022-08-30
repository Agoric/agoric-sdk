import { E, Far } from '@endo/far';

export const buildRootObject = () => {
  return Far('root', {
    bootstrap: async (vats, { bridge }) => {
      //   console.log(Object.keys(vats));
      const { chainStorage } = vats;
      const theBridgeId = 'swingset';
      const rootPath = 'published'; // ?
      const options = { sequence: true };

      const storageRoot = E(chainStorage).makeBridgedChainStorageRoot(
        bridge,
        theBridgeId,
        rootPath,
        options,
      );

      for (let size = 80; size < 120; size += 1) {
        const capData = {
          body: JSON.stringify(
            Array(size * size).fill({ '@qclass': 'slot', index: 1 }),
          ),
          slots: Array(size * size).fill('slotX'),
        };
        await E(storageRoot).setValue(JSON.stringify(capData));
      }
    },
  });
};
