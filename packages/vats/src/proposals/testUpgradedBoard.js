import { E, Far } from '@endo/far';
import { Stable } from '@agoric/internal/src/tokens.js';

export const testUpgradedBoard = async ({
  consume: { board },
  brand: {
    consume: { [Stable.symbol]: stableBrandP },
  },
}) => {
  // /////// can we store something and get it back?  ////////
  const thing1 = Far('thing1', {});
  const thing1Id = await E(board).getId(thing1);
  assert(thing1Id.match(/^board0[0-9]+$/));

  const marshaller = await E(board).getReadonlyMarshaller();
  assert(marshaller, 'expected a marshaller');

  const stableBrand = await stableBrandP;
  // /////// can we retrieve a well-known object via its ID?  ////////
  const stableID = await E(board).getId(stableBrand);
  // /////// can we retrieve something stored long ago?  ////////
  const stableBrandRetrieved = await E(board).getValue(stableID);
  assert(stableBrandRetrieved === stableBrand, 'retrieved matching brand');
};

export const getManifestForTestUpgradedBoard = () => ({
  manifest: {
    [testUpgradedBoard.name]: {
      consume: { board: true },
      brand: {
        consume: { [Stable.symbol]: true },
      },
    },
  },
});
