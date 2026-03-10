//@ts-nocheck
import {
  Counterparty,
  type CounterpartySDKType,
  Version,
  type VersionSDKType,
} from './connection.js';
import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import {
  Height,
  type HeightSDKType,
  Params,
  type ParamsSDKType,
} from '../../client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/**
 * MsgConnectionOpenInit defines the msg sent by an account on Chain A to
 * initialize a connection with Chain B.
 * @name MsgConnectionOpenInit
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInit
 */
export interface MsgConnectionOpenInit {
  clientId: string;
  counterparty: Counterparty;
  version?: Version;
  delayPeriod: bigint;
  signer: string;
}
export interface MsgConnectionOpenInitProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInit';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenInit defines the msg sent by an account on Chain A to
 * initialize a connection with Chain B.
 * @name MsgConnectionOpenInitSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInit
 */
export interface MsgConnectionOpenInitSDKType {
  client_id: string;
  counterparty: CounterpartySDKType;
  version?: VersionSDKType;
  delay_period: bigint;
  signer: string;
}
/**
 * MsgConnectionOpenInitResponse defines the Msg/ConnectionOpenInit response
 * type.
 * @name MsgConnectionOpenInitResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInitResponse
 */
export interface MsgConnectionOpenInitResponse {}
export interface MsgConnectionOpenInitResponseProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInitResponse';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenInitResponse defines the Msg/ConnectionOpenInit response
 * type.
 * @name MsgConnectionOpenInitResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInitResponse
 */
export interface MsgConnectionOpenInitResponseSDKType {}
/**
 * MsgConnectionOpenTry defines a msg sent by a Relayer to try to open a
 * connection on Chain B.
 * @name MsgConnectionOpenTry
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTry
 */
export interface MsgConnectionOpenTry {
  clientId: string;
  /**
   * Deprecated: this field is unused. Crossing hellos are no longer supported in core IBC.
   * @deprecated
   */
  previousConnectionId: string;
  /**
   * @deprecated
   */
  clientState?: Any;
  counterparty: Counterparty;
  delayPeriod: bigint;
  counterpartyVersions: Version[];
  proofHeight: Height;
  /**
   * proof of the initialization the connection on Chain A: `UNITIALIZED ->
   * INIT`
   */
  proofInit: Uint8Array;
  /**
   * proof of client state included in message
   * @deprecated
   */
  proofClient: Uint8Array;
  /**
   * proof of client consensus state
   * @deprecated
   */
  proofConsensus: Uint8Array;
  /**
   * @deprecated
   */
  consensusHeight: Height;
  signer: string;
  /**
   * optional proof data for host state machines that are unable to introspect their own consensus state
   * @deprecated
   */
  hostConsensusStateProof: Uint8Array;
}
export interface MsgConnectionOpenTryProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTry';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenTry defines a msg sent by a Relayer to try to open a
 * connection on Chain B.
 * @name MsgConnectionOpenTrySDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTry
 */
export interface MsgConnectionOpenTrySDKType {
  client_id: string;
  /**
   * @deprecated
   */
  previous_connection_id: string;
  /**
   * @deprecated
   */
  client_state?: AnySDKType;
  counterparty: CounterpartySDKType;
  delay_period: bigint;
  counterparty_versions: VersionSDKType[];
  proof_height: HeightSDKType;
  proof_init: Uint8Array;
  /**
   * @deprecated
   */
  proof_client: Uint8Array;
  /**
   * @deprecated
   */
  proof_consensus: Uint8Array;
  /**
   * @deprecated
   */
  consensus_height: HeightSDKType;
  signer: string;
  /**
   * @deprecated
   */
  host_consensus_state_proof: Uint8Array;
}
/**
 * MsgConnectionOpenTryResponse defines the Msg/ConnectionOpenTry response type.
 * @name MsgConnectionOpenTryResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTryResponse
 */
export interface MsgConnectionOpenTryResponse {}
export interface MsgConnectionOpenTryResponseProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTryResponse';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenTryResponse defines the Msg/ConnectionOpenTry response type.
 * @name MsgConnectionOpenTryResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTryResponse
 */
export interface MsgConnectionOpenTryResponseSDKType {}
/**
 * MsgConnectionOpenAck defines a msg sent by a Relayer to Chain A to
 * acknowledge the change of connection state to TRYOPEN on Chain B.
 * @name MsgConnectionOpenAck
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAck
 */
export interface MsgConnectionOpenAck {
  connectionId: string;
  counterpartyConnectionId: string;
  version?: Version;
  /**
   * @deprecated
   */
  clientState?: Any;
  proofHeight: Height;
  /**
   * proof of the initialization the connection on Chain B: `UNITIALIZED ->
   * TRYOPEN`
   */
  proofTry: Uint8Array;
  /**
   * proof of client state included in message
   * @deprecated
   */
  proofClient: Uint8Array;
  /**
   * proof of client consensus state
   * @deprecated
   */
  proofConsensus: Uint8Array;
  /**
   * @deprecated
   */
  consensusHeight: Height;
  signer: string;
  /**
   * optional proof data for host state machines that are unable to introspect their own consensus state
   * @deprecated
   */
  hostConsensusStateProof: Uint8Array;
}
export interface MsgConnectionOpenAckProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAck';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenAck defines a msg sent by a Relayer to Chain A to
 * acknowledge the change of connection state to TRYOPEN on Chain B.
 * @name MsgConnectionOpenAckSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAck
 */
export interface MsgConnectionOpenAckSDKType {
  connection_id: string;
  counterparty_connection_id: string;
  version?: VersionSDKType;
  /**
   * @deprecated
   */
  client_state?: AnySDKType;
  proof_height: HeightSDKType;
  proof_try: Uint8Array;
  /**
   * @deprecated
   */
  proof_client: Uint8Array;
  /**
   * @deprecated
   */
  proof_consensus: Uint8Array;
  /**
   * @deprecated
   */
  consensus_height: HeightSDKType;
  signer: string;
  /**
   * @deprecated
   */
  host_consensus_state_proof: Uint8Array;
}
/**
 * MsgConnectionOpenAckResponse defines the Msg/ConnectionOpenAck response type.
 * @name MsgConnectionOpenAckResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAckResponse
 */
export interface MsgConnectionOpenAckResponse {}
export interface MsgConnectionOpenAckResponseProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAckResponse';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenAckResponse defines the Msg/ConnectionOpenAck response type.
 * @name MsgConnectionOpenAckResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAckResponse
 */
export interface MsgConnectionOpenAckResponseSDKType {}
/**
 * MsgConnectionOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of connection state to OPEN on Chain A.
 * @name MsgConnectionOpenConfirm
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirm
 */
export interface MsgConnectionOpenConfirm {
  connectionId: string;
  /**
   * proof for the change of the connection state on Chain A: `INIT -> OPEN`
   */
  proofAck: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgConnectionOpenConfirmProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirm';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of connection state to OPEN on Chain A.
 * @name MsgConnectionOpenConfirmSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirm
 */
export interface MsgConnectionOpenConfirmSDKType {
  connection_id: string;
  proof_ack: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgConnectionOpenConfirmResponse defines the Msg/ConnectionOpenConfirm
 * response type.
 * @name MsgConnectionOpenConfirmResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirmResponse
 */
export interface MsgConnectionOpenConfirmResponse {}
export interface MsgConnectionOpenConfirmResponseProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirmResponse';
  value: Uint8Array;
}
/**
 * MsgConnectionOpenConfirmResponse defines the Msg/ConnectionOpenConfirm
 * response type.
 * @name MsgConnectionOpenConfirmResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirmResponse
 */
export interface MsgConnectionOpenConfirmResponseSDKType {}
/**
 * MsgUpdateParams defines the sdk.Msg type to update the connection parameters.
 * @name MsgUpdateParams
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
  /**
   * signer address
   */
  signer: string;
  /**
   * params defines the connection parameters to update.
   *
   * NOTE: All parameters must be supplied.
   */
  params: Params;
}
export interface MsgUpdateParamsProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgUpdateParams';
  value: Uint8Array;
}
/**
 * MsgUpdateParams defines the sdk.Msg type to update the connection parameters.
 * @name MsgUpdateParamsSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
  signer: string;
  params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {}
export interface MsgUpdateParamsResponseProtoMsg {
  typeUrl: '/ibc.core.connection.v1.MsgUpdateParamsResponse';
  value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponseSDKType
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {}
function createBaseMsgConnectionOpenInit(): MsgConnectionOpenInit {
  return {
    clientId: '',
    counterparty: Counterparty.fromPartial({}),
    version: undefined,
    delayPeriod: BigInt(0),
    signer: '',
  };
}
/**
 * MsgConnectionOpenInit defines the msg sent by an account on Chain A to
 * initialize a connection with Chain B.
 * @name MsgConnectionOpenInit
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInit
 */
export const MsgConnectionOpenInit = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInit' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenInit' as const,
  is(o: any): o is MsgConnectionOpenInit {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenInit.typeUrl ||
        (typeof o.clientId === 'string' &&
          Counterparty.is(o.counterparty) &&
          typeof o.delayPeriod === 'bigint' &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgConnectionOpenInitSDKType {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenInit.typeUrl ||
        (typeof o.client_id === 'string' &&
          Counterparty.isSDK(o.counterparty) &&
          typeof o.delay_period === 'bigint' &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgConnectionOpenInit,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.counterparty !== undefined) {
      Counterparty.encode(
        message.counterparty,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.version !== undefined) {
      Version.encode(message.version, writer.uint32(26).fork()).ldelim();
    }
    if (message.delayPeriod !== BigInt(0)) {
      writer.uint32(32).uint64(message.delayPeriod);
    }
    if (message.signer !== '') {
      writer.uint32(42).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenInit {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenInit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.counterparty = Counterparty.decode(reader, reader.uint32());
          break;
        case 3:
          message.version = Version.decode(reader, reader.uint32());
          break;
        case 4:
          message.delayPeriod = reader.uint64();
          break;
        case 5:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgConnectionOpenInit {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      counterparty: isSet(object.counterparty)
        ? Counterparty.fromJSON(object.counterparty)
        : undefined,
      version: isSet(object.version)
        ? Version.fromJSON(object.version)
        : undefined,
      delayPeriod: isSet(object.delayPeriod)
        ? BigInt(object.delayPeriod.toString())
        : BigInt(0),
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgConnectionOpenInit): JsonSafe<MsgConnectionOpenInit> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.counterparty !== undefined &&
      (obj.counterparty = message.counterparty
        ? Counterparty.toJSON(message.counterparty)
        : undefined);
    message.version !== undefined &&
      (obj.version = message.version
        ? Version.toJSON(message.version)
        : undefined);
    message.delayPeriod !== undefined &&
      (obj.delayPeriod = (message.delayPeriod || BigInt(0)).toString());
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgConnectionOpenInit>): MsgConnectionOpenInit {
    const message = createBaseMsgConnectionOpenInit();
    message.clientId = object.clientId ?? '';
    message.counterparty =
      object.counterparty !== undefined && object.counterparty !== null
        ? Counterparty.fromPartial(object.counterparty)
        : undefined;
    message.version =
      object.version !== undefined && object.version !== null
        ? Version.fromPartial(object.version)
        : undefined;
    message.delayPeriod =
      object.delayPeriod !== undefined && object.delayPeriod !== null
        ? BigInt(object.delayPeriod.toString())
        : BigInt(0);
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgConnectionOpenInitProtoMsg): MsgConnectionOpenInit {
    return MsgConnectionOpenInit.decode(message.value);
  },
  toProto(message: MsgConnectionOpenInit): Uint8Array {
    return MsgConnectionOpenInit.encode(message).finish();
  },
  toProtoMsg(message: MsgConnectionOpenInit): MsgConnectionOpenInitProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInit',
      value: MsgConnectionOpenInit.encode(message).finish(),
    };
  },
};
function createBaseMsgConnectionOpenInitResponse(): MsgConnectionOpenInitResponse {
  return {};
}
/**
 * MsgConnectionOpenInitResponse defines the Msg/ConnectionOpenInit response
 * type.
 * @name MsgConnectionOpenInitResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenInitResponse
 */
export const MsgConnectionOpenInitResponse = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInitResponse' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenInitResponse' as const,
  is(o: any): o is MsgConnectionOpenInitResponse {
    return o && o.$typeUrl === MsgConnectionOpenInitResponse.typeUrl;
  },
  isSDK(o: any): o is MsgConnectionOpenInitResponseSDKType {
    return o && o.$typeUrl === MsgConnectionOpenInitResponse.typeUrl;
  },
  encode(
    _: MsgConnectionOpenInitResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenInitResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenInitResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgConnectionOpenInitResponse {
    return {};
  },
  toJSON(
    _: MsgConnectionOpenInitResponse,
  ): JsonSafe<MsgConnectionOpenInitResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgConnectionOpenInitResponse>,
  ): MsgConnectionOpenInitResponse {
    const message = createBaseMsgConnectionOpenInitResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgConnectionOpenInitResponseProtoMsg,
  ): MsgConnectionOpenInitResponse {
    return MsgConnectionOpenInitResponse.decode(message.value);
  },
  toProto(message: MsgConnectionOpenInitResponse): Uint8Array {
    return MsgConnectionOpenInitResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConnectionOpenInitResponse,
  ): MsgConnectionOpenInitResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenInitResponse',
      value: MsgConnectionOpenInitResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgConnectionOpenTry(): MsgConnectionOpenTry {
  return {
    clientId: '',
    previousConnectionId: '',
    clientState: undefined,
    counterparty: Counterparty.fromPartial({}),
    delayPeriod: BigInt(0),
    counterpartyVersions: [],
    proofHeight: Height.fromPartial({}),
    proofInit: new Uint8Array(),
    proofClient: new Uint8Array(),
    proofConsensus: new Uint8Array(),
    consensusHeight: Height.fromPartial({}),
    signer: '',
    hostConsensusStateProof: new Uint8Array(),
  };
}
/**
 * MsgConnectionOpenTry defines a msg sent by a Relayer to try to open a
 * connection on Chain B.
 * @name MsgConnectionOpenTry
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTry
 */
export const MsgConnectionOpenTry = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTry' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenTry' as const,
  is(o: any): o is MsgConnectionOpenTry {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenTry.typeUrl ||
        (typeof o.clientId === 'string' &&
          typeof o.previousConnectionId === 'string' &&
          Counterparty.is(o.counterparty) &&
          typeof o.delayPeriod === 'bigint' &&
          Array.isArray(o.counterpartyVersions) &&
          (!o.counterpartyVersions.length ||
            Version.is(o.counterpartyVersions[0])) &&
          Height.is(o.proofHeight) &&
          (o.proofInit instanceof Uint8Array ||
            typeof o.proofInit === 'string') &&
          (o.proofClient instanceof Uint8Array ||
            typeof o.proofClient === 'string') &&
          (o.proofConsensus instanceof Uint8Array ||
            typeof o.proofConsensus === 'string') &&
          Height.is(o.consensusHeight) &&
          typeof o.signer === 'string' &&
          (o.hostConsensusStateProof instanceof Uint8Array ||
            typeof o.hostConsensusStateProof === 'string')))
    );
  },
  isSDK(o: any): o is MsgConnectionOpenTrySDKType {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenTry.typeUrl ||
        (typeof o.client_id === 'string' &&
          typeof o.previous_connection_id === 'string' &&
          Counterparty.isSDK(o.counterparty) &&
          typeof o.delay_period === 'bigint' &&
          Array.isArray(o.counterparty_versions) &&
          (!o.counterparty_versions.length ||
            Version.isSDK(o.counterparty_versions[0])) &&
          Height.isSDK(o.proof_height) &&
          (o.proof_init instanceof Uint8Array ||
            typeof o.proof_init === 'string') &&
          (o.proof_client instanceof Uint8Array ||
            typeof o.proof_client === 'string') &&
          (o.proof_consensus instanceof Uint8Array ||
            typeof o.proof_consensus === 'string') &&
          Height.isSDK(o.consensus_height) &&
          typeof o.signer === 'string' &&
          (o.host_consensus_state_proof instanceof Uint8Array ||
            typeof o.host_consensus_state_proof === 'string')))
    );
  },
  encode(
    message: MsgConnectionOpenTry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.previousConnectionId !== '') {
      writer.uint32(18).string(message.previousConnectionId);
    }
    if (message.clientState !== undefined) {
      Any.encode(message.clientState, writer.uint32(26).fork()).ldelim();
    }
    if (message.counterparty !== undefined) {
      Counterparty.encode(
        message.counterparty,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    if (message.delayPeriod !== BigInt(0)) {
      writer.uint32(40).uint64(message.delayPeriod);
    }
    for (const v of message.counterpartyVersions) {
      Version.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(58).fork()).ldelim();
    }
    if (message.proofInit.length !== 0) {
      writer.uint32(66).bytes(message.proofInit);
    }
    if (message.proofClient.length !== 0) {
      writer.uint32(74).bytes(message.proofClient);
    }
    if (message.proofConsensus.length !== 0) {
      writer.uint32(82).bytes(message.proofConsensus);
    }
    if (message.consensusHeight !== undefined) {
      Height.encode(message.consensusHeight, writer.uint32(90).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(98).string(message.signer);
    }
    if (message.hostConsensusStateProof.length !== 0) {
      writer.uint32(106).bytes(message.hostConsensusStateProof);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenTry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenTry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.previousConnectionId = reader.string();
          break;
        case 3:
          message.clientState = Any.decode(reader, reader.uint32());
          break;
        case 4:
          message.counterparty = Counterparty.decode(reader, reader.uint32());
          break;
        case 5:
          message.delayPeriod = reader.uint64();
          break;
        case 6:
          message.counterpartyVersions.push(
            Version.decode(reader, reader.uint32()),
          );
          break;
        case 7:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 8:
          message.proofInit = reader.bytes();
          break;
        case 9:
          message.proofClient = reader.bytes();
          break;
        case 10:
          message.proofConsensus = reader.bytes();
          break;
        case 11:
          message.consensusHeight = Height.decode(reader, reader.uint32());
          break;
        case 12:
          message.signer = reader.string();
          break;
        case 13:
          message.hostConsensusStateProof = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgConnectionOpenTry {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      previousConnectionId: isSet(object.previousConnectionId)
        ? String(object.previousConnectionId)
        : '',
      clientState: isSet(object.clientState)
        ? Any.fromJSON(object.clientState)
        : undefined,
      counterparty: isSet(object.counterparty)
        ? Counterparty.fromJSON(object.counterparty)
        : undefined,
      delayPeriod: isSet(object.delayPeriod)
        ? BigInt(object.delayPeriod.toString())
        : BigInt(0),
      counterpartyVersions: Array.isArray(object?.counterpartyVersions)
        ? object.counterpartyVersions.map((e: any) => Version.fromJSON(e))
        : [],
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      proofInit: isSet(object.proofInit)
        ? bytesFromBase64(object.proofInit)
        : new Uint8Array(),
      proofClient: isSet(object.proofClient)
        ? bytesFromBase64(object.proofClient)
        : new Uint8Array(),
      proofConsensus: isSet(object.proofConsensus)
        ? bytesFromBase64(object.proofConsensus)
        : new Uint8Array(),
      consensusHeight: isSet(object.consensusHeight)
        ? Height.fromJSON(object.consensusHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
      hostConsensusStateProof: isSet(object.hostConsensusStateProof)
        ? bytesFromBase64(object.hostConsensusStateProof)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgConnectionOpenTry): JsonSafe<MsgConnectionOpenTry> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.previousConnectionId !== undefined &&
      (obj.previousConnectionId = message.previousConnectionId);
    message.clientState !== undefined &&
      (obj.clientState = message.clientState
        ? Any.toJSON(message.clientState)
        : undefined);
    message.counterparty !== undefined &&
      (obj.counterparty = message.counterparty
        ? Counterparty.toJSON(message.counterparty)
        : undefined);
    message.delayPeriod !== undefined &&
      (obj.delayPeriod = (message.delayPeriod || BigInt(0)).toString());
    if (message.counterpartyVersions) {
      obj.counterpartyVersions = message.counterpartyVersions.map(e =>
        e ? Version.toJSON(e) : undefined,
      );
    } else {
      obj.counterpartyVersions = [];
    }
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.proofInit !== undefined &&
      (obj.proofInit = base64FromBytes(
        message.proofInit !== undefined ? message.proofInit : new Uint8Array(),
      ));
    message.proofClient !== undefined &&
      (obj.proofClient = base64FromBytes(
        message.proofClient !== undefined
          ? message.proofClient
          : new Uint8Array(),
      ));
    message.proofConsensus !== undefined &&
      (obj.proofConsensus = base64FromBytes(
        message.proofConsensus !== undefined
          ? message.proofConsensus
          : new Uint8Array(),
      ));
    message.consensusHeight !== undefined &&
      (obj.consensusHeight = message.consensusHeight
        ? Height.toJSON(message.consensusHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    message.hostConsensusStateProof !== undefined &&
      (obj.hostConsensusStateProof = base64FromBytes(
        message.hostConsensusStateProof !== undefined
          ? message.hostConsensusStateProof
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgConnectionOpenTry>): MsgConnectionOpenTry {
    const message = createBaseMsgConnectionOpenTry();
    message.clientId = object.clientId ?? '';
    message.previousConnectionId = object.previousConnectionId ?? '';
    message.clientState =
      object.clientState !== undefined && object.clientState !== null
        ? Any.fromPartial(object.clientState)
        : undefined;
    message.counterparty =
      object.counterparty !== undefined && object.counterparty !== null
        ? Counterparty.fromPartial(object.counterparty)
        : undefined;
    message.delayPeriod =
      object.delayPeriod !== undefined && object.delayPeriod !== null
        ? BigInt(object.delayPeriod.toString())
        : BigInt(0);
    message.counterpartyVersions =
      object.counterpartyVersions?.map(e => Version.fromPartial(e)) || [];
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.proofInit = object.proofInit ?? new Uint8Array();
    message.proofClient = object.proofClient ?? new Uint8Array();
    message.proofConsensus = object.proofConsensus ?? new Uint8Array();
    message.consensusHeight =
      object.consensusHeight !== undefined && object.consensusHeight !== null
        ? Height.fromPartial(object.consensusHeight)
        : undefined;
    message.signer = object.signer ?? '';
    message.hostConsensusStateProof =
      object.hostConsensusStateProof ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgConnectionOpenTryProtoMsg): MsgConnectionOpenTry {
    return MsgConnectionOpenTry.decode(message.value);
  },
  toProto(message: MsgConnectionOpenTry): Uint8Array {
    return MsgConnectionOpenTry.encode(message).finish();
  },
  toProtoMsg(message: MsgConnectionOpenTry): MsgConnectionOpenTryProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTry',
      value: MsgConnectionOpenTry.encode(message).finish(),
    };
  },
};
function createBaseMsgConnectionOpenTryResponse(): MsgConnectionOpenTryResponse {
  return {};
}
/**
 * MsgConnectionOpenTryResponse defines the Msg/ConnectionOpenTry response type.
 * @name MsgConnectionOpenTryResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenTryResponse
 */
export const MsgConnectionOpenTryResponse = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTryResponse' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenTryResponse' as const,
  is(o: any): o is MsgConnectionOpenTryResponse {
    return o && o.$typeUrl === MsgConnectionOpenTryResponse.typeUrl;
  },
  isSDK(o: any): o is MsgConnectionOpenTryResponseSDKType {
    return o && o.$typeUrl === MsgConnectionOpenTryResponse.typeUrl;
  },
  encode(
    _: MsgConnectionOpenTryResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenTryResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenTryResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgConnectionOpenTryResponse {
    return {};
  },
  toJSON(
    _: MsgConnectionOpenTryResponse,
  ): JsonSafe<MsgConnectionOpenTryResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgConnectionOpenTryResponse>,
  ): MsgConnectionOpenTryResponse {
    const message = createBaseMsgConnectionOpenTryResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgConnectionOpenTryResponseProtoMsg,
  ): MsgConnectionOpenTryResponse {
    return MsgConnectionOpenTryResponse.decode(message.value);
  },
  toProto(message: MsgConnectionOpenTryResponse): Uint8Array {
    return MsgConnectionOpenTryResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConnectionOpenTryResponse,
  ): MsgConnectionOpenTryResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenTryResponse',
      value: MsgConnectionOpenTryResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgConnectionOpenAck(): MsgConnectionOpenAck {
  return {
    connectionId: '',
    counterpartyConnectionId: '',
    version: undefined,
    clientState: undefined,
    proofHeight: Height.fromPartial({}),
    proofTry: new Uint8Array(),
    proofClient: new Uint8Array(),
    proofConsensus: new Uint8Array(),
    consensusHeight: Height.fromPartial({}),
    signer: '',
    hostConsensusStateProof: new Uint8Array(),
  };
}
/**
 * MsgConnectionOpenAck defines a msg sent by a Relayer to Chain A to
 * acknowledge the change of connection state to TRYOPEN on Chain B.
 * @name MsgConnectionOpenAck
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAck
 */
export const MsgConnectionOpenAck = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAck' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenAck' as const,
  is(o: any): o is MsgConnectionOpenAck {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenAck.typeUrl ||
        (typeof o.connectionId === 'string' &&
          typeof o.counterpartyConnectionId === 'string' &&
          Height.is(o.proofHeight) &&
          (o.proofTry instanceof Uint8Array ||
            typeof o.proofTry === 'string') &&
          (o.proofClient instanceof Uint8Array ||
            typeof o.proofClient === 'string') &&
          (o.proofConsensus instanceof Uint8Array ||
            typeof o.proofConsensus === 'string') &&
          Height.is(o.consensusHeight) &&
          typeof o.signer === 'string' &&
          (o.hostConsensusStateProof instanceof Uint8Array ||
            typeof o.hostConsensusStateProof === 'string')))
    );
  },
  isSDK(o: any): o is MsgConnectionOpenAckSDKType {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenAck.typeUrl ||
        (typeof o.connection_id === 'string' &&
          typeof o.counterparty_connection_id === 'string' &&
          Height.isSDK(o.proof_height) &&
          (o.proof_try instanceof Uint8Array ||
            typeof o.proof_try === 'string') &&
          (o.proof_client instanceof Uint8Array ||
            typeof o.proof_client === 'string') &&
          (o.proof_consensus instanceof Uint8Array ||
            typeof o.proof_consensus === 'string') &&
          Height.isSDK(o.consensus_height) &&
          typeof o.signer === 'string' &&
          (o.host_consensus_state_proof instanceof Uint8Array ||
            typeof o.host_consensus_state_proof === 'string')))
    );
  },
  encode(
    message: MsgConnectionOpenAck,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.connectionId !== '') {
      writer.uint32(10).string(message.connectionId);
    }
    if (message.counterpartyConnectionId !== '') {
      writer.uint32(18).string(message.counterpartyConnectionId);
    }
    if (message.version !== undefined) {
      Version.encode(message.version, writer.uint32(26).fork()).ldelim();
    }
    if (message.clientState !== undefined) {
      Any.encode(message.clientState, writer.uint32(34).fork()).ldelim();
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(42).fork()).ldelim();
    }
    if (message.proofTry.length !== 0) {
      writer.uint32(50).bytes(message.proofTry);
    }
    if (message.proofClient.length !== 0) {
      writer.uint32(58).bytes(message.proofClient);
    }
    if (message.proofConsensus.length !== 0) {
      writer.uint32(66).bytes(message.proofConsensus);
    }
    if (message.consensusHeight !== undefined) {
      Height.encode(message.consensusHeight, writer.uint32(74).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(82).string(message.signer);
    }
    if (message.hostConsensusStateProof.length !== 0) {
      writer.uint32(90).bytes(message.hostConsensusStateProof);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenAck {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.connectionId = reader.string();
          break;
        case 2:
          message.counterpartyConnectionId = reader.string();
          break;
        case 3:
          message.version = Version.decode(reader, reader.uint32());
          break;
        case 4:
          message.clientState = Any.decode(reader, reader.uint32());
          break;
        case 5:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 6:
          message.proofTry = reader.bytes();
          break;
        case 7:
          message.proofClient = reader.bytes();
          break;
        case 8:
          message.proofConsensus = reader.bytes();
          break;
        case 9:
          message.consensusHeight = Height.decode(reader, reader.uint32());
          break;
        case 10:
          message.signer = reader.string();
          break;
        case 11:
          message.hostConsensusStateProof = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgConnectionOpenAck {
    return {
      connectionId: isSet(object.connectionId)
        ? String(object.connectionId)
        : '',
      counterpartyConnectionId: isSet(object.counterpartyConnectionId)
        ? String(object.counterpartyConnectionId)
        : '',
      version: isSet(object.version)
        ? Version.fromJSON(object.version)
        : undefined,
      clientState: isSet(object.clientState)
        ? Any.fromJSON(object.clientState)
        : undefined,
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      proofTry: isSet(object.proofTry)
        ? bytesFromBase64(object.proofTry)
        : new Uint8Array(),
      proofClient: isSet(object.proofClient)
        ? bytesFromBase64(object.proofClient)
        : new Uint8Array(),
      proofConsensus: isSet(object.proofConsensus)
        ? bytesFromBase64(object.proofConsensus)
        : new Uint8Array(),
      consensusHeight: isSet(object.consensusHeight)
        ? Height.fromJSON(object.consensusHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
      hostConsensusStateProof: isSet(object.hostConsensusStateProof)
        ? bytesFromBase64(object.hostConsensusStateProof)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgConnectionOpenAck): JsonSafe<MsgConnectionOpenAck> {
    const obj: any = {};
    message.connectionId !== undefined &&
      (obj.connectionId = message.connectionId);
    message.counterpartyConnectionId !== undefined &&
      (obj.counterpartyConnectionId = message.counterpartyConnectionId);
    message.version !== undefined &&
      (obj.version = message.version
        ? Version.toJSON(message.version)
        : undefined);
    message.clientState !== undefined &&
      (obj.clientState = message.clientState
        ? Any.toJSON(message.clientState)
        : undefined);
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.proofTry !== undefined &&
      (obj.proofTry = base64FromBytes(
        message.proofTry !== undefined ? message.proofTry : new Uint8Array(),
      ));
    message.proofClient !== undefined &&
      (obj.proofClient = base64FromBytes(
        message.proofClient !== undefined
          ? message.proofClient
          : new Uint8Array(),
      ));
    message.proofConsensus !== undefined &&
      (obj.proofConsensus = base64FromBytes(
        message.proofConsensus !== undefined
          ? message.proofConsensus
          : new Uint8Array(),
      ));
    message.consensusHeight !== undefined &&
      (obj.consensusHeight = message.consensusHeight
        ? Height.toJSON(message.consensusHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    message.hostConsensusStateProof !== undefined &&
      (obj.hostConsensusStateProof = base64FromBytes(
        message.hostConsensusStateProof !== undefined
          ? message.hostConsensusStateProof
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgConnectionOpenAck>): MsgConnectionOpenAck {
    const message = createBaseMsgConnectionOpenAck();
    message.connectionId = object.connectionId ?? '';
    message.counterpartyConnectionId = object.counterpartyConnectionId ?? '';
    message.version =
      object.version !== undefined && object.version !== null
        ? Version.fromPartial(object.version)
        : undefined;
    message.clientState =
      object.clientState !== undefined && object.clientState !== null
        ? Any.fromPartial(object.clientState)
        : undefined;
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.proofTry = object.proofTry ?? new Uint8Array();
    message.proofClient = object.proofClient ?? new Uint8Array();
    message.proofConsensus = object.proofConsensus ?? new Uint8Array();
    message.consensusHeight =
      object.consensusHeight !== undefined && object.consensusHeight !== null
        ? Height.fromPartial(object.consensusHeight)
        : undefined;
    message.signer = object.signer ?? '';
    message.hostConsensusStateProof =
      object.hostConsensusStateProof ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgConnectionOpenAckProtoMsg): MsgConnectionOpenAck {
    return MsgConnectionOpenAck.decode(message.value);
  },
  toProto(message: MsgConnectionOpenAck): Uint8Array {
    return MsgConnectionOpenAck.encode(message).finish();
  },
  toProtoMsg(message: MsgConnectionOpenAck): MsgConnectionOpenAckProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAck',
      value: MsgConnectionOpenAck.encode(message).finish(),
    };
  },
};
function createBaseMsgConnectionOpenAckResponse(): MsgConnectionOpenAckResponse {
  return {};
}
/**
 * MsgConnectionOpenAckResponse defines the Msg/ConnectionOpenAck response type.
 * @name MsgConnectionOpenAckResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenAckResponse
 */
export const MsgConnectionOpenAckResponse = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAckResponse' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenAckResponse' as const,
  is(o: any): o is MsgConnectionOpenAckResponse {
    return o && o.$typeUrl === MsgConnectionOpenAckResponse.typeUrl;
  },
  isSDK(o: any): o is MsgConnectionOpenAckResponseSDKType {
    return o && o.$typeUrl === MsgConnectionOpenAckResponse.typeUrl;
  },
  encode(
    _: MsgConnectionOpenAckResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenAckResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenAckResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgConnectionOpenAckResponse {
    return {};
  },
  toJSON(
    _: MsgConnectionOpenAckResponse,
  ): JsonSafe<MsgConnectionOpenAckResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgConnectionOpenAckResponse>,
  ): MsgConnectionOpenAckResponse {
    const message = createBaseMsgConnectionOpenAckResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgConnectionOpenAckResponseProtoMsg,
  ): MsgConnectionOpenAckResponse {
    return MsgConnectionOpenAckResponse.decode(message.value);
  },
  toProto(message: MsgConnectionOpenAckResponse): Uint8Array {
    return MsgConnectionOpenAckResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConnectionOpenAckResponse,
  ): MsgConnectionOpenAckResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenAckResponse',
      value: MsgConnectionOpenAckResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgConnectionOpenConfirm(): MsgConnectionOpenConfirm {
  return {
    connectionId: '',
    proofAck: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgConnectionOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of connection state to OPEN on Chain A.
 * @name MsgConnectionOpenConfirm
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirm
 */
export const MsgConnectionOpenConfirm = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirm' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenConfirm' as const,
  is(o: any): o is MsgConnectionOpenConfirm {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenConfirm.typeUrl ||
        (typeof o.connectionId === 'string' &&
          (o.proofAck instanceof Uint8Array ||
            typeof o.proofAck === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgConnectionOpenConfirmSDKType {
    return (
      o &&
      (o.$typeUrl === MsgConnectionOpenConfirm.typeUrl ||
        (typeof o.connection_id === 'string' &&
          (o.proof_ack instanceof Uint8Array ||
            typeof o.proof_ack === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgConnectionOpenConfirm,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.connectionId !== '') {
      writer.uint32(10).string(message.connectionId);
    }
    if (message.proofAck.length !== 0) {
      writer.uint32(18).bytes(message.proofAck);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(34).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenConfirm {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenConfirm();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.connectionId = reader.string();
          break;
        case 2:
          message.proofAck = reader.bytes();
          break;
        case 3:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 4:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgConnectionOpenConfirm {
    return {
      connectionId: isSet(object.connectionId)
        ? String(object.connectionId)
        : '',
      proofAck: isSet(object.proofAck)
        ? bytesFromBase64(object.proofAck)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(
    message: MsgConnectionOpenConfirm,
  ): JsonSafe<MsgConnectionOpenConfirm> {
    const obj: any = {};
    message.connectionId !== undefined &&
      (obj.connectionId = message.connectionId);
    message.proofAck !== undefined &&
      (obj.proofAck = base64FromBytes(
        message.proofAck !== undefined ? message.proofAck : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(
    object: Partial<MsgConnectionOpenConfirm>,
  ): MsgConnectionOpenConfirm {
    const message = createBaseMsgConnectionOpenConfirm();
    message.connectionId = object.connectionId ?? '';
    message.proofAck = object.proofAck ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgConnectionOpenConfirmProtoMsg,
  ): MsgConnectionOpenConfirm {
    return MsgConnectionOpenConfirm.decode(message.value);
  },
  toProto(message: MsgConnectionOpenConfirm): Uint8Array {
    return MsgConnectionOpenConfirm.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConnectionOpenConfirm,
  ): MsgConnectionOpenConfirmProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirm',
      value: MsgConnectionOpenConfirm.encode(message).finish(),
    };
  },
};
function createBaseMsgConnectionOpenConfirmResponse(): MsgConnectionOpenConfirmResponse {
  return {};
}
/**
 * MsgConnectionOpenConfirmResponse defines the Msg/ConnectionOpenConfirm
 * response type.
 * @name MsgConnectionOpenConfirmResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgConnectionOpenConfirmResponse
 */
export const MsgConnectionOpenConfirmResponse = {
  typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirmResponse' as const,
  aminoType: 'cosmos-sdk/MsgConnectionOpenConfirmResponse' as const,
  is(o: any): o is MsgConnectionOpenConfirmResponse {
    return o && o.$typeUrl === MsgConnectionOpenConfirmResponse.typeUrl;
  },
  isSDK(o: any): o is MsgConnectionOpenConfirmResponseSDKType {
    return o && o.$typeUrl === MsgConnectionOpenConfirmResponse.typeUrl;
  },
  encode(
    _: MsgConnectionOpenConfirmResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConnectionOpenConfirmResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConnectionOpenConfirmResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgConnectionOpenConfirmResponse {
    return {};
  },
  toJSON(
    _: MsgConnectionOpenConfirmResponse,
  ): JsonSafe<MsgConnectionOpenConfirmResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgConnectionOpenConfirmResponse>,
  ): MsgConnectionOpenConfirmResponse {
    const message = createBaseMsgConnectionOpenConfirmResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgConnectionOpenConfirmResponseProtoMsg,
  ): MsgConnectionOpenConfirmResponse {
    return MsgConnectionOpenConfirmResponse.decode(message.value);
  },
  toProto(message: MsgConnectionOpenConfirmResponse): Uint8Array {
    return MsgConnectionOpenConfirmResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConnectionOpenConfirmResponse,
  ): MsgConnectionOpenConfirmResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgConnectionOpenConfirmResponse',
      value: MsgConnectionOpenConfirmResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParams(): MsgUpdateParams {
  return {
    signer: '',
    params: Params.fromPartial({}),
  };
}
/**
 * MsgUpdateParams defines the sdk.Msg type to update the connection parameters.
 * @name MsgUpdateParams
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParams
 */
export const MsgUpdateParams = {
  typeUrl: '/ibc.core.connection.v1.MsgUpdateParams' as const,
  aminoType: 'cosmos-sdk/MsgUpdateParams' as const,
  is(o: any): o is MsgUpdateParams {
    return (
      o &&
      (o.$typeUrl === MsgUpdateParams.typeUrl ||
        (typeof o.signer === 'string' && Params.is(o.params)))
    );
  },
  isSDK(o: any): o is MsgUpdateParamsSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateParams.typeUrl ||
        (typeof o.signer === 'string' && Params.isSDK(o.params)))
    );
  },
  encode(
    message: MsgUpdateParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateParams {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams {
    const message = createBaseMsgUpdateParams();
    message.signer = object.signer ?? '';
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams {
    return MsgUpdateParams.decode(message.value);
  },
  toProto(message: MsgUpdateParams): Uint8Array {
    return MsgUpdateParams.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgUpdateParams',
      value: MsgUpdateParams.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParamsResponse(): MsgUpdateParamsResponse {
  return {};
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.connection.v1
 * @see proto type: ibc.core.connection.v1.MsgUpdateParamsResponse
 */
export const MsgUpdateParamsResponse = {
  typeUrl: '/ibc.core.connection.v1.MsgUpdateParamsResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateParamsResponse' as const,
  is(o: any): o is MsgUpdateParamsResponse {
    return o && o.$typeUrl === MsgUpdateParamsResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateParamsResponseSDKType {
    return o && o.$typeUrl === MsgUpdateParamsResponse.typeUrl;
  },
  encode(
    _: MsgUpdateParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParamsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateParamsResponse {
    return {};
  },
  toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse {
    const message = createBaseMsgUpdateParamsResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateParamsResponseProtoMsg,
  ): MsgUpdateParamsResponse {
    return MsgUpdateParamsResponse.decode(message.value);
  },
  toProto(message: MsgUpdateParamsResponse): Uint8Array {
    return MsgUpdateParamsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateParamsResponse,
  ): MsgUpdateParamsResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.connection.v1.MsgUpdateParamsResponse',
      value: MsgUpdateParamsResponse.encode(message).finish(),
    };
  },
};
