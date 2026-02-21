import { Plan, type PlanSDKType } from './upgrade.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgSoftwareUpgrade is the Msg/SoftwareUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgrade
 */
export interface MsgSoftwareUpgrade {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
    authority: string;
    /**
     * plan is the upgrade plan.
     */
    plan: Plan;
}
export interface MsgSoftwareUpgradeProtoMsg {
    typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade';
    value: Uint8Array;
}
/**
 * MsgSoftwareUpgrade is the Msg/SoftwareUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgrade
 */
export interface MsgSoftwareUpgradeSDKType {
    authority: string;
    plan: PlanSDKType;
}
/**
 * MsgSoftwareUpgradeResponse is the Msg/SoftwareUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse
 */
export interface MsgSoftwareUpgradeResponse {
}
export interface MsgSoftwareUpgradeResponseProtoMsg {
    typeUrl: '/cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse';
    value: Uint8Array;
}
/**
 * MsgSoftwareUpgradeResponse is the Msg/SoftwareUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse
 */
export interface MsgSoftwareUpgradeResponseSDKType {
}
/**
 * MsgCancelUpgrade is the Msg/CancelUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgrade
 */
export interface MsgCancelUpgrade {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
    authority: string;
}
export interface MsgCancelUpgradeProtoMsg {
    typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgrade';
    value: Uint8Array;
}
/**
 * MsgCancelUpgrade is the Msg/CancelUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgrade
 */
export interface MsgCancelUpgradeSDKType {
    authority: string;
}
/**
 * MsgCancelUpgradeResponse is the Msg/CancelUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse
 */
export interface MsgCancelUpgradeResponse {
}
export interface MsgCancelUpgradeResponseProtoMsg {
    typeUrl: '/cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse';
    value: Uint8Array;
}
/**
 * MsgCancelUpgradeResponse is the Msg/CancelUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeResponseSDKType
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse
 */
export interface MsgCancelUpgradeResponseSDKType {
}
/**
 * MsgSoftwareUpgrade is the Msg/SoftwareUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgrade
 */
export declare const MsgSoftwareUpgrade: {
    typeUrl: "/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade";
    aminoType: "cosmos-sdk/MsgSoftwareUpgrade";
    is(o: any): o is MsgSoftwareUpgrade;
    isSDK(o: any): o is MsgSoftwareUpgradeSDKType;
    encode(message: MsgSoftwareUpgrade, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSoftwareUpgrade;
    fromJSON(object: any): MsgSoftwareUpgrade;
    toJSON(message: MsgSoftwareUpgrade): JsonSafe<MsgSoftwareUpgrade>;
    fromPartial(object: Partial<MsgSoftwareUpgrade>): MsgSoftwareUpgrade;
    fromProtoMsg(message: MsgSoftwareUpgradeProtoMsg): MsgSoftwareUpgrade;
    toProto(message: MsgSoftwareUpgrade): Uint8Array;
    toProtoMsg(message: MsgSoftwareUpgrade): MsgSoftwareUpgradeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSoftwareUpgradeResponse is the Msg/SoftwareUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgSoftwareUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse
 */
export declare const MsgSoftwareUpgradeResponse: {
    typeUrl: "/cosmos.upgrade.v1beta1.MsgSoftwareUpgradeResponse";
    aminoType: "cosmos-sdk/MsgSoftwareUpgradeResponse";
    is(o: any): o is MsgSoftwareUpgradeResponse;
    isSDK(o: any): o is MsgSoftwareUpgradeResponseSDKType;
    encode(_: MsgSoftwareUpgradeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSoftwareUpgradeResponse;
    fromJSON(_: any): MsgSoftwareUpgradeResponse;
    toJSON(_: MsgSoftwareUpgradeResponse): JsonSafe<MsgSoftwareUpgradeResponse>;
    fromPartial(_: Partial<MsgSoftwareUpgradeResponse>): MsgSoftwareUpgradeResponse;
    fromProtoMsg(message: MsgSoftwareUpgradeResponseProtoMsg): MsgSoftwareUpgradeResponse;
    toProto(message: MsgSoftwareUpgradeResponse): Uint8Array;
    toProtoMsg(message: MsgSoftwareUpgradeResponse): MsgSoftwareUpgradeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCancelUpgrade is the Msg/CancelUpgrade request type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgrade
 */
export declare const MsgCancelUpgrade: {
    typeUrl: "/cosmos.upgrade.v1beta1.MsgCancelUpgrade";
    aminoType: "cosmos-sdk/MsgCancelUpgrade";
    is(o: any): o is MsgCancelUpgrade;
    isSDK(o: any): o is MsgCancelUpgradeSDKType;
    encode(message: MsgCancelUpgrade, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCancelUpgrade;
    fromJSON(object: any): MsgCancelUpgrade;
    toJSON(message: MsgCancelUpgrade): JsonSafe<MsgCancelUpgrade>;
    fromPartial(object: Partial<MsgCancelUpgrade>): MsgCancelUpgrade;
    fromProtoMsg(message: MsgCancelUpgradeProtoMsg): MsgCancelUpgrade;
    toProto(message: MsgCancelUpgrade): Uint8Array;
    toProtoMsg(message: MsgCancelUpgrade): MsgCancelUpgradeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCancelUpgradeResponse is the Msg/CancelUpgrade response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUpgradeResponse
 * @package cosmos.upgrade.v1beta1
 * @see proto type: cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse
 */
export declare const MsgCancelUpgradeResponse: {
    typeUrl: "/cosmos.upgrade.v1beta1.MsgCancelUpgradeResponse";
    aminoType: "cosmos-sdk/MsgCancelUpgradeResponse";
    is(o: any): o is MsgCancelUpgradeResponse;
    isSDK(o: any): o is MsgCancelUpgradeResponseSDKType;
    encode(_: MsgCancelUpgradeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCancelUpgradeResponse;
    fromJSON(_: any): MsgCancelUpgradeResponse;
    toJSON(_: MsgCancelUpgradeResponse): JsonSafe<MsgCancelUpgradeResponse>;
    fromPartial(_: Partial<MsgCancelUpgradeResponse>): MsgCancelUpgradeResponse;
    fromProtoMsg(message: MsgCancelUpgradeResponseProtoMsg): MsgCancelUpgradeResponse;
    toProto(message: MsgCancelUpgradeResponse): Uint8Array;
    toProtoMsg(message: MsgCancelUpgradeResponse): MsgCancelUpgradeResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map