//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/**
 * FeeToken is a struct that specifies a coin denom, and pool ID pair.
 * This marks the token as eligible for use as a tx fee asset in Osmosis.
 * Its price in osmo is derived through looking at the provided pool ID.
 * The pool ID must have osmo as one of its assets.
 */
export interface FeeToken {
  denom: string;
  poolID: bigint;
}
export interface FeeTokenProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.FeeToken';
  value: Uint8Array;
}
/**
 * FeeToken is a struct that specifies a coin denom, and pool ID pair.
 * This marks the token as eligible for use as a tx fee asset in Osmosis.
 * Its price in osmo is derived through looking at the provided pool ID.
 * The pool ID must have osmo as one of its assets.
 */
export interface FeeTokenSDKType {
  denom: string;
  poolID: bigint;
}
function createBaseFeeToken(): FeeToken {
  return {
    denom: '',
    poolID: BigInt(0),
  };
}
export const FeeToken = {
  typeUrl: '/osmosis.txfees.v1beta1.FeeToken',
  encode(
    message: FeeToken,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    if (message.poolID !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolID);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): FeeToken {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFeeToken();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        case 2:
          message.poolID = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FeeToken {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
      poolID: isSet(object.poolID)
        ? BigInt(object.poolID.toString())
        : BigInt(0),
    };
  },
  toJSON(message: FeeToken): JsonSafe<FeeToken> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    message.poolID !== undefined &&
      (obj.poolID = (message.poolID || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<FeeToken>): FeeToken {
    const message = createBaseFeeToken();
    message.denom = object.denom ?? '';
    message.poolID =
      object.poolID !== undefined && object.poolID !== null
        ? BigInt(object.poolID.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: FeeTokenProtoMsg): FeeToken {
    return FeeToken.decode(message.value);
  },
  toProto(message: FeeToken): Uint8Array {
    return FeeToken.encode(message).finish();
  },
  toProtoMsg(message: FeeToken): FeeTokenProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.FeeToken',
      value: FeeToken.encode(message).finish(),
    };
  },
};
