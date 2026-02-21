import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryValidatorsRequest, QueryValidatorsResponse, QueryValidatorRequest, QueryValidatorResponse, QueryValidatorDelegationsRequest, QueryValidatorDelegationsResponse, QueryValidatorUnbondingDelegationsRequest, QueryValidatorUnbondingDelegationsResponse, QueryDelegationRequest, QueryDelegationResponse, QueryUnbondingDelegationRequest, QueryUnbondingDelegationResponse, QueryDelegatorDelegationsRequest, QueryDelegatorDelegationsResponse, QueryDelegatorUnbondingDelegationsRequest, QueryDelegatorUnbondingDelegationsResponse, QueryRedelegationsRequest, QueryRedelegationsResponse, QueryDelegatorValidatorsRequest, QueryDelegatorValidatorsResponse, QueryDelegatorValidatorRequest, QueryDelegatorValidatorResponse, QueryHistoricalInfoRequest, QueryHistoricalInfoResponse, QueryPoolRequest, QueryPoolResponse, QueryParamsRequest, QueryParamsResponse, } from '@agoric/cosmic-proto/codegen/cosmos/staking/v1beta1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.validators = this.validators.bind(this);
        this.validator = this.validator.bind(this);
        this.validatorDelegations = this.validatorDelegations.bind(this);
        this.validatorUnbondingDelegations =
            this.validatorUnbondingDelegations.bind(this);
        this.delegation = this.delegation.bind(this);
        this.unbondingDelegation = this.unbondingDelegation.bind(this);
        this.delegatorDelegations = this.delegatorDelegations.bind(this);
        this.delegatorUnbondingDelegations =
            this.delegatorUnbondingDelegations.bind(this);
        this.redelegations = this.redelegations.bind(this);
        this.delegatorValidators = this.delegatorValidators.bind(this);
        this.delegatorValidator = this.delegatorValidator.bind(this);
        this.historicalInfo = this.historicalInfo.bind(this);
        this.pool = this.pool.bind(this);
        this.params = this.params.bind(this);
    }
    validators(request) {
        const data = QueryValidatorsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'Validators', data);
        return promise.then(data => QueryValidatorsResponse.decode(new BinaryReader(data)));
    }
    validator(request) {
        const data = QueryValidatorRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'Validator', data);
        return promise.then(data => QueryValidatorResponse.decode(new BinaryReader(data)));
    }
    validatorDelegations(request) {
        const data = QueryValidatorDelegationsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'ValidatorDelegations', data);
        return promise.then(data => QueryValidatorDelegationsResponse.decode(new BinaryReader(data)));
    }
    validatorUnbondingDelegations(request) {
        const data = QueryValidatorUnbondingDelegationsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'ValidatorUnbondingDelegations', data);
        return promise.then(data => QueryValidatorUnbondingDelegationsResponse.decode(new BinaryReader(data)));
    }
    delegation(request) {
        const data = QueryDelegationRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'Delegation', data);
        return promise.then(data => QueryDelegationResponse.decode(new BinaryReader(data)));
    }
    unbondingDelegation(request) {
        const data = QueryUnbondingDelegationRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'UnbondingDelegation', data);
        return promise.then(data => QueryUnbondingDelegationResponse.decode(new BinaryReader(data)));
    }
    delegatorDelegations(request) {
        const data = QueryDelegatorDelegationsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'DelegatorDelegations', data);
        return promise.then(data => QueryDelegatorDelegationsResponse.decode(new BinaryReader(data)));
    }
    delegatorUnbondingDelegations(request) {
        const data = QueryDelegatorUnbondingDelegationsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'DelegatorUnbondingDelegations', data);
        return promise.then(data => QueryDelegatorUnbondingDelegationsResponse.decode(new BinaryReader(data)));
    }
    redelegations(request) {
        const data = QueryRedelegationsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'Redelegations', data);
        return promise.then(data => QueryRedelegationsResponse.decode(new BinaryReader(data)));
    }
    delegatorValidators(request) {
        const data = QueryDelegatorValidatorsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'DelegatorValidators', data);
        return promise.then(data => QueryDelegatorValidatorsResponse.decode(new BinaryReader(data)));
    }
    delegatorValidator(request) {
        const data = QueryDelegatorValidatorRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'DelegatorValidator', data);
        return promise.then(data => QueryDelegatorValidatorResponse.decode(new BinaryReader(data)));
    }
    historicalInfo(request) {
        const data = QueryHistoricalInfoRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'HistoricalInfo', data);
        return promise.then(data => QueryHistoricalInfoResponse.decode(new BinaryReader(data)));
    }
    pool(request = {}) {
        const data = QueryPoolRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'Pool', data);
        return promise.then(data => QueryPoolResponse.decode(new BinaryReader(data)));
    }
    params(request = {}) {
        const data = QueryParamsRequest.encode(request).finish();
        const promise = this.rpc.request('cosmos.staking.v1beta1.Query', 'Params', data);
        return promise.then(data => QueryParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        validators(request) {
            return queryService.validators(request);
        },
        validator(request) {
            return queryService.validator(request);
        },
        validatorDelegations(request) {
            return queryService.validatorDelegations(request);
        },
        validatorUnbondingDelegations(request) {
            return queryService.validatorUnbondingDelegations(request);
        },
        delegation(request) {
            return queryService.delegation(request);
        },
        unbondingDelegation(request) {
            return queryService.unbondingDelegation(request);
        },
        delegatorDelegations(request) {
            return queryService.delegatorDelegations(request);
        },
        delegatorUnbondingDelegations(request) {
            return queryService.delegatorUnbondingDelegations(request);
        },
        redelegations(request) {
            return queryService.redelegations(request);
        },
        delegatorValidators(request) {
            return queryService.delegatorValidators(request);
        },
        delegatorValidator(request) {
            return queryService.delegatorValidator(request);
        },
        historicalInfo(request) {
            return queryService.historicalInfo(request);
        },
        pool(request) {
            return queryService.pool(request);
        },
        params(request) {
            return queryService.params(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map