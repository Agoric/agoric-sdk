//@ts-nocheck
import {
  CounterpartyInfo,
  type CounterpartyInfoSDKType,
} from './counterparty.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * GenesisCounterpartyInfo defines the state associating a client with a counterparty.
 * @name GenesisCounterpartyInfo
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.GenesisCounterpartyInfo
 */
export interface GenesisCounterpartyInfo {
  /**
   * ClientId is the ID of the given client.
   */
  clientId: string;
  /**
   * CounterpartyInfo is the counterparty info of the given client.
   */
  counterpartyInfo: CounterpartyInfo;
}
export interface GenesisCounterpartyInfoProtoMsg {
  typeUrl: '/ibc.core.client.v2.GenesisCounterpartyInfo';
  value: Uint8Array;
}
/**
 * GenesisCounterpartyInfo defines the state associating a client with a counterparty.
 * @name GenesisCounterpartyInfoSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.GenesisCounterpartyInfo
 */
export interface GenesisCounterpartyInfoSDKType {
  client_id: string;
  counterparty_info: CounterpartyInfoSDKType;
}
/**
 * GenesisState defines the ibc client v2 submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.GenesisState
 */
export interface GenesisState {
  /**
   * counterparty info for each client
   */
  counterpartyInfos: GenesisCounterpartyInfo[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/ibc.core.client.v2.GenesisState';
  value: Uint8Array;
}
/**
 * GenesisState defines the ibc client v2 submodule's genesis state.
 * @name GenesisStateSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.GenesisState
 */
export interface GenesisStateSDKType {
  counterparty_infos: GenesisCounterpartyInfoSDKType[];
}
function createBaseGenesisCounterpartyInfo(): GenesisCounterpartyInfo {
  return {
    clientId: '',
    counterpartyInfo: CounterpartyInfo.fromPartial({}),
  };
}
/**
 * GenesisCounterpartyInfo defines the state associating a client with a counterparty.
 * @name GenesisCounterpartyInfo
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.GenesisCounterpartyInfo
 */
export const GenesisCounterpartyInfo = {
  typeUrl: '/ibc.core.client.v2.GenesisCounterpartyInfo' as const,
  aminoType: 'cosmos-sdk/GenesisCounterpartyInfo' as const,
  is(o: any): o is GenesisCounterpartyInfo {
    return (
      o &&
      (o.$typeUrl === GenesisCounterpartyInfo.typeUrl ||
        (typeof o.clientId === 'string' &&
          CounterpartyInfo.is(o.counterpartyInfo)))
    );
  },
  isSDK(o: any): o is GenesisCounterpartyInfoSDKType {
    return (
      o &&
      (o.$typeUrl === GenesisCounterpartyInfo.typeUrl ||
        (typeof o.client_id === 'string' &&
          CounterpartyInfo.isSDK(o.counterparty_info)))
    );
  },
  encode(
    message: GenesisCounterpartyInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.counterpartyInfo !== undefined) {
      CounterpartyInfo.encode(
        message.counterpartyInfo,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GenesisCounterpartyInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisCounterpartyInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.counterpartyInfo = CounterpartyInfo.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisCounterpartyInfo {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      counterpartyInfo: isSet(object.counterpartyInfo)
        ? CounterpartyInfo.fromJSON(object.counterpartyInfo)
        : undefined,
    };
  },
  toJSON(message: GenesisCounterpartyInfo): JsonSafe<GenesisCounterpartyInfo> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.counterpartyInfo !== undefined &&
      (obj.counterpartyInfo = message.counterpartyInfo
        ? CounterpartyInfo.toJSON(message.counterpartyInfo)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<GenesisCounterpartyInfo>,
  ): GenesisCounterpartyInfo {
    const message = createBaseGenesisCounterpartyInfo();
    message.clientId = object.clientId ?? '';
    message.counterpartyInfo =
      object.counterpartyInfo !== undefined && object.counterpartyInfo !== null
        ? CounterpartyInfo.fromPartial(object.counterpartyInfo)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: GenesisCounterpartyInfoProtoMsg,
  ): GenesisCounterpartyInfo {
    return GenesisCounterpartyInfo.decode(message.value);
  },
  toProto(message: GenesisCounterpartyInfo): Uint8Array {
    return GenesisCounterpartyInfo.encode(message).finish();
  },
  toProtoMsg(
    message: GenesisCounterpartyInfo,
  ): GenesisCounterpartyInfoProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.GenesisCounterpartyInfo',
      value: GenesisCounterpartyInfo.encode(message).finish(),
    };
  },
};
function createBaseGenesisState(): GenesisState {
  return {
    counterpartyInfos: [],
  };
}
/**
 * GenesisState defines the ibc client v2 submodule's genesis state.
 * @name GenesisState
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.GenesisState
 */
export const GenesisState = {
  typeUrl: '/ibc.core.client.v2.GenesisState' as const,
  aminoType: 'cosmos-sdk/GenesisState' as const,
  is(o: any): o is GenesisState {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.counterpartyInfos) &&
          (!o.counterpartyInfos.length ||
            GenesisCounterpartyInfo.is(o.counterpartyInfos[0]))))
    );
  },
  isSDK(o: any): o is GenesisStateSDKType {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.counterparty_infos) &&
          (!o.counterparty_infos.length ||
            GenesisCounterpartyInfo.isSDK(o.counterparty_infos[0]))))
    );
  },
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.counterpartyInfos) {
      GenesisCounterpartyInfo.encode(v!, writer.uint32(10).fork()).ldelim();
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
          message.counterpartyInfos.push(
            GenesisCounterpartyInfo.decode(reader, reader.uint32()),
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
      counterpartyInfos: Array.isArray(object?.counterpartyInfos)
        ? object.counterpartyInfos.map((e: any) =>
            GenesisCounterpartyInfo.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.counterpartyInfos) {
      obj.counterpartyInfos = message.counterpartyInfos.map(e =>
        e ? GenesisCounterpartyInfo.toJSON(e) : undefined,
      );
    } else {
      obj.counterpartyInfos = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.counterpartyInfos =
      object.counterpartyInfos?.map(e =>
        GenesisCounterpartyInfo.fromPartial(e),
      ) || [];
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
      typeUrl: '/ibc.core.client.v2.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
