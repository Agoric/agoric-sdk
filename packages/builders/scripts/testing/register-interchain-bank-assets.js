/**
 * @file register-interchain-bank-assets.js Core Eval
 *
 * Used to populate vbank in testing environments.
 */
import { AssetKind } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

const { Fail } = assert;

const trace = makeTracer('RegisterInterchainBankAssets', true);

/** @import {Board} from '@agoric/vats'; */

/**
 * @typedef {object} InterchainAssetOptions
 * @property {string} denom
 * @property {number} decimalPlaces
 * @property {string} issuerName
 * @property {string} keyword - defaults to `issuerName` if not provided
 * @property {string} [proposedName] - defaults to `issuerName` if not provided
 */

// vstorage paths under published.*
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
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions[]} config.options.assets
 */
export const publishInterchainAssets = async (
  {
    consume: {
      agoricNamesAdmin,
      bankManager,
      board,
      chainStorage,
      startUpgradable,
    },
    brand: { produce: produceBrands },
    issuer: { produce: produceIssuers },
    installation: {
      consume: { mintHolder },
    },
  },
  { options: { assets } },
) => {
  trace(`${publishInterchainAssets.name} starting...`);
  trace(assets);
  await null;
  for (const interchainAssetOptions of assets) {
    const {
      denom,
      decimalPlaces,
      issuerName,
      keyword = issuerName,
      proposedName = issuerName,
    } = interchainAssetOptions;

    trace('interchainAssetOptions', {
      denom,
      decimalPlaces,
      issuerName,
      keyword,
      proposedName,
    });

    assert.typeof(denom, 'string');
    assert.typeof(decimalPlaces, 'number');
    assert.typeof(keyword, 'string');
    assert.typeof(issuerName, 'string');
    assert.typeof(proposedName, 'string');

    const terms = {
      keyword: issuerName, // "keyword" is a misnomer in mintHolder terms
      assetKind: AssetKind.NAT,
      displayInfo: {
        decimalPlaces,
        assetKind: AssetKind.NAT,
      },
    };
    const { creatorFacet: mint, publicFacet: issuer } = await E(
      startUpgradable,
    )({
      installation: mintHolder,
      label: issuerName,
      privateArgs: undefined,
      terms,
    });

    const brand = await E(issuer).getBrand();
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
    produceBrands[keyword].reset();
    produceIssuers[keyword].reset();
    produceBrands[keyword].resolve(brand);
    produceIssuers[keyword].resolve(issuer);

    // publish brand info / boardAux for offer legibility
    await publishBrandInfo(
      // @ts-expect-error 'Promise<StorageNode | null>' is not assignable to
      // parameter of type 'ERef<StorageNode>'
      chainStorage,
      board,
      brand,
    );
  }
  trace(`${publishInterchainAssets.name} complete`);
};

/**
 * @param {unknown} _powers
 * @param {{ assets: InterchainAssetOptions[] }} options
 */
export const getManifestCall = (_powers, options) => {
  /** @type {Record<string, true>} */
  const IssuerKws = options.assets.reduce(
    /**
     * @param {Record<string, true>} acc
     * @param {InterchainAssetOptions} assetOptions
     */
    (acc, { issuerName }) => Object.assign(acc, { [issuerName]: true }),
    {},
  );
  harden(IssuerKws);

  return {
    manifest: {
      [publishInterchainAssets.name]: {
        consume: {
          agoricNamesAdmin: true,
          bankManager: true,
          board: true,
          chainStorage: true,
          startUpgradable: true,
        },
        brand: {
          produce: IssuerKws,
        },
        issuer: {
          produce: IssuerKws,
        },
        installation: {
          consume: { mintHolder: true },
        },
      },
    },
    options,
  };
};
