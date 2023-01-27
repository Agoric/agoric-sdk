import '@agoric/governance/exported.js';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

// The vaultFactory owns a number of VaultManagers and a mint for Minted.
//
// addVaultType is a closely held method that adds a brand new collateral type.
// It specifies the initial exchange rate for that type. It depends on a
// separately specified AMM to provide the ability to liquidate loans that are
// in arrears. We could check that the AMM has sufficient liquidity, but for the
// moment leave that to those participating in the governance process for adding
// new collateral type to ascertain.

// This contract wants to be managed by a contractGovernor, but it isn't
// compatible with contractGovernor, since it has a separate paramManager for
// each Vault. This requires it to manually replicate the API of contractHelper
// to satisfy contractGovernor. It needs to return a creatorFacet with
// { getParamMgrRetriever, getInvitation, getLimitedCreatorFacet }.

import { assertElectorateMatches } from '@agoric/governance';
import { makeStoredPublisherKit } from '@agoric/notifier';
import { assertAllDefined } from '@agoric/internal';
import {
  makeVaultDirectorParamManager,
  LIQUIDATION_INSTALL_KEY,
  LIQUIDATION_TERMS_KEY,
  MIN_INITIAL_DEBT_KEY,
} from './params.js';
import { prepareVaultDirector } from './vaultDirector.js';

/**
 * @typedef {ZCF<GovernanceTerms<import('./params').VaultDirectorParams> & {
 *   ammPublicFacet: AutoswapPublicFacet,
 *   liquidationInstall: Installation<import('./liquidateMinimum.js').start>,
 *   loanTimingParams: {ChargingPeriod: ParamValueTyped<'nat'>, RecordingPeriod: ParamValueTyped<'nat'>},
 *   minInitialDebt: Amount,
 *   priceAuthority: ERef<PriceAuthority>,
 *   reservePublicFacet: AssetReservePublicFacet,
 *   timerService: TimerService,
 *   shortfallInvitation: 'invitation',
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

  const {
    [LIQUIDATION_INSTALL_KEY]: { value: liqInstall },
    [LIQUIDATION_TERMS_KEY]: { value: liqTerms },
    [MIN_INITIAL_DEBT_KEY]: { value: minInitialDebt },
  } = zcf.getTerms().governedParams;
  /** a powerful object; can modify the invitation */
  const vaultDirectorParamManager = await makeVaultDirectorParamManager(
    makeStoredPublisherKit(storageNode, marshaller, 'governance'),
    zcf.getZoeService(),
    initialPoserInvitation,
    liqInstall,
    liqTerms,
    minInitialDebt,
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
