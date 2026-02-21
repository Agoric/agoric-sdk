import type { HttpEndpoint } from '@cosmjs/tendermint-rpc';
export declare const createRPCQueryClient: ({ rpcEndpoint, }: {
    rpcEndpoint: string | HttpEndpoint;
}) => Promise<{
    icq: {
        v1: {
            params(request?: import("@agoric/cosmic-proto/icq/v1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/icq/v1/query.js").QueryParamsResponse>;
        };
    };
    cosmos: {
        upgrade: {
            v1beta1: {
                currentPlan(request?: import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryCurrentPlanRequest): Promise<import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryCurrentPlanResponse>;
                appliedPlan(request: import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryAppliedPlanRequest): Promise<import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryAppliedPlanResponse>;
                upgradedConsensusState(request: import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryUpgradedConsensusStateRequest): Promise<import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryUpgradedConsensusStateResponse>;
                moduleVersions(request: import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryModuleVersionsRequest): Promise<import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryModuleVersionsResponse>;
                authority(request?: import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryAuthorityRequest): Promise<import("@agoric/cosmic-proto/cosmos/upgrade/v1beta1/query.js").QueryAuthorityResponse>;
            };
        };
        tx: {
            v1beta1: {
                simulate(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").SimulateRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").SimulateResponse>;
                getTx(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").GetTxRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").GetTxResponse>;
                broadcastTx(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").BroadcastTxRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").BroadcastTxResponse>;
                getTxsEvent(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").GetTxsEventRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").GetTxsEventResponse>;
                getBlockWithTxs(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").GetBlockWithTxsRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").GetBlockWithTxsResponse>;
                txDecode(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxDecodeRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxDecodeResponse>;
                txEncode(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxEncodeRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxEncodeResponse>;
                txEncodeAmino(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxEncodeAminoRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxEncodeAminoResponse>;
                txDecodeAmino(request: import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxDecodeAminoRequest): Promise<import("@agoric/cosmic-proto/cosmos/tx/v1beta1/service.js").TxDecodeAminoResponse>;
            };
        };
        staking: {
            v1beta1: {
                validators(request: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorsRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorsResponse>;
                validator(request: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorResponse>;
                validatorDelegations(request: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorDelegationsRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorDelegationsResponse>;
                validatorUnbondingDelegations(request: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorUnbondingDelegationsRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryValidatorUnbondingDelegationsResponse>;
                delegation(request: import("@agoric/orchestration/src/utils/codecs.js").QueryDelegationRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryDelegationResponseType>;
                unbondingDelegation(request: import("@agoric/orchestration/src/utils/codecs.js").QueryUnbondingDelegationRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryUnbondingDelegationResponseType>;
                delegatorDelegations(request: import("@agoric/orchestration/src/utils/codecs.js").QueryDelegatorDelegationsRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryDelegatorDelegationsResponseType>;
                delegatorUnbondingDelegations(request: import("@agoric/orchestration/src/utils/codecs.js").QueryDelegatorUnbondingDelegationsRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryDelegatorUnbondingDelegationsResponseType>;
                redelegations(request: import("@agoric/orchestration/src/utils/codecs.js").QueryRedelegationsRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryRedelegationsResponseType>;
                delegatorValidators(request: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryDelegatorValidatorsRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryDelegatorValidatorsResponse>;
                delegatorValidator(request: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryDelegatorValidatorRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryDelegatorValidatorResponse>;
                historicalInfo(request: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryHistoricalInfoRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryHistoricalInfoResponse>;
                pool(request?: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryPoolRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryPoolResponse>;
                params(request?: import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js").QueryParamsResponse>;
            };
        };
        params: {
            v1beta1: {
                params(request: import("@agoric/cosmic-proto/cosmos/params/v1beta1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/params/v1beta1/query.js").QueryParamsResponse>;
                subspaces(request?: import("@agoric/cosmic-proto/cosmos/params/v1beta1/query.js").QuerySubspacesRequest): Promise<import("@agoric/cosmic-proto/cosmos/params/v1beta1/query.js").QuerySubspacesResponse>;
            };
        };
        mint: {
            v1beta1: {
                params(request?: import("@agoric/cosmic-proto/cosmos/mint/v1beta1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/mint/v1beta1/query.js").QueryParamsResponse>;
                inflation(request?: import("@agoric/cosmic-proto/cosmos/mint/v1beta1/query.js").QueryInflationRequest): Promise<import("@agoric/cosmic-proto/cosmos/mint/v1beta1/query.js").QueryInflationResponse>;
                annualProvisions(request?: import("@agoric/cosmic-proto/cosmos/mint/v1beta1/query.js").QueryAnnualProvisionsRequest): Promise<import("@agoric/cosmic-proto/cosmos/mint/v1beta1/query.js").QueryAnnualProvisionsResponse>;
            };
        };
        group: {
            v1: {
                groupInfo(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupInfoRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupInfoResponse>;
                groupPolicyInfo(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupPolicyInfoRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupPolicyInfoResponse>;
                groupMembers(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupMembersRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupMembersResponse>;
                groupsByAdmin(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupsByAdminRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupsByAdminResponse>;
                groupPoliciesByGroup(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupPoliciesByGroupRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupPoliciesByGroupResponse>;
                groupPoliciesByAdmin(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupPoliciesByAdminRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupPoliciesByAdminResponse>;
                proposal(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryProposalRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryProposalResponse>;
                proposalsByGroupPolicy(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryProposalsByGroupPolicyRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryProposalsByGroupPolicyResponse>;
                voteByProposalVoter(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryVoteByProposalVoterRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryVoteByProposalVoterResponse>;
                votesByProposal(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryVotesByProposalRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryVotesByProposalResponse>;
                votesByVoter(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryVotesByVoterRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryVotesByVoterResponse>;
                groupsByMember(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupsByMemberRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupsByMemberResponse>;
                tallyResult(request: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryTallyResultRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryTallyResultResponse>;
                groups(request?: import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupsRequest): Promise<import("@agoric/cosmic-proto/cosmos/group/v1/query.js").QueryGroupsResponse>;
            };
        };
        gov: {
            v1beta1: {
                proposal(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryProposalRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryProposalResponse>;
                proposals(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryProposalsRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryProposalsResponse>;
                vote(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryVoteRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryVoteResponse>;
                votes(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryVotesRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryVotesResponse>;
                params(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryParamsResponse>;
                deposit(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryDepositRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryDepositResponse>;
                deposits(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryDepositsRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryDepositsResponse>;
                tallyResult(request: import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryTallyResultRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1beta1/query.js").QueryTallyResultResponse>;
            };
            v1: {
                constitution(request?: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryConstitutionRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryConstitutionResponse>;
                proposal(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryProposalRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryProposalResponse>;
                proposals(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryProposalsRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryProposalsResponse>;
                vote(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryVoteRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryVoteResponse>;
                votes(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryVotesRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryVotesResponse>;
                params(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryParamsResponse>;
                deposit(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryDepositRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryDepositResponse>;
                deposits(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryDepositsRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryDepositsResponse>;
                tallyResult(request: import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryTallyResultRequest): Promise<import("@agoric/cosmic-proto/cosmos/gov/v1/query.js").QueryTallyResultResponse>;
            };
        };
        feegrant: {
            v1beta1: {
                allowance(request: import("@agoric/cosmic-proto/cosmos/feegrant/v1beta1/query.js").QueryAllowanceRequest): Promise<import("@agoric/cosmic-proto/cosmos/feegrant/v1beta1/query.js").QueryAllowanceResponse>;
                allowances(request: import("@agoric/cosmic-proto/cosmos/feegrant/v1beta1/query.js").QueryAllowancesRequest): Promise<import("@agoric/cosmic-proto/cosmos/feegrant/v1beta1/query.js").QueryAllowancesResponse>;
                allowancesByGranter(request: import("@agoric/cosmic-proto/cosmos/feegrant/v1beta1/query.js").QueryAllowancesByGranterRequest): Promise<import("@agoric/cosmic-proto/cosmos/feegrant/v1beta1/query.js").QueryAllowancesByGranterResponse>;
            };
        };
        distribution: {
            v1beta1: {
                params(request?: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryParamsResponse>;
                validatorDistributionInfo(request: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorDistributionInfoRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorDistributionInfoResponse>;
                validatorOutstandingRewards(request: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorOutstandingRewardsRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorOutstandingRewardsResponse>;
                validatorCommission(request: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorCommissionRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorCommissionResponse>;
                validatorSlashes(request: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorSlashesRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryValidatorSlashesResponse>;
                delegationRewards(request: import("@agoric/orchestration/src/utils/codecs.js").QueryDelegationRewardsRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryDelegationRewardsResponseType>;
                delegationTotalRewards(request: import("@agoric/orchestration/src/utils/codecs.js").QueryDelegationTotalRewardsRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryDelegationTotalRewardsResponseType>;
                delegatorValidators(request: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryDelegatorValidatorsRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryDelegatorValidatorsResponse>;
                delegatorWithdrawAddress(request: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryDelegatorWithdrawAddressRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryDelegatorWithdrawAddressResponse>;
                communityPool(request?: import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryCommunityPoolRequest): Promise<import("@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js").QueryCommunityPoolResponse>;
            };
        };
        consensus: {
            v1: {
                params(request?: import("@agoric/cosmic-proto/cosmos/consensus/v1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/consensus/v1/query.js").QueryParamsResponse>;
            };
        };
        circuit: {
            v1: {
                account(request: import("@agoric/cosmic-proto/cosmos/circuit/v1/query.js").QueryAccountRequest): Promise<import("@agoric/cosmic-proto/cosmos/circuit/v1/query.js").AccountResponse>;
                accounts(request?: import("@agoric/cosmic-proto/cosmos/circuit/v1/query.js").QueryAccountsRequest): Promise<import("@agoric/cosmic-proto/cosmos/circuit/v1/query.js").AccountsResponse>;
                disabledList(request?: import("@agoric/cosmic-proto/cosmos/circuit/v1/query.js").QueryDisabledListRequest): Promise<import("@agoric/cosmic-proto/cosmos/circuit/v1/query.js").DisabledListResponse>;
            };
        };
        base: {
            node: {
                v1beta1: {
                    config(request?: import("@agoric/cosmic-proto/cosmos/base/node/v1beta1/query.js").ConfigRequest): Promise<import("@agoric/cosmic-proto/cosmos/base/node/v1beta1/query.js").ConfigResponse>;
                    status(request?: import("@agoric/cosmic-proto/cosmos/base/node/v1beta1/query.js").StatusRequest): Promise<import("@agoric/cosmic-proto/cosmos/base/node/v1beta1/query.js").StatusResponse>;
                };
            };
        };
        bank: {
            v1beta1: {
                balance(request: import("@agoric/orchestration/src/utils/codecs.js").QueryBalanceRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryBalanceResponseType>;
                allBalances(request: import("@agoric/orchestration/src/utils/codecs.js").QueryAllBalancesRequestType): Promise<import("@agoric/orchestration/src/utils/codecs.js").QueryAllBalancesResponseType>;
                spendableBalances(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySpendableBalancesRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySpendableBalancesResponse>;
                spendableBalanceByDenom(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySpendableBalanceByDenomRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySpendableBalanceByDenomResponse>;
                totalSupply(request?: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryTotalSupplyRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryTotalSupplyResponse>;
                supplyOf(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySupplyOfRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySupplyOfResponse>;
                params(request?: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryParamsResponse>;
                denomMetadata(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomMetadataRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomMetadataResponse>;
                denomMetadataByQueryString(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomMetadataByQueryStringRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomMetadataByQueryStringResponse>;
                denomsMetadata(request?: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomsMetadataRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomsMetadataResponse>;
                denomOwners(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomOwnersRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomOwnersResponse>;
                denomOwnersByQuery(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomOwnersByQueryRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QueryDenomOwnersByQueryResponse>;
                sendEnabled(request: import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySendEnabledRequest): Promise<import("@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js").QuerySendEnabledResponse>;
            };
        };
        authz: {
            v1beta1: {
                grants(request: import("@agoric/cosmic-proto/cosmos/authz/v1beta1/query.js").QueryGrantsRequest): Promise<import("@agoric/cosmic-proto/cosmos/authz/v1beta1/query.js").QueryGrantsResponse>;
                granterGrants(request: import("@agoric/cosmic-proto/cosmos/authz/v1beta1/query.js").QueryGranterGrantsRequest): Promise<import("@agoric/cosmic-proto/cosmos/authz/v1beta1/query.js").QueryGranterGrantsResponse>;
                granteeGrants(request: import("@agoric/cosmic-proto/cosmos/authz/v1beta1/query.js").QueryGranteeGrantsRequest): Promise<import("@agoric/cosmic-proto/cosmos/authz/v1beta1/query.js").QueryGranteeGrantsResponse>;
            };
        };
        auth: {
            v1beta1: {
                accounts(request?: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountsRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountsResponse>;
                account(request: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountResponse>;
                accountAddressByID(request: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountAddressByIDRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountAddressByIDResponse>;
                params(request?: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryParamsRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryParamsResponse>;
                moduleAccounts(request?: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryModuleAccountsRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryModuleAccountsResponse>;
                moduleAccountByName(request: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryModuleAccountByNameRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryModuleAccountByNameResponse>;
                bech32Prefix(request?: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").Bech32PrefixRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").Bech32PrefixResponse>;
                addressBytesToString(request: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").AddressBytesToStringRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").AddressBytesToStringResponse>;
                addressStringToBytes(request: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").AddressStringToBytesRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").AddressStringToBytesResponse>;
                accountInfo(request: import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountInfoRequest): Promise<import("@agoric/cosmic-proto/cosmos/auth/v1beta1/query.js").QueryAccountInfoResponse>;
            };
        };
    };
}>;
//# sourceMappingURL=rpc.query.d.ts.map