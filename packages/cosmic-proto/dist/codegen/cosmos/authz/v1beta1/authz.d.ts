import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { Timestamp, type TimestampSDKType } from '../../../google/protobuf/timestamp.js';
import { TransferAuthorization, type TransferAuthorizationSDKType } from '../../../ibc/applications/transfer/v1/authz.js';
import { StakeAuthorization, type StakeAuthorizationSDKType } from '../../staking/v1beta1/authz.js';
import { SendAuthorization, type SendAuthorizationSDKType } from '../../bank/v1beta1/authz.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenericAuthorization gives the grantee unrestricted permissions to execute
 * the provided method on behalf of the granter's account.
 * @name GenericAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenericAuthorization
 */
export interface GenericAuthorization {
    $typeUrl?: '/cosmos.authz.v1beta1.GenericAuthorization';
    /**
     * Msg, identified by it's type URL, to grant unrestricted permissions to execute
     */
    msg: string;
}
export interface GenericAuthorizationProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization';
    value: Uint8Array;
}
/**
 * GenericAuthorization gives the grantee unrestricted permissions to execute
 * the provided method on behalf of the granter's account.
 * @name GenericAuthorizationSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenericAuthorization
 */
export interface GenericAuthorizationSDKType {
    $typeUrl?: '/cosmos.authz.v1beta1.GenericAuthorization';
    msg: string;
}
/**
 * Grant gives permissions to execute
 * the provide method with expiration time.
 * @name Grant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.Grant
 */
export interface Grant {
    authorization?: GenericAuthorization | TransferAuthorization | StakeAuthorization | SendAuthorization | Any | undefined;
    /**
     * time when the grant will expire and will be pruned. If null, then the grant
     * doesn't have a time expiration (other conditions  in `authorization`
     * may apply to invalidate the grant)
     */
    expiration?: Timestamp;
}
export interface GrantProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.Grant';
    value: Uint8Array;
}
/**
 * Grant gives permissions to execute
 * the provide method with expiration time.
 * @name GrantSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.Grant
 */
export interface GrantSDKType {
    authorization?: GenericAuthorizationSDKType | TransferAuthorizationSDKType | StakeAuthorizationSDKType | SendAuthorizationSDKType | AnySDKType | undefined;
    expiration?: TimestampSDKType;
}
/**
 * GrantAuthorization extends a grant with both the addresses of the grantee and granter.
 * It is used in genesis.proto and query.proto
 * @name GrantAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantAuthorization
 */
export interface GrantAuthorization {
    granter: string;
    grantee: string;
    authorization?: GenericAuthorization | TransferAuthorization | StakeAuthorization | SendAuthorization | Any | undefined;
    expiration?: Timestamp;
}
export interface GrantAuthorizationProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.GrantAuthorization';
    value: Uint8Array;
}
/**
 * GrantAuthorization extends a grant with both the addresses of the grantee and granter.
 * It is used in genesis.proto and query.proto
 * @name GrantAuthorizationSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantAuthorization
 */
export interface GrantAuthorizationSDKType {
    granter: string;
    grantee: string;
    authorization?: GenericAuthorizationSDKType | TransferAuthorizationSDKType | StakeAuthorizationSDKType | SendAuthorizationSDKType | AnySDKType | undefined;
    expiration?: TimestampSDKType;
}
/**
 * GrantQueueItem contains the list of TypeURL of a sdk.Msg.
 * @name GrantQueueItem
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantQueueItem
 */
export interface GrantQueueItem {
    /**
     * msg_type_urls contains the list of TypeURL of a sdk.Msg.
     */
    msgTypeUrls: string[];
}
export interface GrantQueueItemProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.GrantQueueItem';
    value: Uint8Array;
}
/**
 * GrantQueueItem contains the list of TypeURL of a sdk.Msg.
 * @name GrantQueueItemSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantQueueItem
 */
export interface GrantQueueItemSDKType {
    msg_type_urls: string[];
}
/**
 * GenericAuthorization gives the grantee unrestricted permissions to execute
 * the provided method on behalf of the granter's account.
 * @name GenericAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenericAuthorization
 */
export declare const GenericAuthorization: {
    typeUrl: "/cosmos.authz.v1beta1.GenericAuthorization";
    aminoType: "cosmos-sdk/GenericAuthorization";
    is(o: any): o is GenericAuthorization;
    isSDK(o: any): o is GenericAuthorizationSDKType;
    encode(message: GenericAuthorization, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenericAuthorization;
    fromJSON(object: any): GenericAuthorization;
    toJSON(message: GenericAuthorization): JsonSafe<GenericAuthorization>;
    fromPartial(object: Partial<GenericAuthorization>): GenericAuthorization;
    fromProtoMsg(message: GenericAuthorizationProtoMsg): GenericAuthorization;
    toProto(message: GenericAuthorization): Uint8Array;
    toProtoMsg(message: GenericAuthorization): GenericAuthorizationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Grant gives permissions to execute
 * the provide method with expiration time.
 * @name Grant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.Grant
 */
export declare const Grant: {
    typeUrl: "/cosmos.authz.v1beta1.Grant";
    aminoType: "cosmos-sdk/Grant";
    is(o: any): o is Grant;
    isSDK(o: any): o is GrantSDKType;
    encode(message: Grant, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Grant;
    fromJSON(object: any): Grant;
    toJSON(message: Grant): JsonSafe<Grant>;
    fromPartial(object: Partial<Grant>): Grant;
    fromProtoMsg(message: GrantProtoMsg): Grant;
    toProto(message: Grant): Uint8Array;
    toProtoMsg(message: Grant): GrantProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GrantAuthorization extends a grant with both the addresses of the grantee and granter.
 * It is used in genesis.proto and query.proto
 * @name GrantAuthorization
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantAuthorization
 */
export declare const GrantAuthorization: {
    typeUrl: "/cosmos.authz.v1beta1.GrantAuthorization";
    aminoType: "cosmos-sdk/GrantAuthorization";
    is(o: any): o is GrantAuthorization;
    isSDK(o: any): o is GrantAuthorizationSDKType;
    encode(message: GrantAuthorization, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GrantAuthorization;
    fromJSON(object: any): GrantAuthorization;
    toJSON(message: GrantAuthorization): JsonSafe<GrantAuthorization>;
    fromPartial(object: Partial<GrantAuthorization>): GrantAuthorization;
    fromProtoMsg(message: GrantAuthorizationProtoMsg): GrantAuthorization;
    toProto(message: GrantAuthorization): Uint8Array;
    toProtoMsg(message: GrantAuthorization): GrantAuthorizationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GrantQueueItem contains the list of TypeURL of a sdk.Msg.
 * @name GrantQueueItem
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GrantQueueItem
 */
export declare const GrantQueueItem: {
    typeUrl: "/cosmos.authz.v1beta1.GrantQueueItem";
    aminoType: "cosmos-sdk/GrantQueueItem";
    is(o: any): o is GrantQueueItem;
    isSDK(o: any): o is GrantQueueItemSDKType;
    encode(message: GrantQueueItem, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GrantQueueItem;
    fromJSON(object: any): GrantQueueItem;
    toJSON(message: GrantQueueItem): JsonSafe<GrantQueueItem>;
    fromPartial(object: Partial<GrantQueueItem>): GrantQueueItem;
    fromProtoMsg(message: GrantQueueItemProtoMsg): GrantQueueItem;
    toProto(message: GrantQueueItem): Uint8Array;
    toProtoMsg(message: GrantQueueItem): GrantQueueItemProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=authz.d.ts.map