//@ts-nocheck
import { Coin, CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { JsonSafe } from '../../../json-safe.js';
/** Params defines the parameters for the tokenfactory module. */
export interface Params {
  denomCreationFee: Coin[];
}
export interface ParamsProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.Params';
  value: Uint8Array;
}
/** Params defines the parameters for the tokenfactory module. */
export interface ParamsSDKType {
  denom_creation_fee: CoinSDKType[];
}
function createBaseParams(): Params {
  return {
    denomCreationFee: [],
  };
}
export const Params = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.denomCreationFee) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Params {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denomCreationFee.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Params {
    return {
      denomCreationFee: Array.isArray(object?.denomCreationFee)
        ? object.denomCreationFee.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    if (message.denomCreationFee) {
      obj.denomCreationFee = message.denomCreationFee.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.denomCreationFee = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.denomCreationFee =
      object.denomCreationFee?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: ParamsProtoMsg): Params {
    return Params.decode(message.value);
  },
  toProto(message: Params): Uint8Array {
    return Params.encode(message).finish();
  },
  toProtoMsg(message: Params): ParamsProtoMsg {
    return {
      typeUrl: '/osmosis.tokenfactory.v1beta1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
