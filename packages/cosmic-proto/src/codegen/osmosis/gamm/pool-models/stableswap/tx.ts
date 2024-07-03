//@ts-nocheck
import { PoolParams, PoolParamsSDKType } from './stableswap_pool.js';
import { Coin, CoinSDKType } from '../../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { JsonSafe } from '../../../../json-safe.js';
/** ===================== MsgCreatePool */
export interface MsgCreateStableswapPool {
  sender: string;
  poolParams?: PoolParams;
  initialPoolLiquidity: Coin[];
  scalingFactors: bigint[];
  futurePoolGovernor: string;
  scalingFactorController: string;
}
export interface MsgCreateStableswapPoolProtoMsg {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgCreateStableswapPool';
  value: Uint8Array;
}
/** ===================== MsgCreatePool */
export interface MsgCreateStableswapPoolSDKType {
  sender: string;
  pool_params?: PoolParamsSDKType;
  initial_pool_liquidity: CoinSDKType[];
  scaling_factors: bigint[];
  future_pool_governor: string;
  scaling_factor_controller: string;
}
/** Returns a poolID with custom poolName. */
export interface MsgCreateStableswapPoolResponse {
  poolId: bigint;
}
export interface MsgCreateStableswapPoolResponseProtoMsg {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgCreateStableswapPoolResponse';
  value: Uint8Array;
}
/** Returns a poolID with custom poolName. */
export interface MsgCreateStableswapPoolResponseSDKType {
  pool_id: bigint;
}
/**
 * Sender must be the pool's scaling_factor_governor in order for the tx to
 * succeed. Adjusts stableswap scaling factors.
 */
export interface MsgStableSwapAdjustScalingFactors {
  sender: string;
  poolId: bigint;
  scalingFactors: bigint[];
}
export interface MsgStableSwapAdjustScalingFactorsProtoMsg {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgStableSwapAdjustScalingFactors';
  value: Uint8Array;
}
/**
 * Sender must be the pool's scaling_factor_governor in order for the tx to
 * succeed. Adjusts stableswap scaling factors.
 */
export interface MsgStableSwapAdjustScalingFactorsSDKType {
  sender: string;
  pool_id: bigint;
  scaling_factors: bigint[];
}
export interface MsgStableSwapAdjustScalingFactorsResponse {}
export interface MsgStableSwapAdjustScalingFactorsResponseProtoMsg {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgStableSwapAdjustScalingFactorsResponse';
  value: Uint8Array;
}
export interface MsgStableSwapAdjustScalingFactorsResponseSDKType {}
function createBaseMsgCreateStableswapPool(): MsgCreateStableswapPool {
  return {
    sender: '',
    poolParams: undefined,
    initialPoolLiquidity: [],
    scalingFactors: [],
    futurePoolGovernor: '',
    scalingFactorController: '',
  };
}
export const MsgCreateStableswapPool = {
  typeUrl:
    '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgCreateStableswapPool',
  encode(
    message: MsgCreateStableswapPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolParams !== undefined) {
      PoolParams.encode(message.poolParams, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.initialPoolLiquidity) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    writer.uint32(34).fork();
    for (const v of message.scalingFactors) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (message.futurePoolGovernor !== '') {
      writer.uint32(42).string(message.futurePoolGovernor);
    }
    if (message.scalingFactorController !== '') {
      writer.uint32(50).string(message.scalingFactorController);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateStableswapPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateStableswapPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolParams = PoolParams.decode(reader, reader.uint32());
          break;
        case 3:
          message.initialPoolLiquidity.push(
            Coin.decode(reader, reader.uint32()),
          );
          break;
        case 4:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.scalingFactors.push(reader.uint64());
            }
          } else {
            message.scalingFactors.push(reader.uint64());
          }
          break;
        case 5:
          message.futurePoolGovernor = reader.string();
          break;
        case 6:
          message.scalingFactorController = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateStableswapPool {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolParams: isSet(object.poolParams)
        ? PoolParams.fromJSON(object.poolParams)
        : undefined,
      initialPoolLiquidity: Array.isArray(object?.initialPoolLiquidity)
        ? object.initialPoolLiquidity.map((e: any) => Coin.fromJSON(e))
        : [],
      scalingFactors: Array.isArray(object?.scalingFactors)
        ? object.scalingFactors.map((e: any) => BigInt(e.toString()))
        : [],
      futurePoolGovernor: isSet(object.futurePoolGovernor)
        ? String(object.futurePoolGovernor)
        : '',
      scalingFactorController: isSet(object.scalingFactorController)
        ? String(object.scalingFactorController)
        : '',
    };
  },
  toJSON(message: MsgCreateStableswapPool): JsonSafe<MsgCreateStableswapPool> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolParams !== undefined &&
      (obj.poolParams = message.poolParams
        ? PoolParams.toJSON(message.poolParams)
        : undefined);
    if (message.initialPoolLiquidity) {
      obj.initialPoolLiquidity = message.initialPoolLiquidity.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.initialPoolLiquidity = [];
    }
    if (message.scalingFactors) {
      obj.scalingFactors = message.scalingFactors.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.scalingFactors = [];
    }
    message.futurePoolGovernor !== undefined &&
      (obj.futurePoolGovernor = message.futurePoolGovernor);
    message.scalingFactorController !== undefined &&
      (obj.scalingFactorController = message.scalingFactorController);
    return obj;
  },
  fromPartial(
    object: Partial<MsgCreateStableswapPool>,
  ): MsgCreateStableswapPool {
    const message = createBaseMsgCreateStableswapPool();
    message.sender = object.sender ?? '';
    message.poolParams =
      object.poolParams !== undefined && object.poolParams !== null
        ? PoolParams.fromPartial(object.poolParams)
        : undefined;
    message.initialPoolLiquidity =
      object.initialPoolLiquidity?.map(e => Coin.fromPartial(e)) || [];
    message.scalingFactors =
      object.scalingFactors?.map(e => BigInt(e.toString())) || [];
    message.futurePoolGovernor = object.futurePoolGovernor ?? '';
    message.scalingFactorController = object.scalingFactorController ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgCreateStableswapPoolProtoMsg,
  ): MsgCreateStableswapPool {
    return MsgCreateStableswapPool.decode(message.value);
  },
  toProto(message: MsgCreateStableswapPool): Uint8Array {
    return MsgCreateStableswapPool.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCreateStableswapPool,
  ): MsgCreateStableswapPoolProtoMsg {
    return {
      typeUrl:
        '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgCreateStableswapPool',
      value: MsgCreateStableswapPool.encode(message).finish(),
    };
  },
};
function createBaseMsgCreateStableswapPoolResponse(): MsgCreateStableswapPoolResponse {
  return {
    poolId: BigInt(0),
  };
}
export const MsgCreateStableswapPoolResponse = {
  typeUrl:
    '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgCreateStableswapPoolResponse',
  encode(
    message: MsgCreateStableswapPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCreateStableswapPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateStableswapPoolResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCreateStableswapPoolResponse {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgCreateStableswapPoolResponse,
  ): JsonSafe<MsgCreateStableswapPoolResponse> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgCreateStableswapPoolResponse>,
  ): MsgCreateStableswapPoolResponse {
    const message = createBaseMsgCreateStableswapPoolResponse();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgCreateStableswapPoolResponseProtoMsg,
  ): MsgCreateStableswapPoolResponse {
    return MsgCreateStableswapPoolResponse.decode(message.value);
  },
  toProto(message: MsgCreateStableswapPoolResponse): Uint8Array {
    return MsgCreateStableswapPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCreateStableswapPoolResponse,
  ): MsgCreateStableswapPoolResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgCreateStableswapPoolResponse',
      value: MsgCreateStableswapPoolResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgStableSwapAdjustScalingFactors(): MsgStableSwapAdjustScalingFactors {
  return {
    sender: '',
    poolId: BigInt(0),
    scalingFactors: [],
  };
}
export const MsgStableSwapAdjustScalingFactors = {
  typeUrl:
    '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgStableSwapAdjustScalingFactors',
  encode(
    message: MsgStableSwapAdjustScalingFactors,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    writer.uint32(26).fork();
    for (const v of message.scalingFactors) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgStableSwapAdjustScalingFactors {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStableSwapAdjustScalingFactors();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        case 3:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.scalingFactors.push(reader.uint64());
            }
          } else {
            message.scalingFactors.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgStableSwapAdjustScalingFactors {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      scalingFactors: Array.isArray(object?.scalingFactors)
        ? object.scalingFactors.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: MsgStableSwapAdjustScalingFactors,
  ): JsonSafe<MsgStableSwapAdjustScalingFactors> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    if (message.scalingFactors) {
      obj.scalingFactors = message.scalingFactors.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.scalingFactors = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgStableSwapAdjustScalingFactors>,
  ): MsgStableSwapAdjustScalingFactors {
    const message = createBaseMsgStableSwapAdjustScalingFactors();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.scalingFactors =
      object.scalingFactors?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgStableSwapAdjustScalingFactorsProtoMsg,
  ): MsgStableSwapAdjustScalingFactors {
    return MsgStableSwapAdjustScalingFactors.decode(message.value);
  },
  toProto(message: MsgStableSwapAdjustScalingFactors): Uint8Array {
    return MsgStableSwapAdjustScalingFactors.encode(message).finish();
  },
  toProtoMsg(
    message: MsgStableSwapAdjustScalingFactors,
  ): MsgStableSwapAdjustScalingFactorsProtoMsg {
    return {
      typeUrl:
        '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgStableSwapAdjustScalingFactors',
      value: MsgStableSwapAdjustScalingFactors.encode(message).finish(),
    };
  },
};
function createBaseMsgStableSwapAdjustScalingFactorsResponse(): MsgStableSwapAdjustScalingFactorsResponse {
  return {};
}
export const MsgStableSwapAdjustScalingFactorsResponse = {
  typeUrl:
    '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgStableSwapAdjustScalingFactorsResponse',
  encode(
    _: MsgStableSwapAdjustScalingFactorsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgStableSwapAdjustScalingFactorsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStableSwapAdjustScalingFactorsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgStableSwapAdjustScalingFactorsResponse {
    return {};
  },
  toJSON(
    _: MsgStableSwapAdjustScalingFactorsResponse,
  ): JsonSafe<MsgStableSwapAdjustScalingFactorsResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgStableSwapAdjustScalingFactorsResponse>,
  ): MsgStableSwapAdjustScalingFactorsResponse {
    const message = createBaseMsgStableSwapAdjustScalingFactorsResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgStableSwapAdjustScalingFactorsResponseProtoMsg,
  ): MsgStableSwapAdjustScalingFactorsResponse {
    return MsgStableSwapAdjustScalingFactorsResponse.decode(message.value);
  },
  toProto(message: MsgStableSwapAdjustScalingFactorsResponse): Uint8Array {
    return MsgStableSwapAdjustScalingFactorsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgStableSwapAdjustScalingFactorsResponse,
  ): MsgStableSwapAdjustScalingFactorsResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.gamm.poolmodels.stableswap.v1beta1.MsgStableSwapAdjustScalingFactorsResponse',
      value: MsgStableSwapAdjustScalingFactorsResponse.encode(message).finish(),
    };
  },
};
