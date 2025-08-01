//@ts-nocheck
import {
  Timestamp,
  type TimestampSDKType,
} from '../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/**
 * CommitInfo defines commit information used by the multi-store when committing
 * a version/height.
 */
export interface CommitInfo {
  version: bigint;
  storeInfos: StoreInfo[];
  timestamp: Timestamp;
}
export interface CommitInfoProtoMsg {
  typeUrl: '/cosmos.store.v1beta1.CommitInfo';
  value: Uint8Array;
}
/**
 * CommitInfo defines commit information used by the multi-store when committing
 * a version/height.
 */
export interface CommitInfoSDKType {
  version: bigint;
  store_infos: StoreInfoSDKType[];
  timestamp: TimestampSDKType;
}
/**
 * StoreInfo defines store-specific commit information. It contains a reference
 * between a store name and the commit ID.
 */
export interface StoreInfo {
  name: string;
  commitId: CommitID;
}
export interface StoreInfoProtoMsg {
  typeUrl: '/cosmos.store.v1beta1.StoreInfo';
  value: Uint8Array;
}
/**
 * StoreInfo defines store-specific commit information. It contains a reference
 * between a store name and the commit ID.
 */
export interface StoreInfoSDKType {
  name: string;
  commit_id: CommitIDSDKType;
}
/**
 * CommitID defines the commitment information when a specific store is
 * committed.
 */
export interface CommitID {
  version: bigint;
  hash: Uint8Array;
}
export interface CommitIDProtoMsg {
  typeUrl: '/cosmos.store.v1beta1.CommitID';
  value: Uint8Array;
}
/**
 * CommitID defines the commitment information when a specific store is
 * committed.
 */
export interface CommitIDSDKType {
  version: bigint;
  hash: Uint8Array;
}
function createBaseCommitInfo(): CommitInfo {
  return {
    version: BigInt(0),
    storeInfos: [],
    timestamp: Timestamp.fromPartial({}),
  };
}
export const CommitInfo = {
  typeUrl: '/cosmos.store.v1beta1.CommitInfo',
  encode(
    message: CommitInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.version !== BigInt(0)) {
      writer.uint32(8).int64(message.version);
    }
    for (const v of message.storeInfos) {
      StoreInfo.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(message.timestamp, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): CommitInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCommitInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.int64();
          break;
        case 2:
          message.storeInfos.push(StoreInfo.decode(reader, reader.uint32()));
          break;
        case 3:
          message.timestamp = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CommitInfo {
    return {
      version: isSet(object.version)
        ? BigInt(object.version.toString())
        : BigInt(0),
      storeInfos: Array.isArray(object?.storeInfos)
        ? object.storeInfos.map((e: any) => StoreInfo.fromJSON(e))
        : [],
      timestamp: isSet(object.timestamp)
        ? fromJsonTimestamp(object.timestamp)
        : undefined,
    };
  },
  toJSON(message: CommitInfo): JsonSafe<CommitInfo> {
    const obj: any = {};
    message.version !== undefined &&
      (obj.version = (message.version || BigInt(0)).toString());
    if (message.storeInfos) {
      obj.storeInfos = message.storeInfos.map(e =>
        e ? StoreInfo.toJSON(e) : undefined,
      );
    } else {
      obj.storeInfos = [];
    }
    message.timestamp !== undefined &&
      (obj.timestamp = fromTimestamp(message.timestamp).toISOString());
    return obj;
  },
  fromPartial(object: Partial<CommitInfo>): CommitInfo {
    const message = createBaseCommitInfo();
    message.version =
      object.version !== undefined && object.version !== null
        ? BigInt(object.version.toString())
        : BigInt(0);
    message.storeInfos =
      object.storeInfos?.map(e => StoreInfo.fromPartial(e)) || [];
    message.timestamp =
      object.timestamp !== undefined && object.timestamp !== null
        ? Timestamp.fromPartial(object.timestamp)
        : undefined;
    return message;
  },
  fromProtoMsg(message: CommitInfoProtoMsg): CommitInfo {
    return CommitInfo.decode(message.value);
  },
  toProto(message: CommitInfo): Uint8Array {
    return CommitInfo.encode(message).finish();
  },
  toProtoMsg(message: CommitInfo): CommitInfoProtoMsg {
    return {
      typeUrl: '/cosmos.store.v1beta1.CommitInfo',
      value: CommitInfo.encode(message).finish(),
    };
  },
};
function createBaseStoreInfo(): StoreInfo {
  return {
    name: '',
    commitId: CommitID.fromPartial({}),
  };
}
export const StoreInfo = {
  typeUrl: '/cosmos.store.v1beta1.StoreInfo',
  encode(
    message: StoreInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.commitId !== undefined) {
      CommitID.encode(message.commitId, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): StoreInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStoreInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.commitId = CommitID.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): StoreInfo {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      commitId: isSet(object.commitId)
        ? CommitID.fromJSON(object.commitId)
        : undefined,
    };
  },
  toJSON(message: StoreInfo): JsonSafe<StoreInfo> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.commitId !== undefined &&
      (obj.commitId = message.commitId
        ? CommitID.toJSON(message.commitId)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<StoreInfo>): StoreInfo {
    const message = createBaseStoreInfo();
    message.name = object.name ?? '';
    message.commitId =
      object.commitId !== undefined && object.commitId !== null
        ? CommitID.fromPartial(object.commitId)
        : undefined;
    return message;
  },
  fromProtoMsg(message: StoreInfoProtoMsg): StoreInfo {
    return StoreInfo.decode(message.value);
  },
  toProto(message: StoreInfo): Uint8Array {
    return StoreInfo.encode(message).finish();
  },
  toProtoMsg(message: StoreInfo): StoreInfoProtoMsg {
    return {
      typeUrl: '/cosmos.store.v1beta1.StoreInfo',
      value: StoreInfo.encode(message).finish(),
    };
  },
};
function createBaseCommitID(): CommitID {
  return {
    version: BigInt(0),
    hash: new Uint8Array(),
  };
}
export const CommitID = {
  typeUrl: '/cosmos.store.v1beta1.CommitID',
  encode(
    message: CommitID,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.version !== BigInt(0)) {
      writer.uint32(8).int64(message.version);
    }
    if (message.hash.length !== 0) {
      writer.uint32(18).bytes(message.hash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): CommitID {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCommitID();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.int64();
          break;
        case 2:
          message.hash = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CommitID {
    return {
      version: isSet(object.version)
        ? BigInt(object.version.toString())
        : BigInt(0),
      hash: isSet(object.hash)
        ? bytesFromBase64(object.hash)
        : new Uint8Array(),
    };
  },
  toJSON(message: CommitID): JsonSafe<CommitID> {
    const obj: any = {};
    message.version !== undefined &&
      (obj.version = (message.version || BigInt(0)).toString());
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(
        message.hash !== undefined ? message.hash : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<CommitID>): CommitID {
    const message = createBaseCommitID();
    message.version =
      object.version !== undefined && object.version !== null
        ? BigInt(object.version.toString())
        : BigInt(0);
    message.hash = object.hash ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: CommitIDProtoMsg): CommitID {
    return CommitID.decode(message.value);
  },
  toProto(message: CommitID): Uint8Array {
    return CommitID.encode(message).finish();
  },
  toProtoMsg(message: CommitID): CommitIDProtoMsg {
    return {
      typeUrl: '/cosmos.store.v1beta1.CommitID',
      value: CommitID.encode(message).finish(),
    };
  },
};
