//@ts-nocheck
import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * IdentifiedClientState defines a client state with an additional client
 * identifier field.
 * @name IdentifiedClientState
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedClientState
 */
export interface IdentifiedClientState {
  /**
   * client identifier
   */
  clientId: string;
  /**
   * client state
   */
  clientState?: Any;
}
export interface IdentifiedClientStateProtoMsg {
  typeUrl: '/ibc.core.client.v1.IdentifiedClientState';
  value: Uint8Array;
}
/**
 * IdentifiedClientState defines a client state with an additional client
 * identifier field.
 * @name IdentifiedClientStateSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedClientState
 */
export interface IdentifiedClientStateSDKType {
  client_id: string;
  client_state?: AnySDKType;
}
/**
 * ConsensusStateWithHeight defines a consensus state with an additional height
 * field.
 * @name ConsensusStateWithHeight
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ConsensusStateWithHeight
 */
export interface ConsensusStateWithHeight {
  /**
   * consensus state height
   */
  height: Height;
  /**
   * consensus state
   */
  consensusState?: Any;
}
export interface ConsensusStateWithHeightProtoMsg {
  typeUrl: '/ibc.core.client.v1.ConsensusStateWithHeight';
  value: Uint8Array;
}
/**
 * ConsensusStateWithHeight defines a consensus state with an additional height
 * field.
 * @name ConsensusStateWithHeightSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ConsensusStateWithHeight
 */
export interface ConsensusStateWithHeightSDKType {
  height: HeightSDKType;
  consensus_state?: AnySDKType;
}
/**
 * ClientConsensusStates defines all the stored consensus states for a given
 * client.
 * @name ClientConsensusStates
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientConsensusStates
 */
export interface ClientConsensusStates {
  /**
   * client identifier
   */
  clientId: string;
  /**
   * consensus states and their heights associated with the client
   */
  consensusStates: ConsensusStateWithHeight[];
}
export interface ClientConsensusStatesProtoMsg {
  typeUrl: '/ibc.core.client.v1.ClientConsensusStates';
  value: Uint8Array;
}
/**
 * ClientConsensusStates defines all the stored consensus states for a given
 * client.
 * @name ClientConsensusStatesSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientConsensusStates
 */
export interface ClientConsensusStatesSDKType {
  client_id: string;
  consensus_states: ConsensusStateWithHeightSDKType[];
}
/**
 * Height is a monotonically increasing data type
 * that can be compared against another Height for the purposes of updating and
 * freezing clients
 *
 * Normally the RevisionHeight is incremented at each height while keeping
 * RevisionNumber the same. However some consensus algorithms may choose to
 * reset the height in certain conditions e.g. hard forks, state-machine
 * breaking changes In these cases, the RevisionNumber is incremented so that
 * height continues to be monitonically increasing even as the RevisionHeight
 * gets reset
 *
 * Please note that json tags for generated Go code are overridden to explicitly exclude the omitempty jsontag.
 * This enforces the Go json marshaller to always emit zero values for both revision_number and revision_height.
 * @name Height
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Height
 */
export interface Height {
  /**
   * the revision that the client is currently on
   */
  revisionNumber: bigint;
  /**
   * the height within the given revision
   */
  revisionHeight: bigint;
}
export interface HeightProtoMsg {
  typeUrl: '/ibc.core.client.v1.Height';
  value: Uint8Array;
}
/**
 * Height is a monotonically increasing data type
 * that can be compared against another Height for the purposes of updating and
 * freezing clients
 *
 * Normally the RevisionHeight is incremented at each height while keeping
 * RevisionNumber the same. However some consensus algorithms may choose to
 * reset the height in certain conditions e.g. hard forks, state-machine
 * breaking changes In these cases, the RevisionNumber is incremented so that
 * height continues to be monitonically increasing even as the RevisionHeight
 * gets reset
 *
 * Please note that json tags for generated Go code are overridden to explicitly exclude the omitempty jsontag.
 * This enforces the Go json marshaller to always emit zero values for both revision_number and revision_height.
 * @name HeightSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Height
 */
export interface HeightSDKType {
  revision_number: bigint;
  revision_height: bigint;
}
/**
 * Params defines the set of IBC light client parameters.
 * @name Params
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Params
 */
export interface Params {
  /**
   * allowed_clients defines the list of allowed client state types which can be created
   * and interacted with. If a client type is removed from the allowed clients list, usage
   * of this client will be disabled until it is added again to the list.
   */
  allowedClients: string[];
}
export interface ParamsProtoMsg {
  typeUrl: '/ibc.core.client.v1.Params';
  value: Uint8Array;
}
/**
 * Params defines the set of IBC light client parameters.
 * @name ParamsSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Params
 */
export interface ParamsSDKType {
  allowed_clients: string[];
}
function createBaseIdentifiedClientState(): IdentifiedClientState {
  return {
    clientId: '',
    clientState: undefined,
  };
}
/**
 * IdentifiedClientState defines a client state with an additional client
 * identifier field.
 * @name IdentifiedClientState
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedClientState
 */
export const IdentifiedClientState = {
  typeUrl: '/ibc.core.client.v1.IdentifiedClientState' as const,
  aminoType: 'cosmos-sdk/IdentifiedClientState' as const,
  is(o: any): o is IdentifiedClientState {
    return (
      o &&
      (o.$typeUrl === IdentifiedClientState.typeUrl ||
        typeof o.clientId === 'string')
    );
  },
  isSDK(o: any): o is IdentifiedClientStateSDKType {
    return (
      o &&
      (o.$typeUrl === IdentifiedClientState.typeUrl ||
        typeof o.client_id === 'string')
    );
  },
  encode(
    message: IdentifiedClientState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.clientState !== undefined) {
      Any.encode(message.clientState, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): IdentifiedClientState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIdentifiedClientState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.clientState = Any.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): IdentifiedClientState {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      clientState: isSet(object.clientState)
        ? Any.fromJSON(object.clientState)
        : undefined,
    };
  },
  toJSON(message: IdentifiedClientState): JsonSafe<IdentifiedClientState> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.clientState !== undefined &&
      (obj.clientState = message.clientState
        ? Any.toJSON(message.clientState)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<IdentifiedClientState>): IdentifiedClientState {
    const message = createBaseIdentifiedClientState();
    message.clientId = object.clientId ?? '';
    message.clientState =
      object.clientState !== undefined && object.clientState !== null
        ? Any.fromPartial(object.clientState)
        : undefined;
    return message;
  },
  fromProtoMsg(message: IdentifiedClientStateProtoMsg): IdentifiedClientState {
    return IdentifiedClientState.decode(message.value);
  },
  toProto(message: IdentifiedClientState): Uint8Array {
    return IdentifiedClientState.encode(message).finish();
  },
  toProtoMsg(message: IdentifiedClientState): IdentifiedClientStateProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v1.IdentifiedClientState',
      value: IdentifiedClientState.encode(message).finish(),
    };
  },
};
function createBaseConsensusStateWithHeight(): ConsensusStateWithHeight {
  return {
    height: Height.fromPartial({}),
    consensusState: undefined,
  };
}
/**
 * ConsensusStateWithHeight defines a consensus state with an additional height
 * field.
 * @name ConsensusStateWithHeight
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ConsensusStateWithHeight
 */
export const ConsensusStateWithHeight = {
  typeUrl: '/ibc.core.client.v1.ConsensusStateWithHeight' as const,
  aminoType: 'cosmos-sdk/ConsensusStateWithHeight' as const,
  is(o: any): o is ConsensusStateWithHeight {
    return (
      o &&
      (o.$typeUrl === ConsensusStateWithHeight.typeUrl || Height.is(o.height))
    );
  },
  isSDK(o: any): o is ConsensusStateWithHeightSDKType {
    return (
      o &&
      (o.$typeUrl === ConsensusStateWithHeight.typeUrl ||
        Height.isSDK(o.height))
    );
  },
  encode(
    message: ConsensusStateWithHeight,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.height !== undefined) {
      Height.encode(message.height, writer.uint32(10).fork()).ldelim();
    }
    if (message.consensusState !== undefined) {
      Any.encode(message.consensusState, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ConsensusStateWithHeight {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConsensusStateWithHeight();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.height = Height.decode(reader, reader.uint32());
          break;
        case 2:
          message.consensusState = Any.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ConsensusStateWithHeight {
    return {
      height: isSet(object.height) ? Height.fromJSON(object.height) : undefined,
      consensusState: isSet(object.consensusState)
        ? Any.fromJSON(object.consensusState)
        : undefined,
    };
  },
  toJSON(
    message: ConsensusStateWithHeight,
  ): JsonSafe<ConsensusStateWithHeight> {
    const obj: any = {};
    message.height !== undefined &&
      (obj.height = message.height ? Height.toJSON(message.height) : undefined);
    message.consensusState !== undefined &&
      (obj.consensusState = message.consensusState
        ? Any.toJSON(message.consensusState)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<ConsensusStateWithHeight>,
  ): ConsensusStateWithHeight {
    const message = createBaseConsensusStateWithHeight();
    message.height =
      object.height !== undefined && object.height !== null
        ? Height.fromPartial(object.height)
        : undefined;
    message.consensusState =
      object.consensusState !== undefined && object.consensusState !== null
        ? Any.fromPartial(object.consensusState)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: ConsensusStateWithHeightProtoMsg,
  ): ConsensusStateWithHeight {
    return ConsensusStateWithHeight.decode(message.value);
  },
  toProto(message: ConsensusStateWithHeight): Uint8Array {
    return ConsensusStateWithHeight.encode(message).finish();
  },
  toProtoMsg(
    message: ConsensusStateWithHeight,
  ): ConsensusStateWithHeightProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v1.ConsensusStateWithHeight',
      value: ConsensusStateWithHeight.encode(message).finish(),
    };
  },
};
function createBaseClientConsensusStates(): ClientConsensusStates {
  return {
    clientId: '',
    consensusStates: [],
  };
}
/**
 * ClientConsensusStates defines all the stored consensus states for a given
 * client.
 * @name ClientConsensusStates
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientConsensusStates
 */
export const ClientConsensusStates = {
  typeUrl: '/ibc.core.client.v1.ClientConsensusStates' as const,
  aminoType: 'cosmos-sdk/ClientConsensusStates' as const,
  is(o: any): o is ClientConsensusStates {
    return (
      o &&
      (o.$typeUrl === ClientConsensusStates.typeUrl ||
        (typeof o.clientId === 'string' &&
          Array.isArray(o.consensusStates) &&
          (!o.consensusStates.length ||
            ConsensusStateWithHeight.is(o.consensusStates[0]))))
    );
  },
  isSDK(o: any): o is ClientConsensusStatesSDKType {
    return (
      o &&
      (o.$typeUrl === ClientConsensusStates.typeUrl ||
        (typeof o.client_id === 'string' &&
          Array.isArray(o.consensus_states) &&
          (!o.consensus_states.length ||
            ConsensusStateWithHeight.isSDK(o.consensus_states[0]))))
    );
  },
  encode(
    message: ClientConsensusStates,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    for (const v of message.consensusStates) {
      ConsensusStateWithHeight.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ClientConsensusStates {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseClientConsensusStates();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.consensusStates.push(
            ConsensusStateWithHeight.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ClientConsensusStates {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      consensusStates: Array.isArray(object?.consensusStates)
        ? object.consensusStates.map((e: any) =>
            ConsensusStateWithHeight.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: ClientConsensusStates): JsonSafe<ClientConsensusStates> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    if (message.consensusStates) {
      obj.consensusStates = message.consensusStates.map(e =>
        e ? ConsensusStateWithHeight.toJSON(e) : undefined,
      );
    } else {
      obj.consensusStates = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ClientConsensusStates>): ClientConsensusStates {
    const message = createBaseClientConsensusStates();
    message.clientId = object.clientId ?? '';
    message.consensusStates =
      object.consensusStates?.map(e =>
        ConsensusStateWithHeight.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: ClientConsensusStatesProtoMsg): ClientConsensusStates {
    return ClientConsensusStates.decode(message.value);
  },
  toProto(message: ClientConsensusStates): Uint8Array {
    return ClientConsensusStates.encode(message).finish();
  },
  toProtoMsg(message: ClientConsensusStates): ClientConsensusStatesProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v1.ClientConsensusStates',
      value: ClientConsensusStates.encode(message).finish(),
    };
  },
};
function createBaseHeight(): Height {
  return {
    revisionNumber: BigInt(0),
    revisionHeight: BigInt(0),
  };
}
/**
 * Height is a monotonically increasing data type
 * that can be compared against another Height for the purposes of updating and
 * freezing clients
 *
 * Normally the RevisionHeight is incremented at each height while keeping
 * RevisionNumber the same. However some consensus algorithms may choose to
 * reset the height in certain conditions e.g. hard forks, state-machine
 * breaking changes In these cases, the RevisionNumber is incremented so that
 * height continues to be monitonically increasing even as the RevisionHeight
 * gets reset
 *
 * Please note that json tags for generated Go code are overridden to explicitly exclude the omitempty jsontag.
 * This enforces the Go json marshaller to always emit zero values for both revision_number and revision_height.
 * @name Height
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Height
 */
export const Height = {
  typeUrl: '/ibc.core.client.v1.Height' as const,
  aminoType: 'cosmos-sdk/Height' as const,
  is(o: any): o is Height {
    return (
      o &&
      (o.$typeUrl === Height.typeUrl ||
        (typeof o.revisionNumber === 'bigint' &&
          typeof o.revisionHeight === 'bigint'))
    );
  },
  isSDK(o: any): o is HeightSDKType {
    return (
      o &&
      (o.$typeUrl === Height.typeUrl ||
        (typeof o.revision_number === 'bigint' &&
          typeof o.revision_height === 'bigint'))
    );
  },
  encode(
    message: Height,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.revisionNumber !== BigInt(0)) {
      writer.uint32(8).uint64(message.revisionNumber);
    }
    if (message.revisionHeight !== BigInt(0)) {
      writer.uint32(16).uint64(message.revisionHeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Height {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHeight();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.revisionNumber = reader.uint64();
          break;
        case 2:
          message.revisionHeight = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Height {
    return {
      revisionNumber: isSet(object.revisionNumber)
        ? BigInt(object.revisionNumber.toString())
        : BigInt(0),
      revisionHeight: isSet(object.revisionHeight)
        ? BigInt(object.revisionHeight.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Height): JsonSafe<Height> {
    const obj: any = {};
    message.revisionNumber !== undefined &&
      (obj.revisionNumber = (message.revisionNumber || BigInt(0)).toString());
    message.revisionHeight !== undefined &&
      (obj.revisionHeight = (message.revisionHeight || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<Height>): Height {
    const message = createBaseHeight();
    message.revisionNumber =
      object.revisionNumber !== undefined && object.revisionNumber !== null
        ? BigInt(object.revisionNumber.toString())
        : BigInt(0);
    message.revisionHeight =
      object.revisionHeight !== undefined && object.revisionHeight !== null
        ? BigInt(object.revisionHeight.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: HeightProtoMsg): Height {
    return Height.decode(message.value);
  },
  toProto(message: Height): Uint8Array {
    return Height.encode(message).finish();
  },
  toProtoMsg(message: Height): HeightProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v1.Height',
      value: Height.encode(message).finish(),
    };
  },
};
function createBaseParams(): Params {
  return {
    allowedClients: [],
  };
}
/**
 * Params defines the set of IBC light client parameters.
 * @name Params
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Params
 */
export const Params = {
  typeUrl: '/ibc.core.client.v1.Params' as const,
  aminoType: 'cosmos-sdk/Params' as const,
  is(o: any): o is Params {
    return (
      o &&
      (o.$typeUrl === Params.typeUrl ||
        (Array.isArray(o.allowedClients) &&
          (!o.allowedClients.length ||
            typeof o.allowedClients[0] === 'string')))
    );
  },
  isSDK(o: any): o is ParamsSDKType {
    return (
      o &&
      (o.$typeUrl === Params.typeUrl ||
        (Array.isArray(o.allowed_clients) &&
          (!o.allowed_clients.length ||
            typeof o.allowed_clients[0] === 'string')))
    );
  },
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.allowedClients) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Params {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.allowedClients.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Params {
    return {
      allowedClients: Array.isArray(object?.allowedClients)
        ? object.allowedClients.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    if (message.allowedClients) {
      obj.allowedClients = message.allowedClients.map(e => e);
    } else {
      obj.allowedClients = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.allowedClients = object.allowedClients?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: ParamsProtoMsg): Params {
    return Params.decode(message.value);
  },
  toProto(message: Params): Uint8Array {
    return Params.encode(message).finish();
  },
  toProtoMsg(message: Params): ParamsProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
