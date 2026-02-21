//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { GetAuthnDescriptorRequest, GetAuthnDescriptorResponse, GetChainDescriptorRequest, GetChainDescriptorResponse, GetCodecDescriptorRequest, GetCodecDescriptorResponse, GetConfigurationDescriptorRequest, GetConfigurationDescriptorResponse, GetQueryServicesDescriptorRequest, GetQueryServicesDescriptorResponse, GetTxDescriptorRequest, GetTxDescriptorResponse, } from '@agoric/cosmic-proto/codegen/cosmos/base/reflection/v2alpha1/reflection.js';
/**
 * GetAuthnDescriptor returns information on how to authenticate transactions in the application
 * NOTE: this RPC is still experimental and might be subject to breaking changes or removal in
 * future releases of the cosmos-sdk.
 * @name getGetAuthnDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetAuthnDescriptor
 */
export const getGetAuthnDescriptor = buildQuery({
    encode: GetAuthnDescriptorRequest.encode,
    decode: GetAuthnDescriptorResponse.decode,
    service: 'cosmos.base.reflection.v2alpha1.ReflectionService',
    method: 'GetAuthnDescriptor',
    deps: [GetAuthnDescriptorRequest, GetAuthnDescriptorResponse],
});
/**
 * GetChainDescriptor returns the description of the chain
 * @name getGetChainDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetChainDescriptor
 */
export const getGetChainDescriptor = buildQuery({
    encode: GetChainDescriptorRequest.encode,
    decode: GetChainDescriptorResponse.decode,
    service: 'cosmos.base.reflection.v2alpha1.ReflectionService',
    method: 'GetChainDescriptor',
    deps: [GetChainDescriptorRequest, GetChainDescriptorResponse],
});
/**
 * GetCodecDescriptor returns the descriptor of the codec of the application
 * @name getGetCodecDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetCodecDescriptor
 */
export const getGetCodecDescriptor = buildQuery({
    encode: GetCodecDescriptorRequest.encode,
    decode: GetCodecDescriptorResponse.decode,
    service: 'cosmos.base.reflection.v2alpha1.ReflectionService',
    method: 'GetCodecDescriptor',
    deps: [GetCodecDescriptorRequest, GetCodecDescriptorResponse],
});
/**
 * GetConfigurationDescriptor returns the descriptor for the sdk.Config of the application
 * @name getGetConfigurationDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetConfigurationDescriptor
 */
export const getGetConfigurationDescriptor = buildQuery({
    encode: GetConfigurationDescriptorRequest.encode,
    decode: GetConfigurationDescriptorResponse.decode,
    service: 'cosmos.base.reflection.v2alpha1.ReflectionService',
    method: 'GetConfigurationDescriptor',
    deps: [GetConfigurationDescriptorRequest, GetConfigurationDescriptorResponse],
});
/**
 * GetQueryServicesDescriptor returns the available gRPC queryable services of the application
 * @name getGetQueryServicesDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetQueryServicesDescriptor
 */
export const getGetQueryServicesDescriptor = buildQuery({
    encode: GetQueryServicesDescriptorRequest.encode,
    decode: GetQueryServicesDescriptorResponse.decode,
    service: 'cosmos.base.reflection.v2alpha1.ReflectionService',
    method: 'GetQueryServicesDescriptor',
    deps: [GetQueryServicesDescriptorRequest, GetQueryServicesDescriptorResponse],
});
/**
 * GetTxDescriptor returns information on the used transaction object and available msgs that can be used
 * @name getGetTxDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetTxDescriptor
 */
export const getGetTxDescriptor = buildQuery({
    encode: GetTxDescriptorRequest.encode,
    decode: GetTxDescriptorResponse.decode,
    service: 'cosmos.base.reflection.v2alpha1.ReflectionService',
    method: 'GetTxDescriptor',
    deps: [GetTxDescriptorRequest, GetTxDescriptorResponse],
});
//# sourceMappingURL=reflection.rpc.func.js.map