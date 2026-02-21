import { Deposit, type DepositSDKType, Vote, type VoteSDKType, Proposal, type ProposalSDKType, DepositParams, type DepositParamsSDKType, VotingParams, type VotingParamsSDKType, TallyParams, type TallyParamsSDKType, Params, type ParamsSDKType } from './gov.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the gov module's genesis state.
 * @name GenesisState
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.GenesisState
 */
export interface GenesisState {
    /**
     * starting_proposal_id is the ID of the starting proposal.
     */
    startingProposalId: bigint;
    /**
     * deposits defines all the deposits present at genesis.
     */
    deposits: Deposit[];
    /**
     * votes defines all the votes present at genesis.
     */
    votes: Vote[];
    /**
     * proposals defines all the proposals present at genesis.
     */
    proposals: Proposal[];
    /**
     * Deprecated: Prefer to use `params` instead.
     * deposit_params defines all the paramaters of related to deposit.
     * @deprecated
     */
    depositParams?: DepositParams;
    /**
     * Deprecated: Prefer to use `params` instead.
     * voting_params defines all the paramaters of related to voting.
     * @deprecated
     */
    votingParams?: VotingParams;
    /**
     * Deprecated: Prefer to use `params` instead.
     * tally_params defines all the paramaters of related to tally.
     * @deprecated
     */
    tallyParams?: TallyParams;
    /**
     * params defines all the paramaters of x/gov module.
     *
     * Since: cosmos-sdk 0.47
     */
    params?: Params;
    /**
     * The constitution allows builders to lay a foundation and define purpose.
     * This is an immutable string set in genesis.
     * There are no amendments, to go outside of scope, just fork.
     * constitution is an immutable string in genesis for a chain builder to lay out their vision, ideas and ideals.
     *
     * Since: cosmos-sdk 0.50
     */
    constitution: string;
}
export interface GenesisStateProtoMsg {
    typeUrl: '/cosmos.gov.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the gov module's genesis state.
 * @name GenesisStateSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.GenesisState
 */
export interface GenesisStateSDKType {
    starting_proposal_id: bigint;
    deposits: DepositSDKType[];
    votes: VoteSDKType[];
    proposals: ProposalSDKType[];
    /**
     * @deprecated
     */
    deposit_params?: DepositParamsSDKType;
    /**
     * @deprecated
     */
    voting_params?: VotingParamsSDKType;
    /**
     * @deprecated
     */
    tally_params?: TallyParamsSDKType;
    params?: ParamsSDKType;
    constitution: string;
}
/**
 * GenesisState defines the gov module's genesis state.
 * @name GenesisState
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/cosmos.gov.v1.GenesisState";
    aminoType: "cosmos-sdk/v1/GenesisState";
    is(o: any): o is GenesisState;
    isSDK(o: any): o is GenesisStateSDKType;
    encode(message: GenesisState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenesisState;
    fromJSON(object: any): GenesisState;
    toJSON(message: GenesisState): JsonSafe<GenesisState>;
    fromPartial(object: Partial<GenesisState>): GenesisState;
    fromProtoMsg(message: GenesisStateProtoMsg): GenesisState;
    toProto(message: GenesisState): Uint8Array;
    toProtoMsg(message: GenesisState): GenesisStateProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map