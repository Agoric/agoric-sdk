import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name NetAddress
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.NetAddress
 */
export interface NetAddress {
    id: string;
    ip: string;
    port: number;
}
export interface NetAddressProtoMsg {
    typeUrl: '/tendermint.p2p.NetAddress';
    value: Uint8Array;
}
/**
 * @name NetAddressSDKType
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.NetAddress
 */
export interface NetAddressSDKType {
    id: string;
    ip: string;
    port: number;
}
/**
 * @name ProtocolVersion
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.ProtocolVersion
 */
export interface ProtocolVersion {
    p2p: bigint;
    block: bigint;
    app: bigint;
}
export interface ProtocolVersionProtoMsg {
    typeUrl: '/tendermint.p2p.ProtocolVersion';
    value: Uint8Array;
}
/**
 * @name ProtocolVersionSDKType
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.ProtocolVersion
 */
export interface ProtocolVersionSDKType {
    p2p: bigint;
    block: bigint;
    app: bigint;
}
/**
 * @name DefaultNodeInfo
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.DefaultNodeInfo
 */
export interface DefaultNodeInfo {
    protocolVersion: ProtocolVersion;
    defaultNodeId: string;
    listenAddr: string;
    network: string;
    version: string;
    channels: Uint8Array;
    moniker: string;
    other: DefaultNodeInfoOther;
}
export interface DefaultNodeInfoProtoMsg {
    typeUrl: '/tendermint.p2p.DefaultNodeInfo';
    value: Uint8Array;
}
/**
 * @name DefaultNodeInfoSDKType
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.DefaultNodeInfo
 */
export interface DefaultNodeInfoSDKType {
    protocol_version: ProtocolVersionSDKType;
    default_node_id: string;
    listen_addr: string;
    network: string;
    version: string;
    channels: Uint8Array;
    moniker: string;
    other: DefaultNodeInfoOtherSDKType;
}
/**
 * @name DefaultNodeInfoOther
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.DefaultNodeInfoOther
 */
export interface DefaultNodeInfoOther {
    txIndex: string;
    rpcAddress: string;
}
export interface DefaultNodeInfoOtherProtoMsg {
    typeUrl: '/tendermint.p2p.DefaultNodeInfoOther';
    value: Uint8Array;
}
/**
 * @name DefaultNodeInfoOtherSDKType
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.DefaultNodeInfoOther
 */
export interface DefaultNodeInfoOtherSDKType {
    tx_index: string;
    rpc_address: string;
}
/**
 * @name NetAddress
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.NetAddress
 */
export declare const NetAddress: {
    typeUrl: "/tendermint.p2p.NetAddress";
    is(o: any): o is NetAddress;
    isSDK(o: any): o is NetAddressSDKType;
    encode(message: NetAddress, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): NetAddress;
    fromJSON(object: any): NetAddress;
    toJSON(message: NetAddress): JsonSafe<NetAddress>;
    fromPartial(object: Partial<NetAddress>): NetAddress;
    fromProtoMsg(message: NetAddressProtoMsg): NetAddress;
    toProto(message: NetAddress): Uint8Array;
    toProtoMsg(message: NetAddress): NetAddressProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ProtocolVersion
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.ProtocolVersion
 */
export declare const ProtocolVersion: {
    typeUrl: "/tendermint.p2p.ProtocolVersion";
    is(o: any): o is ProtocolVersion;
    isSDK(o: any): o is ProtocolVersionSDKType;
    encode(message: ProtocolVersion, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ProtocolVersion;
    fromJSON(object: any): ProtocolVersion;
    toJSON(message: ProtocolVersion): JsonSafe<ProtocolVersion>;
    fromPartial(object: Partial<ProtocolVersion>): ProtocolVersion;
    fromProtoMsg(message: ProtocolVersionProtoMsg): ProtocolVersion;
    toProto(message: ProtocolVersion): Uint8Array;
    toProtoMsg(message: ProtocolVersion): ProtocolVersionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name DefaultNodeInfo
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.DefaultNodeInfo
 */
export declare const DefaultNodeInfo: {
    typeUrl: "/tendermint.p2p.DefaultNodeInfo";
    is(o: any): o is DefaultNodeInfo;
    isSDK(o: any): o is DefaultNodeInfoSDKType;
    encode(message: DefaultNodeInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DefaultNodeInfo;
    fromJSON(object: any): DefaultNodeInfo;
    toJSON(message: DefaultNodeInfo): JsonSafe<DefaultNodeInfo>;
    fromPartial(object: Partial<DefaultNodeInfo>): DefaultNodeInfo;
    fromProtoMsg(message: DefaultNodeInfoProtoMsg): DefaultNodeInfo;
    toProto(message: DefaultNodeInfo): Uint8Array;
    toProtoMsg(message: DefaultNodeInfo): DefaultNodeInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name DefaultNodeInfoOther
 * @package tendermint.p2p
 * @see proto type: tendermint.p2p.DefaultNodeInfoOther
 */
export declare const DefaultNodeInfoOther: {
    typeUrl: "/tendermint.p2p.DefaultNodeInfoOther";
    is(o: any): o is DefaultNodeInfoOther;
    isSDK(o: any): o is DefaultNodeInfoOtherSDKType;
    encode(message: DefaultNodeInfoOther, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DefaultNodeInfoOther;
    fromJSON(object: any): DefaultNodeInfoOther;
    toJSON(message: DefaultNodeInfoOther): JsonSafe<DefaultNodeInfoOther>;
    fromPartial(object: Partial<DefaultNodeInfoOther>): DefaultNodeInfoOther;
    fromProtoMsg(message: DefaultNodeInfoOtherProtoMsg): DefaultNodeInfoOther;
    toProto(message: DefaultNodeInfoOther): Uint8Array;
    toProtoMsg(message: DefaultNodeInfoOther): DefaultNodeInfoOtherProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=types.d.ts.map