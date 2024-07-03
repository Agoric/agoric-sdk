//@ts-nocheck
import { Coin, CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { Any, AnySDKType } from '../../../google/protobuf/any.js';
import { Pool as Pool1 } from '../pool-models/balancer/balancerPool.js';
import { PoolSDKType as Pool1SDKType } from '../pool-models/balancer/balancerPool.js';
import { Pool as Pool2 } from '../pool-models/stableswap/stableswap_pool.js';
import { PoolSDKType as Pool2SDKType } from '../pool-models/stableswap/stableswap_pool.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/** Params holds parameters for the incentives module */
export interface Params {
  poolCreationFee: Coin[];
}
export interface ParamsProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.Params';
  value: Uint8Array;
}
/** Params holds parameters for the incentives module */
export interface ParamsSDKType {
  pool_creation_fee: CoinSDKType[];
}
/** GenesisState defines the gamm module's genesis state. */
export interface GenesisState {
  pools: (Pool1 & Pool2 & Any)[] | Any[];
  /** will be renamed to next_pool_id in an upcoming version */
  nextPoolNumber: bigint;
  params: Params;
}
export interface GenesisStateProtoMsg {
  typeUrl: '/osmosis.gamm.v1beta1.GenesisState';
  value: Uint8Array;
}
/** GenesisState defines the gamm module's genesis state. */
export interface GenesisStateSDKType {
  pools: (Pool1SDKType | Pool2SDKType | AnySDKType)[];
  next_pool_number: bigint;
  params: ParamsSDKType;
}
function createBaseParams(): Params {
  return {
    poolCreationFee: [],
  };
}
export const Params = {
  typeUrl: '/osmosis.gamm.v1beta1.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.poolCreationFee) {
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
          message.poolCreationFee.push(Coin.decode(reader, reader.uint32()));
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
      poolCreationFee: Array.isArray(object?.poolCreationFee)
        ? object.poolCreationFee.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    if (message.poolCreationFee) {
      obj.poolCreationFee = message.poolCreationFee.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.poolCreationFee = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.poolCreationFee =
      object.poolCreationFee?.map(e => Coin.fromPartial(e)) || [];
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
      typeUrl: '/osmosis.gamm.v1beta1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
function createBaseGenesisState(): GenesisState {
  return {
    pools: [],
    nextPoolNumber: BigInt(0),
    params: Params.fromPartial({}),
  };
}
export const GenesisState = {
  typeUrl: '/osmosis.gamm.v1beta1.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.pools) {
      Any.encode(v! as Any, writer.uint32(10).fork()).ldelim();
    }
    if (message.nextPoolNumber !== BigInt(0)) {
      writer.uint32(16).uint64(message.nextPoolNumber);
    }
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(26).fork()).ldelim();
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
          message.pools.push(Any.decode(reader, reader.uint32()) as Any);
          break;
        case 2:
          message.nextPoolNumber = reader.uint64();
          break;
        case 3:
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
      pools: Array.isArray(object?.pools)
        ? object.pools.map((e: any) => Any.fromJSON(e))
        : [],
      nextPoolNumber: isSet(object.nextPoolNumber)
        ? BigInt(object.nextPoolNumber.toString())
        : BigInt(0),
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.pools) {
      obj.pools = message.pools.map(e => (e ? Any.toJSON(e) : undefined));
    } else {
      obj.pools = [];
    }
    message.nextPoolNumber !== undefined &&
      (obj.nextPoolNumber = (message.nextPoolNumber || BigInt(0)).toString());
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.pools = object.pools?.map(e => Any.fromPartial(e)) || [];
    message.nextPoolNumber =
      object.nextPoolNumber !== undefined && object.nextPoolNumber !== null
        ? BigInt(object.nextPoolNumber.toString())
        : BigInt(0);
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
      typeUrl: '/osmosis.gamm.v1beta1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
export const PoolI_InterfaceDecoder = (
  input: BinaryReader | Uint8Array,
): Pool1 | Pool2 | Any => {
  const reader =
    input instanceof BinaryReader ? input : new BinaryReader(input);
  const data = Any.decode(reader, reader.uint32());
  switch (data.typeUrl) {
    case '/osmosis.gamm.v1beta1.Pool':
      return Pool1.decode(data.value);
    case '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool':
      return Pool2.decode(data.value);
    default:
      return data;
  }
};
