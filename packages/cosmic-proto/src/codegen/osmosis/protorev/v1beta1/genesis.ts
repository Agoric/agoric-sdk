//@ts-nocheck
import { Params, ParamsSDKType } from './params.js';
import { TokenPairArbRoutes, TokenPairArbRoutesSDKType } from './protorev.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** GenesisState defines the protorev module's genesis state. */
export interface GenesisState {
  /** Module Parameters */
  params: Params;
  /** Hot routes that are configured on genesis */
  tokenPairs: TokenPairArbRoutes[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.GenesisState';
  value: Uint8Array;
}
/** GenesisState defines the protorev module's genesis state. */
export interface GenesisStateSDKType {
  params: ParamsSDKType;
  token_pairs: TokenPairArbRoutesSDKType[];
}
function createBaseGenesisState(): GenesisState {
  return {
    params: Params.fromPartial({}),
    tokenPairs: [],
  };
}
export const GenesisState = {
  typeUrl: '/osmosis.protorev.v1beta1.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.tokenPairs) {
      TokenPairArbRoutes.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GenesisState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        case 2:
          message.tokenPairs.push(
            TokenPairArbRoutes.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
      tokenPairs: Array.isArray(object?.tokenPairs)
        ? object.tokenPairs.map((e: any) => TokenPairArbRoutes.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    if (message.tokenPairs) {
      obj.tokenPairs = message.tokenPairs.map(e =>
        e ? TokenPairArbRoutes.toJSON(e) : undefined,
      );
    } else {
      obj.tokenPairs = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    message.tokenPairs =
      object.tokenPairs?.map(e => TokenPairArbRoutes.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: GenesisStateProtoMsg): GenesisState {
    return GenesisState.decode(message.value);
  },
  toProto(message: GenesisState): Uint8Array {
    return GenesisState.encode(message).finish();
  },
  toProtoMsg(message: GenesisState): GenesisStateProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
