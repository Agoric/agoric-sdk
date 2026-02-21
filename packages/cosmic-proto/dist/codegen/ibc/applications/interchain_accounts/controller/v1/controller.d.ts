import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * Params defines the set of on-chain interchain accounts parameters.
 * The following parameters may be used to disable the controller submodule.
 * @name Params
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.Params
 */
export interface Params {
    /**
     * controller_enabled enables or disables the controller submodule.
     */
    controllerEnabled: boolean;
}
export interface ParamsProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.Params';
    value: Uint8Array;
}
/**
 * Params defines the set of on-chain interchain accounts parameters.
 * The following parameters may be used to disable the controller submodule.
 * @name ParamsSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.Params
 */
export interface ParamsSDKType {
    controller_enabled: boolean;
}
/**
 * Params defines the set of on-chain interchain accounts parameters.
 * The following parameters may be used to disable the controller submodule.
 * @name Params
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.Params
 */
export declare const Params: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.Params";
    aminoType: "cosmos-sdk/Params";
    is(o: any): o is Params;
    isSDK(o: any): o is ParamsSDKType;
    encode(message: Params, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Params;
    fromJSON(object: any): Params;
    toJSON(message: Params): JsonSafe<Params>;
    fromPartial(object: Partial<Params>): Params;
    fromProtoMsg(message: ParamsProtoMsg): Params;
    toProto(message: Params): Uint8Array;
    toProtoMsg(message: Params): ParamsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=controller.d.ts.map