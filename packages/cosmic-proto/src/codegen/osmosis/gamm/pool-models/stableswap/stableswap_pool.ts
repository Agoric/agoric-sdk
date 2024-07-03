//@ts-nocheck
import { Coin, CoinSDKType } from '../../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { Decimal } from '@cosmjs/math';
import { isSet } from '../../../../helpers.js';
import { JsonSafe } from '../../../../json-safe.js';
/**
 * PoolParams defined the parameters that will be managed by the pool
 * governance in the future. This params are not managed by the chain
 * governance. Instead they will be managed by the token holders of the pool.
 * The pool's token holders are specified in future_pool_governor.
 */
export interface PoolParams {
  swapFee: string;
  exitFee: string;
}
export interface PoolParamsProtoMsg {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.PoolParams';
  value: Uint8Array;
}
/**
 * PoolParams defined the parameters that will be managed by the pool
 * governance in the future. This params are not managed by the chain
 * governance. Instead they will be managed by the token holders of the pool.
 * The pool's token holders are specified in future_pool_governor.
 */
export interface PoolParamsSDKType {
  swap_fee: string;
  exit_fee: string;
}
/** Pool is the stableswap Pool struct */
export interface Pool {
  $typeUrl?: '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool';
  address: string;
  id: bigint;
  poolParams: PoolParams;
  /**
   * This string specifies who will govern the pool in the future.
   * Valid forms of this are:
   * {token name},{duration}
   * {duration}
   * where {token name} if specified is the token which determines the
   * governor, and if not specified is the LP token for this pool.duration is
   * a time specified as 0w,1w,2w, etc. which specifies how long the token
   * would need to be locked up to count in governance. 0w means no lockup.
   */
  futurePoolGovernor: string;
  /** sum of all LP shares */
  totalShares: Coin;
  /** assets in the pool */
  poolLiquidity: Coin[];
  /** for calculation amognst assets with different precisions */
  scalingFactors: bigint[];
  /** scaling_factor_controller is the address can adjust pool scaling factors */
  scalingFactorController: string;
}
export interface PoolProtoMsg {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool';
  value: Uint8Array;
}
/** Pool is the stableswap Pool struct */
export interface PoolSDKType {
  $typeUrl?: '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool';
  address: string;
  id: bigint;
  pool_params: PoolParamsSDKType;
  future_pool_governor: string;
  total_shares: CoinSDKType;
  pool_liquidity: CoinSDKType[];
  scaling_factors: bigint[];
  scaling_factor_controller: string;
}
function createBasePoolParams(): PoolParams {
  return {
    swapFee: '',
    exitFee: '',
  };
}
export const PoolParams = {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.PoolParams',
  encode(
    message: PoolParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.swapFee !== '') {
      writer
        .uint32(10)
        .string(Decimal.fromUserInput(message.swapFee, 18).atomics);
    }
    if (message.exitFee !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.exitFee, 18).atomics);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PoolParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.swapFee = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        case 2:
          message.exitFee = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PoolParams {
    return {
      swapFee: isSet(object.swapFee) ? String(object.swapFee) : '',
      exitFee: isSet(object.exitFee) ? String(object.exitFee) : '',
    };
  },
  toJSON(message: PoolParams): JsonSafe<PoolParams> {
    const obj: any = {};
    message.swapFee !== undefined && (obj.swapFee = message.swapFee);
    message.exitFee !== undefined && (obj.exitFee = message.exitFee);
    return obj;
  },
  fromPartial(object: Partial<PoolParams>): PoolParams {
    const message = createBasePoolParams();
    message.swapFee = object.swapFee ?? '';
    message.exitFee = object.exitFee ?? '';
    return message;
  },
  fromProtoMsg(message: PoolParamsProtoMsg): PoolParams {
    return PoolParams.decode(message.value);
  },
  toProto(message: PoolParams): Uint8Array {
    return PoolParams.encode(message).finish();
  },
  toProtoMsg(message: PoolParams): PoolParamsProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.PoolParams',
      value: PoolParams.encode(message).finish(),
    };
  },
};
function createBasePool(): Pool {
  return {
    $typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool',
    address: '',
    id: BigInt(0),
    poolParams: PoolParams.fromPartial({}),
    futurePoolGovernor: '',
    totalShares: Coin.fromPartial({}),
    poolLiquidity: [],
    scalingFactors: [],
    scalingFactorController: '',
  };
}
export const Pool = {
  typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool',
  encode(
    message: Pool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.id !== BigInt(0)) {
      writer.uint32(16).uint64(message.id);
    }
    if (message.poolParams !== undefined) {
      PoolParams.encode(message.poolParams, writer.uint32(26).fork()).ldelim();
    }
    if (message.futurePoolGovernor !== '') {
      writer.uint32(34).string(message.futurePoolGovernor);
    }
    if (message.totalShares !== undefined) {
      Coin.encode(message.totalShares, writer.uint32(42).fork()).ldelim();
    }
    for (const v of message.poolLiquidity) {
      Coin.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    writer.uint32(58).fork();
    for (const v of message.scalingFactors) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (message.scalingFactorController !== '') {
      writer.uint32(66).string(message.scalingFactorController);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Pool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.id = reader.uint64();
          break;
        case 3:
          message.poolParams = PoolParams.decode(reader, reader.uint32());
          break;
        case 4:
          message.futurePoolGovernor = reader.string();
          break;
        case 5:
          message.totalShares = Coin.decode(reader, reader.uint32());
          break;
        case 6:
          message.poolLiquidity.push(Coin.decode(reader, reader.uint32()));
          break;
        case 7:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.scalingFactors.push(reader.uint64());
            }
          } else {
            message.scalingFactors.push(reader.uint64());
          }
          break;
        case 8:
          message.scalingFactorController = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Pool {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      id: isSet(object.id) ? BigInt(object.id.toString()) : BigInt(0),
      poolParams: isSet(object.poolParams)
        ? PoolParams.fromJSON(object.poolParams)
        : undefined,
      futurePoolGovernor: isSet(object.futurePoolGovernor)
        ? String(object.futurePoolGovernor)
        : '',
      totalShares: isSet(object.totalShares)
        ? Coin.fromJSON(object.totalShares)
        : undefined,
      poolLiquidity: Array.isArray(object?.poolLiquidity)
        ? object.poolLiquidity.map((e: any) => Coin.fromJSON(e))
        : [],
      scalingFactors: Array.isArray(object?.scalingFactors)
        ? object.scalingFactors.map((e: any) => BigInt(e.toString()))
        : [],
      scalingFactorController: isSet(object.scalingFactorController)
        ? String(object.scalingFactorController)
        : '',
    };
  },
  toJSON(message: Pool): JsonSafe<Pool> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.id !== undefined && (obj.id = (message.id || BigInt(0)).toString());
    message.poolParams !== undefined &&
      (obj.poolParams = message.poolParams
        ? PoolParams.toJSON(message.poolParams)
        : undefined);
    message.futurePoolGovernor !== undefined &&
      (obj.futurePoolGovernor = message.futurePoolGovernor);
    message.totalShares !== undefined &&
      (obj.totalShares = message.totalShares
        ? Coin.toJSON(message.totalShares)
        : undefined);
    if (message.poolLiquidity) {
      obj.poolLiquidity = message.poolLiquidity.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.poolLiquidity = [];
    }
    if (message.scalingFactors) {
      obj.scalingFactors = message.scalingFactors.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.scalingFactors = [];
    }
    message.scalingFactorController !== undefined &&
      (obj.scalingFactorController = message.scalingFactorController);
    return obj;
  },
  fromPartial(object: Partial<Pool>): Pool {
    const message = createBasePool();
    message.address = object.address ?? '';
    message.id =
      object.id !== undefined && object.id !== null
        ? BigInt(object.id.toString())
        : BigInt(0);
    message.poolParams =
      object.poolParams !== undefined && object.poolParams !== null
        ? PoolParams.fromPartial(object.poolParams)
        : undefined;
    message.futurePoolGovernor = object.futurePoolGovernor ?? '';
    message.totalShares =
      object.totalShares !== undefined && object.totalShares !== null
        ? Coin.fromPartial(object.totalShares)
        : undefined;
    message.poolLiquidity =
      object.poolLiquidity?.map(e => Coin.fromPartial(e)) || [];
    message.scalingFactors =
      object.scalingFactors?.map(e => BigInt(e.toString())) || [];
    message.scalingFactorController = object.scalingFactorController ?? '';
    return message;
  },
  fromProtoMsg(message: PoolProtoMsg): Pool {
    return Pool.decode(message.value);
  },
  toProto(message: Pool): Uint8Array {
    return Pool.encode(message).finish();
  },
  toProtoMsg(message: Pool): PoolProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.poolmodels.stableswap.v1beta1.Pool',
      value: Pool.encode(message).finish(),
    };
  },
};
