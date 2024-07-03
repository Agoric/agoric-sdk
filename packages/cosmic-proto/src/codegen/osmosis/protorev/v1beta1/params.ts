//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** Params defines the parameters for the module. */
export interface Params {
  /** Boolean whether the module is going to be enabled */
  enabled: boolean;
}
export interface ParamsProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.Params';
  value: Uint8Array;
}
/** Params defines the parameters for the module. */
export interface ParamsSDKType {
  enabled: boolean;
}
function createBaseParams(): Params {
  return {
    enabled: false,
  };
}
export const Params = {
  typeUrl: '/osmosis.protorev.v1beta1.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.enabled === true) {
      writer.uint32(8).bool(message.enabled);
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
          message.enabled = reader.bool();
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
      enabled: isSet(object.enabled) ? Boolean(object.enabled) : false,
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    message.enabled !== undefined && (obj.enabled = message.enabled);
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.enabled = object.enabled ?? false;
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
      typeUrl: '/osmosis.protorev.v1beta1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
