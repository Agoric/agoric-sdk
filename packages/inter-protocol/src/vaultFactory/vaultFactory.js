// @jessie-check

import '@agoric/governance/exported.js';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

// The vaultFactory owns a number of VaultManagers and a mint for Minted.
//
// addVaultType is a closely held method that adds a brand new collateral type.
// It specifies the initial exchange rate for that type. It depends on a
// separately specified mechanism to liquidate vaults that are
// in arrears.

// This contract wants to be managed by a contractGovernor, but it isn't
// compatible with contractGovernor, since it has a separate paramManager for
// each Vault. This requires it to manually replicate the API of contractHelper
// to satisfy contractGovernor. It needs to return a creatorFacet with
// { getParamMgrRetriever, getInvitation, getLimitedCreatorFacet }.

import { CONTRACT_ELECTORATE } from '@agoric/governance';
import { makeParamManagerFromTerms } from '@agoric/governance/src/contractGovernance/typedParamManager.js';
import { validateElectorate } from '@agoric/governance/src/contractHelper.js';
import { assertAllDefined } from '@agoric/internal';
import { makeStoredSubscription, makeSubscriptionKit } from '@agoric/notifier';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { E } from '@endo/eventual-send';
import { SHORTFALL_INVITATION_KEY, vaultDirectorParamTypes } from './params.js';
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
export const prepare = async (zcf, privateArgs, baggage) => {
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

  const { makeRecorderKit, makeERecorderKit } = prepareRecorderKitMakers(
    baggage,
    marshaller,
  );

  // XXX non-durable
  const governanceSubscriptionKit = makeSubscriptionKit();
  const governanceNode = E(storageNode).makeChildNode('governance');
  const governanceSubscriber = makeStoredSubscription(
    governanceSubscriptionKit.subscription,
    governanceNode,
    marshaller,
  );
  /** a powerful object; can modify the invitation */
  const vaultDirectorParamManager = await makeParamManagerFromTerms(
    {
      publisher: governanceSubscriptionKit.publication,
      subscriber: governanceSubscriber,
    },
    zcf,
    {
      [CONTRACT_ELECTORATE]: initialPoserInvitation,
      [SHORTFALL_INVITATION_KEY]: initialShortfallInvitation,
    },
    vaultDirectorParamTypes,
  );

  const makeVaultDirector = prepareVaultDirector(
    baggage,
    zcf,
    vaultDirectorParamManager,
    debtMint,
    timerService,
    auctioneerPublicFacet,
    storageNode,
    // XXX remove Recorder makers; remove once we excise deprecated kits for governance
    marshaller,
    makeRecorderKit,
    makeERecorderKit,
  );

  const factory = makeVaultDirector();

  // validate async to wait for params to be finished
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
  void validateElectorate(zcf, vaultDirectorParamManager);

  return harden({
    creatorFacet: factory.creator,
    publicFacet: factory.public,
  });
};

/** @typedef {ContractOf<typeof prepare>} VaultFactoryContract */
