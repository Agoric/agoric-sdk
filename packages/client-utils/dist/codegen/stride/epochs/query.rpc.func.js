//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryEpochsInfoRequest, QueryEpochsInfoResponse, QueryCurrentEpochRequest, QueryCurrentEpochResponse, QueryEpochInfoRequest, QueryEpochInfoResponse, } from '@agoric/cosmic-proto/codegen/stride/epochs/query.js';
/**
 * EpochInfos provide running epochInfos
 * @name getEpochInfos
 * @package stride.epochs
 * @see proto service: stride.epochs.EpochInfos
 */
export const getEpochInfos = buildQuery({
    encode: QueryEpochsInfoRequest.encode,
    decode: QueryEpochsInfoResponse.decode,
    service: 'stride.epochs.Query',
    method: 'EpochInfos',
    deps: [QueryEpochsInfoRequest, QueryEpochsInfoResponse],
});
/**
 * CurrentEpoch provide current epoch of specified identifier
 * @name getCurrentEpoch
 * @package stride.epochs
 * @see proto service: stride.epochs.CurrentEpoch
 */
export const getCurrentEpoch = buildQuery({
    encode: QueryCurrentEpochRequest.encode,
    decode: QueryCurrentEpochResponse.decode,
    service: 'stride.epochs.Query',
    method: 'CurrentEpoch',
    deps: [QueryCurrentEpochRequest, QueryCurrentEpochResponse],
});
/**
 * CurrentEpoch provide current epoch of specified identifier
 * @name getEpochInfo
 * @package stride.epochs
 * @see proto service: stride.epochs.EpochInfo
 */
export const getEpochInfo = buildQuery({
    encode: QueryEpochInfoRequest.encode,
    decode: QueryEpochInfoResponse.decode,
    service: 'stride.epochs.Query',
    method: 'EpochInfo',
    deps: [QueryEpochInfoRequest, QueryEpochInfoResponse],
});
//# sourceMappingURL=query.rpc.func.js.map