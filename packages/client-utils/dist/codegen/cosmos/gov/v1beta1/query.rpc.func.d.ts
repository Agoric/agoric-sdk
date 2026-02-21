import { QueryProposalRequest, QueryProposalResponse, QueryProposalsRequest, QueryProposalsResponse, QueryVoteRequest, QueryVoteResponse, QueryVotesRequest, QueryVotesResponse, QueryParamsRequest, QueryParamsResponse, QueryDepositRequest, QueryDepositResponse, QueryDepositsRequest, QueryDepositsResponse, QueryTallyResultRequest, QueryTallyResultResponse } from '@agoric/cosmic-proto/codegen/cosmos/gov/v1beta1/query.js';
/**
 * Proposal queries proposal details based on ProposalID.
 * @name getProposal
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Proposal
 */
export declare const getProposal: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryProposalRequest) => Promise<QueryProposalResponse>;
/**
 * Proposals queries all proposals based on given status.
 * @name getProposals
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Proposals
 */
export declare const getProposals: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryProposalsRequest) => Promise<QueryProposalsResponse>;
/**
 * Vote queries voted information based on proposalID, voterAddr.
 * @name getVote
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Vote
 */
export declare const getVote: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryVoteRequest) => Promise<QueryVoteResponse>;
/**
 * Votes queries votes of a given proposal.
 * @name getVotes
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Votes
 */
export declare const getVotes: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryVotesRequest) => Promise<QueryVotesResponse>;
/**
 * Params queries all parameters of the gov module.
 * @name getParams
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * Deposit queries single deposit information based on proposalID, depositor address.
 * @name getDeposit
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Deposit
 */
export declare const getDeposit: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDepositRequest) => Promise<QueryDepositResponse>;
/**
 * Deposits queries all deposits of a single proposal.
 * @name getDeposits
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.Deposits
 */
export declare const getDeposits: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDepositsRequest) => Promise<QueryDepositsResponse>;
/**
 * TallyResult queries the tally of a proposal vote.
 * @name getTallyResult
 * @package cosmos.gov.v1beta1
 * @see proto service: cosmos.gov.v1beta1.TallyResult
 */
export declare const getTallyResult: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryTallyResultRequest) => Promise<QueryTallyResultResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map