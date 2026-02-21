//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryParamsRequest, QueryParamsResponse, QueryGetValidatorsRequest, QueryGetValidatorsResponse, QueryGetHostZoneRequest, QueryGetHostZoneResponse, QueryAllHostZoneRequest, QueryAllHostZoneResponse, QueryModuleAddressRequest, QueryModuleAddressResponse, QueryInterchainAccountFromAddressRequest, QueryInterchainAccountFromAddressResponse, QueryGetEpochTrackerRequest, QueryGetEpochTrackerResponse, QueryAllEpochTrackerRequest, QueryAllEpochTrackerResponse, QueryGetNextPacketSequenceRequest, QueryGetNextPacketSequenceResponse, QueryAddressUnbondings, QueryAddressUnbondingsResponse, QueryAllTradeRoutes, QueryAllTradeRoutesResponse, } from '@agoric/cosmic-proto/codegen/stride/stakeibc/query.js';
/**
 * Parameters queries the parameters of the module.
 * @name getParams
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.Params
 */
export const getParams = buildQuery({
    encode: QueryParamsRequest.encode,
    decode: QueryParamsResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'Params',
    deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * Queries a Validator by host zone.
 * @name getValidators
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.Validators
 */
export const getValidators = buildQuery({
    encode: QueryGetValidatorsRequest.encode,
    decode: QueryGetValidatorsResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'Validators',
    deps: [QueryGetValidatorsRequest, QueryGetValidatorsResponse],
});
/**
 * Queries a HostZone by id.
 * @name getHostZone
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.HostZone
 */
export const getHostZone = buildQuery({
    encode: QueryGetHostZoneRequest.encode,
    decode: QueryGetHostZoneResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'HostZone',
    deps: [QueryGetHostZoneRequest, QueryGetHostZoneResponse],
});
/**
 * Queries a list of HostZone items.
 * @name getHostZoneAll
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.HostZoneAll
 */
export const getHostZoneAll = buildQuery({
    encode: QueryAllHostZoneRequest.encode,
    decode: QueryAllHostZoneResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'HostZoneAll',
    deps: [QueryAllHostZoneRequest, QueryAllHostZoneResponse],
});
/**
 * Queries a list of ModuleAddress items.
 * @name getModuleAddress
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.ModuleAddress
 */
export const getModuleAddress = buildQuery({
    encode: QueryModuleAddressRequest.encode,
    decode: QueryModuleAddressResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'ModuleAddress',
    deps: [QueryModuleAddressRequest, QueryModuleAddressResponse],
});
/**
 * QueryInterchainAccountFromAddress returns the interchain account for given
 * owner address on a given connection pair
 * @name getInterchainAccountFromAddress
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.InterchainAccountFromAddress
 */
export const getInterchainAccountFromAddress = buildQuery({
    encode: QueryInterchainAccountFromAddressRequest.encode,
    decode: QueryInterchainAccountFromAddressResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'InterchainAccountFromAddress',
    deps: [
        QueryInterchainAccountFromAddressRequest,
        QueryInterchainAccountFromAddressResponse,
    ],
});
/**
 * Queries a EpochTracker by index.
 * @name getEpochTracker
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.EpochTracker
 */
export const getEpochTracker = buildQuery({
    encode: QueryGetEpochTrackerRequest.encode,
    decode: QueryGetEpochTrackerResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'EpochTracker',
    deps: [QueryGetEpochTrackerRequest, QueryGetEpochTrackerResponse],
});
/**
 * Queries a list of EpochTracker items.
 * @name getEpochTrackerAll
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.EpochTrackerAll
 */
export const getEpochTrackerAll = buildQuery({
    encode: QueryAllEpochTrackerRequest.encode,
    decode: QueryAllEpochTrackerResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'EpochTrackerAll',
    deps: [QueryAllEpochTrackerRequest, QueryAllEpochTrackerResponse],
});
/**
 * Queries the next packet sequence for one for a given channel
 * @name getNextPacketSequence
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.NextPacketSequence
 */
export const getNextPacketSequence = buildQuery({
    encode: QueryGetNextPacketSequenceRequest.encode,
    decode: QueryGetNextPacketSequenceResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'NextPacketSequence',
    deps: [QueryGetNextPacketSequenceRequest, QueryGetNextPacketSequenceResponse],
});
/**
 * Queries an address's unbondings
 * @name getAddressUnbondings
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.AddressUnbondings
 */
export const getAddressUnbondings = buildQuery({
    encode: QueryAddressUnbondings.encode,
    decode: QueryAddressUnbondingsResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'AddressUnbondings',
    deps: [QueryAddressUnbondings, QueryAddressUnbondingsResponse],
});
/**
 * Queries all trade routes
 * @name getAllTradeRoutes
 * @package stride.stakeibc
 * @see proto service: stride.stakeibc.AllTradeRoutes
 */
export const getAllTradeRoutes = buildQuery({
    encode: QueryAllTradeRoutes.encode,
    decode: QueryAllTradeRoutesResponse.decode,
    service: 'stride.stakeibc.Query',
    method: 'AllTradeRoutes',
    deps: [QueryAllTradeRoutes, QueryAllTradeRoutesResponse],
});
//# sourceMappingURL=query.rpc.func.js.map