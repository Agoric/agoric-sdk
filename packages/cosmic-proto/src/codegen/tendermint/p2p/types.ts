//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
export interface NetAddress {
  id: string;
  ip: string;
  port: number;
}
export interface NetAddressProtoMsg {
  typeUrl: '/tendermint.p2p.NetAddress';
  value: Uint8Array;
}
export interface NetAddressSDKType {
  id: string;
  ip: string;
  port: number;
}
export interface ProtocolVersion {
  p2p: bigint;
  block: bigint;
  app: bigint;
}
export interface ProtocolVersionProtoMsg {
  typeUrl: '/tendermint.p2p.ProtocolVersion';
  value: Uint8Array;
}
export interface ProtocolVersionSDKType {
  p2p: bigint;
  block: bigint;
  app: bigint;
}
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
export interface DefaultNodeInfoOther {
  txIndex: string;
  rpcAddress: string;
}
export interface DefaultNodeInfoOtherProtoMsg {
  typeUrl: '/tendermint.p2p.DefaultNodeInfoOther';
  value: Uint8Array;
}
export interface DefaultNodeInfoOtherSDKType {
  tx_index: string;
  rpc_address: string;
}
function createBaseNetAddress(): NetAddress {
  return {
    id: '',
    ip: '',
    port: 0,
  };
}
export const NetAddress = {
  typeUrl: '/tendermint.p2p.NetAddress' as const,
  encode(
    message: NetAddress,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.id !== '') {
      writer.uint32(10).string(message.id);
    }
    if (message.ip !== '') {
      writer.uint32(18).string(message.ip);
    }
    if (message.port !== 0) {
      writer.uint32(24).uint32(message.port);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): NetAddress {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNetAddress();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 2:
          message.ip = reader.string();
          break;
        case 3:
          message.port = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): NetAddress {
    return {
      id: isSet(object.id) ? String(object.id) : '',
      ip: isSet(object.ip) ? String(object.ip) : '',
      port: isSet(object.port) ? Number(object.port) : 0,
    };
  },
  toJSON(message: NetAddress): JsonSafe<NetAddress> {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    message.ip !== undefined && (obj.ip = message.ip);
    message.port !== undefined && (obj.port = Math.round(message.port));
    return obj;
  },
  fromPartial(object: Partial<NetAddress>): NetAddress {
    const message = createBaseNetAddress();
    message.id = object.id ?? '';
    message.ip = object.ip ?? '';
    message.port = object.port ?? 0;
    return message;
  },
  fromProtoMsg(message: NetAddressProtoMsg): NetAddress {
    return NetAddress.decode(message.value);
  },
  toProto(message: NetAddress): Uint8Array {
    return NetAddress.encode(message).finish();
  },
  toProtoMsg(message: NetAddress): NetAddressProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.NetAddress',
      value: NetAddress.encode(message).finish(),
    };
  },
};
function createBaseProtocolVersion(): ProtocolVersion {
  return {
    p2p: BigInt(0),
    block: BigInt(0),
    app: BigInt(0),
  };
}
export const ProtocolVersion = {
  typeUrl: '/tendermint.p2p.ProtocolVersion' as const,
  encode(
    message: ProtocolVersion,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.p2p !== BigInt(0)) {
      writer.uint32(8).uint64(message.p2p);
    }
    if (message.block !== BigInt(0)) {
      writer.uint32(16).uint64(message.block);
    }
    if (message.app !== BigInt(0)) {
      writer.uint32(24).uint64(message.app);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ProtocolVersion {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProtocolVersion();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.p2p = reader.uint64();
          break;
        case 2:
          message.block = reader.uint64();
          break;
        case 3:
          message.app = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ProtocolVersion {
    return {
      p2p: isSet(object.p2p) ? BigInt(object.p2p.toString()) : BigInt(0),
      block: isSet(object.block) ? BigInt(object.block.toString()) : BigInt(0),
      app: isSet(object.app) ? BigInt(object.app.toString()) : BigInt(0),
    };
  },
  toJSON(message: ProtocolVersion): JsonSafe<ProtocolVersion> {
    const obj: any = {};
    message.p2p !== undefined &&
      (obj.p2p = (message.p2p || BigInt(0)).toString());
    message.block !== undefined &&
      (obj.block = (message.block || BigInt(0)).toString());
    message.app !== undefined &&
      (obj.app = (message.app || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<ProtocolVersion>): ProtocolVersion {
    const message = createBaseProtocolVersion();
    message.p2p =
      object.p2p !== undefined && object.p2p !== null
        ? BigInt(object.p2p.toString())
        : BigInt(0);
    message.block =
      object.block !== undefined && object.block !== null
        ? BigInt(object.block.toString())
        : BigInt(0);
    message.app =
      object.app !== undefined && object.app !== null
        ? BigInt(object.app.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: ProtocolVersionProtoMsg): ProtocolVersion {
    return ProtocolVersion.decode(message.value);
  },
  toProto(message: ProtocolVersion): Uint8Array {
    return ProtocolVersion.encode(message).finish();
  },
  toProtoMsg(message: ProtocolVersion): ProtocolVersionProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.ProtocolVersion',
      value: ProtocolVersion.encode(message).finish(),
    };
  },
};
function createBaseDefaultNodeInfo(): DefaultNodeInfo {
  return {
    protocolVersion: ProtocolVersion.fromPartial({}),
    defaultNodeId: '',
    listenAddr: '',
    network: '',
    version: '',
    channels: new Uint8Array(),
    moniker: '',
    other: DefaultNodeInfoOther.fromPartial({}),
  };
}
export const DefaultNodeInfo = {
  typeUrl: '/tendermint.p2p.DefaultNodeInfo' as const,
  encode(
    message: DefaultNodeInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.protocolVersion !== undefined) {
      ProtocolVersion.encode(
        message.protocolVersion,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.defaultNodeId !== '') {
      writer.uint32(18).string(message.defaultNodeId);
    }
    if (message.listenAddr !== '') {
      writer.uint32(26).string(message.listenAddr);
    }
    if (message.network !== '') {
      writer.uint32(34).string(message.network);
    }
    if (message.version !== '') {
      writer.uint32(42).string(message.version);
    }
    if (message.channels.length !== 0) {
      writer.uint32(50).bytes(message.channels);
    }
    if (message.moniker !== '') {
      writer.uint32(58).string(message.moniker);
    }
    if (message.other !== undefined) {
      DefaultNodeInfoOther.encode(
        message.other,
        writer.uint32(66).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DefaultNodeInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDefaultNodeInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.protocolVersion = ProtocolVersion.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 2:
          message.defaultNodeId = reader.string();
          break;
        case 3:
          message.listenAddr = reader.string();
          break;
        case 4:
          message.network = reader.string();
          break;
        case 5:
          message.version = reader.string();
          break;
        case 6:
          message.channels = reader.bytes();
          break;
        case 7:
          message.moniker = reader.string();
          break;
        case 8:
          message.other = DefaultNodeInfoOther.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DefaultNodeInfo {
    return {
      protocolVersion: isSet(object.protocolVersion)
        ? ProtocolVersion.fromJSON(object.protocolVersion)
        : undefined,
      defaultNodeId: isSet(object.defaultNodeId)
        ? String(object.defaultNodeId)
        : '',
      listenAddr: isSet(object.listenAddr) ? String(object.listenAddr) : '',
      network: isSet(object.network) ? String(object.network) : '',
      version: isSet(object.version) ? String(object.version) : '',
      channels: isSet(object.channels)
        ? bytesFromBase64(object.channels)
        : new Uint8Array(),
      moniker: isSet(object.moniker) ? String(object.moniker) : '',
      other: isSet(object.other)
        ? DefaultNodeInfoOther.fromJSON(object.other)
        : undefined,
    };
  },
  toJSON(message: DefaultNodeInfo): JsonSafe<DefaultNodeInfo> {
    const obj: any = {};
    message.protocolVersion !== undefined &&
      (obj.protocolVersion = message.protocolVersion
        ? ProtocolVersion.toJSON(message.protocolVersion)
        : undefined);
    message.defaultNodeId !== undefined &&
      (obj.defaultNodeId = message.defaultNodeId);
    message.listenAddr !== undefined && (obj.listenAddr = message.listenAddr);
    message.network !== undefined && (obj.network = message.network);
    message.version !== undefined && (obj.version = message.version);
    message.channels !== undefined &&
      (obj.channels = base64FromBytes(
        message.channels !== undefined ? message.channels : new Uint8Array(),
      ));
    message.moniker !== undefined && (obj.moniker = message.moniker);
    message.other !== undefined &&
      (obj.other = message.other
        ? DefaultNodeInfoOther.toJSON(message.other)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<DefaultNodeInfo>): DefaultNodeInfo {
    const message = createBaseDefaultNodeInfo();
    message.protocolVersion =
      object.protocolVersion !== undefined && object.protocolVersion !== null
        ? ProtocolVersion.fromPartial(object.protocolVersion)
        : undefined;
    message.defaultNodeId = object.defaultNodeId ?? '';
    message.listenAddr = object.listenAddr ?? '';
    message.network = object.network ?? '';
    message.version = object.version ?? '';
    message.channels = object.channels ?? new Uint8Array();
    message.moniker = object.moniker ?? '';
    message.other =
      object.other !== undefined && object.other !== null
        ? DefaultNodeInfoOther.fromPartial(object.other)
        : undefined;
    return message;
  },
  fromProtoMsg(message: DefaultNodeInfoProtoMsg): DefaultNodeInfo {
    return DefaultNodeInfo.decode(message.value);
  },
  toProto(message: DefaultNodeInfo): Uint8Array {
    return DefaultNodeInfo.encode(message).finish();
  },
  toProtoMsg(message: DefaultNodeInfo): DefaultNodeInfoProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.DefaultNodeInfo',
      value: DefaultNodeInfo.encode(message).finish(),
    };
  },
};
function createBaseDefaultNodeInfoOther(): DefaultNodeInfoOther {
  return {
    txIndex: '',
    rpcAddress: '',
  };
}
export const DefaultNodeInfoOther = {
  typeUrl: '/tendermint.p2p.DefaultNodeInfoOther' as const,
  encode(
    message: DefaultNodeInfoOther,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.txIndex !== '') {
      writer.uint32(10).string(message.txIndex);
    }
    if (message.rpcAddress !== '') {
      writer.uint32(18).string(message.rpcAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DefaultNodeInfoOther {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDefaultNodeInfoOther();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txIndex = reader.string();
          break;
        case 2:
          message.rpcAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DefaultNodeInfoOther {
    return {
      txIndex: isSet(object.txIndex) ? String(object.txIndex) : '',
      rpcAddress: isSet(object.rpcAddress) ? String(object.rpcAddress) : '',
    };
  },
  toJSON(message: DefaultNodeInfoOther): JsonSafe<DefaultNodeInfoOther> {
    const obj: any = {};
    message.txIndex !== undefined && (obj.txIndex = message.txIndex);
    message.rpcAddress !== undefined && (obj.rpcAddress = message.rpcAddress);
    return obj;
  },
  fromPartial(object: Partial<DefaultNodeInfoOther>): DefaultNodeInfoOther {
    const message = createBaseDefaultNodeInfoOther();
    message.txIndex = object.txIndex ?? '';
    message.rpcAddress = object.rpcAddress ?? '';
    return message;
  },
  fromProtoMsg(message: DefaultNodeInfoOtherProtoMsg): DefaultNodeInfoOther {
    return DefaultNodeInfoOther.decode(message.value);
  },
  toProto(message: DefaultNodeInfoOther): Uint8Array {
    return DefaultNodeInfoOther.encode(message).finish();
  },
  toProtoMsg(message: DefaultNodeInfoOther): DefaultNodeInfoOtherProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.DefaultNodeInfoOther',
      value: DefaultNodeInfoOther.encode(message).finish(),
    };
  },
};
