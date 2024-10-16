/**
 * @template SF
 * @typedef {import('@agoric/zoe/src/zoeService/utils').StartResult<SF>} StartResult<SF>
 */
/**
 * @template SF
 * @typedef {import('@agoric/zoe/src/zoeService/utils').StartParams<SF>} StartParams<SF>
 */
/**
 * @typedef {StartResult<
 *   typeof import('@agoric/governance/src/committee.js').prepare
 * >} CommitteeStart
 */
/**
 * cf. packages/inter-protocol/src/econCommitteeCharter.js
 */
export const INVITATION_MAKERS_DESC: "charter member invitation";
export const COMMITTEES_ROOT: "committees";
export const CONTRACT_ELECTORATE: "Electorate";
export namespace ParamTypes {
    let AMOUNT: "amount";
    let BRAND: "brand";
    let INSTALLATION: "installation";
    let INSTANCE: "instance";
    let INVITATION: "invitation";
    let NAT: "nat";
    let RATIO: "ratio";
    let STRING: "string";
    let PASSABLE_RECORD: "record";
    let TIMESTAMP: "timestamp";
    let RELATIVE_TIME: "relativeTime";
    let UNKNOWN: "unknown";
}
export function startMyGovernedInstance<SF extends GovernableStartFn>({ zoe, governedContractInstallation, issuerKeywordRecord, terms, privateArgs, label, }: {
    zoe: ERef<ZoeService>;
    governedContractInstallation: ERef<Installation<SF>>;
    issuerKeywordRecord?: IssuerKeywordRecord;
    terms: Record<string, unknown>;
    privateArgs: StartParams<SF>["privateArgs"];
    label: string;
}, { governedParams, timer, contractGovernor, governorTerms, committeeCreatorFacet, }: {
    governedParams: Record<string, unknown>;
    timer: ERef<import("@agoric/time/src/types").TimerService>;
    contractGovernor: ERef<Installation>;
    governorTerms: Record<string, unknown>;
    committeeCreatorFacet: CommitteeStart["creatorFacet"];
}): Promise<GovernanceFacetKit<SF>>;
export function inviteToMyCharter(creatorFacet: any, namesByAddress: ERef<NameHub>, voterAddresses: Record<string, string>): Promise<any>;
export function startMyCharter(contractName: string, powers: BootstrapPowers, config: any): Promise<import("@agoric/zoe/src/zoeService/utils").StartedInstanceKit<(zcf: ZCF<{
    binaryVoteCounterInstallation: Installation;
}>, privateArgs: undefined, baggage: import("@agoric/vat-data").Baggage) => Promise<{
    creatorFacet: import("@endo/exo").Guarded<{
        addInstance: (governedInstance: Instance, governorFacet: GovernorCreatorFacet<any>, label?: string | undefined) => void;
        makeCharterMemberInvitation: () => Promise<Invitation<{
            invitationMakers: import("@endo/exo").Guarded<{
                VoteOnParamChange: () => Promise<Invitation<import("@agoric/governance/src/types.js").ContractGovernanceVoteResult, import("@agoric/inter-protocol/src/econCommitteeCharter.js").ParamChangesOfferArgs>>;
                VoteOnPauseOffers: (instance: any, strings: any, deadline: any) => Promise<Invitation<import("@agoric/governance/src/types.js").ContractGovernanceVoteResult, undefined>>;
                VoteOnApiCall: (instance: Instance, methodName: string, methodArgs: string[], deadline: import("@agoric/time").TimestampValue) => Promise<Invitation<import("@agoric/governance/src/types.js").ContractGovernanceVoteResult, undefined>>;
            }>;
        }, undefined>>;
    }>;
}>>>;
export function startMyCommittee(contractName: string, powers: BootstrapPowers, config: any): Promise<{
    instance: import("@agoric/zoe/src/zoeService/utils").Instance<(zcf: ZCF<{
        committeeName: string;
        committeeSize: number;
    }>, privateArgs: {
        storageNode: ERef<StorageNode>;
        marshaller: ERef<Marshaller>;
    }, baggage: import("@agoric/vat-data").Baggage) => {
        creatorFacet: CommitteeElectorateCreatorFacet;
        publicFacet: CommitteeElectoratePublic;
    }>;
    adminFacet: import("@agoric/zoe/src/zoeService/utils").AdminFacet<(zcf: ZCF<{
        committeeName: string;
        committeeSize: number;
    }>, privateArgs: {
        storageNode: ERef<StorageNode>;
        marshaller: ERef<Marshaller>;
    }, baggage: import("@agoric/vat-data").Baggage) => {
        creatorFacet: CommitteeElectorateCreatorFacet;
        publicFacet: CommitteeElectoratePublic;
    }>;
    creatorFacet: {};
    publicFacet: {};
} & {
    creatorFacet: CommitteeElectorateCreatorFacet;
    publicFacet: CommitteeElectoratePublic;
} & {
    label: string;
}>;
/**
 * <SF>
 */
export type StartResult<SF> = import("@agoric/zoe/src/zoeService/utils").StartResult<SF>;
/**
 * <SF>
 */
export type StartParams<SF> = import("@agoric/zoe/src/zoeService/utils").StartParams<SF>;
export type CommitteeStart = StartResult<typeof import("@agoric/governance/src/committee.js").prepare>;
//# sourceMappingURL=start-governed-contract.d.ts.map