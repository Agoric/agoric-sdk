import { Coin, type CoinSDKType } from '../../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Allocation defines the spend limit for a particular port and channel
 * @name Allocation
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Allocation
 */
export interface Allocation {
    /**
     * the port on which the packet will be sent
     */
    sourcePort: string;
    /**
     * the channel by which the packet will be sent
     */
    sourceChannel: string;
    /**
     * spend limitation on the channel
     */
    spendLimit: Coin[];
    /**
     * allow list of receivers, an empty allow list permits any receiver address
     */
    allowList: string[];
    /**
     * allow list of memo strings, an empty list prohibits all memo strings;
     * a list only with "*" permits any memo string
     */
    allowedPacketData: string[];
}
export interface AllocationProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.Allocation';
    value: Uint8Array;
}
/**
 * Allocation defines the spend limit for a particular port and channel
 * @name AllocationSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Allocation
 */
export interface AllocationSDKType {
    source_port: string;
    source_channel: string;
    spend_limit: CoinSDKType[];
    allow_list: string[];
    allowed_packet_data: string[];
}
/**
 * TransferAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account for ibc transfer on a specific channel
 * @name TransferAuthorization
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.TransferAuthorization
 */
export interface TransferAuthorization {
    $typeUrl?: '/ibc.applications.transfer.v1.TransferAuthorization';
    /**
     * port and channel amounts
     */
    allocations: Allocation[];
}
export interface TransferAuthorizationProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.TransferAuthorization';
    value: Uint8Array;
}
/**
 * TransferAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account for ibc transfer on a specific channel
 * @name TransferAuthorizationSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.TransferAuthorization
 */
export interface TransferAuthorizationSDKType {
    $typeUrl?: '/ibc.applications.transfer.v1.TransferAuthorization';
    allocations: AllocationSDKType[];
}
/**
 * Allocation defines the spend limit for a particular port and channel
 * @name Allocation
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Allocation
 */
export declare const Allocation: {
    typeUrl: "/ibc.applications.transfer.v1.Allocation";
    aminoType: "cosmos-sdk/Allocation";
    is(o: any): o is Allocation;
    isSDK(o: any): o is AllocationSDKType;
    encode(message: Allocation, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Allocation;
    fromJSON(object: any): Allocation;
    toJSON(message: Allocation): JsonSafe<Allocation>;
    fromPartial(object: Partial<Allocation>): Allocation;
    fromProtoMsg(message: AllocationProtoMsg): Allocation;
    toProto(message: Allocation): Uint8Array;
    toProtoMsg(message: Allocation): AllocationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TransferAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account for ibc transfer on a specific channel
 * @name TransferAuthorization
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.TransferAuthorization
 */
export declare const TransferAuthorization: {
    typeUrl: "/ibc.applications.transfer.v1.TransferAuthorization";
    aminoType: "cosmos-sdk/TransferAuthorization";
    is(o: any): o is TransferAuthorization;
    isSDK(o: any): o is TransferAuthorizationSDKType;
    encode(message: TransferAuthorization, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TransferAuthorization;
    fromJSON(object: any): TransferAuthorization;
    toJSON(message: TransferAuthorization): JsonSafe<TransferAuthorization>;
    fromPartial(object: Partial<TransferAuthorization>): TransferAuthorization;
    fromProtoMsg(message: TransferAuthorizationProtoMsg): TransferAuthorization;
    toProto(message: TransferAuthorization): Uint8Array;
    toProtoMsg(message: TransferAuthorization): TransferAuthorizationProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=authz.d.ts.map