import { ProposalStatus, Proposal, type ProposalSDKType, Vote, type VoteSDKType, VotingParams, type VotingParamsSDKType, DepositParams, type DepositParamsSDKType, TallyParams, type TallyParamsSDKType, Params, type ParamsSDKType, Deposit, type DepositSDKType, TallyResult, type TallyResultSDKType } from './gov.js';
import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../base/query/v1beta1/pagination.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryConstitutionRequest is the request type for the Query/Constitution RPC method
 * @name QueryConstitutionRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryConstitutionRequest
 */
export interface QueryConstitutionRequest {
}
export interface QueryConstitutionRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryConstitutionRequest';
    value: Uint8Array;
}
/**
 * QueryConstitutionRequest is the request type for the Query/Constitution RPC method
 * @name QueryConstitutionRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryConstitutionRequest
 */
export interface QueryConstitutionRequestSDKType {
}
/**
 * QueryConstitutionResponse is the response type for the Query/Constitution RPC method
 * @name QueryConstitutionResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryConstitutionResponse
 */
export interface QueryConstitutionResponse {
    constitution: string;
}
export interface QueryConstitutionResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryConstitutionResponse';
    value: Uint8Array;
}
/**
 * QueryConstitutionResponse is the response type for the Query/Constitution RPC method
 * @name QueryConstitutionResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryConstitutionResponse
 */
export interface QueryConstitutionResponseSDKType {
    constitution: string;
}
/**
 * QueryProposalRequest is the request type for the Query/Proposal RPC method.
 * @name QueryProposalRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalRequest
 */
export interface QueryProposalRequest {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
}
export interface QueryProposalRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryProposalRequest';
    value: Uint8Array;
}
/**
 * QueryProposalRequest is the request type for the Query/Proposal RPC method.
 * @name QueryProposalRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalRequest
 */
export interface QueryProposalRequestSDKType {
    proposal_id: bigint;
}
/**
 * QueryProposalResponse is the response type for the Query/Proposal RPC method.
 * @name QueryProposalResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalResponse
 */
export interface QueryProposalResponse {
    /**
     * proposal is the requested governance proposal.
     */
    proposal?: Proposal;
}
export interface QueryProposalResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryProposalResponse';
    value: Uint8Array;
}
/**
 * QueryProposalResponse is the response type for the Query/Proposal RPC method.
 * @name QueryProposalResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalResponse
 */
export interface QueryProposalResponseSDKType {
    proposal?: ProposalSDKType;
}
/**
 * QueryProposalsRequest is the request type for the Query/Proposals RPC method.
 * @name QueryProposalsRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalsRequest
 */
export interface QueryProposalsRequest {
    /**
     * proposal_status defines the status of the proposals.
     */
    proposalStatus: ProposalStatus;
    /**
     * voter defines the voter address for the proposals.
     */
    voter: string;
    /**
     * depositor defines the deposit addresses from the proposals.
     */
    depositor: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryProposalsRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryProposalsRequest';
    value: Uint8Array;
}
/**
 * QueryProposalsRequest is the request type for the Query/Proposals RPC method.
 * @name QueryProposalsRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalsRequest
 */
export interface QueryProposalsRequestSDKType {
    proposal_status: ProposalStatus;
    voter: string;
    depositor: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryProposalsResponse is the response type for the Query/Proposals RPC
 * method.
 * @name QueryProposalsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalsResponse
 */
export interface QueryProposalsResponse {
    /**
     * proposals defines all the requested governance proposals.
     */
    proposals: Proposal[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryProposalsResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryProposalsResponse';
    value: Uint8Array;
}
/**
 * QueryProposalsResponse is the response type for the Query/Proposals RPC
 * method.
 * @name QueryProposalsResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalsResponse
 */
export interface QueryProposalsResponseSDKType {
    proposals: ProposalSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryVoteRequest is the request type for the Query/Vote RPC method.
 * @name QueryVoteRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVoteRequest
 */
export interface QueryVoteRequest {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * voter defines the voter address for the proposals.
     */
    voter: string;
}
export interface QueryVoteRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryVoteRequest';
    value: Uint8Array;
}
/**
 * QueryVoteRequest is the request type for the Query/Vote RPC method.
 * @name QueryVoteRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVoteRequest
 */
export interface QueryVoteRequestSDKType {
    proposal_id: bigint;
    voter: string;
}
/**
 * QueryVoteResponse is the response type for the Query/Vote RPC method.
 * @name QueryVoteResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVoteResponse
 */
export interface QueryVoteResponse {
    /**
     * vote defines the queried vote.
     */
    vote?: Vote;
}
export interface QueryVoteResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryVoteResponse';
    value: Uint8Array;
}
/**
 * QueryVoteResponse is the response type for the Query/Vote RPC method.
 * @name QueryVoteResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVoteResponse
 */
export interface QueryVoteResponseSDKType {
    vote?: VoteSDKType;
}
/**
 * QueryVotesRequest is the request type for the Query/Votes RPC method.
 * @name QueryVotesRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVotesRequest
 */
export interface QueryVotesRequest {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryVotesRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryVotesRequest';
    value: Uint8Array;
}
/**
 * QueryVotesRequest is the request type for the Query/Votes RPC method.
 * @name QueryVotesRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVotesRequest
 */
export interface QueryVotesRequestSDKType {
    proposal_id: bigint;
    pagination?: PageRequestSDKType;
}
/**
 * QueryVotesResponse is the response type for the Query/Votes RPC method.
 * @name QueryVotesResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVotesResponse
 */
export interface QueryVotesResponse {
    /**
     * votes defines the queried votes.
     */
    votes: Vote[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryVotesResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryVotesResponse';
    value: Uint8Array;
}
/**
 * QueryVotesResponse is the response type for the Query/Votes RPC method.
 * @name QueryVotesResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVotesResponse
 */
export interface QueryVotesResponseSDKType {
    votes: VoteSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {
    /**
     * params_type defines which parameters to query for, can be one of "voting",
     * "tallying" or "deposit".
     */
    paramsType: string;
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
    params_type: string;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * Deprecated: Prefer to use `params` instead.
     * voting_params defines the parameters related to voting.
     * @deprecated
     */
    votingParams?: VotingParams;
    /**
     * Deprecated: Prefer to use `params` instead.
     * deposit_params defines the parameters related to deposit.
     * @deprecated
     */
    depositParams?: DepositParams;
    /**
     * Deprecated: Prefer to use `params` instead.
     * tally_params defines the parameters related to tally.
     * @deprecated
     */
    tallyParams?: TallyParams;
    /**
     * params defines all the paramaters of x/gov module.
     *
     * Since: cosmos-sdk 0.47
     */
    params?: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    /**
     * @deprecated
     */
    voting_params?: VotingParamsSDKType;
    /**
     * @deprecated
     */
    deposit_params?: DepositParamsSDKType;
    /**
     * @deprecated
     */
    tally_params?: TallyParamsSDKType;
    params?: ParamsSDKType;
}
/**
 * QueryDepositRequest is the request type for the Query/Deposit RPC method.
 * @name QueryDepositRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositRequest
 */
export interface QueryDepositRequest {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * depositor defines the deposit addresses from the proposals.
     */
    depositor: string;
}
export interface QueryDepositRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryDepositRequest';
    value: Uint8Array;
}
/**
 * QueryDepositRequest is the request type for the Query/Deposit RPC method.
 * @name QueryDepositRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositRequest
 */
export interface QueryDepositRequestSDKType {
    proposal_id: bigint;
    depositor: string;
}
/**
 * QueryDepositResponse is the response type for the Query/Deposit RPC method.
 * @name QueryDepositResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositResponse
 */
export interface QueryDepositResponse {
    /**
     * deposit defines the requested deposit.
     */
    deposit?: Deposit;
}
export interface QueryDepositResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryDepositResponse';
    value: Uint8Array;
}
/**
 * QueryDepositResponse is the response type for the Query/Deposit RPC method.
 * @name QueryDepositResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositResponse
 */
export interface QueryDepositResponseSDKType {
    deposit?: DepositSDKType;
}
/**
 * QueryDepositsRequest is the request type for the Query/Deposits RPC method.
 * @name QueryDepositsRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositsRequest
 */
export interface QueryDepositsRequest {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDepositsRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryDepositsRequest';
    value: Uint8Array;
}
/**
 * QueryDepositsRequest is the request type for the Query/Deposits RPC method.
 * @name QueryDepositsRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositsRequest
 */
export interface QueryDepositsRequestSDKType {
    proposal_id: bigint;
    pagination?: PageRequestSDKType;
}
/**
 * QueryDepositsResponse is the response type for the Query/Deposits RPC method.
 * @name QueryDepositsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositsResponse
 */
export interface QueryDepositsResponse {
    /**
     * deposits defines the requested deposits.
     */
    deposits: Deposit[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDepositsResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryDepositsResponse';
    value: Uint8Array;
}
/**
 * QueryDepositsResponse is the response type for the Query/Deposits RPC method.
 * @name QueryDepositsResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositsResponse
 */
export interface QueryDepositsResponseSDKType {
    deposits: DepositSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryTallyResultRequest is the request type for the Query/Tally RPC method.
 * @name QueryTallyResultRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryTallyResultRequest
 */
export interface QueryTallyResultRequest {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
}
export interface QueryTallyResultRequestProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryTallyResultRequest';
    value: Uint8Array;
}
/**
 * QueryTallyResultRequest is the request type for the Query/Tally RPC method.
 * @name QueryTallyResultRequestSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryTallyResultRequest
 */
export interface QueryTallyResultRequestSDKType {
    proposal_id: bigint;
}
/**
 * QueryTallyResultResponse is the response type for the Query/Tally RPC method.
 * @name QueryTallyResultResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryTallyResultResponse
 */
export interface QueryTallyResultResponse {
    /**
     * tally defines the requested tally.
     */
    tally?: TallyResult;
}
export interface QueryTallyResultResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.QueryTallyResultResponse';
    value: Uint8Array;
}
/**
 * QueryTallyResultResponse is the response type for the Query/Tally RPC method.
 * @name QueryTallyResultResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryTallyResultResponse
 */
export interface QueryTallyResultResponseSDKType {
    tally?: TallyResultSDKType;
}
/**
 * QueryConstitutionRequest is the request type for the Query/Constitution RPC method
 * @name QueryConstitutionRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryConstitutionRequest
 */
export declare const QueryConstitutionRequest: {
    typeUrl: "/cosmos.gov.v1.QueryConstitutionRequest";
    aminoType: "cosmos-sdk/v1/QueryConstitutionRequest";
    is(o: any): o is QueryConstitutionRequest;
    isSDK(o: any): o is QueryConstitutionRequestSDKType;
    encode(_: QueryConstitutionRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConstitutionRequest;
    fromJSON(_: any): QueryConstitutionRequest;
    toJSON(_: QueryConstitutionRequest): JsonSafe<QueryConstitutionRequest>;
    fromPartial(_: Partial<QueryConstitutionRequest>): QueryConstitutionRequest;
    fromProtoMsg(message: QueryConstitutionRequestProtoMsg): QueryConstitutionRequest;
    toProto(message: QueryConstitutionRequest): Uint8Array;
    toProtoMsg(message: QueryConstitutionRequest): QueryConstitutionRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConstitutionResponse is the response type for the Query/Constitution RPC method
 * @name QueryConstitutionResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryConstitutionResponse
 */
export declare const QueryConstitutionResponse: {
    typeUrl: "/cosmos.gov.v1.QueryConstitutionResponse";
    aminoType: "cosmos-sdk/v1/QueryConstitutionResponse";
    is(o: any): o is QueryConstitutionResponse;
    isSDK(o: any): o is QueryConstitutionResponseSDKType;
    encode(message: QueryConstitutionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConstitutionResponse;
    fromJSON(object: any): QueryConstitutionResponse;
    toJSON(message: QueryConstitutionResponse): JsonSafe<QueryConstitutionResponse>;
    fromPartial(object: Partial<QueryConstitutionResponse>): QueryConstitutionResponse;
    fromProtoMsg(message: QueryConstitutionResponseProtoMsg): QueryConstitutionResponse;
    toProto(message: QueryConstitutionResponse): Uint8Array;
    toProtoMsg(message: QueryConstitutionResponse): QueryConstitutionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryProposalRequest is the request type for the Query/Proposal RPC method.
 * @name QueryProposalRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalRequest
 */
export declare const QueryProposalRequest: {
    typeUrl: "/cosmos.gov.v1.QueryProposalRequest";
    aminoType: "cosmos-sdk/v1/QueryProposalRequest";
    is(o: any): o is QueryProposalRequest;
    isSDK(o: any): o is QueryProposalRequestSDKType;
    encode(message: QueryProposalRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryProposalRequest;
    fromJSON(object: any): QueryProposalRequest;
    toJSON(message: QueryProposalRequest): JsonSafe<QueryProposalRequest>;
    fromPartial(object: Partial<QueryProposalRequest>): QueryProposalRequest;
    fromProtoMsg(message: QueryProposalRequestProtoMsg): QueryProposalRequest;
    toProto(message: QueryProposalRequest): Uint8Array;
    toProtoMsg(message: QueryProposalRequest): QueryProposalRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryProposalResponse is the response type for the Query/Proposal RPC method.
 * @name QueryProposalResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalResponse
 */
export declare const QueryProposalResponse: {
    typeUrl: "/cosmos.gov.v1.QueryProposalResponse";
    aminoType: "cosmos-sdk/v1/QueryProposalResponse";
    is(o: any): o is QueryProposalResponse;
    isSDK(o: any): o is QueryProposalResponseSDKType;
    encode(message: QueryProposalResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryProposalResponse;
    fromJSON(object: any): QueryProposalResponse;
    toJSON(message: QueryProposalResponse): JsonSafe<QueryProposalResponse>;
    fromPartial(object: Partial<QueryProposalResponse>): QueryProposalResponse;
    fromProtoMsg(message: QueryProposalResponseProtoMsg): QueryProposalResponse;
    toProto(message: QueryProposalResponse): Uint8Array;
    toProtoMsg(message: QueryProposalResponse): QueryProposalResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryProposalsRequest is the request type for the Query/Proposals RPC method.
 * @name QueryProposalsRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalsRequest
 */
export declare const QueryProposalsRequest: {
    typeUrl: "/cosmos.gov.v1.QueryProposalsRequest";
    aminoType: "cosmos-sdk/v1/QueryProposalsRequest";
    is(o: any): o is QueryProposalsRequest;
    isSDK(o: any): o is QueryProposalsRequestSDKType;
    encode(message: QueryProposalsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryProposalsRequest;
    fromJSON(object: any): QueryProposalsRequest;
    toJSON(message: QueryProposalsRequest): JsonSafe<QueryProposalsRequest>;
    fromPartial(object: Partial<QueryProposalsRequest>): QueryProposalsRequest;
    fromProtoMsg(message: QueryProposalsRequestProtoMsg): QueryProposalsRequest;
    toProto(message: QueryProposalsRequest): Uint8Array;
    toProtoMsg(message: QueryProposalsRequest): QueryProposalsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryProposalsResponse is the response type for the Query/Proposals RPC
 * method.
 * @name QueryProposalsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryProposalsResponse
 */
export declare const QueryProposalsResponse: {
    typeUrl: "/cosmos.gov.v1.QueryProposalsResponse";
    aminoType: "cosmos-sdk/v1/QueryProposalsResponse";
    is(o: any): o is QueryProposalsResponse;
    isSDK(o: any): o is QueryProposalsResponseSDKType;
    encode(message: QueryProposalsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryProposalsResponse;
    fromJSON(object: any): QueryProposalsResponse;
    toJSON(message: QueryProposalsResponse): JsonSafe<QueryProposalsResponse>;
    fromPartial(object: Partial<QueryProposalsResponse>): QueryProposalsResponse;
    fromProtoMsg(message: QueryProposalsResponseProtoMsg): QueryProposalsResponse;
    toProto(message: QueryProposalsResponse): Uint8Array;
    toProtoMsg(message: QueryProposalsResponse): QueryProposalsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryVoteRequest is the request type for the Query/Vote RPC method.
 * @name QueryVoteRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVoteRequest
 */
export declare const QueryVoteRequest: {
    typeUrl: "/cosmos.gov.v1.QueryVoteRequest";
    aminoType: "cosmos-sdk/v1/QueryVoteRequest";
    is(o: any): o is QueryVoteRequest;
    isSDK(o: any): o is QueryVoteRequestSDKType;
    encode(message: QueryVoteRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryVoteRequest;
    fromJSON(object: any): QueryVoteRequest;
    toJSON(message: QueryVoteRequest): JsonSafe<QueryVoteRequest>;
    fromPartial(object: Partial<QueryVoteRequest>): QueryVoteRequest;
    fromProtoMsg(message: QueryVoteRequestProtoMsg): QueryVoteRequest;
    toProto(message: QueryVoteRequest): Uint8Array;
    toProtoMsg(message: QueryVoteRequest): QueryVoteRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryVoteResponse is the response type for the Query/Vote RPC method.
 * @name QueryVoteResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVoteResponse
 */
export declare const QueryVoteResponse: {
    typeUrl: "/cosmos.gov.v1.QueryVoteResponse";
    aminoType: "cosmos-sdk/v1/QueryVoteResponse";
    is(o: any): o is QueryVoteResponse;
    isSDK(o: any): o is QueryVoteResponseSDKType;
    encode(message: QueryVoteResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryVoteResponse;
    fromJSON(object: any): QueryVoteResponse;
    toJSON(message: QueryVoteResponse): JsonSafe<QueryVoteResponse>;
    fromPartial(object: Partial<QueryVoteResponse>): QueryVoteResponse;
    fromProtoMsg(message: QueryVoteResponseProtoMsg): QueryVoteResponse;
    toProto(message: QueryVoteResponse): Uint8Array;
    toProtoMsg(message: QueryVoteResponse): QueryVoteResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryVotesRequest is the request type for the Query/Votes RPC method.
 * @name QueryVotesRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVotesRequest
 */
export declare const QueryVotesRequest: {
    typeUrl: "/cosmos.gov.v1.QueryVotesRequest";
    aminoType: "cosmos-sdk/v1/QueryVotesRequest";
    is(o: any): o is QueryVotesRequest;
    isSDK(o: any): o is QueryVotesRequestSDKType;
    encode(message: QueryVotesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryVotesRequest;
    fromJSON(object: any): QueryVotesRequest;
    toJSON(message: QueryVotesRequest): JsonSafe<QueryVotesRequest>;
    fromPartial(object: Partial<QueryVotesRequest>): QueryVotesRequest;
    fromProtoMsg(message: QueryVotesRequestProtoMsg): QueryVotesRequest;
    toProto(message: QueryVotesRequest): Uint8Array;
    toProtoMsg(message: QueryVotesRequest): QueryVotesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryVotesResponse is the response type for the Query/Votes RPC method.
 * @name QueryVotesResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryVotesResponse
 */
export declare const QueryVotesResponse: {
    typeUrl: "/cosmos.gov.v1.QueryVotesResponse";
    aminoType: "cosmos-sdk/v1/QueryVotesResponse";
    is(o: any): o is QueryVotesResponse;
    isSDK(o: any): o is QueryVotesResponseSDKType;
    encode(message: QueryVotesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryVotesResponse;
    fromJSON(object: any): QueryVotesResponse;
    toJSON(message: QueryVotesResponse): JsonSafe<QueryVotesResponse>;
    fromPartial(object: Partial<QueryVotesResponse>): QueryVotesResponse;
    fromProtoMsg(message: QueryVotesResponseProtoMsg): QueryVotesResponse;
    toProto(message: QueryVotesResponse): Uint8Array;
    toProtoMsg(message: QueryVotesResponse): QueryVotesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.gov.v1.QueryParamsRequest";
    aminoType: "cosmos-sdk/v1/QueryParamsRequest";
    is(o: any): o is QueryParamsRequest;
    isSDK(o: any): o is QueryParamsRequestSDKType;
    encode(message: QueryParamsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsRequest;
    fromJSON(object: any): QueryParamsRequest;
    toJSON(message: QueryParamsRequest): JsonSafe<QueryParamsRequest>;
    fromPartial(object: Partial<QueryParamsRequest>): QueryParamsRequest;
    fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest;
    toProto(message: QueryParamsRequest): Uint8Array;
    toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.gov.v1.QueryParamsResponse";
    aminoType: "cosmos-sdk/v1/QueryParamsResponse";
    is(o: any): o is QueryParamsResponse;
    isSDK(o: any): o is QueryParamsResponseSDKType;
    encode(message: QueryParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsResponse;
    fromJSON(object: any): QueryParamsResponse;
    toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse>;
    fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse;
    fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse;
    toProto(message: QueryParamsResponse): Uint8Array;
    toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDepositRequest is the request type for the Query/Deposit RPC method.
 * @name QueryDepositRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositRequest
 */
export declare const QueryDepositRequest: {
    typeUrl: "/cosmos.gov.v1.QueryDepositRequest";
    aminoType: "cosmos-sdk/v1/QueryDepositRequest";
    is(o: any): o is QueryDepositRequest;
    isSDK(o: any): o is QueryDepositRequestSDKType;
    encode(message: QueryDepositRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDepositRequest;
    fromJSON(object: any): QueryDepositRequest;
    toJSON(message: QueryDepositRequest): JsonSafe<QueryDepositRequest>;
    fromPartial(object: Partial<QueryDepositRequest>): QueryDepositRequest;
    fromProtoMsg(message: QueryDepositRequestProtoMsg): QueryDepositRequest;
    toProto(message: QueryDepositRequest): Uint8Array;
    toProtoMsg(message: QueryDepositRequest): QueryDepositRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDepositResponse is the response type for the Query/Deposit RPC method.
 * @name QueryDepositResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositResponse
 */
export declare const QueryDepositResponse: {
    typeUrl: "/cosmos.gov.v1.QueryDepositResponse";
    aminoType: "cosmos-sdk/v1/QueryDepositResponse";
    is(o: any): o is QueryDepositResponse;
    isSDK(o: any): o is QueryDepositResponseSDKType;
    encode(message: QueryDepositResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDepositResponse;
    fromJSON(object: any): QueryDepositResponse;
    toJSON(message: QueryDepositResponse): JsonSafe<QueryDepositResponse>;
    fromPartial(object: Partial<QueryDepositResponse>): QueryDepositResponse;
    fromProtoMsg(message: QueryDepositResponseProtoMsg): QueryDepositResponse;
    toProto(message: QueryDepositResponse): Uint8Array;
    toProtoMsg(message: QueryDepositResponse): QueryDepositResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDepositsRequest is the request type for the Query/Deposits RPC method.
 * @name QueryDepositsRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositsRequest
 */
export declare const QueryDepositsRequest: {
    typeUrl: "/cosmos.gov.v1.QueryDepositsRequest";
    aminoType: "cosmos-sdk/v1/QueryDepositsRequest";
    is(o: any): o is QueryDepositsRequest;
    isSDK(o: any): o is QueryDepositsRequestSDKType;
    encode(message: QueryDepositsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDepositsRequest;
    fromJSON(object: any): QueryDepositsRequest;
    toJSON(message: QueryDepositsRequest): JsonSafe<QueryDepositsRequest>;
    fromPartial(object: Partial<QueryDepositsRequest>): QueryDepositsRequest;
    fromProtoMsg(message: QueryDepositsRequestProtoMsg): QueryDepositsRequest;
    toProto(message: QueryDepositsRequest): Uint8Array;
    toProtoMsg(message: QueryDepositsRequest): QueryDepositsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDepositsResponse is the response type for the Query/Deposits RPC method.
 * @name QueryDepositsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryDepositsResponse
 */
export declare const QueryDepositsResponse: {
    typeUrl: "/cosmos.gov.v1.QueryDepositsResponse";
    aminoType: "cosmos-sdk/v1/QueryDepositsResponse";
    is(o: any): o is QueryDepositsResponse;
    isSDK(o: any): o is QueryDepositsResponseSDKType;
    encode(message: QueryDepositsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDepositsResponse;
    fromJSON(object: any): QueryDepositsResponse;
    toJSON(message: QueryDepositsResponse): JsonSafe<QueryDepositsResponse>;
    fromPartial(object: Partial<QueryDepositsResponse>): QueryDepositsResponse;
    fromProtoMsg(message: QueryDepositsResponseProtoMsg): QueryDepositsResponse;
    toProto(message: QueryDepositsResponse): Uint8Array;
    toProtoMsg(message: QueryDepositsResponse): QueryDepositsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryTallyResultRequest is the request type for the Query/Tally RPC method.
 * @name QueryTallyResultRequest
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryTallyResultRequest
 */
export declare const QueryTallyResultRequest: {
    typeUrl: "/cosmos.gov.v1.QueryTallyResultRequest";
    aminoType: "cosmos-sdk/v1/QueryTallyResultRequest";
    is(o: any): o is QueryTallyResultRequest;
    isSDK(o: any): o is QueryTallyResultRequestSDKType;
    encode(message: QueryTallyResultRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryTallyResultRequest;
    fromJSON(object: any): QueryTallyResultRequest;
    toJSON(message: QueryTallyResultRequest): JsonSafe<QueryTallyResultRequest>;
    fromPartial(object: Partial<QueryTallyResultRequest>): QueryTallyResultRequest;
    fromProtoMsg(message: QueryTallyResultRequestProtoMsg): QueryTallyResultRequest;
    toProto(message: QueryTallyResultRequest): Uint8Array;
    toProtoMsg(message: QueryTallyResultRequest): QueryTallyResultRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryTallyResultResponse is the response type for the Query/Tally RPC method.
 * @name QueryTallyResultResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.QueryTallyResultResponse
 */
export declare const QueryTallyResultResponse: {
    typeUrl: "/cosmos.gov.v1.QueryTallyResultResponse";
    aminoType: "cosmos-sdk/v1/QueryTallyResultResponse";
    is(o: any): o is QueryTallyResultResponse;
    isSDK(o: any): o is QueryTallyResultResponseSDKType;
    encode(message: QueryTallyResultResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryTallyResultResponse;
    fromJSON(object: any): QueryTallyResultResponse;
    toJSON(message: QueryTallyResultResponse): JsonSafe<QueryTallyResultResponse>;
    fromPartial(object: Partial<QueryTallyResultResponse>): QueryTallyResultResponse;
    fromProtoMsg(message: QueryTallyResultResponseProtoMsg): QueryTallyResultResponse;
    toProto(message: QueryTallyResultResponse): Uint8Array;
    toProtoMsg(message: QueryTallyResultResponse): QueryTallyResultResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map