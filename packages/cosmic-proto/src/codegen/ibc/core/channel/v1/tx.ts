//@ts-nocheck
import {
  Channel,
  type ChannelSDKType,
  Packet,
  type PacketSDKType,
} from './channel.js';
import { Height, type HeightSDKType } from '../../client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** ResponseResultType defines the possible outcomes of the execution of a message */
export enum ResponseResultType {
  /** RESPONSE_RESULT_TYPE_UNSPECIFIED - Default zero value enumeration */
  RESPONSE_RESULT_TYPE_UNSPECIFIED = 0,
  /** RESPONSE_RESULT_TYPE_NOOP - The message did not call the IBC application callbacks (because, for example, the packet had already been relayed) */
  RESPONSE_RESULT_TYPE_NOOP = 1,
  /** RESPONSE_RESULT_TYPE_SUCCESS - The message was executed successfully */
  RESPONSE_RESULT_TYPE_SUCCESS = 2,
  /** RESPONSE_RESULT_TYPE_FAILURE - The message was executed unsuccessfully */
  RESPONSE_RESULT_TYPE_FAILURE = 3,
  UNRECOGNIZED = -1,
}
export const ResponseResultTypeSDKType = ResponseResultType;
export function responseResultTypeFromJSON(object: any): ResponseResultType {
  switch (object) {
    case 0:
    case 'RESPONSE_RESULT_TYPE_UNSPECIFIED':
      return ResponseResultType.RESPONSE_RESULT_TYPE_UNSPECIFIED;
    case 1:
    case 'RESPONSE_RESULT_TYPE_NOOP':
      return ResponseResultType.RESPONSE_RESULT_TYPE_NOOP;
    case 2:
    case 'RESPONSE_RESULT_TYPE_SUCCESS':
      return ResponseResultType.RESPONSE_RESULT_TYPE_SUCCESS;
    case 3:
    case 'RESPONSE_RESULT_TYPE_FAILURE':
      return ResponseResultType.RESPONSE_RESULT_TYPE_FAILURE;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return ResponseResultType.UNRECOGNIZED;
  }
}
export function responseResultTypeToJSON(object: ResponseResultType): string {
  switch (object) {
    case ResponseResultType.RESPONSE_RESULT_TYPE_UNSPECIFIED:
      return 'RESPONSE_RESULT_TYPE_UNSPECIFIED';
    case ResponseResultType.RESPONSE_RESULT_TYPE_NOOP:
      return 'RESPONSE_RESULT_TYPE_NOOP';
    case ResponseResultType.RESPONSE_RESULT_TYPE_SUCCESS:
      return 'RESPONSE_RESULT_TYPE_SUCCESS';
    case ResponseResultType.RESPONSE_RESULT_TYPE_FAILURE:
      return 'RESPONSE_RESULT_TYPE_FAILURE';
    case ResponseResultType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * MsgChannelOpenInit defines an sdk.Msg to initialize a channel handshake. It
 * is called by a relayer on Chain A.
 * @name MsgChannelOpenInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInit
 */
export interface MsgChannelOpenInit {
  portId: string;
  channel: Channel;
  signer: string;
}
export interface MsgChannelOpenInitProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInit';
  value: Uint8Array;
}
/**
 * MsgChannelOpenInit defines an sdk.Msg to initialize a channel handshake. It
 * is called by a relayer on Chain A.
 * @name MsgChannelOpenInitSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInit
 */
export interface MsgChannelOpenInitSDKType {
  port_id: string;
  channel: ChannelSDKType;
  signer: string;
}
/**
 * MsgChannelOpenInitResponse defines the Msg/ChannelOpenInit response type.
 * @name MsgChannelOpenInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInitResponse
 */
export interface MsgChannelOpenInitResponse {
  channelId: string;
  version: string;
}
export interface MsgChannelOpenInitResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInitResponse';
  value: Uint8Array;
}
/**
 * MsgChannelOpenInitResponse defines the Msg/ChannelOpenInit response type.
 * @name MsgChannelOpenInitResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInitResponse
 */
export interface MsgChannelOpenInitResponseSDKType {
  channel_id: string;
  version: string;
}
/**
 * MsgChannelOpenInit defines a msg sent by a Relayer to try to open a channel
 * on Chain B. The version field within the Channel field has been deprecated. Its
 * value will be ignored by core IBC.
 * @name MsgChannelOpenTry
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTry
 */
export interface MsgChannelOpenTry {
  portId: string;
  /**
   * Deprecated: this field is unused. Crossing hello's are no longer supported in core IBC.
   * @deprecated
   */
  previousChannelId: string;
  /**
   * NOTE: the version field within the channel has been deprecated. Its value will be ignored by core IBC.
   */
  channel: Channel;
  counterpartyVersion: string;
  proofInit: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelOpenTryProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTry';
  value: Uint8Array;
}
/**
 * MsgChannelOpenInit defines a msg sent by a Relayer to try to open a channel
 * on Chain B. The version field within the Channel field has been deprecated. Its
 * value will be ignored by core IBC.
 * @name MsgChannelOpenTrySDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTry
 */
export interface MsgChannelOpenTrySDKType {
  port_id: string;
  /**
   * @deprecated
   */
  previous_channel_id: string;
  channel: ChannelSDKType;
  counterparty_version: string;
  proof_init: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgChannelOpenTryResponse defines the Msg/ChannelOpenTry response type.
 * @name MsgChannelOpenTryResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTryResponse
 */
export interface MsgChannelOpenTryResponse {
  version: string;
  channelId: string;
}
export interface MsgChannelOpenTryResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTryResponse';
  value: Uint8Array;
}
/**
 * MsgChannelOpenTryResponse defines the Msg/ChannelOpenTry response type.
 * @name MsgChannelOpenTryResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTryResponse
 */
export interface MsgChannelOpenTryResponseSDKType {
  version: string;
  channel_id: string;
}
/**
 * MsgChannelOpenAck defines a msg sent by a Relayer to Chain A to acknowledge
 * the change of channel state to TRYOPEN on Chain B.
 * @name MsgChannelOpenAck
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAck
 */
export interface MsgChannelOpenAck {
  portId: string;
  channelId: string;
  counterpartyChannelId: string;
  counterpartyVersion: string;
  proofTry: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelOpenAckProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAck';
  value: Uint8Array;
}
/**
 * MsgChannelOpenAck defines a msg sent by a Relayer to Chain A to acknowledge
 * the change of channel state to TRYOPEN on Chain B.
 * @name MsgChannelOpenAckSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAck
 */
export interface MsgChannelOpenAckSDKType {
  port_id: string;
  channel_id: string;
  counterparty_channel_id: string;
  counterparty_version: string;
  proof_try: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgChannelOpenAckResponse defines the Msg/ChannelOpenAck response type.
 * @name MsgChannelOpenAckResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAckResponse
 */
export interface MsgChannelOpenAckResponse {}
export interface MsgChannelOpenAckResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAckResponse';
  value: Uint8Array;
}
/**
 * MsgChannelOpenAckResponse defines the Msg/ChannelOpenAck response type.
 * @name MsgChannelOpenAckResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAckResponse
 */
export interface MsgChannelOpenAckResponseSDKType {}
/**
 * MsgChannelOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of channel state to OPEN on Chain A.
 * @name MsgChannelOpenConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirm
 */
export interface MsgChannelOpenConfirm {
  portId: string;
  channelId: string;
  proofAck: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelOpenConfirmProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirm';
  value: Uint8Array;
}
/**
 * MsgChannelOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of channel state to OPEN on Chain A.
 * @name MsgChannelOpenConfirmSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirm
 */
export interface MsgChannelOpenConfirmSDKType {
  port_id: string;
  channel_id: string;
  proof_ack: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgChannelOpenConfirmResponse defines the Msg/ChannelOpenConfirm response
 * type.
 * @name MsgChannelOpenConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirmResponse
 */
export interface MsgChannelOpenConfirmResponse {}
export interface MsgChannelOpenConfirmResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirmResponse';
  value: Uint8Array;
}
/**
 * MsgChannelOpenConfirmResponse defines the Msg/ChannelOpenConfirm response
 * type.
 * @name MsgChannelOpenConfirmResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirmResponse
 */
export interface MsgChannelOpenConfirmResponseSDKType {}
/**
 * MsgChannelCloseInit defines a msg sent by a Relayer to Chain A
 * to close a channel with Chain B.
 * @name MsgChannelCloseInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInit
 */
export interface MsgChannelCloseInit {
  portId: string;
  channelId: string;
  signer: string;
}
export interface MsgChannelCloseInitProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInit';
  value: Uint8Array;
}
/**
 * MsgChannelCloseInit defines a msg sent by a Relayer to Chain A
 * to close a channel with Chain B.
 * @name MsgChannelCloseInitSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInit
 */
export interface MsgChannelCloseInitSDKType {
  port_id: string;
  channel_id: string;
  signer: string;
}
/**
 * MsgChannelCloseInitResponse defines the Msg/ChannelCloseInit response type.
 * @name MsgChannelCloseInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInitResponse
 */
export interface MsgChannelCloseInitResponse {}
export interface MsgChannelCloseInitResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInitResponse';
  value: Uint8Array;
}
/**
 * MsgChannelCloseInitResponse defines the Msg/ChannelCloseInit response type.
 * @name MsgChannelCloseInitResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInitResponse
 */
export interface MsgChannelCloseInitResponseSDKType {}
/**
 * MsgChannelCloseConfirm defines a msg sent by a Relayer to Chain B
 * to acknowledge the change of channel state to CLOSED on Chain A.
 * @name MsgChannelCloseConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirm
 */
export interface MsgChannelCloseConfirm {
  portId: string;
  channelId: string;
  proofInit: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelCloseConfirmProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirm';
  value: Uint8Array;
}
/**
 * MsgChannelCloseConfirm defines a msg sent by a Relayer to Chain B
 * to acknowledge the change of channel state to CLOSED on Chain A.
 * @name MsgChannelCloseConfirmSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirm
 */
export interface MsgChannelCloseConfirmSDKType {
  port_id: string;
  channel_id: string;
  proof_init: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgChannelCloseConfirmResponse defines the Msg/ChannelCloseConfirm response
 * type.
 * @name MsgChannelCloseConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirmResponse
 */
export interface MsgChannelCloseConfirmResponse {}
export interface MsgChannelCloseConfirmResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirmResponse';
  value: Uint8Array;
}
/**
 * MsgChannelCloseConfirmResponse defines the Msg/ChannelCloseConfirm response
 * type.
 * @name MsgChannelCloseConfirmResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirmResponse
 */
export interface MsgChannelCloseConfirmResponseSDKType {}
/**
 * MsgRecvPacket receives incoming IBC packet
 * @name MsgRecvPacket
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacket
 */
export interface MsgRecvPacket {
  packet: Packet;
  proofCommitment: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgRecvPacketProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgRecvPacket';
  value: Uint8Array;
}
/**
 * MsgRecvPacket receives incoming IBC packet
 * @name MsgRecvPacketSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacket
 */
export interface MsgRecvPacketSDKType {
  packet: PacketSDKType;
  proof_commitment: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgRecvPacketResponse defines the Msg/RecvPacket response type.
 * @name MsgRecvPacketResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacketResponse
 */
export interface MsgRecvPacketResponse {
  result: ResponseResultType;
}
export interface MsgRecvPacketResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgRecvPacketResponse';
  value: Uint8Array;
}
/**
 * MsgRecvPacketResponse defines the Msg/RecvPacket response type.
 * @name MsgRecvPacketResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacketResponse
 */
export interface MsgRecvPacketResponseSDKType {
  result: ResponseResultType;
}
/**
 * MsgTimeout receives timed-out packet
 * @name MsgTimeout
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeout
 */
export interface MsgTimeout {
  packet: Packet;
  proofUnreceived: Uint8Array;
  proofHeight: Height;
  nextSequenceRecv: bigint;
  signer: string;
}
export interface MsgTimeoutProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgTimeout';
  value: Uint8Array;
}
/**
 * MsgTimeout receives timed-out packet
 * @name MsgTimeoutSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeout
 */
export interface MsgTimeoutSDKType {
  packet: PacketSDKType;
  proof_unreceived: Uint8Array;
  proof_height: HeightSDKType;
  next_sequence_recv: bigint;
  signer: string;
}
/**
 * MsgTimeoutResponse defines the Msg/Timeout response type.
 * @name MsgTimeoutResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutResponse
 */
export interface MsgTimeoutResponse {
  result: ResponseResultType;
}
export interface MsgTimeoutResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutResponse';
  value: Uint8Array;
}
/**
 * MsgTimeoutResponse defines the Msg/Timeout response type.
 * @name MsgTimeoutResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutResponse
 */
export interface MsgTimeoutResponseSDKType {
  result: ResponseResultType;
}
/**
 * MsgTimeoutOnClose timed-out packet upon counterparty channel closure.
 * @name MsgTimeoutOnClose
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnClose
 */
export interface MsgTimeoutOnClose {
  packet: Packet;
  proofUnreceived: Uint8Array;
  proofClose: Uint8Array;
  proofHeight: Height;
  nextSequenceRecv: bigint;
  signer: string;
}
export interface MsgTimeoutOnCloseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnClose';
  value: Uint8Array;
}
/**
 * MsgTimeoutOnClose timed-out packet upon counterparty channel closure.
 * @name MsgTimeoutOnCloseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnClose
 */
export interface MsgTimeoutOnCloseSDKType {
  packet: PacketSDKType;
  proof_unreceived: Uint8Array;
  proof_close: Uint8Array;
  proof_height: HeightSDKType;
  next_sequence_recv: bigint;
  signer: string;
}
/**
 * MsgTimeoutOnCloseResponse defines the Msg/TimeoutOnClose response type.
 * @name MsgTimeoutOnCloseResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnCloseResponse
 */
export interface MsgTimeoutOnCloseResponse {
  result: ResponseResultType;
}
export interface MsgTimeoutOnCloseResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnCloseResponse';
  value: Uint8Array;
}
/**
 * MsgTimeoutOnCloseResponse defines the Msg/TimeoutOnClose response type.
 * @name MsgTimeoutOnCloseResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnCloseResponse
 */
export interface MsgTimeoutOnCloseResponseSDKType {
  result: ResponseResultType;
}
/**
 * MsgAcknowledgement receives incoming IBC acknowledgement
 * @name MsgAcknowledgement
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgement
 */
export interface MsgAcknowledgement {
  packet: Packet;
  acknowledgement: Uint8Array;
  proofAcked: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgAcknowledgementProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgAcknowledgement';
  value: Uint8Array;
}
/**
 * MsgAcknowledgement receives incoming IBC acknowledgement
 * @name MsgAcknowledgementSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgement
 */
export interface MsgAcknowledgementSDKType {
  packet: PacketSDKType;
  acknowledgement: Uint8Array;
  proof_acked: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/**
 * MsgAcknowledgementResponse defines the Msg/Acknowledgement response type.
 * @name MsgAcknowledgementResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgementResponse
 */
export interface MsgAcknowledgementResponse {
  result: ResponseResultType;
}
export interface MsgAcknowledgementResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgAcknowledgementResponse';
  value: Uint8Array;
}
/**
 * MsgAcknowledgementResponse defines the Msg/Acknowledgement response type.
 * @name MsgAcknowledgementResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgementResponse
 */
export interface MsgAcknowledgementResponseSDKType {
  result: ResponseResultType;
}
function createBaseMsgChannelOpenInit(): MsgChannelOpenInit {
  return {
    portId: '',
    channel: Channel.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgChannelOpenInit defines an sdk.Msg to initialize a channel handshake. It
 * is called by a relayer on Chain A.
 * @name MsgChannelOpenInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInit
 */
export const MsgChannelOpenInit = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInit' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenInit' as const,
  is(o: any): o is MsgChannelOpenInit {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenInit.typeUrl ||
        (typeof o.portId === 'string' &&
          Channel.is(o.channel) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelOpenInitSDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenInit.typeUrl ||
        (typeof o.port_id === 'string' &&
          Channel.isSDK(o.channel) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgChannelOpenInit,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channel !== undefined) {
      Channel.encode(message.channel, writer.uint32(18).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(26).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelOpenInit {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenInit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.channel = Channel.decode(reader, reader.uint32());
          break;
        case 3:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelOpenInit {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channel: isSet(object.channel)
        ? Channel.fromJSON(object.channel)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelOpenInit): JsonSafe<MsgChannelOpenInit> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channel !== undefined &&
      (obj.channel = message.channel
        ? Channel.toJSON(message.channel)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelOpenInit>): MsgChannelOpenInit {
    const message = createBaseMsgChannelOpenInit();
    message.portId = object.portId ?? '';
    message.channel =
      object.channel !== undefined && object.channel !== null
        ? Channel.fromPartial(object.channel)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelOpenInitProtoMsg): MsgChannelOpenInit {
    return MsgChannelOpenInit.decode(message.value);
  },
  toProto(message: MsgChannelOpenInit): Uint8Array {
    return MsgChannelOpenInit.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelOpenInit): MsgChannelOpenInitProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInit',
      value: MsgChannelOpenInit.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelOpenInitResponse(): MsgChannelOpenInitResponse {
  return {
    channelId: '',
    version: '',
  };
}
/**
 * MsgChannelOpenInitResponse defines the Msg/ChannelOpenInit response type.
 * @name MsgChannelOpenInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInitResponse
 */
export const MsgChannelOpenInitResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInitResponse' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenInitResponse' as const,
  is(o: any): o is MsgChannelOpenInitResponse {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenInitResponse.typeUrl ||
        (typeof o.channelId === 'string' && typeof o.version === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelOpenInitResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenInitResponse.typeUrl ||
        (typeof o.channel_id === 'string' && typeof o.version === 'string'))
    );
  },
  encode(
    message: MsgChannelOpenInitResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.channelId !== '') {
      writer.uint32(10).string(message.channelId);
    }
    if (message.version !== '') {
      writer.uint32(18).string(message.version);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelOpenInitResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenInitResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.channelId = reader.string();
          break;
        case 2:
          message.version = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelOpenInitResponse {
    return {
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      version: isSet(object.version) ? String(object.version) : '',
    };
  },
  toJSON(
    message: MsgChannelOpenInitResponse,
  ): JsonSafe<MsgChannelOpenInitResponse> {
    const obj: any = {};
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelOpenInitResponse>,
  ): MsgChannelOpenInitResponse {
    const message = createBaseMsgChannelOpenInitResponse();
    message.channelId = object.channelId ?? '';
    message.version = object.version ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgChannelOpenInitResponseProtoMsg,
  ): MsgChannelOpenInitResponse {
    return MsgChannelOpenInitResponse.decode(message.value);
  },
  toProto(message: MsgChannelOpenInitResponse): Uint8Array {
    return MsgChannelOpenInitResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelOpenInitResponse,
  ): MsgChannelOpenInitResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInitResponse',
      value: MsgChannelOpenInitResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelOpenTry(): MsgChannelOpenTry {
  return {
    portId: '',
    previousChannelId: '',
    channel: Channel.fromPartial({}),
    counterpartyVersion: '',
    proofInit: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgChannelOpenInit defines a msg sent by a Relayer to try to open a channel
 * on Chain B. The version field within the Channel field has been deprecated. Its
 * value will be ignored by core IBC.
 * @name MsgChannelOpenTry
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTry
 */
export const MsgChannelOpenTry = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTry' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenTry' as const,
  is(o: any): o is MsgChannelOpenTry {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenTry.typeUrl ||
        (typeof o.portId === 'string' &&
          typeof o.previousChannelId === 'string' &&
          Channel.is(o.channel) &&
          typeof o.counterpartyVersion === 'string' &&
          (o.proofInit instanceof Uint8Array ||
            typeof o.proofInit === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelOpenTrySDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenTry.typeUrl ||
        (typeof o.port_id === 'string' &&
          typeof o.previous_channel_id === 'string' &&
          Channel.isSDK(o.channel) &&
          typeof o.counterparty_version === 'string' &&
          (o.proof_init instanceof Uint8Array ||
            typeof o.proof_init === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgChannelOpenTry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.previousChannelId !== '') {
      writer.uint32(18).string(message.previousChannelId);
    }
    if (message.channel !== undefined) {
      Channel.encode(message.channel, writer.uint32(26).fork()).ldelim();
    }
    if (message.counterpartyVersion !== '') {
      writer.uint32(34).string(message.counterpartyVersion);
    }
    if (message.proofInit.length !== 0) {
      writer.uint32(42).bytes(message.proofInit);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(50).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(58).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenTry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenTry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.previousChannelId = reader.string();
          break;
        case 3:
          message.channel = Channel.decode(reader, reader.uint32());
          break;
        case 4:
          message.counterpartyVersion = reader.string();
          break;
        case 5:
          message.proofInit = reader.bytes();
          break;
        case 6:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 7:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelOpenTry {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      previousChannelId: isSet(object.previousChannelId)
        ? String(object.previousChannelId)
        : '',
      channel: isSet(object.channel)
        ? Channel.fromJSON(object.channel)
        : undefined,
      counterpartyVersion: isSet(object.counterpartyVersion)
        ? String(object.counterpartyVersion)
        : '',
      proofInit: isSet(object.proofInit)
        ? bytesFromBase64(object.proofInit)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelOpenTry): JsonSafe<MsgChannelOpenTry> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.previousChannelId !== undefined &&
      (obj.previousChannelId = message.previousChannelId);
    message.channel !== undefined &&
      (obj.channel = message.channel
        ? Channel.toJSON(message.channel)
        : undefined);
    message.counterpartyVersion !== undefined &&
      (obj.counterpartyVersion = message.counterpartyVersion);
    message.proofInit !== undefined &&
      (obj.proofInit = base64FromBytes(
        message.proofInit !== undefined ? message.proofInit : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelOpenTry>): MsgChannelOpenTry {
    const message = createBaseMsgChannelOpenTry();
    message.portId = object.portId ?? '';
    message.previousChannelId = object.previousChannelId ?? '';
    message.channel =
      object.channel !== undefined && object.channel !== null
        ? Channel.fromPartial(object.channel)
        : undefined;
    message.counterpartyVersion = object.counterpartyVersion ?? '';
    message.proofInit = object.proofInit ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelOpenTryProtoMsg): MsgChannelOpenTry {
    return MsgChannelOpenTry.decode(message.value);
  },
  toProto(message: MsgChannelOpenTry): Uint8Array {
    return MsgChannelOpenTry.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelOpenTry): MsgChannelOpenTryProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTry',
      value: MsgChannelOpenTry.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelOpenTryResponse(): MsgChannelOpenTryResponse {
  return {
    version: '',
    channelId: '',
  };
}
/**
 * MsgChannelOpenTryResponse defines the Msg/ChannelOpenTry response type.
 * @name MsgChannelOpenTryResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTryResponse
 */
export const MsgChannelOpenTryResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTryResponse' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenTryResponse' as const,
  is(o: any): o is MsgChannelOpenTryResponse {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenTryResponse.typeUrl ||
        (typeof o.version === 'string' && typeof o.channelId === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelOpenTryResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenTryResponse.typeUrl ||
        (typeof o.version === 'string' && typeof o.channel_id === 'string'))
    );
  },
  encode(
    message: MsgChannelOpenTryResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.version !== '') {
      writer.uint32(10).string(message.version);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelOpenTryResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenTryResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string();
          break;
        case 2:
          message.channelId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelOpenTryResponse {
    return {
      version: isSet(object.version) ? String(object.version) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
    };
  },
  toJSON(
    message: MsgChannelOpenTryResponse,
  ): JsonSafe<MsgChannelOpenTryResponse> {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelOpenTryResponse>,
  ): MsgChannelOpenTryResponse {
    const message = createBaseMsgChannelOpenTryResponse();
    message.version = object.version ?? '';
    message.channelId = object.channelId ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgChannelOpenTryResponseProtoMsg,
  ): MsgChannelOpenTryResponse {
    return MsgChannelOpenTryResponse.decode(message.value);
  },
  toProto(message: MsgChannelOpenTryResponse): Uint8Array {
    return MsgChannelOpenTryResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelOpenTryResponse,
  ): MsgChannelOpenTryResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTryResponse',
      value: MsgChannelOpenTryResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelOpenAck(): MsgChannelOpenAck {
  return {
    portId: '',
    channelId: '',
    counterpartyChannelId: '',
    counterpartyVersion: '',
    proofTry: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgChannelOpenAck defines a msg sent by a Relayer to Chain A to acknowledge
 * the change of channel state to TRYOPEN on Chain B.
 * @name MsgChannelOpenAck
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAck
 */
export const MsgChannelOpenAck = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAck' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenAck' as const,
  is(o: any): o is MsgChannelOpenAck {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenAck.typeUrl ||
        (typeof o.portId === 'string' &&
          typeof o.channelId === 'string' &&
          typeof o.counterpartyChannelId === 'string' &&
          typeof o.counterpartyVersion === 'string' &&
          (o.proofTry instanceof Uint8Array ||
            typeof o.proofTry === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelOpenAckSDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenAck.typeUrl ||
        (typeof o.port_id === 'string' &&
          typeof o.channel_id === 'string' &&
          typeof o.counterparty_channel_id === 'string' &&
          typeof o.counterparty_version === 'string' &&
          (o.proof_try instanceof Uint8Array ||
            typeof o.proof_try === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgChannelOpenAck,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.counterpartyChannelId !== '') {
      writer.uint32(26).string(message.counterpartyChannelId);
    }
    if (message.counterpartyVersion !== '') {
      writer.uint32(34).string(message.counterpartyVersion);
    }
    if (message.proofTry.length !== 0) {
      writer.uint32(42).bytes(message.proofTry);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(50).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(58).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenAck {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.channelId = reader.string();
          break;
        case 3:
          message.counterpartyChannelId = reader.string();
          break;
        case 4:
          message.counterpartyVersion = reader.string();
          break;
        case 5:
          message.proofTry = reader.bytes();
          break;
        case 6:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 7:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelOpenAck {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      counterpartyChannelId: isSet(object.counterpartyChannelId)
        ? String(object.counterpartyChannelId)
        : '',
      counterpartyVersion: isSet(object.counterpartyVersion)
        ? String(object.counterpartyVersion)
        : '',
      proofTry: isSet(object.proofTry)
        ? bytesFromBase64(object.proofTry)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelOpenAck): JsonSafe<MsgChannelOpenAck> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.counterpartyChannelId !== undefined &&
      (obj.counterpartyChannelId = message.counterpartyChannelId);
    message.counterpartyVersion !== undefined &&
      (obj.counterpartyVersion = message.counterpartyVersion);
    message.proofTry !== undefined &&
      (obj.proofTry = base64FromBytes(
        message.proofTry !== undefined ? message.proofTry : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelOpenAck>): MsgChannelOpenAck {
    const message = createBaseMsgChannelOpenAck();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.counterpartyChannelId = object.counterpartyChannelId ?? '';
    message.counterpartyVersion = object.counterpartyVersion ?? '';
    message.proofTry = object.proofTry ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelOpenAckProtoMsg): MsgChannelOpenAck {
    return MsgChannelOpenAck.decode(message.value);
  },
  toProto(message: MsgChannelOpenAck): Uint8Array {
    return MsgChannelOpenAck.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelOpenAck): MsgChannelOpenAckProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAck',
      value: MsgChannelOpenAck.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelOpenAckResponse(): MsgChannelOpenAckResponse {
  return {};
}
/**
 * MsgChannelOpenAckResponse defines the Msg/ChannelOpenAck response type.
 * @name MsgChannelOpenAckResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAckResponse
 */
export const MsgChannelOpenAckResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAckResponse' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenAckResponse' as const,
  is(o: any): o is MsgChannelOpenAckResponse {
    return o && o.$typeUrl === MsgChannelOpenAckResponse.typeUrl;
  },
  isSDK(o: any): o is MsgChannelOpenAckResponseSDKType {
    return o && o.$typeUrl === MsgChannelOpenAckResponse.typeUrl;
  },
  encode(
    _: MsgChannelOpenAckResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelOpenAckResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenAckResponse();
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
  fromJSON(_: any): MsgChannelOpenAckResponse {
    return {};
  },
  toJSON(_: MsgChannelOpenAckResponse): JsonSafe<MsgChannelOpenAckResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgChannelOpenAckResponse>,
  ): MsgChannelOpenAckResponse {
    const message = createBaseMsgChannelOpenAckResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgChannelOpenAckResponseProtoMsg,
  ): MsgChannelOpenAckResponse {
    return MsgChannelOpenAckResponse.decode(message.value);
  },
  toProto(message: MsgChannelOpenAckResponse): Uint8Array {
    return MsgChannelOpenAckResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelOpenAckResponse,
  ): MsgChannelOpenAckResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAckResponse',
      value: MsgChannelOpenAckResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelOpenConfirm(): MsgChannelOpenConfirm {
  return {
    portId: '',
    channelId: '',
    proofAck: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgChannelOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of channel state to OPEN on Chain A.
 * @name MsgChannelOpenConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirm
 */
export const MsgChannelOpenConfirm = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirm' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenConfirm' as const,
  is(o: any): o is MsgChannelOpenConfirm {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenConfirm.typeUrl ||
        (typeof o.portId === 'string' &&
          typeof o.channelId === 'string' &&
          (o.proofAck instanceof Uint8Array ||
            typeof o.proofAck === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelOpenConfirmSDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelOpenConfirm.typeUrl ||
        (typeof o.port_id === 'string' &&
          typeof o.channel_id === 'string' &&
          (o.proof_ack instanceof Uint8Array ||
            typeof o.proof_ack === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgChannelOpenConfirm,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.proofAck.length !== 0) {
      writer.uint32(26).bytes(message.proofAck);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(34).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(42).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelOpenConfirm {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenConfirm();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.channelId = reader.string();
          break;
        case 3:
          message.proofAck = reader.bytes();
          break;
        case 4:
          message.proofHeight = Height.decode(reader, reader.uint32());
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
  fromJSON(object: any): MsgChannelOpenConfirm {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      proofAck: isSet(object.proofAck)
        ? bytesFromBase64(object.proofAck)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelOpenConfirm): JsonSafe<MsgChannelOpenConfirm> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
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
  fromPartial(object: Partial<MsgChannelOpenConfirm>): MsgChannelOpenConfirm {
    const message = createBaseMsgChannelOpenConfirm();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.proofAck = object.proofAck ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelOpenConfirmProtoMsg): MsgChannelOpenConfirm {
    return MsgChannelOpenConfirm.decode(message.value);
  },
  toProto(message: MsgChannelOpenConfirm): Uint8Array {
    return MsgChannelOpenConfirm.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelOpenConfirm): MsgChannelOpenConfirmProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirm',
      value: MsgChannelOpenConfirm.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelOpenConfirmResponse(): MsgChannelOpenConfirmResponse {
  return {};
}
/**
 * MsgChannelOpenConfirmResponse defines the Msg/ChannelOpenConfirm response
 * type.
 * @name MsgChannelOpenConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirmResponse
 */
export const MsgChannelOpenConfirmResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirmResponse' as const,
  aminoType: 'cosmos-sdk/MsgChannelOpenConfirmResponse' as const,
  is(o: any): o is MsgChannelOpenConfirmResponse {
    return o && o.$typeUrl === MsgChannelOpenConfirmResponse.typeUrl;
  },
  isSDK(o: any): o is MsgChannelOpenConfirmResponseSDKType {
    return o && o.$typeUrl === MsgChannelOpenConfirmResponse.typeUrl;
  },
  encode(
    _: MsgChannelOpenConfirmResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelOpenConfirmResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelOpenConfirmResponse();
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
  fromJSON(_: any): MsgChannelOpenConfirmResponse {
    return {};
  },
  toJSON(
    _: MsgChannelOpenConfirmResponse,
  ): JsonSafe<MsgChannelOpenConfirmResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgChannelOpenConfirmResponse>,
  ): MsgChannelOpenConfirmResponse {
    const message = createBaseMsgChannelOpenConfirmResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgChannelOpenConfirmResponseProtoMsg,
  ): MsgChannelOpenConfirmResponse {
    return MsgChannelOpenConfirmResponse.decode(message.value);
  },
  toProto(message: MsgChannelOpenConfirmResponse): Uint8Array {
    return MsgChannelOpenConfirmResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelOpenConfirmResponse,
  ): MsgChannelOpenConfirmResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirmResponse',
      value: MsgChannelOpenConfirmResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelCloseInit(): MsgChannelCloseInit {
  return {
    portId: '',
    channelId: '',
    signer: '',
  };
}
/**
 * MsgChannelCloseInit defines a msg sent by a Relayer to Chain A
 * to close a channel with Chain B.
 * @name MsgChannelCloseInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInit
 */
export const MsgChannelCloseInit = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInit' as const,
  aminoType: 'cosmos-sdk/MsgChannelCloseInit' as const,
  is(o: any): o is MsgChannelCloseInit {
    return (
      o &&
      (o.$typeUrl === MsgChannelCloseInit.typeUrl ||
        (typeof o.portId === 'string' &&
          typeof o.channelId === 'string' &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelCloseInitSDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelCloseInit.typeUrl ||
        (typeof o.port_id === 'string' &&
          typeof o.channel_id === 'string' &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgChannelCloseInit,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.signer !== '') {
      writer.uint32(26).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelCloseInit {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelCloseInit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.channelId = reader.string();
          break;
        case 3:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelCloseInit {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelCloseInit): JsonSafe<MsgChannelCloseInit> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelCloseInit>): MsgChannelCloseInit {
    const message = createBaseMsgChannelCloseInit();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelCloseInitProtoMsg): MsgChannelCloseInit {
    return MsgChannelCloseInit.decode(message.value);
  },
  toProto(message: MsgChannelCloseInit): Uint8Array {
    return MsgChannelCloseInit.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelCloseInit): MsgChannelCloseInitProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInit',
      value: MsgChannelCloseInit.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelCloseInitResponse(): MsgChannelCloseInitResponse {
  return {};
}
/**
 * MsgChannelCloseInitResponse defines the Msg/ChannelCloseInit response type.
 * @name MsgChannelCloseInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInitResponse
 */
export const MsgChannelCloseInitResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInitResponse' as const,
  aminoType: 'cosmos-sdk/MsgChannelCloseInitResponse' as const,
  is(o: any): o is MsgChannelCloseInitResponse {
    return o && o.$typeUrl === MsgChannelCloseInitResponse.typeUrl;
  },
  isSDK(o: any): o is MsgChannelCloseInitResponseSDKType {
    return o && o.$typeUrl === MsgChannelCloseInitResponse.typeUrl;
  },
  encode(
    _: MsgChannelCloseInitResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelCloseInitResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelCloseInitResponse();
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
  fromJSON(_: any): MsgChannelCloseInitResponse {
    return {};
  },
  toJSON(
    _: MsgChannelCloseInitResponse,
  ): JsonSafe<MsgChannelCloseInitResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgChannelCloseInitResponse>,
  ): MsgChannelCloseInitResponse {
    const message = createBaseMsgChannelCloseInitResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgChannelCloseInitResponseProtoMsg,
  ): MsgChannelCloseInitResponse {
    return MsgChannelCloseInitResponse.decode(message.value);
  },
  toProto(message: MsgChannelCloseInitResponse): Uint8Array {
    return MsgChannelCloseInitResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelCloseInitResponse,
  ): MsgChannelCloseInitResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInitResponse',
      value: MsgChannelCloseInitResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelCloseConfirm(): MsgChannelCloseConfirm {
  return {
    portId: '',
    channelId: '',
    proofInit: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgChannelCloseConfirm defines a msg sent by a Relayer to Chain B
 * to acknowledge the change of channel state to CLOSED on Chain A.
 * @name MsgChannelCloseConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirm
 */
export const MsgChannelCloseConfirm = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirm' as const,
  aminoType: 'cosmos-sdk/MsgChannelCloseConfirm' as const,
  is(o: any): o is MsgChannelCloseConfirm {
    return (
      o &&
      (o.$typeUrl === MsgChannelCloseConfirm.typeUrl ||
        (typeof o.portId === 'string' &&
          typeof o.channelId === 'string' &&
          (o.proofInit instanceof Uint8Array ||
            typeof o.proofInit === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgChannelCloseConfirmSDKType {
    return (
      o &&
      (o.$typeUrl === MsgChannelCloseConfirm.typeUrl ||
        (typeof o.port_id === 'string' &&
          typeof o.channel_id === 'string' &&
          (o.proof_init instanceof Uint8Array ||
            typeof o.proof_init === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgChannelCloseConfirm,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.proofInit.length !== 0) {
      writer.uint32(26).bytes(message.proofInit);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(34).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(42).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelCloseConfirm {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelCloseConfirm();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.channelId = reader.string();
          break;
        case 3:
          message.proofInit = reader.bytes();
          break;
        case 4:
          message.proofHeight = Height.decode(reader, reader.uint32());
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
  fromJSON(object: any): MsgChannelCloseConfirm {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      proofInit: isSet(object.proofInit)
        ? bytesFromBase64(object.proofInit)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelCloseConfirm): JsonSafe<MsgChannelCloseConfirm> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.proofInit !== undefined &&
      (obj.proofInit = base64FromBytes(
        message.proofInit !== undefined ? message.proofInit : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelCloseConfirm>): MsgChannelCloseConfirm {
    const message = createBaseMsgChannelCloseConfirm();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.proofInit = object.proofInit ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgChannelCloseConfirmProtoMsg,
  ): MsgChannelCloseConfirm {
    return MsgChannelCloseConfirm.decode(message.value);
  },
  toProto(message: MsgChannelCloseConfirm): Uint8Array {
    return MsgChannelCloseConfirm.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelCloseConfirm): MsgChannelCloseConfirmProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirm',
      value: MsgChannelCloseConfirm.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelCloseConfirmResponse(): MsgChannelCloseConfirmResponse {
  return {};
}
/**
 * MsgChannelCloseConfirmResponse defines the Msg/ChannelCloseConfirm response
 * type.
 * @name MsgChannelCloseConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirmResponse
 */
export const MsgChannelCloseConfirmResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirmResponse' as const,
  aminoType: 'cosmos-sdk/MsgChannelCloseConfirmResponse' as const,
  is(o: any): o is MsgChannelCloseConfirmResponse {
    return o && o.$typeUrl === MsgChannelCloseConfirmResponse.typeUrl;
  },
  isSDK(o: any): o is MsgChannelCloseConfirmResponseSDKType {
    return o && o.$typeUrl === MsgChannelCloseConfirmResponse.typeUrl;
  },
  encode(
    _: MsgChannelCloseConfirmResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelCloseConfirmResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelCloseConfirmResponse();
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
  fromJSON(_: any): MsgChannelCloseConfirmResponse {
    return {};
  },
  toJSON(
    _: MsgChannelCloseConfirmResponse,
  ): JsonSafe<MsgChannelCloseConfirmResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgChannelCloseConfirmResponse>,
  ): MsgChannelCloseConfirmResponse {
    const message = createBaseMsgChannelCloseConfirmResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgChannelCloseConfirmResponseProtoMsg,
  ): MsgChannelCloseConfirmResponse {
    return MsgChannelCloseConfirmResponse.decode(message.value);
  },
  toProto(message: MsgChannelCloseConfirmResponse): Uint8Array {
    return MsgChannelCloseConfirmResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelCloseConfirmResponse,
  ): MsgChannelCloseConfirmResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirmResponse',
      value: MsgChannelCloseConfirmResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRecvPacket(): MsgRecvPacket {
  return {
    packet: Packet.fromPartial({}),
    proofCommitment: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgRecvPacket receives incoming IBC packet
 * @name MsgRecvPacket
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacket
 */
export const MsgRecvPacket = {
  typeUrl: '/ibc.core.channel.v1.MsgRecvPacket' as const,
  aminoType: 'cosmos-sdk/MsgRecvPacket' as const,
  is(o: any): o is MsgRecvPacket {
    return (
      o &&
      (o.$typeUrl === MsgRecvPacket.typeUrl ||
        (Packet.is(o.packet) &&
          (o.proofCommitment instanceof Uint8Array ||
            typeof o.proofCommitment === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgRecvPacketSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRecvPacket.typeUrl ||
        (Packet.isSDK(o.packet) &&
          (o.proof_commitment instanceof Uint8Array ||
            typeof o.proof_commitment === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgRecvPacket,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.proofCommitment.length !== 0) {
      writer.uint32(18).bytes(message.proofCommitment);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(34).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgRecvPacket {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRecvPacket();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.proofCommitment = reader.bytes();
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
  fromJSON(object: any): MsgRecvPacket {
    return {
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      proofCommitment: isSet(object.proofCommitment)
        ? bytesFromBase64(object.proofCommitment)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgRecvPacket): JsonSafe<MsgRecvPacket> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.proofCommitment !== undefined &&
      (obj.proofCommitment = base64FromBytes(
        message.proofCommitment !== undefined
          ? message.proofCommitment
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgRecvPacket>): MsgRecvPacket {
    const message = createBaseMsgRecvPacket();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.proofCommitment = object.proofCommitment ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgRecvPacketProtoMsg): MsgRecvPacket {
    return MsgRecvPacket.decode(message.value);
  },
  toProto(message: MsgRecvPacket): Uint8Array {
    return MsgRecvPacket.encode(message).finish();
  },
  toProtoMsg(message: MsgRecvPacket): MsgRecvPacketProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgRecvPacket',
      value: MsgRecvPacket.encode(message).finish(),
    };
  },
};
function createBaseMsgRecvPacketResponse(): MsgRecvPacketResponse {
  return {
    result: 0,
  };
}
/**
 * MsgRecvPacketResponse defines the Msg/RecvPacket response type.
 * @name MsgRecvPacketResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacketResponse
 */
export const MsgRecvPacketResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgRecvPacketResponse' as const,
  aminoType: 'cosmos-sdk/MsgRecvPacketResponse' as const,
  is(o: any): o is MsgRecvPacketResponse {
    return (
      o && (o.$typeUrl === MsgRecvPacketResponse.typeUrl || isSet(o.result))
    );
  },
  isSDK(o: any): o is MsgRecvPacketResponseSDKType {
    return (
      o && (o.$typeUrl === MsgRecvPacketResponse.typeUrl || isSet(o.result))
    );
  },
  encode(
    message: MsgRecvPacketResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRecvPacketResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRecvPacketResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRecvPacketResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(message: MsgRecvPacketResponse): JsonSafe<MsgRecvPacketResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(object: Partial<MsgRecvPacketResponse>): MsgRecvPacketResponse {
    const message = createBaseMsgRecvPacketResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgRecvPacketResponseProtoMsg): MsgRecvPacketResponse {
    return MsgRecvPacketResponse.decode(message.value);
  },
  toProto(message: MsgRecvPacketResponse): Uint8Array {
    return MsgRecvPacketResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgRecvPacketResponse): MsgRecvPacketResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgRecvPacketResponse',
      value: MsgRecvPacketResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgTimeout(): MsgTimeout {
  return {
    packet: Packet.fromPartial({}),
    proofUnreceived: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    nextSequenceRecv: BigInt(0),
    signer: '',
  };
}
/**
 * MsgTimeout receives timed-out packet
 * @name MsgTimeout
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeout
 */
export const MsgTimeout = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeout' as const,
  aminoType: 'cosmos-sdk/MsgTimeout' as const,
  is(o: any): o is MsgTimeout {
    return (
      o &&
      (o.$typeUrl === MsgTimeout.typeUrl ||
        (Packet.is(o.packet) &&
          (o.proofUnreceived instanceof Uint8Array ||
            typeof o.proofUnreceived === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.nextSequenceRecv === 'bigint' &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgTimeoutSDKType {
    return (
      o &&
      (o.$typeUrl === MsgTimeout.typeUrl ||
        (Packet.isSDK(o.packet) &&
          (o.proof_unreceived instanceof Uint8Array ||
            typeof o.proof_unreceived === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.next_sequence_recv === 'bigint' &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgTimeout,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.proofUnreceived.length !== 0) {
      writer.uint32(18).bytes(message.proofUnreceived);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(26).fork()).ldelim();
    }
    if (message.nextSequenceRecv !== BigInt(0)) {
      writer.uint32(32).uint64(message.nextSequenceRecv);
    }
    if (message.signer !== '') {
      writer.uint32(42).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgTimeout {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTimeout();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.proofUnreceived = reader.bytes();
          break;
        case 3:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 4:
          message.nextSequenceRecv = reader.uint64();
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
  fromJSON(object: any): MsgTimeout {
    return {
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      proofUnreceived: isSet(object.proofUnreceived)
        ? bytesFromBase64(object.proofUnreceived)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      nextSequenceRecv: isSet(object.nextSequenceRecv)
        ? BigInt(object.nextSequenceRecv.toString())
        : BigInt(0),
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgTimeout): JsonSafe<MsgTimeout> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.proofUnreceived !== undefined &&
      (obj.proofUnreceived = base64FromBytes(
        message.proofUnreceived !== undefined
          ? message.proofUnreceived
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.nextSequenceRecv !== undefined &&
      (obj.nextSequenceRecv = (
        message.nextSequenceRecv || BigInt(0)
      ).toString());
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgTimeout>): MsgTimeout {
    const message = createBaseMsgTimeout();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.proofUnreceived = object.proofUnreceived ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.nextSequenceRecv =
      object.nextSequenceRecv !== undefined && object.nextSequenceRecv !== null
        ? BigInt(object.nextSequenceRecv.toString())
        : BigInt(0);
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgTimeoutProtoMsg): MsgTimeout {
    return MsgTimeout.decode(message.value);
  },
  toProto(message: MsgTimeout): Uint8Array {
    return MsgTimeout.encode(message).finish();
  },
  toProtoMsg(message: MsgTimeout): MsgTimeoutProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgTimeout',
      value: MsgTimeout.encode(message).finish(),
    };
  },
};
function createBaseMsgTimeoutResponse(): MsgTimeoutResponse {
  return {
    result: 0,
  };
}
/**
 * MsgTimeoutResponse defines the Msg/Timeout response type.
 * @name MsgTimeoutResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutResponse
 */
export const MsgTimeoutResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutResponse' as const,
  aminoType: 'cosmos-sdk/MsgTimeoutResponse' as const,
  is(o: any): o is MsgTimeoutResponse {
    return o && (o.$typeUrl === MsgTimeoutResponse.typeUrl || isSet(o.result));
  },
  isSDK(o: any): o is MsgTimeoutResponseSDKType {
    return o && (o.$typeUrl === MsgTimeoutResponse.typeUrl || isSet(o.result));
  },
  encode(
    message: MsgTimeoutResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgTimeoutResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTimeoutResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgTimeoutResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(message: MsgTimeoutResponse): JsonSafe<MsgTimeoutResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(object: Partial<MsgTimeoutResponse>): MsgTimeoutResponse {
    const message = createBaseMsgTimeoutResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(message: MsgTimeoutResponseProtoMsg): MsgTimeoutResponse {
    return MsgTimeoutResponse.decode(message.value);
  },
  toProto(message: MsgTimeoutResponse): Uint8Array {
    return MsgTimeoutResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgTimeoutResponse): MsgTimeoutResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgTimeoutResponse',
      value: MsgTimeoutResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgTimeoutOnClose(): MsgTimeoutOnClose {
  return {
    packet: Packet.fromPartial({}),
    proofUnreceived: new Uint8Array(),
    proofClose: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    nextSequenceRecv: BigInt(0),
    signer: '',
  };
}
/**
 * MsgTimeoutOnClose timed-out packet upon counterparty channel closure.
 * @name MsgTimeoutOnClose
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnClose
 */
export const MsgTimeoutOnClose = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnClose' as const,
  aminoType: 'cosmos-sdk/MsgTimeoutOnClose' as const,
  is(o: any): o is MsgTimeoutOnClose {
    return (
      o &&
      (o.$typeUrl === MsgTimeoutOnClose.typeUrl ||
        (Packet.is(o.packet) &&
          (o.proofUnreceived instanceof Uint8Array ||
            typeof o.proofUnreceived === 'string') &&
          (o.proofClose instanceof Uint8Array ||
            typeof o.proofClose === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.nextSequenceRecv === 'bigint' &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgTimeoutOnCloseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgTimeoutOnClose.typeUrl ||
        (Packet.isSDK(o.packet) &&
          (o.proof_unreceived instanceof Uint8Array ||
            typeof o.proof_unreceived === 'string') &&
          (o.proof_close instanceof Uint8Array ||
            typeof o.proof_close === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.next_sequence_recv === 'bigint' &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgTimeoutOnClose,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.proofUnreceived.length !== 0) {
      writer.uint32(18).bytes(message.proofUnreceived);
    }
    if (message.proofClose.length !== 0) {
      writer.uint32(26).bytes(message.proofClose);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(34).fork()).ldelim();
    }
    if (message.nextSequenceRecv !== BigInt(0)) {
      writer.uint32(40).uint64(message.nextSequenceRecv);
    }
    if (message.signer !== '') {
      writer.uint32(50).string(message.signer);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgTimeoutOnClose {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTimeoutOnClose();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.proofUnreceived = reader.bytes();
          break;
        case 3:
          message.proofClose = reader.bytes();
          break;
        case 4:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 5:
          message.nextSequenceRecv = reader.uint64();
          break;
        case 6:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgTimeoutOnClose {
    return {
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      proofUnreceived: isSet(object.proofUnreceived)
        ? bytesFromBase64(object.proofUnreceived)
        : new Uint8Array(),
      proofClose: isSet(object.proofClose)
        ? bytesFromBase64(object.proofClose)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      nextSequenceRecv: isSet(object.nextSequenceRecv)
        ? BigInt(object.nextSequenceRecv.toString())
        : BigInt(0),
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgTimeoutOnClose): JsonSafe<MsgTimeoutOnClose> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.proofUnreceived !== undefined &&
      (obj.proofUnreceived = base64FromBytes(
        message.proofUnreceived !== undefined
          ? message.proofUnreceived
          : new Uint8Array(),
      ));
    message.proofClose !== undefined &&
      (obj.proofClose = base64FromBytes(
        message.proofClose !== undefined
          ? message.proofClose
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.nextSequenceRecv !== undefined &&
      (obj.nextSequenceRecv = (
        message.nextSequenceRecv || BigInt(0)
      ).toString());
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgTimeoutOnClose>): MsgTimeoutOnClose {
    const message = createBaseMsgTimeoutOnClose();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.proofUnreceived = object.proofUnreceived ?? new Uint8Array();
    message.proofClose = object.proofClose ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.nextSequenceRecv =
      object.nextSequenceRecv !== undefined && object.nextSequenceRecv !== null
        ? BigInt(object.nextSequenceRecv.toString())
        : BigInt(0);
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgTimeoutOnCloseProtoMsg): MsgTimeoutOnClose {
    return MsgTimeoutOnClose.decode(message.value);
  },
  toProto(message: MsgTimeoutOnClose): Uint8Array {
    return MsgTimeoutOnClose.encode(message).finish();
  },
  toProtoMsg(message: MsgTimeoutOnClose): MsgTimeoutOnCloseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnClose',
      value: MsgTimeoutOnClose.encode(message).finish(),
    };
  },
};
function createBaseMsgTimeoutOnCloseResponse(): MsgTimeoutOnCloseResponse {
  return {
    result: 0,
  };
}
/**
 * MsgTimeoutOnCloseResponse defines the Msg/TimeoutOnClose response type.
 * @name MsgTimeoutOnCloseResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnCloseResponse
 */
export const MsgTimeoutOnCloseResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnCloseResponse' as const,
  aminoType: 'cosmos-sdk/MsgTimeoutOnCloseResponse' as const,
  is(o: any): o is MsgTimeoutOnCloseResponse {
    return (
      o && (o.$typeUrl === MsgTimeoutOnCloseResponse.typeUrl || isSet(o.result))
    );
  },
  isSDK(o: any): o is MsgTimeoutOnCloseResponseSDKType {
    return (
      o && (o.$typeUrl === MsgTimeoutOnCloseResponse.typeUrl || isSet(o.result))
    );
  },
  encode(
    message: MsgTimeoutOnCloseResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgTimeoutOnCloseResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTimeoutOnCloseResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgTimeoutOnCloseResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(
    message: MsgTimeoutOnCloseResponse,
  ): JsonSafe<MsgTimeoutOnCloseResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(
    object: Partial<MsgTimeoutOnCloseResponse>,
  ): MsgTimeoutOnCloseResponse {
    const message = createBaseMsgTimeoutOnCloseResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgTimeoutOnCloseResponseProtoMsg,
  ): MsgTimeoutOnCloseResponse {
    return MsgTimeoutOnCloseResponse.decode(message.value);
  },
  toProto(message: MsgTimeoutOnCloseResponse): Uint8Array {
    return MsgTimeoutOnCloseResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgTimeoutOnCloseResponse,
  ): MsgTimeoutOnCloseResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnCloseResponse',
      value: MsgTimeoutOnCloseResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgAcknowledgement(): MsgAcknowledgement {
  return {
    packet: Packet.fromPartial({}),
    acknowledgement: new Uint8Array(),
    proofAcked: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgAcknowledgement receives incoming IBC acknowledgement
 * @name MsgAcknowledgement
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgement
 */
export const MsgAcknowledgement = {
  typeUrl: '/ibc.core.channel.v1.MsgAcknowledgement' as const,
  aminoType: 'cosmos-sdk/MsgAcknowledgement' as const,
  is(o: any): o is MsgAcknowledgement {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgement.typeUrl ||
        (Packet.is(o.packet) &&
          (o.acknowledgement instanceof Uint8Array ||
            typeof o.acknowledgement === 'string') &&
          (o.proofAcked instanceof Uint8Array ||
            typeof o.proofAcked === 'string') &&
          Height.is(o.proofHeight) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgAcknowledgementSDKType {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgement.typeUrl ||
        (Packet.isSDK(o.packet) &&
          (o.acknowledgement instanceof Uint8Array ||
            typeof o.acknowledgement === 'string') &&
          (o.proof_acked instanceof Uint8Array ||
            typeof o.proof_acked === 'string') &&
          Height.isSDK(o.proof_height) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgAcknowledgement,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.packet !== undefined) {
      Packet.encode(message.packet, writer.uint32(10).fork()).ldelim();
    }
    if (message.acknowledgement.length !== 0) {
      writer.uint32(18).bytes(message.acknowledgement);
    }
    if (message.proofAcked.length !== 0) {
      writer.uint32(26).bytes(message.proofAcked);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(34).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(42).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAcknowledgement {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAcknowledgement();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.packet = Packet.decode(reader, reader.uint32());
          break;
        case 2:
          message.acknowledgement = reader.bytes();
          break;
        case 3:
          message.proofAcked = reader.bytes();
          break;
        case 4:
          message.proofHeight = Height.decode(reader, reader.uint32());
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
  fromJSON(object: any): MsgAcknowledgement {
    return {
      packet: isSet(object.packet) ? Packet.fromJSON(object.packet) : undefined,
      acknowledgement: isSet(object.acknowledgement)
        ? bytesFromBase64(object.acknowledgement)
        : new Uint8Array(),
      proofAcked: isSet(object.proofAcked)
        ? bytesFromBase64(object.proofAcked)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgAcknowledgement): JsonSafe<MsgAcknowledgement> {
    const obj: any = {};
    message.packet !== undefined &&
      (obj.packet = message.packet ? Packet.toJSON(message.packet) : undefined);
    message.acknowledgement !== undefined &&
      (obj.acknowledgement = base64FromBytes(
        message.acknowledgement !== undefined
          ? message.acknowledgement
          : new Uint8Array(),
      ));
    message.proofAcked !== undefined &&
      (obj.proofAcked = base64FromBytes(
        message.proofAcked !== undefined
          ? message.proofAcked
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgAcknowledgement>): MsgAcknowledgement {
    const message = createBaseMsgAcknowledgement();
    message.packet =
      object.packet !== undefined && object.packet !== null
        ? Packet.fromPartial(object.packet)
        : undefined;
    message.acknowledgement = object.acknowledgement ?? new Uint8Array();
    message.proofAcked = object.proofAcked ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgAcknowledgementProtoMsg): MsgAcknowledgement {
    return MsgAcknowledgement.decode(message.value);
  },
  toProto(message: MsgAcknowledgement): Uint8Array {
    return MsgAcknowledgement.encode(message).finish();
  },
  toProtoMsg(message: MsgAcknowledgement): MsgAcknowledgementProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgAcknowledgement',
      value: MsgAcknowledgement.encode(message).finish(),
    };
  },
};
function createBaseMsgAcknowledgementResponse(): MsgAcknowledgementResponse {
  return {
    result: 0,
  };
}
/**
 * MsgAcknowledgementResponse defines the Msg/Acknowledgement response type.
 * @name MsgAcknowledgementResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgementResponse
 */
export const MsgAcknowledgementResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgAcknowledgementResponse' as const,
  aminoType: 'cosmos-sdk/MsgAcknowledgementResponse' as const,
  is(o: any): o is MsgAcknowledgementResponse {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgementResponse.typeUrl || isSet(o.result))
    );
  },
  isSDK(o: any): o is MsgAcknowledgementResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgAcknowledgementResponse.typeUrl || isSet(o.result))
    );
  },
  encode(
    message: MsgAcknowledgementResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAcknowledgementResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAcknowledgementResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAcknowledgementResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(
    message: MsgAcknowledgementResponse,
  ): JsonSafe<MsgAcknowledgementResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(
    object: Partial<MsgAcknowledgementResponse>,
  ): MsgAcknowledgementResponse {
    const message = createBaseMsgAcknowledgementResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgAcknowledgementResponseProtoMsg,
  ): MsgAcknowledgementResponse {
    return MsgAcknowledgementResponse.decode(message.value);
  },
  toProto(message: MsgAcknowledgementResponse): Uint8Array {
    return MsgAcknowledgementResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAcknowledgementResponse,
  ): MsgAcknowledgementResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgAcknowledgementResponse',
      value: MsgAcknowledgementResponse.encode(message).finish(),
    };
  },
};
