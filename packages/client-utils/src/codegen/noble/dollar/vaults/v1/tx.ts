//@ts-nocheck
import {
  VaultType,
  PausedType,
  vaultTypeFromJSON,
  vaultTypeToJSON,
  pausedTypeFromJSON,
  pausedTypeToJSON,
} from './vaults.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** MsgLock is a message holders of the Noble Dollar can use to lock their $USDN into a Vault to earn rewards. */
export interface MsgLock {
  signer: string;
  vault: VaultType;
  amount: string;
}
export interface MsgLockProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.MsgLock';
  value: Uint8Array;
}
/** MsgLock is a message holders of the Noble Dollar can use to lock their $USDN into a Vault to earn rewards. */
export interface MsgLockSDKType {
  signer: string;
  vault: VaultType;
  amount: string;
}
/** MsgLockResponse is the response of the Lock message. */
export interface MsgLockResponse {}
export interface MsgLockResponseProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.MsgLockResponse';
  value: Uint8Array;
}
/** MsgLockResponse is the response of the Lock message. */
export interface MsgLockResponseSDKType {}
/** MsgUnlock is a message that allows holders of the Noble Dollar to unlock their $USDN from a Vault, releasing their funds and claiming any available rewards. */
export interface MsgUnlock {
  signer: string;
  vault: VaultType;
  amount: string;
}
export interface MsgUnlockProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.MsgUnlock';
  value: Uint8Array;
}
/** MsgUnlock is a message that allows holders of the Noble Dollar to unlock their $USDN from a Vault, releasing their funds and claiming any available rewards. */
export interface MsgUnlockSDKType {
  signer: string;
  vault: VaultType;
  amount: string;
}
/** MsgLockResponse is the response of the Unlock message. */
export interface MsgUnlockResponse {}
export interface MsgUnlockResponseProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.MsgUnlockResponse';
  value: Uint8Array;
}
/** MsgLockResponse is the response of the Unlock message. */
export interface MsgUnlockResponseSDKType {}
/** MsgSetPausedState allows the authority to configure the Noble Dollar Vault paused state, enabling or disabling Lock and Unlock actions. */
export interface MsgSetPausedState {
  signer: string;
  paused: PausedType;
}
export interface MsgSetPausedStateProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedState';
  value: Uint8Array;
}
/** MsgSetPausedState allows the authority to configure the Noble Dollar Vault paused state, enabling or disabling Lock and Unlock actions. */
export interface MsgSetPausedStateSDKType {
  signer: string;
  paused: PausedType;
}
/** MsgSetPausedStateResponse is the response of the SetPausedState message. */
export interface MsgSetPausedStateResponse {}
export interface MsgSetPausedStateResponseProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedStateResponse';
  value: Uint8Array;
}
/** MsgSetPausedStateResponse is the response of the SetPausedState message. */
export interface MsgSetPausedStateResponseSDKType {}
function createBaseMsgLock(): MsgLock {
  return {
    signer: '',
    vault: 0,
    amount: '',
  };
}
export const MsgLock = {
  typeUrl: '/noble.dollar.vaults.v1.MsgLock',
  encode(
    message: MsgLock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.vault !== 0) {
      writer.uint32(16).int32(message.vault);
    }
    if (message.amount !== '') {
      writer.uint32(26).string(message.amount);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgLock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.vault = reader.int32() as any;
          break;
        case 3:
          message.amount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLock {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      vault: isSet(object.vault) ? vaultTypeFromJSON(object.vault) : -1,
      amount: isSet(object.amount) ? String(object.amount) : '',
    };
  },
  toJSON(message: MsgLock): JsonSafe<MsgLock> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.vault !== undefined && (obj.vault = vaultTypeToJSON(message.vault));
    message.amount !== undefined && (obj.amount = message.amount);
    return obj;
  },
  fromPartial(object: Partial<MsgLock>): MsgLock {
    const message = createBaseMsgLock();
    message.signer = object.signer ?? '';
    message.vault = object.vault ?? 0;
    message.amount = object.amount ?? '';
    return message;
  },
  fromProtoMsg(message: MsgLockProtoMsg): MsgLock {
    return MsgLock.decode(message.value);
  },
  toProto(message: MsgLock): Uint8Array {
    return MsgLock.encode(message).finish();
  },
  toProtoMsg(message: MsgLock): MsgLockProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.MsgLock',
      value: MsgLock.encode(message).finish(),
    };
  },
};
function createBaseMsgLockResponse(): MsgLockResponse {
  return {};
}
export const MsgLockResponse = {
  typeUrl: '/noble.dollar.vaults.v1.MsgLockResponse',
  encode(
    _: MsgLockResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgLockResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLockResponse();
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
  fromJSON(_: any): MsgLockResponse {
    return {};
  },
  toJSON(_: MsgLockResponse): JsonSafe<MsgLockResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgLockResponse>): MsgLockResponse {
    const message = createBaseMsgLockResponse();
    return message;
  },
  fromProtoMsg(message: MsgLockResponseProtoMsg): MsgLockResponse {
    return MsgLockResponse.decode(message.value);
  },
  toProto(message: MsgLockResponse): Uint8Array {
    return MsgLockResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgLockResponse): MsgLockResponseProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.MsgLockResponse',
      value: MsgLockResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUnlock(): MsgUnlock {
  return {
    signer: '',
    vault: 0,
    amount: '',
  };
}
export const MsgUnlock = {
  typeUrl: '/noble.dollar.vaults.v1.MsgUnlock',
  encode(
    message: MsgUnlock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.vault !== 0) {
      writer.uint32(16).int32(message.vault);
    }
    if (message.amount !== '') {
      writer.uint32(26).string(message.amount);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgUnlock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnlock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.vault = reader.int32() as any;
          break;
        case 3:
          message.amount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnlock {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      vault: isSet(object.vault) ? vaultTypeFromJSON(object.vault) : -1,
      amount: isSet(object.amount) ? String(object.amount) : '',
    };
  },
  toJSON(message: MsgUnlock): JsonSafe<MsgUnlock> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.vault !== undefined && (obj.vault = vaultTypeToJSON(message.vault));
    message.amount !== undefined && (obj.amount = message.amount);
    return obj;
  },
  fromPartial(object: Partial<MsgUnlock>): MsgUnlock {
    const message = createBaseMsgUnlock();
    message.signer = object.signer ?? '';
    message.vault = object.vault ?? 0;
    message.amount = object.amount ?? '';
    return message;
  },
  fromProtoMsg(message: MsgUnlockProtoMsg): MsgUnlock {
    return MsgUnlock.decode(message.value);
  },
  toProto(message: MsgUnlock): Uint8Array {
    return MsgUnlock.encode(message).finish();
  },
  toProtoMsg(message: MsgUnlock): MsgUnlockProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.MsgUnlock',
      value: MsgUnlock.encode(message).finish(),
    };
  },
};
function createBaseMsgUnlockResponse(): MsgUnlockResponse {
  return {};
}
export const MsgUnlockResponse = {
  typeUrl: '/noble.dollar.vaults.v1.MsgUnlockResponse',
  encode(
    _: MsgUnlockResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgUnlockResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnlockResponse();
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
  fromJSON(_: any): MsgUnlockResponse {
    return {};
  },
  toJSON(_: MsgUnlockResponse): JsonSafe<MsgUnlockResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgUnlockResponse>): MsgUnlockResponse {
    const message = createBaseMsgUnlockResponse();
    return message;
  },
  fromProtoMsg(message: MsgUnlockResponseProtoMsg): MsgUnlockResponse {
    return MsgUnlockResponse.decode(message.value);
  },
  toProto(message: MsgUnlockResponse): Uint8Array {
    return MsgUnlockResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgUnlockResponse): MsgUnlockResponseProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.MsgUnlockResponse',
      value: MsgUnlockResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSetPausedState(): MsgSetPausedState {
  return {
    signer: '',
    paused: 0,
  };
}
export const MsgSetPausedState = {
  typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedState',
  encode(
    message: MsgSetPausedState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.paused !== 0) {
      writer.uint32(16).int32(message.paused);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSetPausedState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetPausedState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.paused = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetPausedState {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      paused: isSet(object.paused) ? pausedTypeFromJSON(object.paused) : -1,
    };
  },
  toJSON(message: MsgSetPausedState): JsonSafe<MsgSetPausedState> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.paused !== undefined &&
      (obj.paused = pausedTypeToJSON(message.paused));
    return obj;
  },
  fromPartial(object: Partial<MsgSetPausedState>): MsgSetPausedState {
    const message = createBaseMsgSetPausedState();
    message.signer = object.signer ?? '';
    message.paused = object.paused ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgSetPausedStateProtoMsg): MsgSetPausedState {
    return MsgSetPausedState.decode(message.value);
  },
  toProto(message: MsgSetPausedState): Uint8Array {
    return MsgSetPausedState.encode(message).finish();
  },
  toProtoMsg(message: MsgSetPausedState): MsgSetPausedStateProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedState',
      value: MsgSetPausedState.encode(message).finish(),
    };
  },
};
function createBaseMsgSetPausedStateResponse(): MsgSetPausedStateResponse {
  return {};
}
export const MsgSetPausedStateResponse = {
  typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedStateResponse',
  encode(
    _: MsgSetPausedStateResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetPausedStateResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetPausedStateResponse();
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
  fromJSON(_: any): MsgSetPausedStateResponse {
    return {};
  },
  toJSON(_: MsgSetPausedStateResponse): JsonSafe<MsgSetPausedStateResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetPausedStateResponse>,
  ): MsgSetPausedStateResponse {
    const message = createBaseMsgSetPausedStateResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetPausedStateResponseProtoMsg,
  ): MsgSetPausedStateResponse {
    return MsgSetPausedStateResponse.decode(message.value);
  },
  toProto(message: MsgSetPausedStateResponse): Uint8Array {
    return MsgSetPausedStateResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetPausedStateResponse,
  ): MsgSetPausedStateResponseProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedStateResponse',
      value: MsgSetPausedStateResponse.encode(message).finish(),
    };
  },
};
