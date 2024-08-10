/** @file Ambient exports until https://github.com/Agoric/agoric-sdk/issues/6512 */
/** @see {@link /docs/typescript.md} */
/* eslint-disable -- doesn't understand .d.ts */

import {
  GovernanceFacetKit as _GovernanceFacetKit,
  GovernanceTerms as _GovernanceTerms,
  GovernorCreatorFacet as _GovernorCreatorFacet,
  GovernanceSubscriptionState as _GovernanceSubscriptionState,
  GovernorStartedInstallationKit as _GovernorStartedInstallationKit,
  GovernedCreatorFacet as _GovernedCreatorFacet,
  ParamStateRecord as _ParamStateRecord,
  GovernedPublicFacet as _GovernedPublicFacet,
  CommitteeElectoratePublic as _CommitteeElectoratePublic,
  GovernedApis as _GovernedApis,
  GovernableStartFn as _GovernableStartFn,
} from './src/types.js';
declare global {
  // @ts-ignore TS2666: Exports and export assignments are not permitted in module augmentations.
  export {
    _CommitteeElectoratePublic as CommitteeElectoratePublic,
    _GovernableStartFn as GovernableStartFn,
    _GovernanceFacetKit as GovernanceFacetKit,
    _GovernanceSubscriptionState as GovernanceSubscriptionState,
    _GovernanceTerms as GovernanceTerms,
    _GovernedApis as GovernedApis,
    _GovernedCreatorFacet as GovernedCreatorFacet,
    _GovernedPublicFacet as GovernedPublicFacet,
    _GovernorCreatorFacet as GovernorCreatorFacet,
    _GovernorStartedInstallationKit as GovernorStartedInstallationKit,
    _ParamStateRecord as ParamStateRecord,
  };
}
