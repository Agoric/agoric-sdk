//@ts-nocheck
import { Coin, CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { JsonSafe } from '../../json-safe.js';
export interface MsgSuperfluidDelegate {
  sender: string;
  lockId: bigint;
  valAddr: string;
}
export interface MsgSuperfluidDelegateProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidDelegate';
  value: Uint8Array;
}
export interface MsgSuperfluidDelegateSDKType {
  sender: string;
  lock_id: bigint;
  val_addr: string;
}
export interface MsgSuperfluidDelegateResponse {}
export interface MsgSuperfluidDelegateResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidDelegateResponse';
  value: Uint8Array;
}
export interface MsgSuperfluidDelegateResponseSDKType {}
export interface MsgSuperfluidUndelegate {
  sender: string;
  lockId: bigint;
}
export interface MsgSuperfluidUndelegateProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUndelegate';
  value: Uint8Array;
}
export interface MsgSuperfluidUndelegateSDKType {
  sender: string;
  lock_id: bigint;
}
export interface MsgSuperfluidUndelegateResponse {}
export interface MsgSuperfluidUndelegateResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUndelegateResponse';
  value: Uint8Array;
}
export interface MsgSuperfluidUndelegateResponseSDKType {}
export interface MsgSuperfluidUnbondLock {
  sender: string;
  lockId: bigint;
}
export interface MsgSuperfluidUnbondLockProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUnbondLock';
  value: Uint8Array;
}
export interface MsgSuperfluidUnbondLockSDKType {
  sender: string;
  lock_id: bigint;
}
export interface MsgSuperfluidUnbondLockResponse {}
export interface MsgSuperfluidUnbondLockResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUnbondLockResponse';
  value: Uint8Array;
}
export interface MsgSuperfluidUnbondLockResponseSDKType {}
/**
 * MsgLockAndSuperfluidDelegate locks coins with the unbonding period duration,
 * and then does a superfluid lock from the newly created lockup, to the
 * specified validator addr.
 */
export interface MsgLockAndSuperfluidDelegate {
  sender: string;
  coins: Coin[];
  valAddr: string;
}
export interface MsgLockAndSuperfluidDelegateProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgLockAndSuperfluidDelegate';
  value: Uint8Array;
}
/**
 * MsgLockAndSuperfluidDelegate locks coins with the unbonding period duration,
 * and then does a superfluid lock from the newly created lockup, to the
 * specified validator addr.
 */
export interface MsgLockAndSuperfluidDelegateSDKType {
  sender: string;
  coins: CoinSDKType[];
  val_addr: string;
}
export interface MsgLockAndSuperfluidDelegateResponse {
  ID: bigint;
}
export interface MsgLockAndSuperfluidDelegateResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgLockAndSuperfluidDelegateResponse';
  value: Uint8Array;
}
export interface MsgLockAndSuperfluidDelegateResponseSDKType {
  ID: bigint;
}
/**
 * MsgUnPoolWhitelistedPool Unpools every lock the sender has, that is
 * associated with pool pool_id. If pool_id is not approved for unpooling by
 * governance, this is a no-op. Unpooling takes the locked gamm shares, and runs
 * "ExitPool" on it, to get the constituent tokens. e.g. z gamm/pool/1 tokens
 * ExitPools into constituent tokens x uatom, y uosmo. Then it creates a new
 * lock for every constituent token, with the duration associated with the lock.
 * If the lock was unbonding, the new lockup durations should be the time left
 * until unbond completion.
 */
export interface MsgUnPoolWhitelistedPool {
  sender: string;
  poolId: bigint;
}
export interface MsgUnPoolWhitelistedPoolProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgUnPoolWhitelistedPool';
  value: Uint8Array;
}
/**
 * MsgUnPoolWhitelistedPool Unpools every lock the sender has, that is
 * associated with pool pool_id. If pool_id is not approved for unpooling by
 * governance, this is a no-op. Unpooling takes the locked gamm shares, and runs
 * "ExitPool" on it, to get the constituent tokens. e.g. z gamm/pool/1 tokens
 * ExitPools into constituent tokens x uatom, y uosmo. Then it creates a new
 * lock for every constituent token, with the duration associated with the lock.
 * If the lock was unbonding, the new lockup durations should be the time left
 * until unbond completion.
 */
export interface MsgUnPoolWhitelistedPoolSDKType {
  sender: string;
  pool_id: bigint;
}
export interface MsgUnPoolWhitelistedPoolResponse {
  exitedLockIds: bigint[];
}
export interface MsgUnPoolWhitelistedPoolResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.MsgUnPoolWhitelistedPoolResponse';
  value: Uint8Array;
}
export interface MsgUnPoolWhitelistedPoolResponseSDKType {
  exited_lock_ids: bigint[];
}
function createBaseMsgSuperfluidDelegate(): MsgSuperfluidDelegate {
  return {
    sender: '',
    lockId: BigInt(0),
    valAddr: '',
  };
}
export const MsgSuperfluidDelegate = {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidDelegate',
  encode(
    message: MsgSuperfluidDelegate,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.lockId !== BigInt(0)) {
      writer.uint32(16).uint64(message.lockId);
    }
    if (message.valAddr !== '') {
      writer.uint32(26).string(message.valAddr);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSuperfluidDelegate {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSuperfluidDelegate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.lockId = reader.uint64();
          break;
        case 3:
          message.valAddr = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSuperfluidDelegate {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      lockId: isSet(object.lockId)
        ? BigInt(object.lockId.toString())
        : BigInt(0),
      valAddr: isSet(object.valAddr) ? String(object.valAddr) : '',
    };
  },
  toJSON(message: MsgSuperfluidDelegate): JsonSafe<MsgSuperfluidDelegate> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.lockId !== undefined &&
      (obj.lockId = (message.lockId || BigInt(0)).toString());
    message.valAddr !== undefined && (obj.valAddr = message.valAddr);
    return obj;
  },
  fromPartial(object: Partial<MsgSuperfluidDelegate>): MsgSuperfluidDelegate {
    const message = createBaseMsgSuperfluidDelegate();
    message.sender = object.sender ?? '';
    message.lockId =
      object.lockId !== undefined && object.lockId !== null
        ? BigInt(object.lockId.toString())
        : BigInt(0);
    message.valAddr = object.valAddr ?? '';
    return message;
  },
  fromProtoMsg(message: MsgSuperfluidDelegateProtoMsg): MsgSuperfluidDelegate {
    return MsgSuperfluidDelegate.decode(message.value);
  },
  toProto(message: MsgSuperfluidDelegate): Uint8Array {
    return MsgSuperfluidDelegate.encode(message).finish();
  },
  toProtoMsg(message: MsgSuperfluidDelegate): MsgSuperfluidDelegateProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgSuperfluidDelegate',
      value: MsgSuperfluidDelegate.encode(message).finish(),
    };
  },
};
function createBaseMsgSuperfluidDelegateResponse(): MsgSuperfluidDelegateResponse {
  return {};
}
export const MsgSuperfluidDelegateResponse = {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidDelegateResponse',
  encode(
    _: MsgSuperfluidDelegateResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSuperfluidDelegateResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSuperfluidDelegateResponse();
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
  fromJSON(_: any): MsgSuperfluidDelegateResponse {
    return {};
  },
  toJSON(
    _: MsgSuperfluidDelegateResponse,
  ): JsonSafe<MsgSuperfluidDelegateResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSuperfluidDelegateResponse>,
  ): MsgSuperfluidDelegateResponse {
    const message = createBaseMsgSuperfluidDelegateResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSuperfluidDelegateResponseProtoMsg,
  ): MsgSuperfluidDelegateResponse {
    return MsgSuperfluidDelegateResponse.decode(message.value);
  },
  toProto(message: MsgSuperfluidDelegateResponse): Uint8Array {
    return MsgSuperfluidDelegateResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSuperfluidDelegateResponse,
  ): MsgSuperfluidDelegateResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgSuperfluidDelegateResponse',
      value: MsgSuperfluidDelegateResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSuperfluidUndelegate(): MsgSuperfluidUndelegate {
  return {
    sender: '',
    lockId: BigInt(0),
  };
}
export const MsgSuperfluidUndelegate = {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUndelegate',
  encode(
    message: MsgSuperfluidUndelegate,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.lockId !== BigInt(0)) {
      writer.uint32(16).uint64(message.lockId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSuperfluidUndelegate {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSuperfluidUndelegate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.lockId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSuperfluidUndelegate {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      lockId: isSet(object.lockId)
        ? BigInt(object.lockId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgSuperfluidUndelegate): JsonSafe<MsgSuperfluidUndelegate> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.lockId !== undefined &&
      (obj.lockId = (message.lockId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgSuperfluidUndelegate>,
  ): MsgSuperfluidUndelegate {
    const message = createBaseMsgSuperfluidUndelegate();
    message.sender = object.sender ?? '';
    message.lockId =
      object.lockId !== undefined && object.lockId !== null
        ? BigInt(object.lockId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgSuperfluidUndelegateProtoMsg,
  ): MsgSuperfluidUndelegate {
    return MsgSuperfluidUndelegate.decode(message.value);
  },
  toProto(message: MsgSuperfluidUndelegate): Uint8Array {
    return MsgSuperfluidUndelegate.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSuperfluidUndelegate,
  ): MsgSuperfluidUndelegateProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgSuperfluidUndelegate',
      value: MsgSuperfluidUndelegate.encode(message).finish(),
    };
  },
};
function createBaseMsgSuperfluidUndelegateResponse(): MsgSuperfluidUndelegateResponse {
  return {};
}
export const MsgSuperfluidUndelegateResponse = {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUndelegateResponse',
  encode(
    _: MsgSuperfluidUndelegateResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSuperfluidUndelegateResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSuperfluidUndelegateResponse();
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
  fromJSON(_: any): MsgSuperfluidUndelegateResponse {
    return {};
  },
  toJSON(
    _: MsgSuperfluidUndelegateResponse,
  ): JsonSafe<MsgSuperfluidUndelegateResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSuperfluidUndelegateResponse>,
  ): MsgSuperfluidUndelegateResponse {
    const message = createBaseMsgSuperfluidUndelegateResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSuperfluidUndelegateResponseProtoMsg,
  ): MsgSuperfluidUndelegateResponse {
    return MsgSuperfluidUndelegateResponse.decode(message.value);
  },
  toProto(message: MsgSuperfluidUndelegateResponse): Uint8Array {
    return MsgSuperfluidUndelegateResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSuperfluidUndelegateResponse,
  ): MsgSuperfluidUndelegateResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgSuperfluidUndelegateResponse',
      value: MsgSuperfluidUndelegateResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSuperfluidUnbondLock(): MsgSuperfluidUnbondLock {
  return {
    sender: '',
    lockId: BigInt(0),
  };
}
export const MsgSuperfluidUnbondLock = {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUnbondLock',
  encode(
    message: MsgSuperfluidUnbondLock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.lockId !== BigInt(0)) {
      writer.uint32(16).uint64(message.lockId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSuperfluidUnbondLock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSuperfluidUnbondLock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.lockId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSuperfluidUnbondLock {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      lockId: isSet(object.lockId)
        ? BigInt(object.lockId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgSuperfluidUnbondLock): JsonSafe<MsgSuperfluidUnbondLock> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.lockId !== undefined &&
      (obj.lockId = (message.lockId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgSuperfluidUnbondLock>,
  ): MsgSuperfluidUnbondLock {
    const message = createBaseMsgSuperfluidUnbondLock();
    message.sender = object.sender ?? '';
    message.lockId =
      object.lockId !== undefined && object.lockId !== null
        ? BigInt(object.lockId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgSuperfluidUnbondLockProtoMsg,
  ): MsgSuperfluidUnbondLock {
    return MsgSuperfluidUnbondLock.decode(message.value);
  },
  toProto(message: MsgSuperfluidUnbondLock): Uint8Array {
    return MsgSuperfluidUnbondLock.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSuperfluidUnbondLock,
  ): MsgSuperfluidUnbondLockProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgSuperfluidUnbondLock',
      value: MsgSuperfluidUnbondLock.encode(message).finish(),
    };
  },
};
function createBaseMsgSuperfluidUnbondLockResponse(): MsgSuperfluidUnbondLockResponse {
  return {};
}
export const MsgSuperfluidUnbondLockResponse = {
  typeUrl: '/osmosis.superfluid.MsgSuperfluidUnbondLockResponse',
  encode(
    _: MsgSuperfluidUnbondLockResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSuperfluidUnbondLockResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSuperfluidUnbondLockResponse();
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
  fromJSON(_: any): MsgSuperfluidUnbondLockResponse {
    return {};
  },
  toJSON(
    _: MsgSuperfluidUnbondLockResponse,
  ): JsonSafe<MsgSuperfluidUnbondLockResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSuperfluidUnbondLockResponse>,
  ): MsgSuperfluidUnbondLockResponse {
    const message = createBaseMsgSuperfluidUnbondLockResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSuperfluidUnbondLockResponseProtoMsg,
  ): MsgSuperfluidUnbondLockResponse {
    return MsgSuperfluidUnbondLockResponse.decode(message.value);
  },
  toProto(message: MsgSuperfluidUnbondLockResponse): Uint8Array {
    return MsgSuperfluidUnbondLockResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSuperfluidUnbondLockResponse,
  ): MsgSuperfluidUnbondLockResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgSuperfluidUnbondLockResponse',
      value: MsgSuperfluidUnbondLockResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgLockAndSuperfluidDelegate(): MsgLockAndSuperfluidDelegate {
  return {
    sender: '',
    coins: [],
    valAddr: '',
  };
}
export const MsgLockAndSuperfluidDelegate = {
  typeUrl: '/osmosis.superfluid.MsgLockAndSuperfluidDelegate',
  encode(
    message: MsgLockAndSuperfluidDelegate,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.valAddr !== '') {
      writer.uint32(26).string(message.valAddr);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgLockAndSuperfluidDelegate {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLockAndSuperfluidDelegate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        case 3:
          message.valAddr = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLockAndSuperfluidDelegate {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
      valAddr: isSet(object.valAddr) ? String(object.valAddr) : '',
    };
  },
  toJSON(
    message: MsgLockAndSuperfluidDelegate,
  ): JsonSafe<MsgLockAndSuperfluidDelegate> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    message.valAddr !== undefined && (obj.valAddr = message.valAddr);
    return obj;
  },
  fromPartial(
    object: Partial<MsgLockAndSuperfluidDelegate>,
  ): MsgLockAndSuperfluidDelegate {
    const message = createBaseMsgLockAndSuperfluidDelegate();
    message.sender = object.sender ?? '';
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    message.valAddr = object.valAddr ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgLockAndSuperfluidDelegateProtoMsg,
  ): MsgLockAndSuperfluidDelegate {
    return MsgLockAndSuperfluidDelegate.decode(message.value);
  },
  toProto(message: MsgLockAndSuperfluidDelegate): Uint8Array {
    return MsgLockAndSuperfluidDelegate.encode(message).finish();
  },
  toProtoMsg(
    message: MsgLockAndSuperfluidDelegate,
  ): MsgLockAndSuperfluidDelegateProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgLockAndSuperfluidDelegate',
      value: MsgLockAndSuperfluidDelegate.encode(message).finish(),
    };
  },
};
function createBaseMsgLockAndSuperfluidDelegateResponse(): MsgLockAndSuperfluidDelegateResponse {
  return {
    ID: BigInt(0),
  };
}
export const MsgLockAndSuperfluidDelegateResponse = {
  typeUrl: '/osmosis.superfluid.MsgLockAndSuperfluidDelegateResponse',
  encode(
    message: MsgLockAndSuperfluidDelegateResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.ID !== BigInt(0)) {
      writer.uint32(8).uint64(message.ID);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgLockAndSuperfluidDelegateResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLockAndSuperfluidDelegateResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ID = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLockAndSuperfluidDelegateResponse {
    return {
      ID: isSet(object.ID) ? BigInt(object.ID.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: MsgLockAndSuperfluidDelegateResponse,
  ): JsonSafe<MsgLockAndSuperfluidDelegateResponse> {
    const obj: any = {};
    message.ID !== undefined && (obj.ID = (message.ID || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgLockAndSuperfluidDelegateResponse>,
  ): MsgLockAndSuperfluidDelegateResponse {
    const message = createBaseMsgLockAndSuperfluidDelegateResponse();
    message.ID =
      object.ID !== undefined && object.ID !== null
        ? BigInt(object.ID.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgLockAndSuperfluidDelegateResponseProtoMsg,
  ): MsgLockAndSuperfluidDelegateResponse {
    return MsgLockAndSuperfluidDelegateResponse.decode(message.value);
  },
  toProto(message: MsgLockAndSuperfluidDelegateResponse): Uint8Array {
    return MsgLockAndSuperfluidDelegateResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgLockAndSuperfluidDelegateResponse,
  ): MsgLockAndSuperfluidDelegateResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgLockAndSuperfluidDelegateResponse',
      value: MsgLockAndSuperfluidDelegateResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUnPoolWhitelistedPool(): MsgUnPoolWhitelistedPool {
  return {
    sender: '',
    poolId: BigInt(0),
  };
}
export const MsgUnPoolWhitelistedPool = {
  typeUrl: '/osmosis.superfluid.MsgUnPoolWhitelistedPool',
  encode(
    message: MsgUnPoolWhitelistedPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sender !== '') {
      writer.uint32(10).string(message.sender);
    }
    if (message.poolId !== BigInt(0)) {
      writer.uint32(16).uint64(message.poolId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnPoolWhitelistedPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnPoolWhitelistedPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sender = reader.string();
          break;
        case 2:
          message.poolId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnPoolWhitelistedPool {
    return {
      sender: isSet(object.sender) ? String(object.sender) : '',
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgUnPoolWhitelistedPool,
  ): JsonSafe<MsgUnPoolWhitelistedPool> {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgUnPoolWhitelistedPool>,
  ): MsgUnPoolWhitelistedPool {
    const message = createBaseMsgUnPoolWhitelistedPool();
    message.sender = object.sender ?? '';
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgUnPoolWhitelistedPoolProtoMsg,
  ): MsgUnPoolWhitelistedPool {
    return MsgUnPoolWhitelistedPool.decode(message.value);
  },
  toProto(message: MsgUnPoolWhitelistedPool): Uint8Array {
    return MsgUnPoolWhitelistedPool.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnPoolWhitelistedPool,
  ): MsgUnPoolWhitelistedPoolProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgUnPoolWhitelistedPool',
      value: MsgUnPoolWhitelistedPool.encode(message).finish(),
    };
  },
};
function createBaseMsgUnPoolWhitelistedPoolResponse(): MsgUnPoolWhitelistedPoolResponse {
  return {
    exitedLockIds: [],
  };
}
export const MsgUnPoolWhitelistedPoolResponse = {
  typeUrl: '/osmosis.superfluid.MsgUnPoolWhitelistedPoolResponse',
  encode(
    message: MsgUnPoolWhitelistedPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.exitedLockIds) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnPoolWhitelistedPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnPoolWhitelistedPoolResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.exitedLockIds.push(reader.uint64());
            }
          } else {
            message.exitedLockIds.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnPoolWhitelistedPoolResponse {
    return {
      exitedLockIds: Array.isArray(object?.exitedLockIds)
        ? object.exitedLockIds.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: MsgUnPoolWhitelistedPoolResponse,
  ): JsonSafe<MsgUnPoolWhitelistedPoolResponse> {
    const obj: any = {};
    if (message.exitedLockIds) {
      obj.exitedLockIds = message.exitedLockIds.map(e =>
        (e || BigInt(0)).toString(),
      );
    } else {
      obj.exitedLockIds = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgUnPoolWhitelistedPoolResponse>,
  ): MsgUnPoolWhitelistedPoolResponse {
    const message = createBaseMsgUnPoolWhitelistedPoolResponse();
    message.exitedLockIds =
      object.exitedLockIds?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgUnPoolWhitelistedPoolResponseProtoMsg,
  ): MsgUnPoolWhitelistedPoolResponse {
    return MsgUnPoolWhitelistedPoolResponse.decode(message.value);
  },
  toProto(message: MsgUnPoolWhitelistedPoolResponse): Uint8Array {
    return MsgUnPoolWhitelistedPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnPoolWhitelistedPoolResponse,
  ): MsgUnPoolWhitelistedPoolResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.MsgUnPoolWhitelistedPoolResponse',
      value: MsgUnPoolWhitelistedPoolResponse.encode(message).finish(),
    };
  },
};
