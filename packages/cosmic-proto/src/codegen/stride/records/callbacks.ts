//@ts-nocheck
import { LSMTokenDeposit, type LSMTokenDepositSDKType } from './records.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
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
function createBaseTransferCallback(): TransferCallback {
  return {
    depositRecordId: BigInt(0),
  };
}
/**
 * @name TransferCallback
 * @package stride.records
 * @see proto type: stride.records.TransferCallback
 */
export const TransferCallback = {
  typeUrl: '/stride.records.TransferCallback' as const,
  is(o: any): o is TransferCallback {
    return (
      o &&
      (o.$typeUrl === TransferCallback.typeUrl ||
        typeof o.depositRecordId === 'bigint')
    );
  },
  isSDK(o: any): o is TransferCallbackSDKType {
    return (
      o &&
      (o.$typeUrl === TransferCallback.typeUrl ||
        typeof o.deposit_record_id === 'bigint')
    );
  },
  encode(
    message: TransferCallback,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.depositRecordId !== BigInt(0)) {
      writer.uint32(8).uint64(message.depositRecordId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TransferCallback {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTransferCallback();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.depositRecordId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TransferCallback {
    return {
      depositRecordId: isSet(object.depositRecordId)
        ? BigInt(object.depositRecordId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: TransferCallback): JsonSafe<TransferCallback> {
    const obj: any = {};
    message.depositRecordId !== undefined &&
      (obj.depositRecordId = (message.depositRecordId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<TransferCallback>): TransferCallback {
    const message = createBaseTransferCallback();
    message.depositRecordId =
      object.depositRecordId !== undefined && object.depositRecordId !== null
        ? BigInt(object.depositRecordId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: TransferCallbackProtoMsg): TransferCallback {
    return TransferCallback.decode(message.value);
  },
  toProto(message: TransferCallback): Uint8Array {
    return TransferCallback.encode(message).finish();
  },
  toProtoMsg(message: TransferCallback): TransferCallbackProtoMsg {
    return {
      typeUrl: '/stride.records.TransferCallback',
      value: TransferCallback.encode(message).finish(),
    };
  },
};
function createBaseTransferLSMTokenCallback(): TransferLSMTokenCallback {
  return {
    deposit: undefined,
  };
}
/**
 * @name TransferLSMTokenCallback
 * @package stride.records
 * @see proto type: stride.records.TransferLSMTokenCallback
 */
export const TransferLSMTokenCallback = {
  typeUrl: '/stride.records.TransferLSMTokenCallback' as const,
  is(o: any): o is TransferLSMTokenCallback {
    return o && o.$typeUrl === TransferLSMTokenCallback.typeUrl;
  },
  isSDK(o: any): o is TransferLSMTokenCallbackSDKType {
    return o && o.$typeUrl === TransferLSMTokenCallback.typeUrl;
  },
  encode(
    message: TransferLSMTokenCallback,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.deposit !== undefined) {
      LSMTokenDeposit.encode(
        message.deposit,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TransferLSMTokenCallback {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTransferLSMTokenCallback();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.deposit = LSMTokenDeposit.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TransferLSMTokenCallback {
    return {
      deposit: isSet(object.deposit)
        ? LSMTokenDeposit.fromJSON(object.deposit)
        : undefined,
    };
  },
  toJSON(
    message: TransferLSMTokenCallback,
  ): JsonSafe<TransferLSMTokenCallback> {
    const obj: any = {};
    message.deposit !== undefined &&
      (obj.deposit = message.deposit
        ? LSMTokenDeposit.toJSON(message.deposit)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<TransferLSMTokenCallback>,
  ): TransferLSMTokenCallback {
    const message = createBaseTransferLSMTokenCallback();
    message.deposit =
      object.deposit !== undefined && object.deposit !== null
        ? LSMTokenDeposit.fromPartial(object.deposit)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: TransferLSMTokenCallbackProtoMsg,
  ): TransferLSMTokenCallback {
    return TransferLSMTokenCallback.decode(message.value);
  },
  toProto(message: TransferLSMTokenCallback): Uint8Array {
    return TransferLSMTokenCallback.encode(message).finish();
  },
  toProtoMsg(
    message: TransferLSMTokenCallback,
  ): TransferLSMTokenCallbackProtoMsg {
    return {
      typeUrl: '/stride.records.TransferLSMTokenCallback',
      value: TransferLSMTokenCallback.encode(message).finish(),
    };
  },
};
