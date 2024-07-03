//@ts-nocheck
import { Coin, CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** TokenPairArbRoutes tracks all of the hot routes for a given pair of tokens */
export interface TokenPairArbRoutes {
  /** Stores all of the possible hot paths for a given pair of tokens */
  arbRoutes: Route[];
  /** Token denomination of the first asset */
  tokenIn: string;
  /** Token denomination of the second asset */
  tokenOut: string;
}
export interface TokenPairArbRoutesProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.TokenPairArbRoutes';
  value: Uint8Array;
}
/** TokenPairArbRoutes tracks all of the hot routes for a given pair of tokens */
export interface TokenPairArbRoutesSDKType {
  arb_routes: RouteSDKType[];
  token_in: string;
  token_out: string;
}
/** Route is a hot route for a given pair of tokens */
export interface Route {
  /**
   * The pool IDs that are travered in the directed cyclic graph (traversed left
   * -> right)
   */
  trades: Trade[];
}
export interface RouteProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.Route';
  value: Uint8Array;
}
/** Route is a hot route for a given pair of tokens */
export interface RouteSDKType {
  trades: TradeSDKType[];
}
/** Trade is a single trade in a route */
export interface Trade {
  /**
   * The pool IDs that are travered in the directed cyclic graph (traversed left
   * -> right)
   */
  pool: bigint;
  /** The denom of token A that is traded */
  tokenIn: string;
  /** The denom of token B that is traded */
  tokenOut: string;
}
export interface TradeProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.Trade';
  value: Uint8Array;
}
/** Trade is a single trade in a route */
export interface TradeSDKType {
  pool: bigint;
  token_in: string;
  token_out: string;
}
/**
 * PoolStatistics contains the number of trades the module has executed after a
 * swap on a given pool and the profits from the trades
 */
export interface PoolStatistics {
  /** profits is the total profit from all trades on this pool */
  profits: Coin[];
  /** number_of_trades is the number of trades the module has executed */
  numberOfTrades: string;
  /** pool_id is the id of the pool */
  poolId: bigint;
}
export interface PoolStatisticsProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.PoolStatistics';
  value: Uint8Array;
}
/**
 * PoolStatistics contains the number of trades the module has executed after a
 * swap on a given pool and the profits from the trades
 */
export interface PoolStatisticsSDKType {
  profits: CoinSDKType[];
  number_of_trades: string;
  pool_id: bigint;
}
function createBaseTokenPairArbRoutes(): TokenPairArbRoutes {
  return {
    arbRoutes: [],
    tokenIn: '',
    tokenOut: '',
  };
}
export const TokenPairArbRoutes = {
  typeUrl: '/osmosis.protorev.v1beta1.TokenPairArbRoutes',
  encode(
    message: TokenPairArbRoutes,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.arbRoutes) {
      Route.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.tokenIn !== '') {
      writer.uint32(18).string(message.tokenIn);
    }
    if (message.tokenOut !== '') {
      writer.uint32(26).string(message.tokenOut);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TokenPairArbRoutes {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTokenPairArbRoutes();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.arbRoutes.push(Route.decode(reader, reader.uint32()));
          break;
        case 2:
          message.tokenIn = reader.string();
          break;
        case 3:
          message.tokenOut = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TokenPairArbRoutes {
    return {
      arbRoutes: Array.isArray(object?.arbRoutes)
        ? object.arbRoutes.map((e: any) => Route.fromJSON(e))
        : [],
      tokenIn: isSet(object.tokenIn) ? String(object.tokenIn) : '',
      tokenOut: isSet(object.tokenOut) ? String(object.tokenOut) : '',
    };
  },
  toJSON(message: TokenPairArbRoutes): JsonSafe<TokenPairArbRoutes> {
    const obj: any = {};
    if (message.arbRoutes) {
      obj.arbRoutes = message.arbRoutes.map(e =>
        e ? Route.toJSON(e) : undefined,
      );
    } else {
      obj.arbRoutes = [];
    }
    message.tokenIn !== undefined && (obj.tokenIn = message.tokenIn);
    message.tokenOut !== undefined && (obj.tokenOut = message.tokenOut);
    return obj;
  },
  fromPartial(object: Partial<TokenPairArbRoutes>): TokenPairArbRoutes {
    const message = createBaseTokenPairArbRoutes();
    message.arbRoutes = object.arbRoutes?.map(e => Route.fromPartial(e)) || [];
    message.tokenIn = object.tokenIn ?? '';
    message.tokenOut = object.tokenOut ?? '';
    return message;
  },
  fromProtoMsg(message: TokenPairArbRoutesProtoMsg): TokenPairArbRoutes {
    return TokenPairArbRoutes.decode(message.value);
  },
  toProto(message: TokenPairArbRoutes): Uint8Array {
    return TokenPairArbRoutes.encode(message).finish();
  },
  toProtoMsg(message: TokenPairArbRoutes): TokenPairArbRoutesProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.TokenPairArbRoutes',
      value: TokenPairArbRoutes.encode(message).finish(),
    };
  },
};
function createBaseRoute(): Route {
  return {
    trades: [],
  };
}
export const Route = {
  typeUrl: '/osmosis.protorev.v1beta1.Route',
  encode(
    message: Route,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.trades) {
      Trade.encode(v!, writer.uint32(10).fork()).ldelim();
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
          message.trades.push(Trade.decode(reader, reader.uint32()));
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
      trades: Array.isArray(object?.trades)
        ? object.trades.map((e: any) => Trade.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Route): JsonSafe<Route> {
    const obj: any = {};
    if (message.trades) {
      obj.trades = message.trades.map(e => (e ? Trade.toJSON(e) : undefined));
    } else {
      obj.trades = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Route>): Route {
    const message = createBaseRoute();
    message.trades = object.trades?.map(e => Trade.fromPartial(e)) || [];
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
      typeUrl: '/osmosis.protorev.v1beta1.Route',
      value: Route.encode(message).finish(),
    };
  },
};
function createBaseTrade(): Trade {
  return {
    pool: BigInt(0),
    tokenIn: '',
    tokenOut: '',
  };
}
export const Trade = {
  typeUrl: '/osmosis.protorev.v1beta1.Trade',
  encode(
    message: Trade,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pool !== BigInt(0)) {
      writer.uint32(8).uint64(message.pool);
    }
    if (message.tokenIn !== '') {
      writer.uint32(18).string(message.tokenIn);
    }
    if (message.tokenOut !== '') {
      writer.uint32(26).string(message.tokenOut);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Trade {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTrade();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pool = reader.uint64();
          break;
        case 2:
          message.tokenIn = reader.string();
          break;
        case 3:
          message.tokenOut = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Trade {
    return {
      pool: isSet(object.pool) ? BigInt(object.pool.toString()) : BigInt(0),
      tokenIn: isSet(object.tokenIn) ? String(object.tokenIn) : '',
      tokenOut: isSet(object.tokenOut) ? String(object.tokenOut) : '',
    };
  },
  toJSON(message: Trade): JsonSafe<Trade> {
    const obj: any = {};
    message.pool !== undefined &&
      (obj.pool = (message.pool || BigInt(0)).toString());
    message.tokenIn !== undefined && (obj.tokenIn = message.tokenIn);
    message.tokenOut !== undefined && (obj.tokenOut = message.tokenOut);
    return obj;
  },
  fromPartial(object: Partial<Trade>): Trade {
    const message = createBaseTrade();
    message.pool =
      object.pool !== undefined && object.pool !== null
        ? BigInt(object.pool.toString())
        : BigInt(0);
    message.tokenIn = object.tokenIn ?? '';
    message.tokenOut = object.tokenOut ?? '';
    return message;
  },
  fromProtoMsg(message: TradeProtoMsg): Trade {
    return Trade.decode(message.value);
  },
  toProto(message: Trade): Uint8Array {
    return Trade.encode(message).finish();
  },
  toProtoMsg(message: Trade): TradeProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.Trade',
      value: Trade.encode(message).finish(),
    };
  },
};
function createBasePoolStatistics(): PoolStatistics {
  return {
    profits: [],
    numberOfTrades: '',
    poolId: BigInt(0),
  };
}
export const PoolStatistics = {
  typeUrl: '/osmosis.protorev.v1beta1.PoolStatistics',
  encode(
    message: PoolStatistics,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.profits) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.numberOfTrades !== '') {
      writer.uint32(18).string(message.numberOfTrades);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(24).uint64(message.poolId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PoolStatistics {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolStatistics();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.profits.push(Coin.decode(reader, reader.uint32()));
          break;
        case 2:
          message.numberOfTrades = reader.string();
          break;
        case 3:
          message.poolId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PoolStatistics {
    return {
      profits: Array.isArray(object?.profits)
        ? object.profits.map((e: any) => Coin.fromJSON(e))
        : [],
      numberOfTrades: isSet(object.numberOfTrades)
        ? String(object.numberOfTrades)
        : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: PoolStatistics): JsonSafe<PoolStatistics> {
    const obj: any = {};
    if (message.profits) {
      obj.profits = message.profits.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.profits = [];
    }
    message.numberOfTrades !== undefined &&
      (obj.numberOfTrades = message.numberOfTrades);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<PoolStatistics>): PoolStatistics {
    const message = createBasePoolStatistics();
    message.profits = object.profits?.map(e => Coin.fromPartial(e)) || [];
    message.numberOfTrades = object.numberOfTrades ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: PoolStatisticsProtoMsg): PoolStatistics {
    return PoolStatistics.decode(message.value);
  },
  toProto(message: PoolStatistics): Uint8Array {
    return PoolStatistics.encode(message).finish();
  },
  toProtoMsg(message: PoolStatistics): PoolStatisticsProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.PoolStatistics',
      value: PoolStatistics.encode(message).finish(),
    };
  },
};
