import { LSMTokenDeposit, type LSMTokenDepositSDKType } from './records.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name TransferCallback
 * @package stride.records
 * @see proto type: stride.records.TransferCallback
 */
export interface TransferCallback {
    depositRecordId: bigint;
}
export interface TransferCallbackProtoMsg {
    typeUrl: '/stride.records.TransferCallback';
    value: Uint8Array;
}
/**
 * @name TransferCallbackSDKType
 * @package stride.records
 * @see proto type: stride.records.TransferCallback
 */
export interface TransferCallbackSDKType {
    deposit_record_id: bigint;
}
/**
 * @name TransferLSMTokenCallback
 * @package stride.records
 * @see proto type: stride.records.TransferLSMTokenCallback
 */
export interface TransferLSMTokenCallback {
    deposit?: LSMTokenDeposit;
}
export interface TransferLSMTokenCallbackProtoMsg {
    typeUrl: '/stride.records.TransferLSMTokenCallback';
    value: Uint8Array;
}
/**
 * @name TransferLSMTokenCallbackSDKType
 * @package stride.records
 * @see proto type: stride.records.TransferLSMTokenCallback
 */
export interface TransferLSMTokenCallbackSDKType {
    deposit?: LSMTokenDepositSDKType;
}
/**
 * @name TransferCallback
 * @package stride.records
 * @see proto type: stride.records.TransferCallback
 */
export declare const TransferCallback: {
    typeUrl: "/stride.records.TransferCallback";
    is(o: any): o is TransferCallback;
    isSDK(o: any): o is TransferCallbackSDKType;
    encode(message: TransferCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TransferCallback;
    fromJSON(object: any): TransferCallback;
    toJSON(message: TransferCallback): JsonSafe<TransferCallback>;
    fromPartial(object: Partial<TransferCallback>): TransferCallback;
    fromProtoMsg(message: TransferCallbackProtoMsg): TransferCallback;
    toProto(message: TransferCallback): Uint8Array;
    toProtoMsg(message: TransferCallback): TransferCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name TransferLSMTokenCallback
 * @package stride.records
 * @see proto type: stride.records.TransferLSMTokenCallback
 */
export declare const TransferLSMTokenCallback: {
    typeUrl: "/stride.records.TransferLSMTokenCallback";
    is(o: any): o is TransferLSMTokenCallback;
    isSDK(o: any): o is TransferLSMTokenCallbackSDKType;
    encode(message: TransferLSMTokenCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TransferLSMTokenCallback;
    fromJSON(object: any): TransferLSMTokenCallback;
    toJSON(message: TransferLSMTokenCallback): JsonSafe<TransferLSMTokenCallback>;
    fromPartial(object: Partial<TransferLSMTokenCallback>): TransferLSMTokenCallback;
    fromProtoMsg(message: TransferLSMTokenCallbackProtoMsg): TransferLSMTokenCallback;
    toProto(message: TransferLSMTokenCallback): Uint8Array;
    toProtoMsg(message: TransferLSMTokenCallback): TransferLSMTokenCallbackProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=callbacks.d.ts.map