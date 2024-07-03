//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** Params defines the parameters for the ibc-rate-limit module. */
export interface Params {
  contractAddress: string;
}
export interface ParamsProtoMsg {
  typeUrl: '/osmosis.ibcratelimit.v1beta1.Params';
  value: Uint8Array;
}
/** Params defines the parameters for the ibc-rate-limit module. */
export interface ParamsSDKType {
  contract_address: string;
}
function createBaseParams(): Params {
  return {
    contractAddress: '',
  };
}
export const Params = {
  typeUrl: '/osmosis.ibcratelimit.v1beta1.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.contractAddress !== '') {
      writer.uint32(10).string(message.contractAddress);
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
          message.contractAddress = reader.string();
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
      contractAddress: isSet(object.contractAddress)
        ? String(object.contractAddress)
        : '',
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    message.contractAddress !== undefined &&
      (obj.contractAddress = message.contractAddress);
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.contractAddress = object.contractAddress ?? '';
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
      typeUrl: '/osmosis.ibcratelimit.v1beta1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
