import { E, Far } from '@endo/far';

export const buildRootObject = () => {
  return Far('root', {
    bootstrap: async (vats, { bridge }) => {
      console.log(Object.keys(vats));
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

      await E(storageRoot).setValue('key1', 'value1');
    },
  });
};
