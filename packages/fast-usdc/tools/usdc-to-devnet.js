// @ts-check
/* global E */

// #region @agoric/ertp
const AssetKind = /**@type {const} */ ({ NAT: 'nat' });
harden(AssetKind);
// #endregion @agoric/ertp

/**
 * @import {BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot.js'
 * @import {IssuerInfo, start} from '@agoric/vats/src/mintHolder.js'
 * @import {EconomyBootstrapPowers} from '@agoric/inter-protocol/src/proposals/econ-behaviors.js'
 * @import {InterchainAssetOptions} from '@agoric/inter-protocol/src/proposals/addAssetToVault.js'
 */

/** @typedef {typeof start} MintHolderSF */

const trace = (...args) => console.log('U2D', ...args);

/** @type {InterchainAssetOptions} */
const interchainAssetOptions = {
  decimalPlaces: 6,
  keyword: 'USDC',
  // uusdc transfer/channel-64
  denom: 'ibc/35357FE55D81D88054E135529BB2AEB1BB20D207292775A19BD82D83F27BE9B4',
};

/**
 * @param {EconomyBootstrapPowers} powers
 */
const publishInterchainAssetFromBank = async ({
  consume: { bankManager, agoricNamesAdmin, reserveKit, startUpgradable },
  installation: {
    consume: { mintHolder },
  },
}) => {
  trace('publishInterchainAssetFromBank');
  const {
    denom,
    decimalPlaces,
    keyword,
    issuerName = keyword,
    proposedName = keyword,
  } = interchainAssetOptions;

  assert.typeof(denom, 'string');
  assert.typeof(decimalPlaces, 'number');
  assert.typeof(issuerName, 'string');
  assert.typeof(proposedName, 'string');

  /** @satisfies {IssuerInfo<'nat'>} */
  const terms = {
    keyword: issuerName, // "keyword" is a misnomer in mintHolder terms
    assetKind: AssetKind.NAT,
    displayInfo: {
      decimalPlaces,
      assetKind: AssetKind.NAT,
    },
  };

  trace('starting with', terms);
  const { creatorFacet: mint, publicFacet: issuer } = await E(startUpgradable)({
    installation: mintHolder,
    label: issuerName,
    privateArgs: undefined,
    terms,
  });

  const brand = await E(issuer).getBrand();
  const kit = /** @type {IssuerKit<'nat'>} */ ({ mint, issuer, brand });

  await E(E.get(reserveKit).creatorFacet).addIssuer(issuer, keyword);

  await Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(issuerName, issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(issuerName, brand),
    E(bankManager).addAsset(denom, issuerName, proposedName, kit),
  ]);
};
harden(publishInterchainAssetFromBank);

publishInterchainAssetFromBank;
