import { Timeout, type TimeoutSDKType, Order } from './channel.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Upgrade is a verifiable type which contains the relevant information
 * for an attempted upgrade. It provides the proposed changes to the channel
 * end, the timeout for this upgrade attempt and the next packet sequence
 * which allows the counterparty to efficiently know the highest sequence it has received.
 * The next sequence send is used for pruning and upgrading from unordered to ordered channels.
 * @name Upgrade
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Upgrade
 */
export interface Upgrade {
    fields: UpgradeFields;
    timeout: Timeout;
    nextSequenceSend: bigint;
}
export interface UpgradeProtoMsg {
    typeUrl: '/ibc.core.channel.v1.Upgrade';
    value: Uint8Array;
}
/**
 * Upgrade is a verifiable type which contains the relevant information
 * for an attempted upgrade. It provides the proposed changes to the channel
 * end, the timeout for this upgrade attempt and the next packet sequence
 * which allows the counterparty to efficiently know the highest sequence it has received.
 * The next sequence send is used for pruning and upgrading from unordered to ordered channels.
 * @name UpgradeSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Upgrade
 */
export interface UpgradeSDKType {
    fields: UpgradeFieldsSDKType;
    timeout: TimeoutSDKType;
    next_sequence_send: bigint;
}
/**
 * UpgradeFields are the fields in a channel end which may be changed
 * during a channel upgrade.
 * @name UpgradeFields
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.UpgradeFields
 */
export interface UpgradeFields {
    ordering: Order;
    connectionHops: string[];
    version: string;
}
export interface UpgradeFieldsProtoMsg {
    typeUrl: '/ibc.core.channel.v1.UpgradeFields';
    value: Uint8Array;
}
/**
 * UpgradeFields are the fields in a channel end which may be changed
 * during a channel upgrade.
 * @name UpgradeFieldsSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.UpgradeFields
 */
export interface UpgradeFieldsSDKType {
    ordering: Order;
    connection_hops: string[];
    version: string;
}
/**
 * ErrorReceipt defines a type which encapsulates the upgrade sequence and error associated with the
 * upgrade handshake failure. When a channel upgrade handshake is aborted both chains are expected to increment to the
 * next sequence.
 * @name ErrorReceipt
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.ErrorReceipt
 */
export interface ErrorReceipt {
    /**
     * the channel upgrade sequence
     */
    sequence: bigint;
    /**
     * the error message detailing the cause of failure
     */
    message: string;
}
export interface ErrorReceiptProtoMsg {
    typeUrl: '/ibc.core.channel.v1.ErrorReceipt';
    value: Uint8Array;
}
/**
 * ErrorReceipt defines a type which encapsulates the upgrade sequence and error associated with the
 * upgrade handshake failure. When a channel upgrade handshake is aborted both chains are expected to increment to the
 * next sequence.
 * @name ErrorReceiptSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.ErrorReceipt
 */
export interface ErrorReceiptSDKType {
    sequence: bigint;
    message: string;
}
/**
 * Upgrade is a verifiable type which contains the relevant information
 * for an attempted upgrade. It provides the proposed changes to the channel
 * end, the timeout for this upgrade attempt and the next packet sequence
 * which allows the counterparty to efficiently know the highest sequence it has received.
 * The next sequence send is used for pruning and upgrading from unordered to ordered channels.
 * @name Upgrade
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.Upgrade
 */
export declare const Upgrade: {
    typeUrl: "/ibc.core.channel.v1.Upgrade";
    aminoType: "cosmos-sdk/Upgrade";
    is(o: any): o is Upgrade;
    isSDK(o: any): o is UpgradeSDKType;
    encode(message: Upgrade, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Upgrade;
    fromJSON(object: any): Upgrade;
    toJSON(message: Upgrade): JsonSafe<Upgrade>;
    fromPartial(object: Partial<Upgrade>): Upgrade;
    fromProtoMsg(message: UpgradeProtoMsg): Upgrade;
    toProto(message: Upgrade): Uint8Array;
    toProtoMsg(message: Upgrade): UpgradeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * UpgradeFields are the fields in a channel end which may be changed
 * during a channel upgrade.
 * @name UpgradeFields
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.UpgradeFields
 */
export declare const UpgradeFields: {
    typeUrl: "/ibc.core.channel.v1.UpgradeFields";
    aminoType: "cosmos-sdk/UpgradeFields";
    is(o: any): o is UpgradeFields;
    isSDK(o: any): o is UpgradeFieldsSDKType;
    encode(message: UpgradeFields, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): UpgradeFields;
    fromJSON(object: any): UpgradeFields;
    toJSON(message: UpgradeFields): JsonSafe<UpgradeFields>;
    fromPartial(object: Partial<UpgradeFields>): UpgradeFields;
    fromProtoMsg(message: UpgradeFieldsProtoMsg): UpgradeFields;
    toProto(message: UpgradeFields): Uint8Array;
    toProtoMsg(message: UpgradeFields): UpgradeFieldsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ErrorReceipt defines a type which encapsulates the upgrade sequence and error associated with the
 * upgrade handshake failure. When a channel upgrade handshake is aborted both chains are expected to increment to the
 * next sequence.
 * @name ErrorReceipt
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.ErrorReceipt
 */
export declare const ErrorReceipt: {
    typeUrl: "/ibc.core.channel.v1.ErrorReceipt";
    aminoType: "cosmos-sdk/ErrorReceipt";
    is(o: any): o is ErrorReceipt;
    isSDK(o: any): o is ErrorReceiptSDKType;
    encode(message: ErrorReceipt, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ErrorReceipt;
    fromJSON(object: any): ErrorReceipt;
    toJSON(message: ErrorReceipt): JsonSafe<ErrorReceipt>;
    fromPartial(object: Partial<ErrorReceipt>): ErrorReceipt;
    fromProtoMsg(message: ErrorReceiptProtoMsg): ErrorReceipt;
    toProto(message: ErrorReceipt): Uint8Array;
    toProtoMsg(message: ErrorReceipt): ErrorReceiptProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=upgrade.d.ts.map