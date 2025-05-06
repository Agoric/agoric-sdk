//@ts-nocheck
import {
  Timestamp,
  type TimestampSDKType,
} from '../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
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
export interface NodeInfo {
  protocolVersion: ProtocolVersion;
  nodeId: string;
  listenAddr: string;
  network: string;
  version: string;
  channels: Uint8Array;
  moniker: string;
  other: NodeInfoOther;
}
export interface NodeInfoProtoMsg {
  typeUrl: '/tendermint.p2p.NodeInfo';
  value: Uint8Array;
}
export interface NodeInfoSDKType {
  protocol_version: ProtocolVersionSDKType;
  node_id: string;
  listen_addr: string;
  network: string;
  version: string;
  channels: Uint8Array;
  moniker: string;
  other: NodeInfoOtherSDKType;
}
export interface NodeInfoOther {
  txIndex: string;
  rpcAddress: string;
}
export interface NodeInfoOtherProtoMsg {
  typeUrl: '/tendermint.p2p.NodeInfoOther';
  value: Uint8Array;
}
export interface NodeInfoOtherSDKType {
  tx_index: string;
  rpc_address: string;
}
export interface PeerInfo {
  id: string;
  addressInfo: PeerAddressInfo[];
  lastConnected?: Timestamp;
}
export interface PeerInfoProtoMsg {
  typeUrl: '/tendermint.p2p.PeerInfo';
  value: Uint8Array;
}
export interface PeerInfoSDKType {
  id: string;
  address_info: PeerAddressInfoSDKType[];
  last_connected?: TimestampSDKType;
}
export interface PeerAddressInfo {
  address: string;
  lastDialSuccess?: Timestamp;
  lastDialFailure?: Timestamp;
  dialFailures: number;
}
export interface PeerAddressInfoProtoMsg {
  typeUrl: '/tendermint.p2p.PeerAddressInfo';
  value: Uint8Array;
}
export interface PeerAddressInfoSDKType {
  address: string;
  last_dial_success?: TimestampSDKType;
  last_dial_failure?: TimestampSDKType;
  dial_failures: number;
}
function createBaseProtocolVersion(): ProtocolVersion {
  return {
    p2p: BigInt(0),
    block: BigInt(0),
    app: BigInt(0),
  };
}
export const ProtocolVersion = {
  typeUrl: '/tendermint.p2p.ProtocolVersion',
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
function createBaseNodeInfo(): NodeInfo {
  return {
    protocolVersion: ProtocolVersion.fromPartial({}),
    nodeId: '',
    listenAddr: '',
    network: '',
    version: '',
    channels: new Uint8Array(),
    moniker: '',
    other: NodeInfoOther.fromPartial({}),
  };
}
export const NodeInfo = {
  typeUrl: '/tendermint.p2p.NodeInfo',
  encode(
    message: NodeInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.protocolVersion !== undefined) {
      ProtocolVersion.encode(
        message.protocolVersion,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.nodeId !== '') {
      writer.uint32(18).string(message.nodeId);
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
      NodeInfoOther.encode(message.other, writer.uint32(66).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): NodeInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNodeInfo();
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
          message.nodeId = reader.string();
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
          message.other = NodeInfoOther.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): NodeInfo {
    return {
      protocolVersion: isSet(object.protocolVersion)
        ? ProtocolVersion.fromJSON(object.protocolVersion)
        : undefined,
      nodeId: isSet(object.nodeId) ? String(object.nodeId) : '',
      listenAddr: isSet(object.listenAddr) ? String(object.listenAddr) : '',
      network: isSet(object.network) ? String(object.network) : '',
      version: isSet(object.version) ? String(object.version) : '',
      channels: isSet(object.channels)
        ? bytesFromBase64(object.channels)
        : new Uint8Array(),
      moniker: isSet(object.moniker) ? String(object.moniker) : '',
      other: isSet(object.other)
        ? NodeInfoOther.fromJSON(object.other)
        : undefined,
    };
  },
  toJSON(message: NodeInfo): JsonSafe<NodeInfo> {
    const obj: any = {};
    message.protocolVersion !== undefined &&
      (obj.protocolVersion = message.protocolVersion
        ? ProtocolVersion.toJSON(message.protocolVersion)
        : undefined);
    message.nodeId !== undefined && (obj.nodeId = message.nodeId);
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
        ? NodeInfoOther.toJSON(message.other)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<NodeInfo>): NodeInfo {
    const message = createBaseNodeInfo();
    message.protocolVersion =
      object.protocolVersion !== undefined && object.protocolVersion !== null
        ? ProtocolVersion.fromPartial(object.protocolVersion)
        : undefined;
    message.nodeId = object.nodeId ?? '';
    message.listenAddr = object.listenAddr ?? '';
    message.network = object.network ?? '';
    message.version = object.version ?? '';
    message.channels = object.channels ?? new Uint8Array();
    message.moniker = object.moniker ?? '';
    message.other =
      object.other !== undefined && object.other !== null
        ? NodeInfoOther.fromPartial(object.other)
        : undefined;
    return message;
  },
  fromProtoMsg(message: NodeInfoProtoMsg): NodeInfo {
    return NodeInfo.decode(message.value);
  },
  toProto(message: NodeInfo): Uint8Array {
    return NodeInfo.encode(message).finish();
  },
  toProtoMsg(message: NodeInfo): NodeInfoProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.NodeInfo',
      value: NodeInfo.encode(message).finish(),
    };
  },
};
function createBaseNodeInfoOther(): NodeInfoOther {
  return {
    txIndex: '',
    rpcAddress: '',
  };
}
export const NodeInfoOther = {
  typeUrl: '/tendermint.p2p.NodeInfoOther',
  encode(
    message: NodeInfoOther,
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
  decode(input: BinaryReader | Uint8Array, length?: number): NodeInfoOther {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNodeInfoOther();
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
  fromJSON(object: any): NodeInfoOther {
    return {
      txIndex: isSet(object.txIndex) ? String(object.txIndex) : '',
      rpcAddress: isSet(object.rpcAddress) ? String(object.rpcAddress) : '',
    };
  },
  toJSON(message: NodeInfoOther): JsonSafe<NodeInfoOther> {
    const obj: any = {};
    message.txIndex !== undefined && (obj.txIndex = message.txIndex);
    message.rpcAddress !== undefined && (obj.rpcAddress = message.rpcAddress);
    return obj;
  },
  fromPartial(object: Partial<NodeInfoOther>): NodeInfoOther {
    const message = createBaseNodeInfoOther();
    message.txIndex = object.txIndex ?? '';
    message.rpcAddress = object.rpcAddress ?? '';
    return message;
  },
  fromProtoMsg(message: NodeInfoOtherProtoMsg): NodeInfoOther {
    return NodeInfoOther.decode(message.value);
  },
  toProto(message: NodeInfoOther): Uint8Array {
    return NodeInfoOther.encode(message).finish();
  },
  toProtoMsg(message: NodeInfoOther): NodeInfoOtherProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.NodeInfoOther',
      value: NodeInfoOther.encode(message).finish(),
    };
  },
};
function createBasePeerInfo(): PeerInfo {
  return {
    id: '',
    addressInfo: [],
    lastConnected: undefined,
  };
}
export const PeerInfo = {
  typeUrl: '/tendermint.p2p.PeerInfo',
  encode(
    message: PeerInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.id !== '') {
      writer.uint32(10).string(message.id);
    }
    for (const v of message.addressInfo) {
      PeerAddressInfo.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.lastConnected !== undefined) {
      Timestamp.encode(
        message.lastConnected,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PeerInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePeerInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.string();
          break;
        case 2:
          message.addressInfo.push(
            PeerAddressInfo.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.lastConnected = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PeerInfo {
    return {
      id: isSet(object.id) ? String(object.id) : '',
      addressInfo: Array.isArray(object?.addressInfo)
        ? object.addressInfo.map((e: any) => PeerAddressInfo.fromJSON(e))
        : [],
      lastConnected: isSet(object.lastConnected)
        ? fromJsonTimestamp(object.lastConnected)
        : undefined,
    };
  },
  toJSON(message: PeerInfo): JsonSafe<PeerInfo> {
    const obj: any = {};
    message.id !== undefined && (obj.id = message.id);
    if (message.addressInfo) {
      obj.addressInfo = message.addressInfo.map(e =>
        e ? PeerAddressInfo.toJSON(e) : undefined,
      );
    } else {
      obj.addressInfo = [];
    }
    message.lastConnected !== undefined &&
      (obj.lastConnected = fromTimestamp(message.lastConnected).toISOString());
    return obj;
  },
  fromPartial(object: Partial<PeerInfo>): PeerInfo {
    const message = createBasePeerInfo();
    message.id = object.id ?? '';
    message.addressInfo =
      object.addressInfo?.map(e => PeerAddressInfo.fromPartial(e)) || [];
    message.lastConnected =
      object.lastConnected !== undefined && object.lastConnected !== null
        ? Timestamp.fromPartial(object.lastConnected)
        : undefined;
    return message;
  },
  fromProtoMsg(message: PeerInfoProtoMsg): PeerInfo {
    return PeerInfo.decode(message.value);
  },
  toProto(message: PeerInfo): Uint8Array {
    return PeerInfo.encode(message).finish();
  },
  toProtoMsg(message: PeerInfo): PeerInfoProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.PeerInfo',
      value: PeerInfo.encode(message).finish(),
    };
  },
};
function createBasePeerAddressInfo(): PeerAddressInfo {
  return {
    address: '',
    lastDialSuccess: undefined,
    lastDialFailure: undefined,
    dialFailures: 0,
  };
}
export const PeerAddressInfo = {
  typeUrl: '/tendermint.p2p.PeerAddressInfo',
  encode(
    message: PeerAddressInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.lastDialSuccess !== undefined) {
      Timestamp.encode(
        message.lastDialSuccess,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.lastDialFailure !== undefined) {
      Timestamp.encode(
        message.lastDialFailure,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.dialFailures !== 0) {
      writer.uint32(32).uint32(message.dialFailures);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PeerAddressInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePeerAddressInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.lastDialSuccess = Timestamp.decode(reader, reader.uint32());
          break;
        case 3:
          message.lastDialFailure = Timestamp.decode(reader, reader.uint32());
          break;
        case 4:
          message.dialFailures = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PeerAddressInfo {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      lastDialSuccess: isSet(object.lastDialSuccess)
        ? fromJsonTimestamp(object.lastDialSuccess)
        : undefined,
      lastDialFailure: isSet(object.lastDialFailure)
        ? fromJsonTimestamp(object.lastDialFailure)
        : undefined,
      dialFailures: isSet(object.dialFailures)
        ? Number(object.dialFailures)
        : 0,
    };
  },
  toJSON(message: PeerAddressInfo): JsonSafe<PeerAddressInfo> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.lastDialSuccess !== undefined &&
      (obj.lastDialSuccess = fromTimestamp(
        message.lastDialSuccess,
      ).toISOString());
    message.lastDialFailure !== undefined &&
      (obj.lastDialFailure = fromTimestamp(
        message.lastDialFailure,
      ).toISOString());
    message.dialFailures !== undefined &&
      (obj.dialFailures = Math.round(message.dialFailures));
    return obj;
  },
  fromPartial(object: Partial<PeerAddressInfo>): PeerAddressInfo {
    const message = createBasePeerAddressInfo();
    message.address = object.address ?? '';
    message.lastDialSuccess =
      object.lastDialSuccess !== undefined && object.lastDialSuccess !== null
        ? Timestamp.fromPartial(object.lastDialSuccess)
        : undefined;
    message.lastDialFailure =
      object.lastDialFailure !== undefined && object.lastDialFailure !== null
        ? Timestamp.fromPartial(object.lastDialFailure)
        : undefined;
    message.dialFailures = object.dialFailures ?? 0;
    return message;
  },
  fromProtoMsg(message: PeerAddressInfoProtoMsg): PeerAddressInfo {
    return PeerAddressInfo.decode(message.value);
  },
  toProto(message: PeerAddressInfo): Uint8Array {
    return PeerAddressInfo.encode(message).finish();
  },
  toProtoMsg(message: PeerAddressInfo): PeerAddressInfoProtoMsg {
    return {
      typeUrl: '/tendermint.p2p.PeerAddressInfo',
      value: PeerAddressInfo.encode(message).finish(),
    };
  },
};
