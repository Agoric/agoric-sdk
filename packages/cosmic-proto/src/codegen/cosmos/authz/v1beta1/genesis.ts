//@ts-nocheck
import { GrantAuthorization, type GrantAuthorizationSDKType } from './authz.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the authz module's genesis state.
 * @name GenesisState
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenesisState
 */
export interface GenesisState {
  authorization: GrantAuthorization[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.GenesisState';
  value: Uint8Array;
}
/**
 * GenesisState defines the authz module's genesis state.
 * @name GenesisStateSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenesisState
 */
export interface GenesisStateSDKType {
  authorization: GrantAuthorizationSDKType[];
}
function createBaseGenesisState(): GenesisState {
  return {
    authorization: [],
  };
}
/**
 * GenesisState defines the authz module's genesis state.
 * @name GenesisState
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenesisState
 */
export const GenesisState = {
  typeUrl: '/cosmos.authz.v1beta1.GenesisState' as const,
  aminoType: 'cosmos-sdk/GenesisState' as const,
  is(o: any): o is GenesisState {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.authorization) &&
          (!o.authorization.length ||
            GrantAuthorization.is(o.authorization[0]))))
    );
  },
  isSDK(o: any): o is GenesisStateSDKType {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.authorization) &&
          (!o.authorization.length ||
            GrantAuthorization.isSDK(o.authorization[0]))))
    );
  },
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.authorization) {
      GrantAuthorization.encode(v!, writer.uint32(10).fork()).ldelim();
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
          message.authorization.push(
            GrantAuthorization.decode(reader, reader.uint32()),
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
      authorization: Array.isArray(object?.authorization)
        ? object.authorization.map((e: any) => GrantAuthorization.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.authorization) {
      obj.authorization = message.authorization.map(e =>
        e ? GrantAuthorization.toJSON(e) : undefined,
      );
    } else {
      obj.authorization = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.authorization =
      object.authorization?.map(e => GrantAuthorization.fromPartial(e)) || [];
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
      typeUrl: '/cosmos.authz.v1beta1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
