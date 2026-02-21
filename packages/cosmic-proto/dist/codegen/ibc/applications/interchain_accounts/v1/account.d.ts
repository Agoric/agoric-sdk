import { BaseAccount, type BaseAccountSDKType } from '../../../../cosmos/auth/v1beta1/auth.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * An InterchainAccount is defined as a BaseAccount & the address of the account owner on the controller chain
 * @name InterchainAccount
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.InterchainAccount
 */
export interface InterchainAccount {
    $typeUrl?: '/ibc.applications.interchain_accounts.v1.InterchainAccount';
    baseAccount?: BaseAccount;
    accountOwner: string;
}
export interface InterchainAccountProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.v1.InterchainAccount';
    value: Uint8Array;
}
/**
 * An InterchainAccount is defined as a BaseAccount & the address of the account owner on the controller chain
 * @name InterchainAccountSDKType
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.InterchainAccount
 */
export interface InterchainAccountSDKType {
    $typeUrl?: '/ibc.applications.interchain_accounts.v1.InterchainAccount';
    base_account?: BaseAccountSDKType;
    account_owner: string;
}
/**
 * An InterchainAccount is defined as a BaseAccount & the address of the account owner on the controller chain
 * @name InterchainAccount
 * @package ibc.applications.interchain_accounts.v1
 * @see proto type: ibc.applications.interchain_accounts.v1.InterchainAccount
 */
export declare const InterchainAccount: {
    typeUrl: "/ibc.applications.interchain_accounts.v1.InterchainAccount";
    aminoType: "cosmos-sdk/InterchainAccount";
    is(o: any): o is InterchainAccount;
    isSDK(o: any): o is InterchainAccountSDKType;
    encode(message: InterchainAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): InterchainAccount;
    fromJSON(object: any): InterchainAccount;
    toJSON(message: InterchainAccount): JsonSafe<InterchainAccount>;
    fromPartial(object: Partial<InterchainAccount>): InterchainAccount;
    fromProtoMsg(message: InterchainAccountProtoMsg): InterchainAccount;
    toProto(message: InterchainAccount): Uint8Array;
    toProtoMsg(message: InterchainAccount): InterchainAccountProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=account.d.ts.map