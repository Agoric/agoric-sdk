import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * BaseAccount defines a base account type. It contains all the necessary fields
 * for basic account functionality. Any custom account type should extend this
 * type for additional functionality (e.g. vesting).
 * @name BaseAccount
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.BaseAccount
 */
export interface BaseAccount {
    $typeUrl?: '/cosmos.auth.v1beta1.BaseAccount';
    address: string;
    pubKey?: Any;
    accountNumber: bigint;
    sequence: bigint;
}
export interface BaseAccountProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.BaseAccount';
    value: Uint8Array;
}
/**
 * BaseAccount defines a base account type. It contains all the necessary fields
 * for basic account functionality. Any custom account type should extend this
 * type for additional functionality (e.g. vesting).
 * @name BaseAccountSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.BaseAccount
 */
export interface BaseAccountSDKType {
    $typeUrl?: '/cosmos.auth.v1beta1.BaseAccount';
    address: string;
    pub_key?: AnySDKType;
    account_number: bigint;
    sequence: bigint;
}
/**
 * ModuleAccount defines an account for modules that holds coins on a pool.
 * @name ModuleAccount
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.ModuleAccount
 */
export interface ModuleAccount {
    $typeUrl?: '/cosmos.auth.v1beta1.ModuleAccount';
    baseAccount?: BaseAccount;
    name: string;
    permissions: string[];
}
export interface ModuleAccountProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.ModuleAccount';
    value: Uint8Array;
}
/**
 * ModuleAccount defines an account for modules that holds coins on a pool.
 * @name ModuleAccountSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.ModuleAccount
 */
export interface ModuleAccountSDKType {
    $typeUrl?: '/cosmos.auth.v1beta1.ModuleAccount';
    base_account?: BaseAccountSDKType;
    name: string;
    permissions: string[];
}
/**
 * ModuleCredential represents a unclaimable pubkey for base accounts controlled by modules.
 *
 * Since: cosmos-sdk 0.47
 * @name ModuleCredential
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.ModuleCredential
 */
export interface ModuleCredential {
    /**
     * module_name is the name of the module used for address derivation (passed into address.Module).
     */
    moduleName: string;
    /**
     * derivation_keys is for deriving a module account address (passed into address.Module)
     * adding more keys creates sub-account addresses (passed into address.Derive)
     */
    derivationKeys: Uint8Array[];
}
export interface ModuleCredentialProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.ModuleCredential';
    value: Uint8Array;
}
/**
 * ModuleCredential represents a unclaimable pubkey for base accounts controlled by modules.
 *
 * Since: cosmos-sdk 0.47
 * @name ModuleCredentialSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.ModuleCredential
 */
export interface ModuleCredentialSDKType {
    module_name: string;
    derivation_keys: Uint8Array[];
}
/**
 * Params defines the parameters for the auth module.
 * @name Params
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Params
 */
export interface Params {
    maxMemoCharacters: bigint;
    txSigLimit: bigint;
    txSizeCostPerByte: bigint;
    sigVerifyCostEd25519: bigint;
    sigVerifyCostSecp256k1: bigint;
}
export interface ParamsProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.Params';
    value: Uint8Array;
}
/**
 * Params defines the parameters for the auth module.
 * @name ParamsSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Params
 */
export interface ParamsSDKType {
    max_memo_characters: bigint;
    tx_sig_limit: bigint;
    tx_size_cost_per_byte: bigint;
    sig_verify_cost_ed25519: bigint;
    sig_verify_cost_secp256k1: bigint;
}
/**
 * BaseAccount defines a base account type. It contains all the necessary fields
 * for basic account functionality. Any custom account type should extend this
 * type for additional functionality (e.g. vesting).
 * @name BaseAccount
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.BaseAccount
 */
export declare const BaseAccount: {
    typeUrl: "/cosmos.auth.v1beta1.BaseAccount";
    aminoType: "cosmos-sdk/BaseAccount";
    is(o: any): o is BaseAccount;
    isSDK(o: any): o is BaseAccountSDKType;
    encode(message: BaseAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BaseAccount;
    fromJSON(object: any): BaseAccount;
    toJSON(message: BaseAccount): JsonSafe<BaseAccount>;
    fromPartial(object: Partial<BaseAccount>): BaseAccount;
    fromProtoMsg(message: BaseAccountProtoMsg): BaseAccount;
    toProto(message: BaseAccount): Uint8Array;
    toProtoMsg(message: BaseAccount): BaseAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ModuleAccount defines an account for modules that holds coins on a pool.
 * @name ModuleAccount
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.ModuleAccount
 */
export declare const ModuleAccount: {
    typeUrl: "/cosmos.auth.v1beta1.ModuleAccount";
    aminoType: "cosmos-sdk/ModuleAccount";
    is(o: any): o is ModuleAccount;
    isSDK(o: any): o is ModuleAccountSDKType;
    encode(message: ModuleAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ModuleAccount;
    fromJSON(object: any): ModuleAccount;
    toJSON(message: ModuleAccount): JsonSafe<ModuleAccount>;
    fromPartial(object: Partial<ModuleAccount>): ModuleAccount;
    fromProtoMsg(message: ModuleAccountProtoMsg): ModuleAccount;
    toProto(message: ModuleAccount): Uint8Array;
    toProtoMsg(message: ModuleAccount): ModuleAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ModuleCredential represents a unclaimable pubkey for base accounts controlled by modules.
 *
 * Since: cosmos-sdk 0.47
 * @name ModuleCredential
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.ModuleCredential
 */
export declare const ModuleCredential: {
    typeUrl: "/cosmos.auth.v1beta1.ModuleCredential";
    aminoType: "cosmos-sdk/GroupAccountCredential";
    is(o: any): o is ModuleCredential;
    isSDK(o: any): o is ModuleCredentialSDKType;
    encode(message: ModuleCredential, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ModuleCredential;
    fromJSON(object: any): ModuleCredential;
    toJSON(message: ModuleCredential): JsonSafe<ModuleCredential>;
    fromPartial(object: Partial<ModuleCredential>): ModuleCredential;
    fromProtoMsg(message: ModuleCredentialProtoMsg): ModuleCredential;
    toProto(message: ModuleCredential): Uint8Array;
    toProtoMsg(message: ModuleCredential): ModuleCredentialProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Params defines the parameters for the auth module.
 * @name Params
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Params
 */
export declare const Params: {
    typeUrl: "/cosmos.auth.v1beta1.Params";
    aminoType: "cosmos-sdk/x/auth/Params";
    is(o: any): o is Params;
    isSDK(o: any): o is ParamsSDKType;
    encode(message: Params, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Params;
    fromJSON(object: any): Params;
    toJSON(message: Params): JsonSafe<Params>;
    fromPartial(object: Partial<Params>): Params;
    fromProtoMsg(message: ParamsProtoMsg): Params;
    toProto(message: Params): Uint8Array;
    toProtoMsg(message: Params): ParamsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=auth.d.ts.map