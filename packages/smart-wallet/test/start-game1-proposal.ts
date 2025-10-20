import { Fail } from '@endo/errors';
import { E, type ERef } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand } from '@agoric/ertp';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type { Board } from '@agoric/vats';

console.warn('start-game1-proposal.ts module evaluating');

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

const IST_UNIT = 1_000_000n;
const CENT = IST_UNIT / 100n;

/**
 * Make a storage node for auxilliary data for a value on the board.
 */
const makeBoardAuxNode = async (
  chainStorage: ERef<StorageNode>,
  boardId: string,
): Promise<ERef<StorageNode>> => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};

const publishBrandInfo = async (
  chainStorage: ERef<StorageNode>,
  board: ERef<Board>,
  brand: Brand,
) => {
  const [id, displayInfo] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
  ]);
  const node = await makeBoardAuxNode(chainStorage, id);
  const aux = marshalData.toCapData(harden({ displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};

/**
 * Core eval script to start contract.
 */
export const startGameContract = async (permittedPowers: BootstrapPowers) => {
  console.error('startGameContract()...');
  const {
    consume: { agoricNames, board, chainStorage, startUpgradable, zoe },
    brand: {
      // @ts-expect-error dynamic extension to promise space
      produce: { Place: producePlaceBrand },
    },
    issuer: {
      // @ts-expect-error dynamic extension to promise space
      produce: { Place: producePlaceIssuer },
    },
    instance: {
      // @ts-expect-error dynamic extension to promise space
      produce: { game1: produceInstance },
    },
  } = permittedPowers;

  const istBrand = await E(agoricNames).lookup('brand', 'IST');
  const ist = {
    brand: istBrand,
  };
  // NOTE: joinPrice could be configurable
  const terms = { joinPrice: AmountMath.make(ist.brand, 25n * CENT) };

  // agoricNames gets updated each time; the promise space only once XXXXXXX
  const installation = await E(agoricNames).lookup('installation', 'game1');

  const { instance } = await E(startUpgradable)({
    installation,
    label: 'game1',
    terms,
  });
  console.log('CoreEval script: started game contract', instance);
  const {
    brands: { Place: brand },
    issuers: { Place: issuer },
  } = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames:', brand);

  produceInstance.reset();
  produceInstance.resolve(instance);

  producePlaceBrand.reset();
  producePlaceIssuer.reset();
  producePlaceBrand.resolve(brand);
  producePlaceIssuer.resolve(issuer);

  // @ts-expect-error XXX chainStorage nullable
  await publishBrandInfo(chainStorage, board, brand);
  console.log('game1 (re)installed');
};

const gameManifest: import('@agoric/vats/src/core/lib-boot').BootstrapManifest =
  {
    [startGameContract.name]: {
      consume: {
        agoricNames: true,
        board: true, // to publish boardAux info for game NFT
        chainStorage: true, // to publish boardAux info for game NFT
        startUpgradable: true, // to start contract and save adminFacet
        zoe: true, // to get contract terms, including issuer/brand
      },
      installation: { consume: { game1: true } },
      issuer: { produce: { Place: true } },
      brand: { produce: { Place: true } },
      instance: { produce: { game1: true } },
    },
  };
harden(gameManifest);

export const getManifestForGame1 = ({ restoreRef }, { game1Ref }) => {
  return harden({
    manifest: gameManifest,
    installations: {
      game1: restoreRef(game1Ref),
    },
  });
};
