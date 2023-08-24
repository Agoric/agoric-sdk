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
// each VaultManager. This requires it to manually replicate the API of
// contractHelper to satisfy contractGovernor. It needs to return a creatorFacet
// with { getParamMgrRetriever, getInvitation, getLimitedCreatorFacet }.

import {
  CONTRACT_ELECTORATE,
  buildParamGovernanceExoMakers,
  makeParamManagerFromTermsAndMakers,
} from '@agoric/governance';
import { validateElectorate } from '@agoric/governance/src/contractHelper.js';
import { makeTracer, StorageNodeShape } from '@agoric/internal';
import { M } from '@agoric/store';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { E } from '@endo/eventual-send';
import { FeeMintAccessShape } from '@agoric/zoe/src/typeGuards.js';

import { InvitationShape } from '../auction/params.js';
import { SHORTFALL_INVITATION_KEY, vaultDirectorParamTypes } from './params.js';
import { provideDirector } from './vaultDirector.js';

const trace = makeTracer('VF', true);

/**
 * @typedef {ZCF<
 *   GovernanceTerms<import('./params').VaultDirectorParams> & {
 *     auctioneerPublicFacet: import('../auction/auctioneer.js').AuctioneerPublicFacet;
 *     priceAuthority: ERef<PriceAuthority>;
 *     reservePublicFacet: AssetReservePublicFacet;
 *     timerService: import('@agoric/time/src/types').TimerService;
 *   }
 * >} VaultFactoryZCF
 */

/** @type {ContractMeta} */
export const meta = {
  privateArgsShape: M.splitRecord(
    {
      marshaller: M.remotable('Marshaller'),
      storageNode: StorageNodeShape,
    },
    {
      // only necessary on first invocation, not subsequent
      feeMintAccess: FeeMintAccessShape,
      initialPoserInvitation: InvitationShape,
      initialShortfallInvitation: InvitationShape,
    },
  ),
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * @param {VaultFactoryZCF} zcf
 * @param {{
 *   feeMintAccess: FeeMintAccess;
 *   initialPoserInvitation: Invitation;
 *   initialShortfallInvitation: Invitation;
 *   storageNode: ERef<StorageNode>;
 *   marshaller: ERef<Marshaller>;
 * }} privateArgs
 * @param {import('@agoric/ertp').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  trace('prepare start', privateArgs, [...baggage.keys()]);
  const {
    initialPoserInvitation,
    initialShortfallInvitation,
    marshaller,
    storageNode,
  } = privateArgs;

  trace('awaiting debtMint');
  const { debtMint } = await provideAll(baggage, {
    debtMint: () => zcf.registerFeeMint('Minted', privateArgs.feeMintAccess),
  });

  zcf.setTestJig(() => ({
    mintedIssuerRecord: debtMint.getIssuerRecord(),
  }));

  const { timerService, auctioneerPublicFacet } = zcf.getTerms();

  const { makeRecorderKit, makeERecorderKit } = prepareRecorderKitMakers(
    baggage,
    marshaller,
  );

  const paramMakerKit = buildParamGovernanceExoMakers(
    zcf.getZoeService(),
    baggage,
  );

  trace('making durable publishers');
  const governanceNode = E(storageNode).makeChildNode('governance');
  const governanceRecorderKit = makeERecorderKit(governanceNode);

  /**
   * A powerful object; it can modify parameters. including the invitation.
   * Notice that the only uncontrolled access to it is in the vaultDirector's
   * creator facet.
   */
  const vaultDirectorParamManager = await makeParamManagerFromTermsAndMakers(
    governanceRecorderKit,
    zcf,
    baggage,
    {
      [CONTRACT_ELECTORATE]: initialPoserInvitation,
      [SHORTFALL_INVITATION_KEY]: initialShortfallInvitation,
    },
    vaultDirectorParamTypes,
    paramMakerKit,
  );

  const director = provideDirector(
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
    paramMakerKit,
  );

  // cannot await because it would make remote calls during vat restart
  director.helper.start().catch(err => {
    console.error('💀 vaultDirector failed to start:', err);
    zcf.shutdownWithFailure(err);
  });

  // validate async to wait for params to be finished
  void validateElectorate(zcf, vaultDirectorParamManager);

  return harden({
    creatorFacet: director.creator,
    publicFacet: director.public,
  });
};
harden(start);

/** @typedef {ContractOf<typeof start>} VaultFactoryContract */
