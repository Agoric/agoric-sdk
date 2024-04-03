/* eslint-disable -- doesn't understand .d.ts */

export * from './src/types.js';

// XXX re-export types into global namespace, for consumers that expect these to
//  be ambient. Why the _ prefix? Because without it TS gets confused between the
//  import and export symbols. h/t https://stackoverflow.com/a/66588974
//  Note one big downside vs ambients is that these types will appear to be on `globalThis`.
// UNTIL https://github.com/Agoric/agoric-sdk/issues/6512
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
