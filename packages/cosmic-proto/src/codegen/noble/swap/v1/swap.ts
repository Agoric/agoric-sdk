//@ts-nocheck
import { Coin, type CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
export interface Route {
  /** ID of the Pool. */
  poolId: bigint;
  /** Destination denom after the Swap in the Pool. */
  denomTo: string;
}
export interface RouteProtoMsg {
  typeUrl: '/noble.swap.v1.Route';
  value: Uint8Array;
}
export interface RouteSDKType {
  pool_id: bigint;
  denom_to: string;
}
export interface Swap {
  /** ID of the pool used in the swap. */
  poolId: bigint;
  /** The input coin for the swap. */
  in: Coin;
  /** The output coin after the swap. */
  out: Coin;
  /** Any fees incurred during the swap. */
  fees: Coin[];
}
export interface SwapProtoMsg {
  typeUrl: '/noble.swap.v1.Swap';
  value: Uint8Array;
}
export interface SwapSDKType {
  pool_id: bigint;
  in: CoinSDKType;
  out: CoinSDKType;
  fees: CoinSDKType[];
}
function createBaseRoute(): Route {
  return {
    poolId: BigInt(0),
    denomTo: '',
  };
}
export const Route = {
  typeUrl: '/noble.swap.v1.Route',
  encode(
    message: Route,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.denomTo !== '') {
      writer.uint32(18).string(message.denomTo);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Route {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRoute();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.denomTo = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Route {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      denomTo: isSet(object.denomTo) ? String(object.denomTo) : '',
    };
  },
  toJSON(message: Route): JsonSafe<Route> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.denomTo !== undefined && (obj.denomTo = message.denomTo);
    return obj;
  },
  fromPartial(object: Partial<Route>): Route {
    const message = createBaseRoute();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.denomTo = object.denomTo ?? '';
    return message;
  },
  fromProtoMsg(message: RouteProtoMsg): Route {
    return Route.decode(message.value);
  },
  toProto(message: Route): Uint8Array {
    return Route.encode(message).finish();
  },
  toProtoMsg(message: Route): RouteProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.Route',
      value: Route.encode(message).finish(),
    };
  },
};
function createBaseSwap(): Swap {
  return {
    poolId: BigInt(0),
    in: Coin.fromPartial({}),
    out: Coin.fromPartial({}),
    fees: [],
  };
}
export const Swap = {
  typeUrl: '/noble.swap.v1.Swap',
  encode(
    message: Swap,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.in !== undefined) {
      Coin.encode(message.in, writer.uint32(18).fork()).ldelim();
    }
    if (message.out !== undefined) {
      Coin.encode(message.out, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.fees) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Swap {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSwap();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.in = Coin.decode(reader, reader.uint32());
          break;
        case 3:
          message.out = Coin.decode(reader, reader.uint32());
          break;
        case 4:
          message.fees.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Swap {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      in: isSet(object.in) ? Coin.fromJSON(object.in) : undefined,
      out: isSet(object.out) ? Coin.fromJSON(object.out) : undefined,
      fees: Array.isArray(object?.fees)
        ? object.fees.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Swap): JsonSafe<Swap> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.in !== undefined &&
      (obj.in = message.in ? Coin.toJSON(message.in) : undefined);
    message.out !== undefined &&
      (obj.out = message.out ? Coin.toJSON(message.out) : undefined);
    if (message.fees) {
      obj.fees = message.fees.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.fees = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Swap>): Swap {
    const message = createBaseSwap();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.in =
      object.in !== undefined && object.in !== null
        ? Coin.fromPartial(object.in)
        : undefined;
    message.out =
      object.out !== undefined && object.out !== null
        ? Coin.fromPartial(object.out)
        : undefined;
    message.fees = object.fees?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: SwapProtoMsg): Swap {
    return Swap.decode(message.value);
  },
  toProto(message: Swap): Uint8Array {
    return Swap.encode(message).finish();
  },
  toProtoMsg(message: Swap): SwapProtoMsg {
    return {
      typeUrl: '/noble.swap.v1.Swap',
      value: Swap.encode(message).finish(),
    };
  },
};
