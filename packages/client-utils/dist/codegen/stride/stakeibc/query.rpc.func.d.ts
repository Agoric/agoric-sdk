import { QueryParamsRequest, QueryParamsResponse, QueryGetValidatorsRequest, QueryGetValidatorsResponse, QueryGetHostZoneRequest, QueryGetHostZoneResponse, QueryAllHostZoneRequest, QueryAllHostZoneResponse, QueryModuleAddressRequest, QueryModuleAddressResponse, QueryInterchainAccountFromAddressRequest, QueryInterchainAccountFromAddressResponse, QueryGetEpochTrackerRequest, QueryGetEpochTrackerResponse, QueryAllEpochTrackerRequest, QueryAllEpochTrackerResponse, QueryGetNextPacketSequenceRequest, QueryGetNextPacketSequenceResponse, QueryAddressUnbondings, QueryAddressUnbondingsResponse, QueryAllTradeRoutes, QueryAllTradeRoutesResponse } from '@agoric/cosmic-proto/codegen/stride/stakeibc/query.js';
/**
 * Parameters queries the parameters of the module.
 * @name getParams
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * Queries a Validator by host zone.
 * @name getValidators
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.Validators
 */
export declare const getValidators: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetValidatorsRequest) => Promise<QueryGetValidatorsResponse>;
/**
 * Queries a HostZone by id.
 * @name getHostZone
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.HostZone
 */
export declare const getHostZone: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetHostZoneRequest) => Promise<QueryGetHostZoneResponse>;
/**
 * Queries a list of HostZone items.
 * @name getHostZoneAll
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.HostZoneAll
 */
export declare const getHostZoneAll: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllHostZoneRequest) => Promise<QueryAllHostZoneResponse>;
/**
 * Queries a list of ModuleAddress items.
 * @name getModuleAddress
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ModuleAddress
 */
export declare const getModuleAddress: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryModuleAddressRequest) => Promise<QueryModuleAddressResponse>;
/**
 * QueryInterchainAccountFromAddress returns the interchain account for given
 * owner address on a given connection pair
 * @name getInterchainAccountFromAddress
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.InterchainAccountFromAddress
 */
export declare const getInterchainAccountFromAddress: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryInterchainAccountFromAddressRequest) => Promise<QueryInterchainAccountFromAddressResponse>;
/**
 * Queries a EpochTracker by index.
 * @name getEpochTracker
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.EpochTracker
 */
export declare const getEpochTracker: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetEpochTrackerRequest) => Promise<QueryGetEpochTrackerResponse>;
/**
 * Queries a list of EpochTracker items.
 * @name getEpochTrackerAll
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.EpochTrackerAll
 */
export declare const getEpochTrackerAll: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllEpochTrackerRequest) => Promise<QueryAllEpochTrackerResponse>;
/**
 * Queries the next packet sequence for one for a given channel
 * @name getNextPacketSequence
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.NextPacketSequence
 */
export declare const getNextPacketSequence: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryGetNextPacketSequenceRequest) => Promise<QueryGetNextPacketSequenceResponse>;
/**
 * Queries an address's unbondings
 * @name getAddressUnbondings
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.AddressUnbondings
 */
export declare const getAddressUnbondings: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAddressUnbondings) => Promise<QueryAddressUnbondingsResponse>;
/**
 * Queries all trade routes
 * @name getAllTradeRoutes
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.AllTradeRoutes
 */
export declare const getAllTradeRoutes: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllTradeRoutes) => Promise<QueryAllTradeRoutesResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map