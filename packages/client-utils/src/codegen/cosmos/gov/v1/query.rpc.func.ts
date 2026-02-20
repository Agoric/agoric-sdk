//@ts-nocheck
import { buildQuery } from '../../../helper-func-types.js';
import {
  QueryConstitutionRequest,
  QueryConstitutionResponse,
  QueryProposalRequest,
  QueryProposalResponse,
  QueryProposalsRequest,
  QueryProposalsResponse,
  QueryVoteRequest,
  QueryVoteResponse,
  QueryVotesRequest,
  QueryVotesResponse,
  QueryParamsRequest,
  QueryParamsResponse,
  QueryDepositRequest,
  QueryDepositResponse,
  QueryDepositsRequest,
  QueryDepositsResponse,
  QueryTallyResultRequest,
  QueryTallyResultResponse,
} from './query.js';
/**
 * Constitution queries the chain's constitution.
 * @name getConstitution
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Constitution
 */
export const getConstitution = buildQuery<
  QueryConstitutionRequest,
  QueryConstitutionResponse
>({
  encode: QueryConstitutionRequest.encode,
  decode: QueryConstitutionResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'Constitution',
});
/**
 * Proposal queries proposal details based on ProposalID.
 * @name getProposal
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Proposal
 */
export const getProposal = buildQuery<
  QueryProposalRequest,
  QueryProposalResponse
>({
  encode: QueryProposalRequest.encode,
  decode: QueryProposalResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'Proposal',
});
/**
 * Proposals queries all proposals based on given status.
 * @name getProposals
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Proposals
 */
export const getProposals = buildQuery<
  QueryProposalsRequest,
  QueryProposalsResponse
>({
  encode: QueryProposalsRequest.encode,
  decode: QueryProposalsResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'Proposals',
});
/**
 * Vote queries voted information based on proposalID, voterAddr.
 * @name getVote
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Vote
 */
export const getVote = buildQuery<QueryVoteRequest, QueryVoteResponse>({
  encode: QueryVoteRequest.encode,
  decode: QueryVoteResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'Vote',
});
/**
 * Votes queries votes of a given proposal.
 * @name getVotes
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Votes
 */
export const getVotes = buildQuery<QueryVotesRequest, QueryVotesResponse>({
  encode: QueryVotesRequest.encode,
  decode: QueryVotesResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'Votes',
});
/**
 * Params queries all parameters of the gov module.
 * @name getParams
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'Params',
});
/**
 * Deposit queries single deposit information based on proposalID, depositAddr.
 * @name getDeposit
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Deposit
 */
export const getDeposit = buildQuery<QueryDepositRequest, QueryDepositResponse>(
  {
    encode: QueryDepositRequest.encode,
    decode: QueryDepositResponse.decode,
    service: 'cosmos.gov.v1.Query',
    method: 'Deposit',
  },
);
/**
 * Deposits queries all deposits of a single proposal.
 * @name getDeposits
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.Deposits
 */
export const getDeposits = buildQuery<
  QueryDepositsRequest,
  QueryDepositsResponse
>({
  encode: QueryDepositsRequest.encode,
  decode: QueryDepositsResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'Deposits',
});
/**
 * TallyResult queries the tally of a proposal vote.
 * @name getTallyResult
 * @package cosmos.gov.v1
 * @see proto service: cosmos.gov.v1.TallyResult
 */
export const getTallyResult = buildQuery<
  QueryTallyResultRequest,
  QueryTallyResultResponse
>({
  encode: QueryTallyResultRequest.encode,
  decode: QueryTallyResultResponse.decode,
  service: 'cosmos.gov.v1.Query',
  method: 'TallyResult',
});
