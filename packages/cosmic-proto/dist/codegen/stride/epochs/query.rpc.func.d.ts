import { QueryEpochsInfoRequest, QueryEpochsInfoResponse, QueryCurrentEpochRequest, QueryCurrentEpochResponse, QueryEpochInfoRequest, QueryEpochInfoResponse } from './query.js';
/**
 * EpochInfos provide running epochInfos
 * @name getEpochInfos
 * @package stride.epochs
 * @see proto service: stride.epochs.EpochInfos
 */
export declare const getEpochInfos: (client: import("../../helper-func-types.js").EndpointOrRpc, request: QueryEpochsInfoRequest) => Promise<QueryEpochsInfoResponse>;
/**
 * CurrentEpoch provide current epoch of specified identifier
 * @name getCurrentEpoch
 * @package stride.epochs
 * @see proto service: stride.epochs.CurrentEpoch
 */
export declare const getCurrentEpoch: (client: import("../../helper-func-types.js").EndpointOrRpc, request: QueryCurrentEpochRequest) => Promise<QueryCurrentEpochResponse>;
/**
 * CurrentEpoch provide current epoch of specified identifier
 * @name getEpochInfo
 * @package stride.epochs
 * @see proto service: stride.epochs.EpochInfo
 */
export declare const getEpochInfo: (client: import("../../helper-func-types.js").EndpointOrRpc, request: QueryEpochInfoRequest) => Promise<QueryEpochInfoResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map