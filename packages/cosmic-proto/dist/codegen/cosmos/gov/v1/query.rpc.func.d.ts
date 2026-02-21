import { QueryConstitutionRequest, QueryConstitutionResponse, QueryProposalRequest, QueryProposalResponse, QueryProposalsRequest, QueryProposalsResponse, QueryVoteRequest, QueryVoteResponse, QueryVotesRequest, QueryVotesResponse, QueryParamsRequest, QueryParamsResponse, QueryDepositRequest, QueryDepositResponse, QueryDepositsRequest, QueryDepositsResponse, QueryTallyResultRequest, QueryTallyResultResponse } from './query.js';
/**
 * Constitution queries the chain's constitution.
 * @name getConstitution
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Constitution
 */
export declare const getConstitution: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryConstitutionRequest) => Promise<QueryConstitutionResponse>;
/**
 * Proposal queries proposal details based on ProposalID.
 * @name getProposal
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Proposal
 */
export declare const getProposal: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryProposalRequest) => Promise<QueryProposalResponse>;
/**
 * Proposals queries all proposals based on given status.
 * @name getProposals
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Proposals
 */
export declare const getProposals: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryProposalsRequest) => Promise<QueryProposalsResponse>;
/**
 * Vote queries voted information based on proposalID, voterAddr.
 * @name getVote
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Vote
 */
export declare const getVote: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryVoteRequest) => Promise<QueryVoteResponse>;
/**
 * Votes queries votes of a given proposal.
 * @name getVotes
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Votes
 */
export declare const getVotes: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryVotesRequest) => Promise<QueryVotesResponse>;
/**
 * Params queries all parameters of the gov module.
 * @name getParams
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Params
 */
export declare const getParams: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * Deposit queries single deposit information based on proposalID, depositAddr.
 * @name getDeposit
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Deposit
 */
export declare const getDeposit: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryDepositRequest) => Promise<QueryDepositResponse>;
/**
 * Deposits queries all deposits of a single proposal.
 * @name getDeposits
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Deposits
 */
export declare const getDeposits: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryDepositsRequest) => Promise<QueryDepositsResponse>;
/**
 * TallyResult queries the tally of a proposal vote.
 * @name getTallyResult
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.TallyResult
 */
export declare const getTallyResult: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryTallyResultRequest) => Promise<QueryTallyResultResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map