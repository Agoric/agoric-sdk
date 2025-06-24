/**
 * @file Core Eval to register PoC access token
 *
 * based on register-interchain-bank-assets.js
 */
import { AssetKind } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

const { Fail } = assert;

const trace = makeTracer('PoC-CE', true);

/** @import {Board} from '@agoric/vats'; */

const PoCInfo = /** @type {const} */ ({
  issuerName: 'PoC25',
  denom: 'upoc25',
  decimalPlaces: 1,
});
harden(PoCInfo);

// vstorage paths under published.
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

/**
 * Make a storage node for auxiliary data for a value on the board.
 *
 * @param {ERef<StorageNode>} chainStorage
 * @param {string} boardId
 */
const makeBoardAuxNode = async (chainStorage, boardId) => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};

/**
 * see `publishAgoricBrandsDisplayInfo` {@link @agoric/smart-wallet/proposals/upgrade-walletFactory-proposal.js}
 *
 * @param {ERef<StorageNode>} chainStorage
 * @param {ERef<Board>} board
 * @param {Brand<'nat'>} brand
 */
const publishBrandInfo = async (chainStorage, board, brand) => {
  const [boardId, displayInfo, allegedName] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
    E(brand).getAllegedName(),
  ]);
  const node = makeBoardAuxNode(chainStorage, boardId);
  const aux = marshalData.toCapData(harden({ allegedName, displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};

/**
 * @param {BootstrapPowers} powers
 * @param {{ options: { qty: number, beneficiary: string } }} config
 */
export const createPoCAsset = async (
  {
    consume: {
      agoricNamesAdmin,
      bankManager,
      board,
      chainStorage,
      startUpgradable,
      namesByAddress,
    },
    brand: { produce: produceBrands },
    issuer: { produce: produceIssuers },
    installation: {
      consume: { mintHolder },
    },
  },
  { options: { qty, beneficiary } },
) => {
  trace(`${createPoCAsset.name} starting...`);
  trace(PoCInfo);
  await null;
  const {
    denom,
    decimalPlaces,
    issuerName,
    proposedName = issuerName,
  } = PoCInfo;

  trace('interchainAssetOptions', {
    denom,
    decimalPlaces,
    issuerName,
    proposedName,
  });
  trace('config', { qty, beneficiary });

  // look up *before* starting the mintHolder
  /** @type {import('@agoric/ertp').DepositFacet} */
  const depositFacet = await E(namesByAddress).lookup(
    beneficiary,
    'depositFacet',
  );

  const terms = {
    keyword: issuerName, // "keyword" is a misnomer in mintHolder terms
    assetKind: AssetKind.NAT,
    displayInfo: {
      decimalPlaces,
      assetKind: AssetKind.NAT,
    },
  };
  const { creatorFacet: mint, publicFacet: issuer } = await E(startUpgradable)({
    installation: mintHolder,
    label: issuerName,
    privateArgs: undefined,
    terms,
  });

  /** @type {Brand<'nat'>} */
  // @ts-expect-error narrow AssetKind
  const brand = await E(issuer).getBrand();
  const amt = harden({ brand, value: BigInt(qty) });
  const supply = await E(mint).mintPayment(amt);
  await E(depositFacet).receive(supply);
  trace('sent', amt, 'to', beneficiary);

  const kit = /** @type {IssuerKit<'nat'>} */ ({ mint, issuer, brand });

  /**
   * `addAssetToVault.js` will register the issuer with the `reserveKit`,
   * but we don't need to do that here.
   */

  await Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(issuerName, issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(issuerName, brand),
    // triggers benign UnhandledPromiseRejection 'Error: keyword "ATOM" must
    // be unique' in provisionPool in testing environments
    E(bankManager).addAsset(denom, issuerName, proposedName, kit),
  ]);

  // publish brands and issuers to Bootstrap space for use in proposals
  produceBrands[issuerName].reset();
  produceIssuers[issuerName].reset();
  produceBrands[issuerName].resolve(brand);
  produceIssuers[issuerName].resolve(issuer);

  // publish brand info / boardAux for offer legibility
  await publishBrandInfo(
    // @ts-expect-error 'Promise<StorageNode | null>' is not assignable to
    // parameter of type 'ERef<StorageNode>'
    chainStorage,
    board,
    brand,
  );

  trace(`${createPoCAsset.name} complete`);
};

/**
 * @param {unknown} _powers
 * @param {{ qty: number, beneficiary: string }} options
 */
export const getManifestCall = (_powers, options) => {
  return {
    manifest: {
      [createPoCAsset.name]: {
        consume: {
          agoricNamesAdmin: true,
          namesByAddress: true,
          bankManager: true,
          board: true,
          chainStorage: true,
          startUpgradable: true,
        },
        brand: { produce: { PoC25: true } },
        issuer: { produce: { PoC25: true } },
        installation: {
          consume: { mintHolder: true },
        },
      },
    },
    options,
  };
};
