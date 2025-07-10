//@ts-nocheck
import {
  Channel,
  type ChannelSDKType,
  Packet,
  type PacketSDKType,
  State,
  stateFromJSON,
  stateToJSON,
} from './channel.js';
import {
  Height,
  type HeightSDKType,
  Params,
  type ParamsSDKType,
} from '../../client/v1/client.js';
import {
  UpgradeFields,
  type UpgradeFieldsSDKType,
  Upgrade,
  type UpgradeSDKType,
  ErrorReceipt,
  type ErrorReceiptSDKType,
} from './upgrade.js';
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
 */
export interface MsgChannelOpenInitSDKType {
  port_id: string;
  channel: ChannelSDKType;
  signer: string;
}
/** MsgChannelOpenInitResponse defines the Msg/ChannelOpenInit response type. */
export interface MsgChannelOpenInitResponse {
  channelId: string;
  version: string;
}
export interface MsgChannelOpenInitResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInitResponse';
  value: Uint8Array;
}
/** MsgChannelOpenInitResponse defines the Msg/ChannelOpenInit response type. */
export interface MsgChannelOpenInitResponseSDKType {
  channel_id: string;
  version: string;
}
/**
 * MsgChannelOpenInit defines a msg sent by a Relayer to try to open a channel
 * on Chain B. The version field within the Channel field has been deprecated. Its
 * value will be ignored by core IBC.
 */
export interface MsgChannelOpenTry {
  portId: string;
  /** Deprecated: this field is unused. Crossing hello's are no longer supported in core IBC. */
  /** @deprecated */
  previousChannelId: string;
  /** NOTE: the version field within the channel has been deprecated. Its value will be ignored by core IBC. */
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
 */
export interface MsgChannelOpenTrySDKType {
  port_id: string;
  /** @deprecated */
  previous_channel_id: string;
  channel: ChannelSDKType;
  counterparty_version: string;
  proof_init: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgChannelOpenTryResponse defines the Msg/ChannelOpenTry response type. */
export interface MsgChannelOpenTryResponse {
  version: string;
  channelId: string;
}
export interface MsgChannelOpenTryResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTryResponse';
  value: Uint8Array;
}
/** MsgChannelOpenTryResponse defines the Msg/ChannelOpenTry response type. */
export interface MsgChannelOpenTryResponseSDKType {
  version: string;
  channel_id: string;
}
/**
 * MsgChannelOpenAck defines a msg sent by a Relayer to Chain A to acknowledge
 * the change of channel state to TRYOPEN on Chain B.
 * WARNING: a channel upgrade MUST NOT initialize an upgrade for this channel
 * in the same block as executing this message otherwise the counterparty will
 * be incapable of opening.
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
 * WARNING: a channel upgrade MUST NOT initialize an upgrade for this channel
 * in the same block as executing this message otherwise the counterparty will
 * be incapable of opening.
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
/** MsgChannelOpenAckResponse defines the Msg/ChannelOpenAck response type. */
export interface MsgChannelOpenAckResponse {}
export interface MsgChannelOpenAckResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAckResponse';
  value: Uint8Array;
}
/** MsgChannelOpenAckResponse defines the Msg/ChannelOpenAck response type. */
export interface MsgChannelOpenAckResponseSDKType {}
/**
 * MsgChannelOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of channel state to OPEN on Chain A.
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
 */
export interface MsgChannelOpenConfirmResponse {}
export interface MsgChannelOpenConfirmResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirmResponse';
  value: Uint8Array;
}
/**
 * MsgChannelOpenConfirmResponse defines the Msg/ChannelOpenConfirm response
 * type.
 */
export interface MsgChannelOpenConfirmResponseSDKType {}
/**
 * MsgChannelCloseInit defines a msg sent by a Relayer to Chain A
 * to close a channel with Chain B.
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
 */
export interface MsgChannelCloseInitSDKType {
  port_id: string;
  channel_id: string;
  signer: string;
}
/** MsgChannelCloseInitResponse defines the Msg/ChannelCloseInit response type. */
export interface MsgChannelCloseInitResponse {}
export interface MsgChannelCloseInitResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInitResponse';
  value: Uint8Array;
}
/** MsgChannelCloseInitResponse defines the Msg/ChannelCloseInit response type. */
export interface MsgChannelCloseInitResponseSDKType {}
/**
 * MsgChannelCloseConfirm defines a msg sent by a Relayer to Chain B
 * to acknowledge the change of channel state to CLOSED on Chain A.
 */
export interface MsgChannelCloseConfirm {
  portId: string;
  channelId: string;
  proofInit: Uint8Array;
  proofHeight: Height;
  signer: string;
  counterpartyUpgradeSequence: bigint;
}
export interface MsgChannelCloseConfirmProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirm';
  value: Uint8Array;
}
/**
 * MsgChannelCloseConfirm defines a msg sent by a Relayer to Chain B
 * to acknowledge the change of channel state to CLOSED on Chain A.
 */
export interface MsgChannelCloseConfirmSDKType {
  port_id: string;
  channel_id: string;
  proof_init: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
  counterparty_upgrade_sequence: bigint;
}
/**
 * MsgChannelCloseConfirmResponse defines the Msg/ChannelCloseConfirm response
 * type.
 */
export interface MsgChannelCloseConfirmResponse {}
export interface MsgChannelCloseConfirmResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirmResponse';
  value: Uint8Array;
}
/**
 * MsgChannelCloseConfirmResponse defines the Msg/ChannelCloseConfirm response
 * type.
 */
export interface MsgChannelCloseConfirmResponseSDKType {}
/** MsgRecvPacket receives incoming IBC packet */
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
/** MsgRecvPacket receives incoming IBC packet */
export interface MsgRecvPacketSDKType {
  packet: PacketSDKType;
  proof_commitment: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgRecvPacketResponse defines the Msg/RecvPacket response type. */
export interface MsgRecvPacketResponse {
  result: ResponseResultType;
}
export interface MsgRecvPacketResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgRecvPacketResponse';
  value: Uint8Array;
}
/** MsgRecvPacketResponse defines the Msg/RecvPacket response type. */
export interface MsgRecvPacketResponseSDKType {
  result: ResponseResultType;
}
/** MsgTimeout receives timed-out packet */
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
/** MsgTimeout receives timed-out packet */
export interface MsgTimeoutSDKType {
  packet: PacketSDKType;
  proof_unreceived: Uint8Array;
  proof_height: HeightSDKType;
  next_sequence_recv: bigint;
  signer: string;
}
/** MsgTimeoutResponse defines the Msg/Timeout response type. */
export interface MsgTimeoutResponse {
  result: ResponseResultType;
}
export interface MsgTimeoutResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutResponse';
  value: Uint8Array;
}
/** MsgTimeoutResponse defines the Msg/Timeout response type. */
export interface MsgTimeoutResponseSDKType {
  result: ResponseResultType;
}
/** MsgTimeoutOnClose timed-out packet upon counterparty channel closure. */
export interface MsgTimeoutOnClose {
  packet: Packet;
  proofUnreceived: Uint8Array;
  proofClose: Uint8Array;
  proofHeight: Height;
  nextSequenceRecv: bigint;
  signer: string;
  counterpartyUpgradeSequence: bigint;
}
export interface MsgTimeoutOnCloseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnClose';
  value: Uint8Array;
}
/** MsgTimeoutOnClose timed-out packet upon counterparty channel closure. */
export interface MsgTimeoutOnCloseSDKType {
  packet: PacketSDKType;
  proof_unreceived: Uint8Array;
  proof_close: Uint8Array;
  proof_height: HeightSDKType;
  next_sequence_recv: bigint;
  signer: string;
  counterparty_upgrade_sequence: bigint;
}
/** MsgTimeoutOnCloseResponse defines the Msg/TimeoutOnClose response type. */
export interface MsgTimeoutOnCloseResponse {
  result: ResponseResultType;
}
export interface MsgTimeoutOnCloseResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnCloseResponse';
  value: Uint8Array;
}
/** MsgTimeoutOnCloseResponse defines the Msg/TimeoutOnClose response type. */
export interface MsgTimeoutOnCloseResponseSDKType {
  result: ResponseResultType;
}
/** MsgAcknowledgement receives incoming IBC acknowledgement */
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
/** MsgAcknowledgement receives incoming IBC acknowledgement */
export interface MsgAcknowledgementSDKType {
  packet: PacketSDKType;
  acknowledgement: Uint8Array;
  proof_acked: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgAcknowledgementResponse defines the Msg/Acknowledgement response type. */
export interface MsgAcknowledgementResponse {
  result: ResponseResultType;
}
export interface MsgAcknowledgementResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgAcknowledgementResponse';
  value: Uint8Array;
}
/** MsgAcknowledgementResponse defines the Msg/Acknowledgement response type. */
export interface MsgAcknowledgementResponseSDKType {
  result: ResponseResultType;
}
/**
 * MsgChannelUpgradeInit defines the request type for the ChannelUpgradeInit rpc
 * WARNING: Initializing a channel upgrade in the same block as opening the channel
 * may result in the counterparty being incapable of opening.
 */
export interface MsgChannelUpgradeInit {
  portId: string;
  channelId: string;
  fields: UpgradeFields;
  signer: string;
}
export interface MsgChannelUpgradeInitProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeInit';
  value: Uint8Array;
}
/**
 * MsgChannelUpgradeInit defines the request type for the ChannelUpgradeInit rpc
 * WARNING: Initializing a channel upgrade in the same block as opening the channel
 * may result in the counterparty being incapable of opening.
 */
export interface MsgChannelUpgradeInitSDKType {
  port_id: string;
  channel_id: string;
  fields: UpgradeFieldsSDKType;
  signer: string;
}
/** MsgChannelUpgradeInitResponse defines the MsgChannelUpgradeInit response type */
export interface MsgChannelUpgradeInitResponse {
  upgrade: Upgrade;
  upgradeSequence: bigint;
}
export interface MsgChannelUpgradeInitResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeInitResponse';
  value: Uint8Array;
}
/** MsgChannelUpgradeInitResponse defines the MsgChannelUpgradeInit response type */
export interface MsgChannelUpgradeInitResponseSDKType {
  upgrade: UpgradeSDKType;
  upgrade_sequence: bigint;
}
/** MsgChannelUpgradeTry defines the request type for the ChannelUpgradeTry rpc */
export interface MsgChannelUpgradeTry {
  portId: string;
  channelId: string;
  proposedUpgradeConnectionHops: string[];
  counterpartyUpgradeFields: UpgradeFields;
  counterpartyUpgradeSequence: bigint;
  proofChannel: Uint8Array;
  proofUpgrade: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelUpgradeTryProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTry';
  value: Uint8Array;
}
/** MsgChannelUpgradeTry defines the request type for the ChannelUpgradeTry rpc */
export interface MsgChannelUpgradeTrySDKType {
  port_id: string;
  channel_id: string;
  proposed_upgrade_connection_hops: string[];
  counterparty_upgrade_fields: UpgradeFieldsSDKType;
  counterparty_upgrade_sequence: bigint;
  proof_channel: Uint8Array;
  proof_upgrade: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgChannelUpgradeTryResponse defines the MsgChannelUpgradeTry response type */
export interface MsgChannelUpgradeTryResponse {
  upgrade: Upgrade;
  upgradeSequence: bigint;
  result: ResponseResultType;
}
export interface MsgChannelUpgradeTryResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTryResponse';
  value: Uint8Array;
}
/** MsgChannelUpgradeTryResponse defines the MsgChannelUpgradeTry response type */
export interface MsgChannelUpgradeTryResponseSDKType {
  upgrade: UpgradeSDKType;
  upgrade_sequence: bigint;
  result: ResponseResultType;
}
/** MsgChannelUpgradeAck defines the request type for the ChannelUpgradeAck rpc */
export interface MsgChannelUpgradeAck {
  portId: string;
  channelId: string;
  counterpartyUpgrade: Upgrade;
  proofChannel: Uint8Array;
  proofUpgrade: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelUpgradeAckProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeAck';
  value: Uint8Array;
}
/** MsgChannelUpgradeAck defines the request type for the ChannelUpgradeAck rpc */
export interface MsgChannelUpgradeAckSDKType {
  port_id: string;
  channel_id: string;
  counterparty_upgrade: UpgradeSDKType;
  proof_channel: Uint8Array;
  proof_upgrade: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgChannelUpgradeAckResponse defines MsgChannelUpgradeAck response type */
export interface MsgChannelUpgradeAckResponse {
  result: ResponseResultType;
}
export interface MsgChannelUpgradeAckResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeAckResponse';
  value: Uint8Array;
}
/** MsgChannelUpgradeAckResponse defines MsgChannelUpgradeAck response type */
export interface MsgChannelUpgradeAckResponseSDKType {
  result: ResponseResultType;
}
/** MsgChannelUpgradeConfirm defines the request type for the ChannelUpgradeConfirm rpc */
export interface MsgChannelUpgradeConfirm {
  portId: string;
  channelId: string;
  counterpartyChannelState: State;
  counterpartyUpgrade: Upgrade;
  proofChannel: Uint8Array;
  proofUpgrade: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelUpgradeConfirmProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeConfirm';
  value: Uint8Array;
}
/** MsgChannelUpgradeConfirm defines the request type for the ChannelUpgradeConfirm rpc */
export interface MsgChannelUpgradeConfirmSDKType {
  port_id: string;
  channel_id: string;
  counterparty_channel_state: State;
  counterparty_upgrade: UpgradeSDKType;
  proof_channel: Uint8Array;
  proof_upgrade: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgChannelUpgradeConfirmResponse defines MsgChannelUpgradeConfirm response type */
export interface MsgChannelUpgradeConfirmResponse {
  result: ResponseResultType;
}
export interface MsgChannelUpgradeConfirmResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse';
  value: Uint8Array;
}
/** MsgChannelUpgradeConfirmResponse defines MsgChannelUpgradeConfirm response type */
export interface MsgChannelUpgradeConfirmResponseSDKType {
  result: ResponseResultType;
}
/** MsgChannelUpgradeOpen defines the request type for the ChannelUpgradeOpen rpc */
export interface MsgChannelUpgradeOpen {
  portId: string;
  channelId: string;
  counterpartyChannelState: State;
  counterpartyUpgradeSequence: bigint;
  proofChannel: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelUpgradeOpenProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeOpen';
  value: Uint8Array;
}
/** MsgChannelUpgradeOpen defines the request type for the ChannelUpgradeOpen rpc */
export interface MsgChannelUpgradeOpenSDKType {
  port_id: string;
  channel_id: string;
  counterparty_channel_state: State;
  counterparty_upgrade_sequence: bigint;
  proof_channel: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgChannelUpgradeOpenResponse defines the MsgChannelUpgradeOpen response type */
export interface MsgChannelUpgradeOpenResponse {}
export interface MsgChannelUpgradeOpenResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeOpenResponse';
  value: Uint8Array;
}
/** MsgChannelUpgradeOpenResponse defines the MsgChannelUpgradeOpen response type */
export interface MsgChannelUpgradeOpenResponseSDKType {}
/** MsgChannelUpgradeTimeout defines the request type for the ChannelUpgradeTimeout rpc */
export interface MsgChannelUpgradeTimeout {
  portId: string;
  channelId: string;
  counterpartyChannel: Channel;
  proofChannel: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelUpgradeTimeoutProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTimeout';
  value: Uint8Array;
}
/** MsgChannelUpgradeTimeout defines the request type for the ChannelUpgradeTimeout rpc */
export interface MsgChannelUpgradeTimeoutSDKType {
  port_id: string;
  channel_id: string;
  counterparty_channel: ChannelSDKType;
  proof_channel: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgChannelUpgradeTimeoutRepsonse defines the MsgChannelUpgradeTimeout response type */
export interface MsgChannelUpgradeTimeoutResponse {}
export interface MsgChannelUpgradeTimeoutResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse';
  value: Uint8Array;
}
/** MsgChannelUpgradeTimeoutRepsonse defines the MsgChannelUpgradeTimeout response type */
export interface MsgChannelUpgradeTimeoutResponseSDKType {}
/** MsgChannelUpgradeCancel defines the request type for the ChannelUpgradeCancel rpc */
export interface MsgChannelUpgradeCancel {
  portId: string;
  channelId: string;
  errorReceipt: ErrorReceipt;
  proofErrorReceipt: Uint8Array;
  proofHeight: Height;
  signer: string;
}
export interface MsgChannelUpgradeCancelProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeCancel';
  value: Uint8Array;
}
/** MsgChannelUpgradeCancel defines the request type for the ChannelUpgradeCancel rpc */
export interface MsgChannelUpgradeCancelSDKType {
  port_id: string;
  channel_id: string;
  error_receipt: ErrorReceiptSDKType;
  proof_error_receipt: Uint8Array;
  proof_height: HeightSDKType;
  signer: string;
}
/** MsgChannelUpgradeCancelResponse defines the MsgChannelUpgradeCancel response type */
export interface MsgChannelUpgradeCancelResponse {}
export interface MsgChannelUpgradeCancelResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeCancelResponse';
  value: Uint8Array;
}
/** MsgChannelUpgradeCancelResponse defines the MsgChannelUpgradeCancel response type */
export interface MsgChannelUpgradeCancelResponseSDKType {}
/** MsgUpdateParams is the MsgUpdateParams request type. */
export interface MsgUpdateParams {
  /** authority is the address that controls the module (defaults to x/gov unless overwritten). */
  authority: string;
  /**
   * params defines the channel parameters to update.
   *
   * NOTE: All parameters must be supplied.
   */
  params: Params;
}
export interface MsgUpdateParamsProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgUpdateParams';
  value: Uint8Array;
}
/** MsgUpdateParams is the MsgUpdateParams request type. */
export interface MsgUpdateParamsSDKType {
  authority: string;
  params: ParamsSDKType;
}
/** MsgUpdateParamsResponse defines the MsgUpdateParams response type. */
export interface MsgUpdateParamsResponse {}
export interface MsgUpdateParamsResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgUpdateParamsResponse';
  value: Uint8Array;
}
/** MsgUpdateParamsResponse defines the MsgUpdateParams response type. */
export interface MsgUpdateParamsResponseSDKType {}
/** MsgPruneAcknowledgements defines the request type for the PruneAcknowledgements rpc. */
export interface MsgPruneAcknowledgements {
  portId: string;
  channelId: string;
  limit: bigint;
  signer: string;
}
export interface MsgPruneAcknowledgementsProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgPruneAcknowledgements';
  value: Uint8Array;
}
/** MsgPruneAcknowledgements defines the request type for the PruneAcknowledgements rpc. */
export interface MsgPruneAcknowledgementsSDKType {
  port_id: string;
  channel_id: string;
  limit: bigint;
  signer: string;
}
/** MsgPruneAcknowledgementsResponse defines the response type for the PruneAcknowledgements rpc. */
export interface MsgPruneAcknowledgementsResponse {
  /** Number of sequences pruned (includes both packet acknowledgements and packet receipts where appropriate). */
  totalPrunedSequences: bigint;
  /** Number of sequences left after pruning. */
  totalRemainingSequences: bigint;
}
export interface MsgPruneAcknowledgementsResponseProtoMsg {
  typeUrl: '/ibc.core.channel.v1.MsgPruneAcknowledgementsResponse';
  value: Uint8Array;
}
/** MsgPruneAcknowledgementsResponse defines the response type for the PruneAcknowledgements rpc. */
export interface MsgPruneAcknowledgementsResponseSDKType {
  total_pruned_sequences: bigint;
  total_remaining_sequences: bigint;
}
function createBaseMsgChannelOpenInit(): MsgChannelOpenInit {
  return {
    portId: '',
    channel: Channel.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelOpenInit = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInit',
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
export const MsgChannelOpenInitResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenInitResponse',
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
export const MsgChannelOpenTry = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTry',
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
export const MsgChannelOpenTryResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenTryResponse',
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
export const MsgChannelOpenAck = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAck',
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
export const MsgChannelOpenAckResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenAckResponse',
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
export const MsgChannelOpenConfirm = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirm',
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
export const MsgChannelOpenConfirmResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelOpenConfirmResponse',
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
export const MsgChannelCloseInit = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInit',
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
export const MsgChannelCloseInitResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseInitResponse',
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
    counterpartyUpgradeSequence: BigInt(0),
  };
}
export const MsgChannelCloseConfirm = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirm',
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
    if (message.counterpartyUpgradeSequence !== BigInt(0)) {
      writer.uint32(48).uint64(message.counterpartyUpgradeSequence);
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
        case 6:
          message.counterpartyUpgradeSequence = reader.uint64();
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
      counterpartyUpgradeSequence: isSet(object.counterpartyUpgradeSequence)
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0),
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
    message.counterpartyUpgradeSequence !== undefined &&
      (obj.counterpartyUpgradeSequence = (
        message.counterpartyUpgradeSequence || BigInt(0)
      ).toString());
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
    message.counterpartyUpgradeSequence =
      object.counterpartyUpgradeSequence !== undefined &&
      object.counterpartyUpgradeSequence !== null
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0);
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
export const MsgChannelCloseConfirmResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelCloseConfirmResponse',
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
export const MsgRecvPacket = {
  typeUrl: '/ibc.core.channel.v1.MsgRecvPacket',
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
export const MsgRecvPacketResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgRecvPacketResponse',
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
export const MsgTimeout = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeout',
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
export const MsgTimeoutResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutResponse',
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
    counterpartyUpgradeSequence: BigInt(0),
  };
}
export const MsgTimeoutOnClose = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnClose',
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
    if (message.counterpartyUpgradeSequence !== BigInt(0)) {
      writer.uint32(56).uint64(message.counterpartyUpgradeSequence);
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
        case 7:
          message.counterpartyUpgradeSequence = reader.uint64();
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
      counterpartyUpgradeSequence: isSet(object.counterpartyUpgradeSequence)
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0),
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
    message.counterpartyUpgradeSequence !== undefined &&
      (obj.counterpartyUpgradeSequence = (
        message.counterpartyUpgradeSequence || BigInt(0)
      ).toString());
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
    message.counterpartyUpgradeSequence =
      object.counterpartyUpgradeSequence !== undefined &&
      object.counterpartyUpgradeSequence !== null
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0);
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
export const MsgTimeoutOnCloseResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgTimeoutOnCloseResponse',
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
export const MsgAcknowledgement = {
  typeUrl: '/ibc.core.channel.v1.MsgAcknowledgement',
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
export const MsgAcknowledgementResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgAcknowledgementResponse',
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
function createBaseMsgChannelUpgradeInit(): MsgChannelUpgradeInit {
  return {
    portId: '',
    channelId: '',
    fields: UpgradeFields.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelUpgradeInit = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeInit',
  encode(
    message: MsgChannelUpgradeInit,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.fields !== undefined) {
      UpgradeFields.encode(message.fields, writer.uint32(26).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(34).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeInit {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeInit();
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
          message.fields = UpgradeFields.decode(reader, reader.uint32());
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
  fromJSON(object: any): MsgChannelUpgradeInit {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      fields: isSet(object.fields)
        ? UpgradeFields.fromJSON(object.fields)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelUpgradeInit): JsonSafe<MsgChannelUpgradeInit> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.fields !== undefined &&
      (obj.fields = message.fields
        ? UpgradeFields.toJSON(message.fields)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelUpgradeInit>): MsgChannelUpgradeInit {
    const message = createBaseMsgChannelUpgradeInit();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.fields =
      object.fields !== undefined && object.fields !== null
        ? UpgradeFields.fromPartial(object.fields)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelUpgradeInitProtoMsg): MsgChannelUpgradeInit {
    return MsgChannelUpgradeInit.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeInit): Uint8Array {
    return MsgChannelUpgradeInit.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelUpgradeInit): MsgChannelUpgradeInitProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeInit',
      value: MsgChannelUpgradeInit.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeInitResponse(): MsgChannelUpgradeInitResponse {
  return {
    upgrade: Upgrade.fromPartial({}),
    upgradeSequence: BigInt(0),
  };
}
export const MsgChannelUpgradeInitResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeInitResponse',
  encode(
    message: MsgChannelUpgradeInitResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.upgrade !== undefined) {
      Upgrade.encode(message.upgrade, writer.uint32(10).fork()).ldelim();
    }
    if (message.upgradeSequence !== BigInt(0)) {
      writer.uint32(16).uint64(message.upgradeSequence);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeInitResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeInitResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.upgrade = Upgrade.decode(reader, reader.uint32());
          break;
        case 2:
          message.upgradeSequence = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelUpgradeInitResponse {
    return {
      upgrade: isSet(object.upgrade)
        ? Upgrade.fromJSON(object.upgrade)
        : undefined,
      upgradeSequence: isSet(object.upgradeSequence)
        ? BigInt(object.upgradeSequence.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgChannelUpgradeInitResponse,
  ): JsonSafe<MsgChannelUpgradeInitResponse> {
    const obj: any = {};
    message.upgrade !== undefined &&
      (obj.upgrade = message.upgrade
        ? Upgrade.toJSON(message.upgrade)
        : undefined);
    message.upgradeSequence !== undefined &&
      (obj.upgradeSequence = (message.upgradeSequence || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelUpgradeInitResponse>,
  ): MsgChannelUpgradeInitResponse {
    const message = createBaseMsgChannelUpgradeInitResponse();
    message.upgrade =
      object.upgrade !== undefined && object.upgrade !== null
        ? Upgrade.fromPartial(object.upgrade)
        : undefined;
    message.upgradeSequence =
      object.upgradeSequence !== undefined && object.upgradeSequence !== null
        ? BigInt(object.upgradeSequence.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeInitResponseProtoMsg,
  ): MsgChannelUpgradeInitResponse {
    return MsgChannelUpgradeInitResponse.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeInitResponse): Uint8Array {
    return MsgChannelUpgradeInitResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeInitResponse,
  ): MsgChannelUpgradeInitResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeInitResponse',
      value: MsgChannelUpgradeInitResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeTry(): MsgChannelUpgradeTry {
  return {
    portId: '',
    channelId: '',
    proposedUpgradeConnectionHops: [],
    counterpartyUpgradeFields: UpgradeFields.fromPartial({}),
    counterpartyUpgradeSequence: BigInt(0),
    proofChannel: new Uint8Array(),
    proofUpgrade: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelUpgradeTry = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTry',
  encode(
    message: MsgChannelUpgradeTry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    for (const v of message.proposedUpgradeConnectionHops) {
      writer.uint32(26).string(v!);
    }
    if (message.counterpartyUpgradeFields !== undefined) {
      UpgradeFields.encode(
        message.counterpartyUpgradeFields,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    if (message.counterpartyUpgradeSequence !== BigInt(0)) {
      writer.uint32(40).uint64(message.counterpartyUpgradeSequence);
    }
    if (message.proofChannel.length !== 0) {
      writer.uint32(50).bytes(message.proofChannel);
    }
    if (message.proofUpgrade.length !== 0) {
      writer.uint32(58).bytes(message.proofUpgrade);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(66).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(74).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeTry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeTry();
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
          message.proposedUpgradeConnectionHops.push(reader.string());
          break;
        case 4:
          message.counterpartyUpgradeFields = UpgradeFields.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 5:
          message.counterpartyUpgradeSequence = reader.uint64();
          break;
        case 6:
          message.proofChannel = reader.bytes();
          break;
        case 7:
          message.proofUpgrade = reader.bytes();
          break;
        case 8:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 9:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelUpgradeTry {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      proposedUpgradeConnectionHops: Array.isArray(
        object?.proposedUpgradeConnectionHops,
      )
        ? object.proposedUpgradeConnectionHops.map((e: any) => String(e))
        : [],
      counterpartyUpgradeFields: isSet(object.counterpartyUpgradeFields)
        ? UpgradeFields.fromJSON(object.counterpartyUpgradeFields)
        : undefined,
      counterpartyUpgradeSequence: isSet(object.counterpartyUpgradeSequence)
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0),
      proofChannel: isSet(object.proofChannel)
        ? bytesFromBase64(object.proofChannel)
        : new Uint8Array(),
      proofUpgrade: isSet(object.proofUpgrade)
        ? bytesFromBase64(object.proofUpgrade)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelUpgradeTry): JsonSafe<MsgChannelUpgradeTry> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    if (message.proposedUpgradeConnectionHops) {
      obj.proposedUpgradeConnectionHops =
        message.proposedUpgradeConnectionHops.map(e => e);
    } else {
      obj.proposedUpgradeConnectionHops = [];
    }
    message.counterpartyUpgradeFields !== undefined &&
      (obj.counterpartyUpgradeFields = message.counterpartyUpgradeFields
        ? UpgradeFields.toJSON(message.counterpartyUpgradeFields)
        : undefined);
    message.counterpartyUpgradeSequence !== undefined &&
      (obj.counterpartyUpgradeSequence = (
        message.counterpartyUpgradeSequence || BigInt(0)
      ).toString());
    message.proofChannel !== undefined &&
      (obj.proofChannel = base64FromBytes(
        message.proofChannel !== undefined
          ? message.proofChannel
          : new Uint8Array(),
      ));
    message.proofUpgrade !== undefined &&
      (obj.proofUpgrade = base64FromBytes(
        message.proofUpgrade !== undefined
          ? message.proofUpgrade
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelUpgradeTry>): MsgChannelUpgradeTry {
    const message = createBaseMsgChannelUpgradeTry();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.proposedUpgradeConnectionHops =
      object.proposedUpgradeConnectionHops?.map(e => e) || [];
    message.counterpartyUpgradeFields =
      object.counterpartyUpgradeFields !== undefined &&
      object.counterpartyUpgradeFields !== null
        ? UpgradeFields.fromPartial(object.counterpartyUpgradeFields)
        : undefined;
    message.counterpartyUpgradeSequence =
      object.counterpartyUpgradeSequence !== undefined &&
      object.counterpartyUpgradeSequence !== null
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0);
    message.proofChannel = object.proofChannel ?? new Uint8Array();
    message.proofUpgrade = object.proofUpgrade ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelUpgradeTryProtoMsg): MsgChannelUpgradeTry {
    return MsgChannelUpgradeTry.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeTry): Uint8Array {
    return MsgChannelUpgradeTry.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelUpgradeTry): MsgChannelUpgradeTryProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTry',
      value: MsgChannelUpgradeTry.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeTryResponse(): MsgChannelUpgradeTryResponse {
  return {
    upgrade: Upgrade.fromPartial({}),
    upgradeSequence: BigInt(0),
    result: 0,
  };
}
export const MsgChannelUpgradeTryResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTryResponse',
  encode(
    message: MsgChannelUpgradeTryResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.upgrade !== undefined) {
      Upgrade.encode(message.upgrade, writer.uint32(10).fork()).ldelim();
    }
    if (message.upgradeSequence !== BigInt(0)) {
      writer.uint32(16).uint64(message.upgradeSequence);
    }
    if (message.result !== 0) {
      writer.uint32(24).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeTryResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeTryResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.upgrade = Upgrade.decode(reader, reader.uint32());
          break;
        case 2:
          message.upgradeSequence = reader.uint64();
          break;
        case 3:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelUpgradeTryResponse {
    return {
      upgrade: isSet(object.upgrade)
        ? Upgrade.fromJSON(object.upgrade)
        : undefined,
      upgradeSequence: isSet(object.upgradeSequence)
        ? BigInt(object.upgradeSequence.toString())
        : BigInt(0),
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(
    message: MsgChannelUpgradeTryResponse,
  ): JsonSafe<MsgChannelUpgradeTryResponse> {
    const obj: any = {};
    message.upgrade !== undefined &&
      (obj.upgrade = message.upgrade
        ? Upgrade.toJSON(message.upgrade)
        : undefined);
    message.upgradeSequence !== undefined &&
      (obj.upgradeSequence = (message.upgradeSequence || BigInt(0)).toString());
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelUpgradeTryResponse>,
  ): MsgChannelUpgradeTryResponse {
    const message = createBaseMsgChannelUpgradeTryResponse();
    message.upgrade =
      object.upgrade !== undefined && object.upgrade !== null
        ? Upgrade.fromPartial(object.upgrade)
        : undefined;
    message.upgradeSequence =
      object.upgradeSequence !== undefined && object.upgradeSequence !== null
        ? BigInt(object.upgradeSequence.toString())
        : BigInt(0);
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeTryResponseProtoMsg,
  ): MsgChannelUpgradeTryResponse {
    return MsgChannelUpgradeTryResponse.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeTryResponse): Uint8Array {
    return MsgChannelUpgradeTryResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeTryResponse,
  ): MsgChannelUpgradeTryResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTryResponse',
      value: MsgChannelUpgradeTryResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeAck(): MsgChannelUpgradeAck {
  return {
    portId: '',
    channelId: '',
    counterpartyUpgrade: Upgrade.fromPartial({}),
    proofChannel: new Uint8Array(),
    proofUpgrade: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelUpgradeAck = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeAck',
  encode(
    message: MsgChannelUpgradeAck,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.counterpartyUpgrade !== undefined) {
      Upgrade.encode(
        message.counterpartyUpgrade,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.proofChannel.length !== 0) {
      writer.uint32(34).bytes(message.proofChannel);
    }
    if (message.proofUpgrade.length !== 0) {
      writer.uint32(42).bytes(message.proofUpgrade);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(50).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(58).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeAck {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeAck();
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
          message.counterpartyUpgrade = Upgrade.decode(reader, reader.uint32());
          break;
        case 4:
          message.proofChannel = reader.bytes();
          break;
        case 5:
          message.proofUpgrade = reader.bytes();
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
  fromJSON(object: any): MsgChannelUpgradeAck {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      counterpartyUpgrade: isSet(object.counterpartyUpgrade)
        ? Upgrade.fromJSON(object.counterpartyUpgrade)
        : undefined,
      proofChannel: isSet(object.proofChannel)
        ? bytesFromBase64(object.proofChannel)
        : new Uint8Array(),
      proofUpgrade: isSet(object.proofUpgrade)
        ? bytesFromBase64(object.proofUpgrade)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelUpgradeAck): JsonSafe<MsgChannelUpgradeAck> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.counterpartyUpgrade !== undefined &&
      (obj.counterpartyUpgrade = message.counterpartyUpgrade
        ? Upgrade.toJSON(message.counterpartyUpgrade)
        : undefined);
    message.proofChannel !== undefined &&
      (obj.proofChannel = base64FromBytes(
        message.proofChannel !== undefined
          ? message.proofChannel
          : new Uint8Array(),
      ));
    message.proofUpgrade !== undefined &&
      (obj.proofUpgrade = base64FromBytes(
        message.proofUpgrade !== undefined
          ? message.proofUpgrade
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelUpgradeAck>): MsgChannelUpgradeAck {
    const message = createBaseMsgChannelUpgradeAck();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.counterpartyUpgrade =
      object.counterpartyUpgrade !== undefined &&
      object.counterpartyUpgrade !== null
        ? Upgrade.fromPartial(object.counterpartyUpgrade)
        : undefined;
    message.proofChannel = object.proofChannel ?? new Uint8Array();
    message.proofUpgrade = object.proofUpgrade ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelUpgradeAckProtoMsg): MsgChannelUpgradeAck {
    return MsgChannelUpgradeAck.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeAck): Uint8Array {
    return MsgChannelUpgradeAck.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelUpgradeAck): MsgChannelUpgradeAckProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeAck',
      value: MsgChannelUpgradeAck.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeAckResponse(): MsgChannelUpgradeAckResponse {
  return {
    result: 0,
  };
}
export const MsgChannelUpgradeAckResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeAckResponse',
  encode(
    message: MsgChannelUpgradeAckResponse,
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
  ): MsgChannelUpgradeAckResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeAckResponse();
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
  fromJSON(object: any): MsgChannelUpgradeAckResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(
    message: MsgChannelUpgradeAckResponse,
  ): JsonSafe<MsgChannelUpgradeAckResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelUpgradeAckResponse>,
  ): MsgChannelUpgradeAckResponse {
    const message = createBaseMsgChannelUpgradeAckResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeAckResponseProtoMsg,
  ): MsgChannelUpgradeAckResponse {
    return MsgChannelUpgradeAckResponse.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeAckResponse): Uint8Array {
    return MsgChannelUpgradeAckResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeAckResponse,
  ): MsgChannelUpgradeAckResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeAckResponse',
      value: MsgChannelUpgradeAckResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeConfirm(): MsgChannelUpgradeConfirm {
  return {
    portId: '',
    channelId: '',
    counterpartyChannelState: 0,
    counterpartyUpgrade: Upgrade.fromPartial({}),
    proofChannel: new Uint8Array(),
    proofUpgrade: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelUpgradeConfirm = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeConfirm',
  encode(
    message: MsgChannelUpgradeConfirm,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.counterpartyChannelState !== 0) {
      writer.uint32(24).int32(message.counterpartyChannelState);
    }
    if (message.counterpartyUpgrade !== undefined) {
      Upgrade.encode(
        message.counterpartyUpgrade,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    if (message.proofChannel.length !== 0) {
      writer.uint32(42).bytes(message.proofChannel);
    }
    if (message.proofUpgrade.length !== 0) {
      writer.uint32(50).bytes(message.proofUpgrade);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(58).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(66).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeConfirm {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeConfirm();
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
          message.counterpartyChannelState = reader.int32() as any;
          break;
        case 4:
          message.counterpartyUpgrade = Upgrade.decode(reader, reader.uint32());
          break;
        case 5:
          message.proofChannel = reader.bytes();
          break;
        case 6:
          message.proofUpgrade = reader.bytes();
          break;
        case 7:
          message.proofHeight = Height.decode(reader, reader.uint32());
          break;
        case 8:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgChannelUpgradeConfirm {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      counterpartyChannelState: isSet(object.counterpartyChannelState)
        ? stateFromJSON(object.counterpartyChannelState)
        : -1,
      counterpartyUpgrade: isSet(object.counterpartyUpgrade)
        ? Upgrade.fromJSON(object.counterpartyUpgrade)
        : undefined,
      proofChannel: isSet(object.proofChannel)
        ? bytesFromBase64(object.proofChannel)
        : new Uint8Array(),
      proofUpgrade: isSet(object.proofUpgrade)
        ? bytesFromBase64(object.proofUpgrade)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(
    message: MsgChannelUpgradeConfirm,
  ): JsonSafe<MsgChannelUpgradeConfirm> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.counterpartyChannelState !== undefined &&
      (obj.counterpartyChannelState = stateToJSON(
        message.counterpartyChannelState,
      ));
    message.counterpartyUpgrade !== undefined &&
      (obj.counterpartyUpgrade = message.counterpartyUpgrade
        ? Upgrade.toJSON(message.counterpartyUpgrade)
        : undefined);
    message.proofChannel !== undefined &&
      (obj.proofChannel = base64FromBytes(
        message.proofChannel !== undefined
          ? message.proofChannel
          : new Uint8Array(),
      ));
    message.proofUpgrade !== undefined &&
      (obj.proofUpgrade = base64FromBytes(
        message.proofUpgrade !== undefined
          ? message.proofUpgrade
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelUpgradeConfirm>,
  ): MsgChannelUpgradeConfirm {
    const message = createBaseMsgChannelUpgradeConfirm();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.counterpartyChannelState = object.counterpartyChannelState ?? 0;
    message.counterpartyUpgrade =
      object.counterpartyUpgrade !== undefined &&
      object.counterpartyUpgrade !== null
        ? Upgrade.fromPartial(object.counterpartyUpgrade)
        : undefined;
    message.proofChannel = object.proofChannel ?? new Uint8Array();
    message.proofUpgrade = object.proofUpgrade ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeConfirmProtoMsg,
  ): MsgChannelUpgradeConfirm {
    return MsgChannelUpgradeConfirm.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeConfirm): Uint8Array {
    return MsgChannelUpgradeConfirm.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeConfirm,
  ): MsgChannelUpgradeConfirmProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeConfirm',
      value: MsgChannelUpgradeConfirm.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeConfirmResponse(): MsgChannelUpgradeConfirmResponse {
  return {
    result: 0,
  };
}
export const MsgChannelUpgradeConfirmResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse',
  encode(
    message: MsgChannelUpgradeConfirmResponse,
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
  ): MsgChannelUpgradeConfirmResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeConfirmResponse();
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
  fromJSON(object: any): MsgChannelUpgradeConfirmResponse {
    return {
      result: isSet(object.result)
        ? responseResultTypeFromJSON(object.result)
        : -1,
    };
  },
  toJSON(
    message: MsgChannelUpgradeConfirmResponse,
  ): JsonSafe<MsgChannelUpgradeConfirmResponse> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseResultTypeToJSON(message.result));
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelUpgradeConfirmResponse>,
  ): MsgChannelUpgradeConfirmResponse {
    const message = createBaseMsgChannelUpgradeConfirmResponse();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeConfirmResponseProtoMsg,
  ): MsgChannelUpgradeConfirmResponse {
    return MsgChannelUpgradeConfirmResponse.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeConfirmResponse): Uint8Array {
    return MsgChannelUpgradeConfirmResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeConfirmResponse,
  ): MsgChannelUpgradeConfirmResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse',
      value: MsgChannelUpgradeConfirmResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeOpen(): MsgChannelUpgradeOpen {
  return {
    portId: '',
    channelId: '',
    counterpartyChannelState: 0,
    counterpartyUpgradeSequence: BigInt(0),
    proofChannel: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelUpgradeOpen = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeOpen',
  encode(
    message: MsgChannelUpgradeOpen,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.counterpartyChannelState !== 0) {
      writer.uint32(24).int32(message.counterpartyChannelState);
    }
    if (message.counterpartyUpgradeSequence !== BigInt(0)) {
      writer.uint32(32).uint64(message.counterpartyUpgradeSequence);
    }
    if (message.proofChannel.length !== 0) {
      writer.uint32(42).bytes(message.proofChannel);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(50).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(58).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeOpen {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeOpen();
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
          message.counterpartyChannelState = reader.int32() as any;
          break;
        case 4:
          message.counterpartyUpgradeSequence = reader.uint64();
          break;
        case 5:
          message.proofChannel = reader.bytes();
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
  fromJSON(object: any): MsgChannelUpgradeOpen {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      counterpartyChannelState: isSet(object.counterpartyChannelState)
        ? stateFromJSON(object.counterpartyChannelState)
        : -1,
      counterpartyUpgradeSequence: isSet(object.counterpartyUpgradeSequence)
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0),
      proofChannel: isSet(object.proofChannel)
        ? bytesFromBase64(object.proofChannel)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelUpgradeOpen): JsonSafe<MsgChannelUpgradeOpen> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.counterpartyChannelState !== undefined &&
      (obj.counterpartyChannelState = stateToJSON(
        message.counterpartyChannelState,
      ));
    message.counterpartyUpgradeSequence !== undefined &&
      (obj.counterpartyUpgradeSequence = (
        message.counterpartyUpgradeSequence || BigInt(0)
      ).toString());
    message.proofChannel !== undefined &&
      (obj.proofChannel = base64FromBytes(
        message.proofChannel !== undefined
          ? message.proofChannel
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgChannelUpgradeOpen>): MsgChannelUpgradeOpen {
    const message = createBaseMsgChannelUpgradeOpen();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.counterpartyChannelState = object.counterpartyChannelState ?? 0;
    message.counterpartyUpgradeSequence =
      object.counterpartyUpgradeSequence !== undefined &&
      object.counterpartyUpgradeSequence !== null
        ? BigInt(object.counterpartyUpgradeSequence.toString())
        : BigInt(0);
    message.proofChannel = object.proofChannel ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgChannelUpgradeOpenProtoMsg): MsgChannelUpgradeOpen {
    return MsgChannelUpgradeOpen.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeOpen): Uint8Array {
    return MsgChannelUpgradeOpen.encode(message).finish();
  },
  toProtoMsg(message: MsgChannelUpgradeOpen): MsgChannelUpgradeOpenProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeOpen',
      value: MsgChannelUpgradeOpen.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeOpenResponse(): MsgChannelUpgradeOpenResponse {
  return {};
}
export const MsgChannelUpgradeOpenResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeOpenResponse',
  encode(
    _: MsgChannelUpgradeOpenResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeOpenResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeOpenResponse();
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
  fromJSON(_: any): MsgChannelUpgradeOpenResponse {
    return {};
  },
  toJSON(
    _: MsgChannelUpgradeOpenResponse,
  ): JsonSafe<MsgChannelUpgradeOpenResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgChannelUpgradeOpenResponse>,
  ): MsgChannelUpgradeOpenResponse {
    const message = createBaseMsgChannelUpgradeOpenResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeOpenResponseProtoMsg,
  ): MsgChannelUpgradeOpenResponse {
    return MsgChannelUpgradeOpenResponse.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeOpenResponse): Uint8Array {
    return MsgChannelUpgradeOpenResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeOpenResponse,
  ): MsgChannelUpgradeOpenResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeOpenResponse',
      value: MsgChannelUpgradeOpenResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeTimeout(): MsgChannelUpgradeTimeout {
  return {
    portId: '',
    channelId: '',
    counterpartyChannel: Channel.fromPartial({}),
    proofChannel: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelUpgradeTimeout = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTimeout',
  encode(
    message: MsgChannelUpgradeTimeout,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.counterpartyChannel !== undefined) {
      Channel.encode(
        message.counterpartyChannel,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.proofChannel.length !== 0) {
      writer.uint32(34).bytes(message.proofChannel);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(42).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(50).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeTimeout {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeTimeout();
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
          message.counterpartyChannel = Channel.decode(reader, reader.uint32());
          break;
        case 4:
          message.proofChannel = reader.bytes();
          break;
        case 5:
          message.proofHeight = Height.decode(reader, reader.uint32());
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
  fromJSON(object: any): MsgChannelUpgradeTimeout {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      counterpartyChannel: isSet(object.counterpartyChannel)
        ? Channel.fromJSON(object.counterpartyChannel)
        : undefined,
      proofChannel: isSet(object.proofChannel)
        ? bytesFromBase64(object.proofChannel)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(
    message: MsgChannelUpgradeTimeout,
  ): JsonSafe<MsgChannelUpgradeTimeout> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.counterpartyChannel !== undefined &&
      (obj.counterpartyChannel = message.counterpartyChannel
        ? Channel.toJSON(message.counterpartyChannel)
        : undefined);
    message.proofChannel !== undefined &&
      (obj.proofChannel = base64FromBytes(
        message.proofChannel !== undefined
          ? message.proofChannel
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelUpgradeTimeout>,
  ): MsgChannelUpgradeTimeout {
    const message = createBaseMsgChannelUpgradeTimeout();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.counterpartyChannel =
      object.counterpartyChannel !== undefined &&
      object.counterpartyChannel !== null
        ? Channel.fromPartial(object.counterpartyChannel)
        : undefined;
    message.proofChannel = object.proofChannel ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeTimeoutProtoMsg,
  ): MsgChannelUpgradeTimeout {
    return MsgChannelUpgradeTimeout.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeTimeout): Uint8Array {
    return MsgChannelUpgradeTimeout.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeTimeout,
  ): MsgChannelUpgradeTimeoutProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTimeout',
      value: MsgChannelUpgradeTimeout.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeTimeoutResponse(): MsgChannelUpgradeTimeoutResponse {
  return {};
}
export const MsgChannelUpgradeTimeoutResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse',
  encode(
    _: MsgChannelUpgradeTimeoutResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeTimeoutResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeTimeoutResponse();
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
  fromJSON(_: any): MsgChannelUpgradeTimeoutResponse {
    return {};
  },
  toJSON(
    _: MsgChannelUpgradeTimeoutResponse,
  ): JsonSafe<MsgChannelUpgradeTimeoutResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgChannelUpgradeTimeoutResponse>,
  ): MsgChannelUpgradeTimeoutResponse {
    const message = createBaseMsgChannelUpgradeTimeoutResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeTimeoutResponseProtoMsg,
  ): MsgChannelUpgradeTimeoutResponse {
    return MsgChannelUpgradeTimeoutResponse.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeTimeoutResponse): Uint8Array {
    return MsgChannelUpgradeTimeoutResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeTimeoutResponse,
  ): MsgChannelUpgradeTimeoutResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse',
      value: MsgChannelUpgradeTimeoutResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeCancel(): MsgChannelUpgradeCancel {
  return {
    portId: '',
    channelId: '',
    errorReceipt: ErrorReceipt.fromPartial({}),
    proofErrorReceipt: new Uint8Array(),
    proofHeight: Height.fromPartial({}),
    signer: '',
  };
}
export const MsgChannelUpgradeCancel = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeCancel',
  encode(
    message: MsgChannelUpgradeCancel,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.errorReceipt !== undefined) {
      ErrorReceipt.encode(
        message.errorReceipt,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.proofErrorReceipt.length !== 0) {
      writer.uint32(34).bytes(message.proofErrorReceipt);
    }
    if (message.proofHeight !== undefined) {
      Height.encode(message.proofHeight, writer.uint32(42).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(50).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeCancel {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeCancel();
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
          message.errorReceipt = ErrorReceipt.decode(reader, reader.uint32());
          break;
        case 4:
          message.proofErrorReceipt = reader.bytes();
          break;
        case 5:
          message.proofHeight = Height.decode(reader, reader.uint32());
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
  fromJSON(object: any): MsgChannelUpgradeCancel {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      errorReceipt: isSet(object.errorReceipt)
        ? ErrorReceipt.fromJSON(object.errorReceipt)
        : undefined,
      proofErrorReceipt: isSet(object.proofErrorReceipt)
        ? bytesFromBase64(object.proofErrorReceipt)
        : new Uint8Array(),
      proofHeight: isSet(object.proofHeight)
        ? Height.fromJSON(object.proofHeight)
        : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgChannelUpgradeCancel): JsonSafe<MsgChannelUpgradeCancel> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.errorReceipt !== undefined &&
      (obj.errorReceipt = message.errorReceipt
        ? ErrorReceipt.toJSON(message.errorReceipt)
        : undefined);
    message.proofErrorReceipt !== undefined &&
      (obj.proofErrorReceipt = base64FromBytes(
        message.proofErrorReceipt !== undefined
          ? message.proofErrorReceipt
          : new Uint8Array(),
      ));
    message.proofHeight !== undefined &&
      (obj.proofHeight = message.proofHeight
        ? Height.toJSON(message.proofHeight)
        : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(
    object: Partial<MsgChannelUpgradeCancel>,
  ): MsgChannelUpgradeCancel {
    const message = createBaseMsgChannelUpgradeCancel();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.errorReceipt =
      object.errorReceipt !== undefined && object.errorReceipt !== null
        ? ErrorReceipt.fromPartial(object.errorReceipt)
        : undefined;
    message.proofErrorReceipt = object.proofErrorReceipt ?? new Uint8Array();
    message.proofHeight =
      object.proofHeight !== undefined && object.proofHeight !== null
        ? Height.fromPartial(object.proofHeight)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeCancelProtoMsg,
  ): MsgChannelUpgradeCancel {
    return MsgChannelUpgradeCancel.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeCancel): Uint8Array {
    return MsgChannelUpgradeCancel.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeCancel,
  ): MsgChannelUpgradeCancelProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeCancel',
      value: MsgChannelUpgradeCancel.encode(message).finish(),
    };
  },
};
function createBaseMsgChannelUpgradeCancelResponse(): MsgChannelUpgradeCancelResponse {
  return {};
}
export const MsgChannelUpgradeCancelResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeCancelResponse',
  encode(
    _: MsgChannelUpgradeCancelResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgChannelUpgradeCancelResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgChannelUpgradeCancelResponse();
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
  fromJSON(_: any): MsgChannelUpgradeCancelResponse {
    return {};
  },
  toJSON(
    _: MsgChannelUpgradeCancelResponse,
  ): JsonSafe<MsgChannelUpgradeCancelResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgChannelUpgradeCancelResponse>,
  ): MsgChannelUpgradeCancelResponse {
    const message = createBaseMsgChannelUpgradeCancelResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgChannelUpgradeCancelResponseProtoMsg,
  ): MsgChannelUpgradeCancelResponse {
    return MsgChannelUpgradeCancelResponse.decode(message.value);
  },
  toProto(message: MsgChannelUpgradeCancelResponse): Uint8Array {
    return MsgChannelUpgradeCancelResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgChannelUpgradeCancelResponse,
  ): MsgChannelUpgradeCancelResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeCancelResponse',
      value: MsgChannelUpgradeCancelResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParams(): MsgUpdateParams {
  return {
    authority: '',
    params: Params.fromPartial({}),
  };
}
export const MsgUpdateParams = {
  typeUrl: '/ibc.core.channel.v1.MsgUpdateParams',
  encode(
    message: MsgUpdateParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
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
          message.authority = reader.string();
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
      authority: isSet(object.authority) ? String(object.authority) : '',
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams {
    const message = createBaseMsgUpdateParams();
    message.authority = object.authority ?? '';
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
      typeUrl: '/ibc.core.channel.v1.MsgUpdateParams',
      value: MsgUpdateParams.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParamsResponse(): MsgUpdateParamsResponse {
  return {};
}
export const MsgUpdateParamsResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgUpdateParamsResponse',
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
      typeUrl: '/ibc.core.channel.v1.MsgUpdateParamsResponse',
      value: MsgUpdateParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgPruneAcknowledgements(): MsgPruneAcknowledgements {
  return {
    portId: '',
    channelId: '',
    limit: BigInt(0),
    signer: '',
  };
}
export const MsgPruneAcknowledgements = {
  typeUrl: '/ibc.core.channel.v1.MsgPruneAcknowledgements',
  encode(
    message: MsgPruneAcknowledgements,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    if (message.limit !== BigInt(0)) {
      writer.uint32(24).uint64(message.limit);
    }
    if (message.signer !== '') {
      writer.uint32(34).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPruneAcknowledgements {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPruneAcknowledgements();
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
          message.limit = reader.uint64();
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
  fromJSON(object: any): MsgPruneAcknowledgements {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
      limit: isSet(object.limit) ? BigInt(object.limit.toString()) : BigInt(0),
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(
    message: MsgPruneAcknowledgements,
  ): JsonSafe<MsgPruneAcknowledgements> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    message.limit !== undefined &&
      (obj.limit = (message.limit || BigInt(0)).toString());
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(
    object: Partial<MsgPruneAcknowledgements>,
  ): MsgPruneAcknowledgements {
    const message = createBaseMsgPruneAcknowledgements();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    message.limit =
      object.limit !== undefined && object.limit !== null
        ? BigInt(object.limit.toString())
        : BigInt(0);
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgPruneAcknowledgementsProtoMsg,
  ): MsgPruneAcknowledgements {
    return MsgPruneAcknowledgements.decode(message.value);
  },
  toProto(message: MsgPruneAcknowledgements): Uint8Array {
    return MsgPruneAcknowledgements.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPruneAcknowledgements,
  ): MsgPruneAcknowledgementsProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgPruneAcknowledgements',
      value: MsgPruneAcknowledgements.encode(message).finish(),
    };
  },
};
function createBaseMsgPruneAcknowledgementsResponse(): MsgPruneAcknowledgementsResponse {
  return {
    totalPrunedSequences: BigInt(0),
    totalRemainingSequences: BigInt(0),
  };
}
export const MsgPruneAcknowledgementsResponse = {
  typeUrl: '/ibc.core.channel.v1.MsgPruneAcknowledgementsResponse',
  encode(
    message: MsgPruneAcknowledgementsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.totalPrunedSequences !== BigInt(0)) {
      writer.uint32(8).uint64(message.totalPrunedSequences);
    }
    if (message.totalRemainingSequences !== BigInt(0)) {
      writer.uint32(16).uint64(message.totalRemainingSequences);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPruneAcknowledgementsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPruneAcknowledgementsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.totalPrunedSequences = reader.uint64();
          break;
        case 2:
          message.totalRemainingSequences = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPruneAcknowledgementsResponse {
    return {
      totalPrunedSequences: isSet(object.totalPrunedSequences)
        ? BigInt(object.totalPrunedSequences.toString())
        : BigInt(0),
      totalRemainingSequences: isSet(object.totalRemainingSequences)
        ? BigInt(object.totalRemainingSequences.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgPruneAcknowledgementsResponse,
  ): JsonSafe<MsgPruneAcknowledgementsResponse> {
    const obj: any = {};
    message.totalPrunedSequences !== undefined &&
      (obj.totalPrunedSequences = (
        message.totalPrunedSequences || BigInt(0)
      ).toString());
    message.totalRemainingSequences !== undefined &&
      (obj.totalRemainingSequences = (
        message.totalRemainingSequences || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgPruneAcknowledgementsResponse>,
  ): MsgPruneAcknowledgementsResponse {
    const message = createBaseMsgPruneAcknowledgementsResponse();
    message.totalPrunedSequences =
      object.totalPrunedSequences !== undefined &&
      object.totalPrunedSequences !== null
        ? BigInt(object.totalPrunedSequences.toString())
        : BigInt(0);
    message.totalRemainingSequences =
      object.totalRemainingSequences !== undefined &&
      object.totalRemainingSequences !== null
        ? BigInt(object.totalRemainingSequences.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgPruneAcknowledgementsResponseProtoMsg,
  ): MsgPruneAcknowledgementsResponse {
    return MsgPruneAcknowledgementsResponse.decode(message.value);
  },
  toProto(message: MsgPruneAcknowledgementsResponse): Uint8Array {
    return MsgPruneAcknowledgementsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPruneAcknowledgementsResponse,
  ): MsgPruneAcknowledgementsResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.channel.v1.MsgPruneAcknowledgementsResponse',
      value: MsgPruneAcknowledgementsResponse.encode(message).finish(),
    };
  },
};
