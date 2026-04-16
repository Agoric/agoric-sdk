//@ts-nocheck
import {
  ContinuousFund,
  type ContinuousFundSDKType,
  Params,
  type ParamsSDKType,
} from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the protocolpool module's genesis state.
 * @name GenesisState
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.GenesisState
 */
export interface GenesisState {
  /**
   * ContinuousFunds defines the continuous funds at genesis.
   */
  continuousFunds: ContinuousFund[];
  /**
   * Params defines the parameters of this module, currently only contains the
   * denoms that will be used for continuous fund distributions.
   */
  params: Params;
}
export interface GenesisStateProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.GenesisState';
  value: Uint8Array;
}
/**
 * GenesisState defines the protocolpool module's genesis state.
 * @name GenesisStateSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.GenesisState
 */
export interface GenesisStateSDKType {
  continuous_funds: ContinuousFundSDKType[];
  params: ParamsSDKType;
}
function createBaseGenesisState(): GenesisState {
  return {
    continuousFunds: [],
    params: Params.fromPartial({}),
  };
}
/**
 * GenesisState defines the protocolpool module's genesis state.
 * @name GenesisState
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.GenesisState
 */
export const GenesisState = {
  typeUrl: '/cosmos.protocolpool.v1.GenesisState' as const,
  aminoType: 'cosmos-sdk/GenesisState' as const,
  is(o: any): o is GenesisState {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.continuousFunds) &&
          (!o.continuousFunds.length ||
            ContinuousFund.is(o.continuousFunds[0])) &&
          Params.is(o.params)))
    );
  },
  isSDK(o: any): o is GenesisStateSDKType {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Array.isArray(o.continuous_funds) &&
          (!o.continuous_funds.length ||
            ContinuousFund.isSDK(o.continuous_funds[0])) &&
          Params.isSDK(o.params)))
    );
  },
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.continuousFunds) {
      ContinuousFund.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(18).fork()).ldelim();
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
          message.continuousFunds.push(
            ContinuousFund.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.params = Params.decode(reader, reader.uint32());
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
      continuousFunds: Array.isArray(object?.continuousFunds)
        ? object.continuousFunds.map((e: any) => ContinuousFund.fromJSON(e))
        : [],
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.continuousFunds) {
      obj.continuousFunds = message.continuousFunds.map(e =>
        e ? ContinuousFund.toJSON(e) : undefined,
      );
    } else {
      obj.continuousFunds = [];
    }
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.continuousFunds =
      object.continuousFunds?.map(e => ContinuousFund.fromPartial(e)) || [];
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
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
      typeUrl: '/cosmos.protocolpool.v1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
