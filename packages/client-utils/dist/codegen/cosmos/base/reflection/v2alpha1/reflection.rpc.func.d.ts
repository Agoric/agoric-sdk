import { GetAuthnDescriptorRequest, GetAuthnDescriptorResponse, GetChainDescriptorRequest, GetChainDescriptorResponse, GetCodecDescriptorRequest, GetCodecDescriptorResponse, GetConfigurationDescriptorRequest, GetConfigurationDescriptorResponse, GetQueryServicesDescriptorRequest, GetQueryServicesDescriptorResponse, GetTxDescriptorRequest, GetTxDescriptorResponse } from '@agoric/cosmic-proto/codegen/cosmos/base/reflection/v2alpha1/reflection.js';
/**
 * GetAuthnDescriptor returns information on how to authenticate transactions in the application
 * NOTE: this RPC is still experimental and might be subject to breaking changes or removal in
 * future releases of the cosmos-sdk.
 * @name getGetAuthnDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetAuthnDescriptor
 */
export declare const getGetAuthnDescriptor: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetAuthnDescriptorRequest) => Promise<GetAuthnDescriptorResponse>;
/**
 * GetChainDescriptor returns the description of the chain
 * @name getGetChainDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetChainDescriptor
 */
export declare const getGetChainDescriptor: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetChainDescriptorRequest) => Promise<GetChainDescriptorResponse>;
/**
 * GetCodecDescriptor returns the descriptor of the codec of the application
 * @name getGetCodecDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetCodecDescriptor
 */
export declare const getGetCodecDescriptor: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetCodecDescriptorRequest) => Promise<GetCodecDescriptorResponse>;
/**
 * GetConfigurationDescriptor returns the descriptor for the sdk.Config of the application
 * @name getGetConfigurationDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetConfigurationDescriptor
 */
export declare const getGetConfigurationDescriptor: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetConfigurationDescriptorRequest) => Promise<GetConfigurationDescriptorResponse>;
/**
 * GetQueryServicesDescriptor returns the available gRPC queryable services of the application
 * @name getGetQueryServicesDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetQueryServicesDescriptor
 */
export declare const getGetQueryServicesDescriptor: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetQueryServicesDescriptorRequest) => Promise<GetQueryServicesDescriptorResponse>;
/**
 * GetTxDescriptor returns information on the used transaction object and available msgs that can be used
 * @name getGetTxDescriptor
 * @package cosmos.base.reflection.v2alpha1
 * @see proto service: cosmos.base.reflection.v2alpha1.GetTxDescriptor
 */
export declare const getGetTxDescriptor: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: GetTxDescriptorRequest) => Promise<GetTxDescriptorResponse>;
//# sourceMappingURL=reflection.rpc.func.d.ts.map