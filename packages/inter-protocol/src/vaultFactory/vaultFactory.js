import '@agoric/governance/exported.js';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

// The vaultFactory owns a number of VaultManagers and a mint for Minted.
//
// addVaultType is a closely held method that adds a brand new collateral type.
// It specifies the initial exchange rate for that type. It depends on a
// separately specified mechanism to liquidate loans that are
// in arrears.

// This contract wants to be managed by a contractGovernor, but it isn't
// compatible with contractGovernor, since it has a separate paramManager for
// each Vault. This requires it to manually replicate the API of contractHelper
// to satisfy contractGovernor. It needs to return a creatorFacet with
// { getParamMgrRetriever, getInvitation, getLimitedCreatorFacet }.

import { assertElectorateMatches } from '@agoric/governance';
import { assertAllDefined } from '@agoric/internal';
import { makeStoredPublisherKit } from '@agoric/notifier';
import { makeVaultDirectorParamManager } from './params.js';
import { prepareVaultDirector } from './vaultDirector.js';

/**
 * @typedef {ZCF<GovernanceTerms<import('./params').VaultDirectorParams> & {
 *   auctioneerPublicFacet: import('../auction/auctioneer.js').AuctioneerPublicFacet,
 *   priceAuthority: ERef<PriceAuthority>,
 *   reservePublicFacet: AssetReservePublicFacet,
 *   timerService: import('@agoric/time/src/types').TimerService,
 * }>} VaultFactoryZCF
 */

/**
 * @param {VaultFactoryZCF} zcf
 * @param {{
 *   feeMintAccess: FeeMintAccess,
 *   initialPoserInvitation: Invitation,
 *   initialShortfallInvitation: Invitation,
 *   storageNode: ERef<StorageNode>,
 *   marshaller: ERef<Marshaller>,
 * }} privateArgs
 * @param {import('@agoric/ertp').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const {
    feeMintAccess,
    initialPoserInvitation,
    initialShortfallInvitation,
    marshaller,
    storageNode,
  } = privateArgs;
  assertAllDefined({
    feeMintAccess,
    initialPoserInvitation,
    initialShortfallInvitation,
    marshaller,
    storageNode,
  });
  const debtMint = await zcf.registerFeeMint('Minted', feeMintAccess);
  zcf.setTestJig(() => ({
    mintedIssuerRecord: debtMint.getIssuerRecord(),
  }));

  const { timerService, auctioneerPublicFacet } = zcf.getTerms();
  /** a powerful object; can modify the invitation */
  const vaultDirectorParamManager = await makeVaultDirectorParamManager(
    makeStoredPublisherKit(storageNode, marshaller, 'governance'),
    zcf,
    initialPoserInvitation,
    initialShortfallInvitation,
  );

  assertElectorateMatches(
    vaultDirectorParamManager,
    zcf.getTerms().governedParams,
  );

  const makeVaultDirector = prepareVaultDirector(
    baggage,
    zcf,
    vaultDirectorParamManager,
    debtMint,
    timerService,
    auctioneerPublicFacet,
    storageNode,
    marshaller,
  );

  const factory = makeVaultDirector();

  return harden({
    creatorFacet: factory.creator,
    publicFacet: factory.public,
  });
};

/** @typedef {ContractOf<typeof start>} VaultFactoryContract */
