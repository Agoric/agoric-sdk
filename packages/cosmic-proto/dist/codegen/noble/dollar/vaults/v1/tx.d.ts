import { VaultType, PausedType } from './vaults.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MsgLock is a message holders of the Noble Dollar can use to lock their $USDN into a Vault to earn rewards.
 * @name MsgLock
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgLock
 */
export interface MsgLock {
    signer: string;
    vault: VaultType;
    amount: string;
}
export interface MsgLockProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.MsgLock';
    value: Uint8Array;
}
/**
 * MsgLock is a message holders of the Noble Dollar can use to lock their $USDN into a Vault to earn rewards.
 * @name MsgLockSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgLock
 */
export interface MsgLockSDKType {
    signer: string;
    vault: VaultType;
    amount: string;
}
/**
 * MsgLockResponse is the response of the Lock message.
 * @name MsgLockResponse
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgLockResponse
 */
export interface MsgLockResponse {
}
export interface MsgLockResponseProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.MsgLockResponse';
    value: Uint8Array;
}
/**
 * MsgLockResponse is the response of the Lock message.
 * @name MsgLockResponseSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgLockResponse
 */
export interface MsgLockResponseSDKType {
}
/**
 * MsgUnlock is a message that allows holders of the Noble Dollar to unlock their $USDN from a Vault, releasing their funds and claiming any available rewards.
 * @name MsgUnlock
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgUnlock
 */
export interface MsgUnlock {
    signer: string;
    vault: VaultType;
    amount: string;
}
export interface MsgUnlockProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.MsgUnlock';
    value: Uint8Array;
}
/**
 * MsgUnlock is a message that allows holders of the Noble Dollar to unlock their $USDN from a Vault, releasing their funds and claiming any available rewards.
 * @name MsgUnlockSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgUnlock
 */
export interface MsgUnlockSDKType {
    signer: string;
    vault: VaultType;
    amount: string;
}
/**
 * MsgLockResponse is the response of the Unlock message.
 * @name MsgUnlockResponse
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgUnlockResponse
 */
export interface MsgUnlockResponse {
}
export interface MsgUnlockResponseProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.MsgUnlockResponse';
    value: Uint8Array;
}
/**
 * MsgLockResponse is the response of the Unlock message.
 * @name MsgUnlockResponseSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgUnlockResponse
 */
export interface MsgUnlockResponseSDKType {
}
/**
 * MsgSetPausedState allows the authority to configure the Noble Dollar Vault paused state, enabling or disabling Lock and Unlock actions.
 * @name MsgSetPausedState
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgSetPausedState
 */
export interface MsgSetPausedState {
    signer: string;
    paused: PausedType;
}
export interface MsgSetPausedStateProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedState';
    value: Uint8Array;
}
/**
 * MsgSetPausedState allows the authority to configure the Noble Dollar Vault paused state, enabling or disabling Lock and Unlock actions.
 * @name MsgSetPausedStateSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgSetPausedState
 */
export interface MsgSetPausedStateSDKType {
    signer: string;
    paused: PausedType;
}
/**
 * MsgSetPausedStateResponse is the response of the SetPausedState message.
 * @name MsgSetPausedStateResponse
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgSetPausedStateResponse
 */
export interface MsgSetPausedStateResponse {
}
export interface MsgSetPausedStateResponseProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.MsgSetPausedStateResponse';
    value: Uint8Array;
}
/**
 * MsgSetPausedStateResponse is the response of the SetPausedState message.
 * @name MsgSetPausedStateResponseSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgSetPausedStateResponse
 */
export interface MsgSetPausedStateResponseSDKType {
}
/**
 * MsgLock is a message holders of the Noble Dollar can use to lock their $USDN into a Vault to earn rewards.
 * @name MsgLock
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgLock
 */
export declare const MsgLock: {
    typeUrl: "/noble.dollar.vaults.v1.MsgLock";
    aminoType: "dollar/vaults/Lock";
    is(o: any): o is MsgLock;
    isSDK(o: any): o is MsgLockSDKType;
    encode(message: MsgLock, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLock;
    fromJSON(object: any): MsgLock;
    toJSON(message: MsgLock): JsonSafe<MsgLock>;
    fromPartial(object: Partial<MsgLock>): MsgLock;
    fromProtoMsg(message: MsgLockProtoMsg): MsgLock;
    toProto(message: MsgLock): Uint8Array;
    toProtoMsg(message: MsgLock): MsgLockProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgLockResponse is the response of the Lock message.
 * @name MsgLockResponse
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgLockResponse
 */
export declare const MsgLockResponse: {
    typeUrl: "/noble.dollar.vaults.v1.MsgLockResponse";
    is(o: any): o is MsgLockResponse;
    isSDK(o: any): o is MsgLockResponseSDKType;
    encode(_: MsgLockResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLockResponse;
    fromJSON(_: any): MsgLockResponse;
    toJSON(_: MsgLockResponse): JsonSafe<MsgLockResponse>;
    fromPartial(_: Partial<MsgLockResponse>): MsgLockResponse;
    fromProtoMsg(message: MsgLockResponseProtoMsg): MsgLockResponse;
    toProto(message: MsgLockResponse): Uint8Array;
    toProtoMsg(message: MsgLockResponse): MsgLockResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUnlock is a message that allows holders of the Noble Dollar to unlock their $USDN from a Vault, releasing their funds and claiming any available rewards.
 * @name MsgUnlock
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgUnlock
 */
export declare const MsgUnlock: {
    typeUrl: "/noble.dollar.vaults.v1.MsgUnlock";
    aminoType: "dollar/vaults/Unlock";
    is(o: any): o is MsgUnlock;
    isSDK(o: any): o is MsgUnlockSDKType;
    encode(message: MsgUnlock, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUnlock;
    fromJSON(object: any): MsgUnlock;
    toJSON(message: MsgUnlock): JsonSafe<MsgUnlock>;
    fromPartial(object: Partial<MsgUnlock>): MsgUnlock;
    fromProtoMsg(message: MsgUnlockProtoMsg): MsgUnlock;
    toProto(message: MsgUnlock): Uint8Array;
    toProtoMsg(message: MsgUnlock): MsgUnlockProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgLockResponse is the response of the Unlock message.
 * @name MsgUnlockResponse
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgUnlockResponse
 */
export declare const MsgUnlockResponse: {
    typeUrl: "/noble.dollar.vaults.v1.MsgUnlockResponse";
    is(o: any): o is MsgUnlockResponse;
    isSDK(o: any): o is MsgUnlockResponseSDKType;
    encode(_: MsgUnlockResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUnlockResponse;
    fromJSON(_: any): MsgUnlockResponse;
    toJSON(_: MsgUnlockResponse): JsonSafe<MsgUnlockResponse>;
    fromPartial(_: Partial<MsgUnlockResponse>): MsgUnlockResponse;
    fromProtoMsg(message: MsgUnlockResponseProtoMsg): MsgUnlockResponse;
    toProto(message: MsgUnlockResponse): Uint8Array;
    toProtoMsg(message: MsgUnlockResponse): MsgUnlockResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSetPausedState allows the authority to configure the Noble Dollar Vault paused state, enabling or disabling Lock and Unlock actions.
 * @name MsgSetPausedState
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgSetPausedState
 */
export declare const MsgSetPausedState: {
    typeUrl: "/noble.dollar.vaults.v1.MsgSetPausedState";
    aminoType: "dollar/vaults/SetPausedState";
    is(o: any): o is MsgSetPausedState;
    isSDK(o: any): o is MsgSetPausedStateSDKType;
    encode(message: MsgSetPausedState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetPausedState;
    fromJSON(object: any): MsgSetPausedState;
    toJSON(message: MsgSetPausedState): JsonSafe<MsgSetPausedState>;
    fromPartial(object: Partial<MsgSetPausedState>): MsgSetPausedState;
    fromProtoMsg(message: MsgSetPausedStateProtoMsg): MsgSetPausedState;
    toProto(message: MsgSetPausedState): Uint8Array;
    toProtoMsg(message: MsgSetPausedState): MsgSetPausedStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSetPausedStateResponse is the response of the SetPausedState message.
 * @name MsgSetPausedStateResponse
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.MsgSetPausedStateResponse
 */
export declare const MsgSetPausedStateResponse: {
    typeUrl: "/noble.dollar.vaults.v1.MsgSetPausedStateResponse";
    is(o: any): o is MsgSetPausedStateResponse;
    isSDK(o: any): o is MsgSetPausedStateResponseSDKType;
    encode(_: MsgSetPausedStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetPausedStateResponse;
    fromJSON(_: any): MsgSetPausedStateResponse;
    toJSON(_: MsgSetPausedStateResponse): JsonSafe<MsgSetPausedStateResponse>;
    fromPartial(_: Partial<MsgSetPausedStateResponse>): MsgSetPausedStateResponse;
    fromProtoMsg(message: MsgSetPausedStateResponseProtoMsg): MsgSetPausedStateResponse;
    toProto(message: MsgSetPausedStateResponse): Uint8Array;
    toProtoMsg(message: MsgSetPausedStateResponse): MsgSetPausedStateResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map