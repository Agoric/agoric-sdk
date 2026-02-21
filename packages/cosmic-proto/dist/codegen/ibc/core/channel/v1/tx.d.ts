import { Channel, type ChannelSDKType, Packet, type PacketSDKType, State } from './channel.js';
import { Height, type HeightSDKType, Params, type ParamsSDKType } from '../../client/v1/client.js';
import { UpgradeFields, type UpgradeFieldsSDKType, Upgrade, type UpgradeSDKType, ErrorReceipt, type ErrorReceiptSDKType } from './upgrade.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** ResponseResultType defines the possible outcomes of the execution of a message */
export declare enum ResponseResultType {
    /** RESPONSE_RESULT_TYPE_UNSPECIFIED - Default zero value enumeration */
    RESPONSE_RESULT_TYPE_UNSPECIFIED = 0,
    /** RESPONSE_RESULT_TYPE_NOOP - The message did not call the IBC application callbacks (because, for example, the packet had already been relayed) */
    RESPONSE_RESULT_TYPE_NOOP = 1,
    /** RESPONSE_RESULT_TYPE_SUCCESS - The message was executed successfully */
    RESPONSE_RESULT_TYPE_SUCCESS = 2,
    /** RESPONSE_RESULT_TYPE_FAILURE - The message was executed unsuccessfully */
    RESPONSE_RESULT_TYPE_FAILURE = 3,
    UNRECOGNIZED = -1
}
export declare const ResponseResultTypeSDKType: typeof ResponseResultType;
export declare function responseResultTypeFromJSON(object: any): ResponseResultType;
export declare function responseResultTypeToJSON(object: ResponseResultType): string;
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
 * WARNING: a channel upgrade MUST NOT initialize an upgrade for this channel
 * in the same block as executing this message otherwise the counterparty will
 * be incapable of opening.
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
 * WARNING: a channel upgrade MUST NOT initialize an upgrade for this channel
 * in the same block as executing this message otherwise the counterparty will
 * be incapable of opening.
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
export interface MsgChannelOpenAckResponse {
}
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
export interface MsgChannelOpenAckResponseSDKType {
}
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
export interface MsgChannelOpenConfirmResponse {
}
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
export interface MsgChannelOpenConfirmResponseSDKType {
}
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
export interface MsgChannelCloseInitResponse {
}
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
export interface MsgChannelCloseInitResponseSDKType {
}
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
    counterpartyUpgradeSequence: bigint;
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
    counterparty_upgrade_sequence: bigint;
}
/**
 * MsgChannelCloseConfirmResponse defines the Msg/ChannelCloseConfirm response
 * type.
 * @name MsgChannelCloseConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirmResponse
 */
export interface MsgChannelCloseConfirmResponse {
}
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
export interface MsgChannelCloseConfirmResponseSDKType {
}
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
    counterpartyUpgradeSequence: bigint;
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
    counterparty_upgrade_sequence: bigint;
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
/**
 * MsgChannelUpgradeInit defines the request type for the ChannelUpgradeInit rpc
 * WARNING: Initializing a channel upgrade in the same block as opening the channel
 * may result in the counterparty being incapable of opening.
 * @name MsgChannelUpgradeInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeInit
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
 * @name MsgChannelUpgradeInitSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeInit
 */
export interface MsgChannelUpgradeInitSDKType {
    port_id: string;
    channel_id: string;
    fields: UpgradeFieldsSDKType;
    signer: string;
}
/**
 * MsgChannelUpgradeInitResponse defines the MsgChannelUpgradeInit response type
 * @name MsgChannelUpgradeInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeInitResponse
 */
export interface MsgChannelUpgradeInitResponse {
    upgrade: Upgrade;
    upgradeSequence: bigint;
}
export interface MsgChannelUpgradeInitResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeInitResponse';
    value: Uint8Array;
}
/**
 * MsgChannelUpgradeInitResponse defines the MsgChannelUpgradeInit response type
 * @name MsgChannelUpgradeInitResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeInitResponse
 */
export interface MsgChannelUpgradeInitResponseSDKType {
    upgrade: UpgradeSDKType;
    upgrade_sequence: bigint;
}
/**
 * MsgChannelUpgradeTry defines the request type for the ChannelUpgradeTry rpc
 * @name MsgChannelUpgradeTry
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTry
 */
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
/**
 * MsgChannelUpgradeTry defines the request type for the ChannelUpgradeTry rpc
 * @name MsgChannelUpgradeTrySDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTry
 */
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
/**
 * MsgChannelUpgradeTryResponse defines the MsgChannelUpgradeTry response type
 * @name MsgChannelUpgradeTryResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTryResponse
 */
export interface MsgChannelUpgradeTryResponse {
    upgrade: Upgrade;
    upgradeSequence: bigint;
    result: ResponseResultType;
}
export interface MsgChannelUpgradeTryResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTryResponse';
    value: Uint8Array;
}
/**
 * MsgChannelUpgradeTryResponse defines the MsgChannelUpgradeTry response type
 * @name MsgChannelUpgradeTryResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTryResponse
 */
export interface MsgChannelUpgradeTryResponseSDKType {
    upgrade: UpgradeSDKType;
    upgrade_sequence: bigint;
    result: ResponseResultType;
}
/**
 * MsgChannelUpgradeAck defines the request type for the ChannelUpgradeAck rpc
 * @name MsgChannelUpgradeAck
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeAck
 */
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
/**
 * MsgChannelUpgradeAck defines the request type for the ChannelUpgradeAck rpc
 * @name MsgChannelUpgradeAckSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeAck
 */
export interface MsgChannelUpgradeAckSDKType {
    port_id: string;
    channel_id: string;
    counterparty_upgrade: UpgradeSDKType;
    proof_channel: Uint8Array;
    proof_upgrade: Uint8Array;
    proof_height: HeightSDKType;
    signer: string;
}
/**
 * MsgChannelUpgradeAckResponse defines MsgChannelUpgradeAck response type
 * @name MsgChannelUpgradeAckResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeAckResponse
 */
export interface MsgChannelUpgradeAckResponse {
    result: ResponseResultType;
}
export interface MsgChannelUpgradeAckResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeAckResponse';
    value: Uint8Array;
}
/**
 * MsgChannelUpgradeAckResponse defines MsgChannelUpgradeAck response type
 * @name MsgChannelUpgradeAckResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeAckResponse
 */
export interface MsgChannelUpgradeAckResponseSDKType {
    result: ResponseResultType;
}
/**
 * MsgChannelUpgradeConfirm defines the request type for the ChannelUpgradeConfirm rpc
 * @name MsgChannelUpgradeConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeConfirm
 */
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
/**
 * MsgChannelUpgradeConfirm defines the request type for the ChannelUpgradeConfirm rpc
 * @name MsgChannelUpgradeConfirmSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeConfirm
 */
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
/**
 * MsgChannelUpgradeConfirmResponse defines MsgChannelUpgradeConfirm response type
 * @name MsgChannelUpgradeConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse
 */
export interface MsgChannelUpgradeConfirmResponse {
    result: ResponseResultType;
}
export interface MsgChannelUpgradeConfirmResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse';
    value: Uint8Array;
}
/**
 * MsgChannelUpgradeConfirmResponse defines MsgChannelUpgradeConfirm response type
 * @name MsgChannelUpgradeConfirmResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse
 */
export interface MsgChannelUpgradeConfirmResponseSDKType {
    result: ResponseResultType;
}
/**
 * MsgChannelUpgradeOpen defines the request type for the ChannelUpgradeOpen rpc
 * @name MsgChannelUpgradeOpen
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeOpen
 */
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
/**
 * MsgChannelUpgradeOpen defines the request type for the ChannelUpgradeOpen rpc
 * @name MsgChannelUpgradeOpenSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeOpen
 */
export interface MsgChannelUpgradeOpenSDKType {
    port_id: string;
    channel_id: string;
    counterparty_channel_state: State;
    counterparty_upgrade_sequence: bigint;
    proof_channel: Uint8Array;
    proof_height: HeightSDKType;
    signer: string;
}
/**
 * MsgChannelUpgradeOpenResponse defines the MsgChannelUpgradeOpen response type
 * @name MsgChannelUpgradeOpenResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeOpenResponse
 */
export interface MsgChannelUpgradeOpenResponse {
}
export interface MsgChannelUpgradeOpenResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeOpenResponse';
    value: Uint8Array;
}
/**
 * MsgChannelUpgradeOpenResponse defines the MsgChannelUpgradeOpen response type
 * @name MsgChannelUpgradeOpenResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeOpenResponse
 */
export interface MsgChannelUpgradeOpenResponseSDKType {
}
/**
 * MsgChannelUpgradeTimeout defines the request type for the ChannelUpgradeTimeout rpc
 * @name MsgChannelUpgradeTimeout
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTimeout
 */
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
/**
 * MsgChannelUpgradeTimeout defines the request type for the ChannelUpgradeTimeout rpc
 * @name MsgChannelUpgradeTimeoutSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTimeout
 */
export interface MsgChannelUpgradeTimeoutSDKType {
    port_id: string;
    channel_id: string;
    counterparty_channel: ChannelSDKType;
    proof_channel: Uint8Array;
    proof_height: HeightSDKType;
    signer: string;
}
/**
 * MsgChannelUpgradeTimeoutRepsonse defines the MsgChannelUpgradeTimeout response type
 * @name MsgChannelUpgradeTimeoutResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse
 */
export interface MsgChannelUpgradeTimeoutResponse {
}
export interface MsgChannelUpgradeTimeoutResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse';
    value: Uint8Array;
}
/**
 * MsgChannelUpgradeTimeoutRepsonse defines the MsgChannelUpgradeTimeout response type
 * @name MsgChannelUpgradeTimeoutResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse
 */
export interface MsgChannelUpgradeTimeoutResponseSDKType {
}
/**
 * MsgChannelUpgradeCancel defines the request type for the ChannelUpgradeCancel rpc
 * @name MsgChannelUpgradeCancel
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeCancel
 */
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
/**
 * MsgChannelUpgradeCancel defines the request type for the ChannelUpgradeCancel rpc
 * @name MsgChannelUpgradeCancelSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeCancel
 */
export interface MsgChannelUpgradeCancelSDKType {
    port_id: string;
    channel_id: string;
    error_receipt: ErrorReceiptSDKType;
    proof_error_receipt: Uint8Array;
    proof_height: HeightSDKType;
    signer: string;
}
/**
 * MsgChannelUpgradeCancelResponse defines the MsgChannelUpgradeCancel response type
 * @name MsgChannelUpgradeCancelResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeCancelResponse
 */
export interface MsgChannelUpgradeCancelResponse {
}
export interface MsgChannelUpgradeCancelResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgChannelUpgradeCancelResponse';
    value: Uint8Array;
}
/**
 * MsgChannelUpgradeCancelResponse defines the MsgChannelUpgradeCancel response type
 * @name MsgChannelUpgradeCancelResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeCancelResponse
 */
export interface MsgChannelUpgradeCancelResponseSDKType {
}
/**
 * MsgUpdateParams is the MsgUpdateParams request type.
 * @name MsgUpdateParams
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
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
/**
 * MsgUpdateParams is the MsgUpdateParams request type.
 * @name MsgUpdateParamsSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    authority: string;
    params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgPruneAcknowledgements defines the request type for the PruneAcknowledgements rpc.
 * @name MsgPruneAcknowledgements
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgPruneAcknowledgements
 */
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
/**
 * MsgPruneAcknowledgements defines the request type for the PruneAcknowledgements rpc.
 * @name MsgPruneAcknowledgementsSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgPruneAcknowledgements
 */
export interface MsgPruneAcknowledgementsSDKType {
    port_id: string;
    channel_id: string;
    limit: bigint;
    signer: string;
}
/**
 * MsgPruneAcknowledgementsResponse defines the response type for the PruneAcknowledgements rpc.
 * @name MsgPruneAcknowledgementsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgPruneAcknowledgementsResponse
 */
export interface MsgPruneAcknowledgementsResponse {
    /**
     * Number of sequences pruned (includes both packet acknowledgements and packet receipts where appropriate).
     */
    totalPrunedSequences: bigint;
    /**
     * Number of sequences left after pruning.
     */
    totalRemainingSequences: bigint;
}
export interface MsgPruneAcknowledgementsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.MsgPruneAcknowledgementsResponse';
    value: Uint8Array;
}
/**
 * MsgPruneAcknowledgementsResponse defines the response type for the PruneAcknowledgements rpc.
 * @name MsgPruneAcknowledgementsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgPruneAcknowledgementsResponse
 */
export interface MsgPruneAcknowledgementsResponseSDKType {
    total_pruned_sequences: bigint;
    total_remaining_sequences: bigint;
}
/**
 * MsgChannelOpenInit defines an sdk.Msg to initialize a channel handshake. It
 * is called by a relayer on Chain A.
 * @name MsgChannelOpenInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInit
 */
export declare const MsgChannelOpenInit: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenInit";
    aminoType: "cosmos-sdk/MsgChannelOpenInit";
    is(o: any): o is MsgChannelOpenInit;
    isSDK(o: any): o is MsgChannelOpenInitSDKType;
    encode(message: MsgChannelOpenInit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenInit;
    fromJSON(object: any): MsgChannelOpenInit;
    toJSON(message: MsgChannelOpenInit): JsonSafe<MsgChannelOpenInit>;
    fromPartial(object: Partial<MsgChannelOpenInit>): MsgChannelOpenInit;
    fromProtoMsg(message: MsgChannelOpenInitProtoMsg): MsgChannelOpenInit;
    toProto(message: MsgChannelOpenInit): Uint8Array;
    toProtoMsg(message: MsgChannelOpenInit): MsgChannelOpenInitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelOpenInitResponse defines the Msg/ChannelOpenInit response type.
 * @name MsgChannelOpenInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenInitResponse
 */
export declare const MsgChannelOpenInitResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenInitResponse";
    aminoType: "cosmos-sdk/MsgChannelOpenInitResponse";
    is(o: any): o is MsgChannelOpenInitResponse;
    isSDK(o: any): o is MsgChannelOpenInitResponseSDKType;
    encode(message: MsgChannelOpenInitResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenInitResponse;
    fromJSON(object: any): MsgChannelOpenInitResponse;
    toJSON(message: MsgChannelOpenInitResponse): JsonSafe<MsgChannelOpenInitResponse>;
    fromPartial(object: Partial<MsgChannelOpenInitResponse>): MsgChannelOpenInitResponse;
    fromProtoMsg(message: MsgChannelOpenInitResponseProtoMsg): MsgChannelOpenInitResponse;
    toProto(message: MsgChannelOpenInitResponse): Uint8Array;
    toProtoMsg(message: MsgChannelOpenInitResponse): MsgChannelOpenInitResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelOpenInit defines a msg sent by a Relayer to try to open a channel
 * on Chain B. The version field within the Channel field has been deprecated. Its
 * value will be ignored by core IBC.
 * @name MsgChannelOpenTry
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTry
 */
export declare const MsgChannelOpenTry: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenTry";
    aminoType: "cosmos-sdk/MsgChannelOpenTry";
    is(o: any): o is MsgChannelOpenTry;
    isSDK(o: any): o is MsgChannelOpenTrySDKType;
    encode(message: MsgChannelOpenTry, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenTry;
    fromJSON(object: any): MsgChannelOpenTry;
    toJSON(message: MsgChannelOpenTry): JsonSafe<MsgChannelOpenTry>;
    fromPartial(object: Partial<MsgChannelOpenTry>): MsgChannelOpenTry;
    fromProtoMsg(message: MsgChannelOpenTryProtoMsg): MsgChannelOpenTry;
    toProto(message: MsgChannelOpenTry): Uint8Array;
    toProtoMsg(message: MsgChannelOpenTry): MsgChannelOpenTryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelOpenTryResponse defines the Msg/ChannelOpenTry response type.
 * @name MsgChannelOpenTryResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenTryResponse
 */
export declare const MsgChannelOpenTryResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenTryResponse";
    aminoType: "cosmos-sdk/MsgChannelOpenTryResponse";
    is(o: any): o is MsgChannelOpenTryResponse;
    isSDK(o: any): o is MsgChannelOpenTryResponseSDKType;
    encode(message: MsgChannelOpenTryResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenTryResponse;
    fromJSON(object: any): MsgChannelOpenTryResponse;
    toJSON(message: MsgChannelOpenTryResponse): JsonSafe<MsgChannelOpenTryResponse>;
    fromPartial(object: Partial<MsgChannelOpenTryResponse>): MsgChannelOpenTryResponse;
    fromProtoMsg(message: MsgChannelOpenTryResponseProtoMsg): MsgChannelOpenTryResponse;
    toProto(message: MsgChannelOpenTryResponse): Uint8Array;
    toProtoMsg(message: MsgChannelOpenTryResponse): MsgChannelOpenTryResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelOpenAck defines a msg sent by a Relayer to Chain A to acknowledge
 * the change of channel state to TRYOPEN on Chain B.
 * WARNING: a channel upgrade MUST NOT initialize an upgrade for this channel
 * in the same block as executing this message otherwise the counterparty will
 * be incapable of opening.
 * @name MsgChannelOpenAck
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAck
 */
export declare const MsgChannelOpenAck: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenAck";
    aminoType: "cosmos-sdk/MsgChannelOpenAck";
    is(o: any): o is MsgChannelOpenAck;
    isSDK(o: any): o is MsgChannelOpenAckSDKType;
    encode(message: MsgChannelOpenAck, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenAck;
    fromJSON(object: any): MsgChannelOpenAck;
    toJSON(message: MsgChannelOpenAck): JsonSafe<MsgChannelOpenAck>;
    fromPartial(object: Partial<MsgChannelOpenAck>): MsgChannelOpenAck;
    fromProtoMsg(message: MsgChannelOpenAckProtoMsg): MsgChannelOpenAck;
    toProto(message: MsgChannelOpenAck): Uint8Array;
    toProtoMsg(message: MsgChannelOpenAck): MsgChannelOpenAckProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelOpenAckResponse defines the Msg/ChannelOpenAck response type.
 * @name MsgChannelOpenAckResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenAckResponse
 */
export declare const MsgChannelOpenAckResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenAckResponse";
    aminoType: "cosmos-sdk/MsgChannelOpenAckResponse";
    is(o: any): o is MsgChannelOpenAckResponse;
    isSDK(o: any): o is MsgChannelOpenAckResponseSDKType;
    encode(_: MsgChannelOpenAckResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenAckResponse;
    fromJSON(_: any): MsgChannelOpenAckResponse;
    toJSON(_: MsgChannelOpenAckResponse): JsonSafe<MsgChannelOpenAckResponse>;
    fromPartial(_: Partial<MsgChannelOpenAckResponse>): MsgChannelOpenAckResponse;
    fromProtoMsg(message: MsgChannelOpenAckResponseProtoMsg): MsgChannelOpenAckResponse;
    toProto(message: MsgChannelOpenAckResponse): Uint8Array;
    toProtoMsg(message: MsgChannelOpenAckResponse): MsgChannelOpenAckResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelOpenConfirm defines a msg sent by a Relayer to Chain B to
 * acknowledge the change of channel state to OPEN on Chain A.
 * @name MsgChannelOpenConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirm
 */
export declare const MsgChannelOpenConfirm: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenConfirm";
    aminoType: "cosmos-sdk/MsgChannelOpenConfirm";
    is(o: any): o is MsgChannelOpenConfirm;
    isSDK(o: any): o is MsgChannelOpenConfirmSDKType;
    encode(message: MsgChannelOpenConfirm, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenConfirm;
    fromJSON(object: any): MsgChannelOpenConfirm;
    toJSON(message: MsgChannelOpenConfirm): JsonSafe<MsgChannelOpenConfirm>;
    fromPartial(object: Partial<MsgChannelOpenConfirm>): MsgChannelOpenConfirm;
    fromProtoMsg(message: MsgChannelOpenConfirmProtoMsg): MsgChannelOpenConfirm;
    toProto(message: MsgChannelOpenConfirm): Uint8Array;
    toProtoMsg(message: MsgChannelOpenConfirm): MsgChannelOpenConfirmProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelOpenConfirmResponse defines the Msg/ChannelOpenConfirm response
 * type.
 * @name MsgChannelOpenConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelOpenConfirmResponse
 */
export declare const MsgChannelOpenConfirmResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelOpenConfirmResponse";
    aminoType: "cosmos-sdk/MsgChannelOpenConfirmResponse";
    is(o: any): o is MsgChannelOpenConfirmResponse;
    isSDK(o: any): o is MsgChannelOpenConfirmResponseSDKType;
    encode(_: MsgChannelOpenConfirmResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelOpenConfirmResponse;
    fromJSON(_: any): MsgChannelOpenConfirmResponse;
    toJSON(_: MsgChannelOpenConfirmResponse): JsonSafe<MsgChannelOpenConfirmResponse>;
    fromPartial(_: Partial<MsgChannelOpenConfirmResponse>): MsgChannelOpenConfirmResponse;
    fromProtoMsg(message: MsgChannelOpenConfirmResponseProtoMsg): MsgChannelOpenConfirmResponse;
    toProto(message: MsgChannelOpenConfirmResponse): Uint8Array;
    toProtoMsg(message: MsgChannelOpenConfirmResponse): MsgChannelOpenConfirmResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelCloseInit defines a msg sent by a Relayer to Chain A
 * to close a channel with Chain B.
 * @name MsgChannelCloseInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInit
 */
export declare const MsgChannelCloseInit: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelCloseInit";
    aminoType: "cosmos-sdk/MsgChannelCloseInit";
    is(o: any): o is MsgChannelCloseInit;
    isSDK(o: any): o is MsgChannelCloseInitSDKType;
    encode(message: MsgChannelCloseInit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelCloseInit;
    fromJSON(object: any): MsgChannelCloseInit;
    toJSON(message: MsgChannelCloseInit): JsonSafe<MsgChannelCloseInit>;
    fromPartial(object: Partial<MsgChannelCloseInit>): MsgChannelCloseInit;
    fromProtoMsg(message: MsgChannelCloseInitProtoMsg): MsgChannelCloseInit;
    toProto(message: MsgChannelCloseInit): Uint8Array;
    toProtoMsg(message: MsgChannelCloseInit): MsgChannelCloseInitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelCloseInitResponse defines the Msg/ChannelCloseInit response type.
 * @name MsgChannelCloseInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseInitResponse
 */
export declare const MsgChannelCloseInitResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelCloseInitResponse";
    aminoType: "cosmos-sdk/MsgChannelCloseInitResponse";
    is(o: any): o is MsgChannelCloseInitResponse;
    isSDK(o: any): o is MsgChannelCloseInitResponseSDKType;
    encode(_: MsgChannelCloseInitResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelCloseInitResponse;
    fromJSON(_: any): MsgChannelCloseInitResponse;
    toJSON(_: MsgChannelCloseInitResponse): JsonSafe<MsgChannelCloseInitResponse>;
    fromPartial(_: Partial<MsgChannelCloseInitResponse>): MsgChannelCloseInitResponse;
    fromProtoMsg(message: MsgChannelCloseInitResponseProtoMsg): MsgChannelCloseInitResponse;
    toProto(message: MsgChannelCloseInitResponse): Uint8Array;
    toProtoMsg(message: MsgChannelCloseInitResponse): MsgChannelCloseInitResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelCloseConfirm defines a msg sent by a Relayer to Chain B
 * to acknowledge the change of channel state to CLOSED on Chain A.
 * @name MsgChannelCloseConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirm
 */
export declare const MsgChannelCloseConfirm: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelCloseConfirm";
    aminoType: "cosmos-sdk/MsgChannelCloseConfirm";
    is(o: any): o is MsgChannelCloseConfirm;
    isSDK(o: any): o is MsgChannelCloseConfirmSDKType;
    encode(message: MsgChannelCloseConfirm, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelCloseConfirm;
    fromJSON(object: any): MsgChannelCloseConfirm;
    toJSON(message: MsgChannelCloseConfirm): JsonSafe<MsgChannelCloseConfirm>;
    fromPartial(object: Partial<MsgChannelCloseConfirm>): MsgChannelCloseConfirm;
    fromProtoMsg(message: MsgChannelCloseConfirmProtoMsg): MsgChannelCloseConfirm;
    toProto(message: MsgChannelCloseConfirm): Uint8Array;
    toProtoMsg(message: MsgChannelCloseConfirm): MsgChannelCloseConfirmProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelCloseConfirmResponse defines the Msg/ChannelCloseConfirm response
 * type.
 * @name MsgChannelCloseConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelCloseConfirmResponse
 */
export declare const MsgChannelCloseConfirmResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelCloseConfirmResponse";
    aminoType: "cosmos-sdk/MsgChannelCloseConfirmResponse";
    is(o: any): o is MsgChannelCloseConfirmResponse;
    isSDK(o: any): o is MsgChannelCloseConfirmResponseSDKType;
    encode(_: MsgChannelCloseConfirmResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelCloseConfirmResponse;
    fromJSON(_: any): MsgChannelCloseConfirmResponse;
    toJSON(_: MsgChannelCloseConfirmResponse): JsonSafe<MsgChannelCloseConfirmResponse>;
    fromPartial(_: Partial<MsgChannelCloseConfirmResponse>): MsgChannelCloseConfirmResponse;
    fromProtoMsg(message: MsgChannelCloseConfirmResponseProtoMsg): MsgChannelCloseConfirmResponse;
    toProto(message: MsgChannelCloseConfirmResponse): Uint8Array;
    toProtoMsg(message: MsgChannelCloseConfirmResponse): MsgChannelCloseConfirmResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRecvPacket receives incoming IBC packet
 * @name MsgRecvPacket
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacket
 */
export declare const MsgRecvPacket: {
    typeUrl: "/ibc.core.channel.v1.MsgRecvPacket";
    aminoType: "cosmos-sdk/MsgRecvPacket";
    is(o: any): o is MsgRecvPacket;
    isSDK(o: any): o is MsgRecvPacketSDKType;
    encode(message: MsgRecvPacket, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRecvPacket;
    fromJSON(object: any): MsgRecvPacket;
    toJSON(message: MsgRecvPacket): JsonSafe<MsgRecvPacket>;
    fromPartial(object: Partial<MsgRecvPacket>): MsgRecvPacket;
    fromProtoMsg(message: MsgRecvPacketProtoMsg): MsgRecvPacket;
    toProto(message: MsgRecvPacket): Uint8Array;
    toProtoMsg(message: MsgRecvPacket): MsgRecvPacketProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRecvPacketResponse defines the Msg/RecvPacket response type.
 * @name MsgRecvPacketResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgRecvPacketResponse
 */
export declare const MsgRecvPacketResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgRecvPacketResponse";
    aminoType: "cosmos-sdk/MsgRecvPacketResponse";
    is(o: any): o is MsgRecvPacketResponse;
    isSDK(o: any): o is MsgRecvPacketResponseSDKType;
    encode(message: MsgRecvPacketResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRecvPacketResponse;
    fromJSON(object: any): MsgRecvPacketResponse;
    toJSON(message: MsgRecvPacketResponse): JsonSafe<MsgRecvPacketResponse>;
    fromPartial(object: Partial<MsgRecvPacketResponse>): MsgRecvPacketResponse;
    fromProtoMsg(message: MsgRecvPacketResponseProtoMsg): MsgRecvPacketResponse;
    toProto(message: MsgRecvPacketResponse): Uint8Array;
    toProtoMsg(message: MsgRecvPacketResponse): MsgRecvPacketResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgTimeout receives timed-out packet
 * @name MsgTimeout
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeout
 */
export declare const MsgTimeout: {
    typeUrl: "/ibc.core.channel.v1.MsgTimeout";
    aminoType: "cosmos-sdk/MsgTimeout";
    is(o: any): o is MsgTimeout;
    isSDK(o: any): o is MsgTimeoutSDKType;
    encode(message: MsgTimeout, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTimeout;
    fromJSON(object: any): MsgTimeout;
    toJSON(message: MsgTimeout): JsonSafe<MsgTimeout>;
    fromPartial(object: Partial<MsgTimeout>): MsgTimeout;
    fromProtoMsg(message: MsgTimeoutProtoMsg): MsgTimeout;
    toProto(message: MsgTimeout): Uint8Array;
    toProtoMsg(message: MsgTimeout): MsgTimeoutProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgTimeoutResponse defines the Msg/Timeout response type.
 * @name MsgTimeoutResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutResponse
 */
export declare const MsgTimeoutResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgTimeoutResponse";
    aminoType: "cosmos-sdk/MsgTimeoutResponse";
    is(o: any): o is MsgTimeoutResponse;
    isSDK(o: any): o is MsgTimeoutResponseSDKType;
    encode(message: MsgTimeoutResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTimeoutResponse;
    fromJSON(object: any): MsgTimeoutResponse;
    toJSON(message: MsgTimeoutResponse): JsonSafe<MsgTimeoutResponse>;
    fromPartial(object: Partial<MsgTimeoutResponse>): MsgTimeoutResponse;
    fromProtoMsg(message: MsgTimeoutResponseProtoMsg): MsgTimeoutResponse;
    toProto(message: MsgTimeoutResponse): Uint8Array;
    toProtoMsg(message: MsgTimeoutResponse): MsgTimeoutResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgTimeoutOnClose timed-out packet upon counterparty channel closure.
 * @name MsgTimeoutOnClose
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnClose
 */
export declare const MsgTimeoutOnClose: {
    typeUrl: "/ibc.core.channel.v1.MsgTimeoutOnClose";
    aminoType: "cosmos-sdk/MsgTimeoutOnClose";
    is(o: any): o is MsgTimeoutOnClose;
    isSDK(o: any): o is MsgTimeoutOnCloseSDKType;
    encode(message: MsgTimeoutOnClose, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTimeoutOnClose;
    fromJSON(object: any): MsgTimeoutOnClose;
    toJSON(message: MsgTimeoutOnClose): JsonSafe<MsgTimeoutOnClose>;
    fromPartial(object: Partial<MsgTimeoutOnClose>): MsgTimeoutOnClose;
    fromProtoMsg(message: MsgTimeoutOnCloseProtoMsg): MsgTimeoutOnClose;
    toProto(message: MsgTimeoutOnClose): Uint8Array;
    toProtoMsg(message: MsgTimeoutOnClose): MsgTimeoutOnCloseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgTimeoutOnCloseResponse defines the Msg/TimeoutOnClose response type.
 * @name MsgTimeoutOnCloseResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgTimeoutOnCloseResponse
 */
export declare const MsgTimeoutOnCloseResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgTimeoutOnCloseResponse";
    aminoType: "cosmos-sdk/MsgTimeoutOnCloseResponse";
    is(o: any): o is MsgTimeoutOnCloseResponse;
    isSDK(o: any): o is MsgTimeoutOnCloseResponseSDKType;
    encode(message: MsgTimeoutOnCloseResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTimeoutOnCloseResponse;
    fromJSON(object: any): MsgTimeoutOnCloseResponse;
    toJSON(message: MsgTimeoutOnCloseResponse): JsonSafe<MsgTimeoutOnCloseResponse>;
    fromPartial(object: Partial<MsgTimeoutOnCloseResponse>): MsgTimeoutOnCloseResponse;
    fromProtoMsg(message: MsgTimeoutOnCloseResponseProtoMsg): MsgTimeoutOnCloseResponse;
    toProto(message: MsgTimeoutOnCloseResponse): Uint8Array;
    toProtoMsg(message: MsgTimeoutOnCloseResponse): MsgTimeoutOnCloseResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgAcknowledgement receives incoming IBC acknowledgement
 * @name MsgAcknowledgement
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgement
 */
export declare const MsgAcknowledgement: {
    typeUrl: "/ibc.core.channel.v1.MsgAcknowledgement";
    aminoType: "cosmos-sdk/MsgAcknowledgement";
    is(o: any): o is MsgAcknowledgement;
    isSDK(o: any): o is MsgAcknowledgementSDKType;
    encode(message: MsgAcknowledgement, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAcknowledgement;
    fromJSON(object: any): MsgAcknowledgement;
    toJSON(message: MsgAcknowledgement): JsonSafe<MsgAcknowledgement>;
    fromPartial(object: Partial<MsgAcknowledgement>): MsgAcknowledgement;
    fromProtoMsg(message: MsgAcknowledgementProtoMsg): MsgAcknowledgement;
    toProto(message: MsgAcknowledgement): Uint8Array;
    toProtoMsg(message: MsgAcknowledgement): MsgAcknowledgementProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgAcknowledgementResponse defines the Msg/Acknowledgement response type.
 * @name MsgAcknowledgementResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgAcknowledgementResponse
 */
export declare const MsgAcknowledgementResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgAcknowledgementResponse";
    aminoType: "cosmos-sdk/MsgAcknowledgementResponse";
    is(o: any): o is MsgAcknowledgementResponse;
    isSDK(o: any): o is MsgAcknowledgementResponseSDKType;
    encode(message: MsgAcknowledgementResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAcknowledgementResponse;
    fromJSON(object: any): MsgAcknowledgementResponse;
    toJSON(message: MsgAcknowledgementResponse): JsonSafe<MsgAcknowledgementResponse>;
    fromPartial(object: Partial<MsgAcknowledgementResponse>): MsgAcknowledgementResponse;
    fromProtoMsg(message: MsgAcknowledgementResponseProtoMsg): MsgAcknowledgementResponse;
    toProto(message: MsgAcknowledgementResponse): Uint8Array;
    toProtoMsg(message: MsgAcknowledgementResponse): MsgAcknowledgementResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeInit defines the request type for the ChannelUpgradeInit rpc
 * WARNING: Initializing a channel upgrade in the same block as opening the channel
 * may result in the counterparty being incapable of opening.
 * @name MsgChannelUpgradeInit
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeInit
 */
export declare const MsgChannelUpgradeInit: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeInit";
    aminoType: "cosmos-sdk/MsgChannelUpgradeInit";
    is(o: any): o is MsgChannelUpgradeInit;
    isSDK(o: any): o is MsgChannelUpgradeInitSDKType;
    encode(message: MsgChannelUpgradeInit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeInit;
    fromJSON(object: any): MsgChannelUpgradeInit;
    toJSON(message: MsgChannelUpgradeInit): JsonSafe<MsgChannelUpgradeInit>;
    fromPartial(object: Partial<MsgChannelUpgradeInit>): MsgChannelUpgradeInit;
    fromProtoMsg(message: MsgChannelUpgradeInitProtoMsg): MsgChannelUpgradeInit;
    toProto(message: MsgChannelUpgradeInit): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeInit): MsgChannelUpgradeInitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeInitResponse defines the MsgChannelUpgradeInit response type
 * @name MsgChannelUpgradeInitResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeInitResponse
 */
export declare const MsgChannelUpgradeInitResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeInitResponse";
    aminoType: "cosmos-sdk/MsgChannelUpgradeInitResponse";
    is(o: any): o is MsgChannelUpgradeInitResponse;
    isSDK(o: any): o is MsgChannelUpgradeInitResponseSDKType;
    encode(message: MsgChannelUpgradeInitResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeInitResponse;
    fromJSON(object: any): MsgChannelUpgradeInitResponse;
    toJSON(message: MsgChannelUpgradeInitResponse): JsonSafe<MsgChannelUpgradeInitResponse>;
    fromPartial(object: Partial<MsgChannelUpgradeInitResponse>): MsgChannelUpgradeInitResponse;
    fromProtoMsg(message: MsgChannelUpgradeInitResponseProtoMsg): MsgChannelUpgradeInitResponse;
    toProto(message: MsgChannelUpgradeInitResponse): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeInitResponse): MsgChannelUpgradeInitResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeTry defines the request type for the ChannelUpgradeTry rpc
 * @name MsgChannelUpgradeTry
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTry
 */
export declare const MsgChannelUpgradeTry: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeTry";
    aminoType: "cosmos-sdk/MsgChannelUpgradeTry";
    is(o: any): o is MsgChannelUpgradeTry;
    isSDK(o: any): o is MsgChannelUpgradeTrySDKType;
    encode(message: MsgChannelUpgradeTry, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeTry;
    fromJSON(object: any): MsgChannelUpgradeTry;
    toJSON(message: MsgChannelUpgradeTry): JsonSafe<MsgChannelUpgradeTry>;
    fromPartial(object: Partial<MsgChannelUpgradeTry>): MsgChannelUpgradeTry;
    fromProtoMsg(message: MsgChannelUpgradeTryProtoMsg): MsgChannelUpgradeTry;
    toProto(message: MsgChannelUpgradeTry): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeTry): MsgChannelUpgradeTryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeTryResponse defines the MsgChannelUpgradeTry response type
 * @name MsgChannelUpgradeTryResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTryResponse
 */
export declare const MsgChannelUpgradeTryResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeTryResponse";
    aminoType: "cosmos-sdk/MsgChannelUpgradeTryResponse";
    is(o: any): o is MsgChannelUpgradeTryResponse;
    isSDK(o: any): o is MsgChannelUpgradeTryResponseSDKType;
    encode(message: MsgChannelUpgradeTryResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeTryResponse;
    fromJSON(object: any): MsgChannelUpgradeTryResponse;
    toJSON(message: MsgChannelUpgradeTryResponse): JsonSafe<MsgChannelUpgradeTryResponse>;
    fromPartial(object: Partial<MsgChannelUpgradeTryResponse>): MsgChannelUpgradeTryResponse;
    fromProtoMsg(message: MsgChannelUpgradeTryResponseProtoMsg): MsgChannelUpgradeTryResponse;
    toProto(message: MsgChannelUpgradeTryResponse): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeTryResponse): MsgChannelUpgradeTryResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeAck defines the request type for the ChannelUpgradeAck rpc
 * @name MsgChannelUpgradeAck
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeAck
 */
export declare const MsgChannelUpgradeAck: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeAck";
    aminoType: "cosmos-sdk/MsgChannelUpgradeAck";
    is(o: any): o is MsgChannelUpgradeAck;
    isSDK(o: any): o is MsgChannelUpgradeAckSDKType;
    encode(message: MsgChannelUpgradeAck, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeAck;
    fromJSON(object: any): MsgChannelUpgradeAck;
    toJSON(message: MsgChannelUpgradeAck): JsonSafe<MsgChannelUpgradeAck>;
    fromPartial(object: Partial<MsgChannelUpgradeAck>): MsgChannelUpgradeAck;
    fromProtoMsg(message: MsgChannelUpgradeAckProtoMsg): MsgChannelUpgradeAck;
    toProto(message: MsgChannelUpgradeAck): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeAck): MsgChannelUpgradeAckProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeAckResponse defines MsgChannelUpgradeAck response type
 * @name MsgChannelUpgradeAckResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeAckResponse
 */
export declare const MsgChannelUpgradeAckResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeAckResponse";
    aminoType: "cosmos-sdk/MsgChannelUpgradeAckResponse";
    is(o: any): o is MsgChannelUpgradeAckResponse;
    isSDK(o: any): o is MsgChannelUpgradeAckResponseSDKType;
    encode(message: MsgChannelUpgradeAckResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeAckResponse;
    fromJSON(object: any): MsgChannelUpgradeAckResponse;
    toJSON(message: MsgChannelUpgradeAckResponse): JsonSafe<MsgChannelUpgradeAckResponse>;
    fromPartial(object: Partial<MsgChannelUpgradeAckResponse>): MsgChannelUpgradeAckResponse;
    fromProtoMsg(message: MsgChannelUpgradeAckResponseProtoMsg): MsgChannelUpgradeAckResponse;
    toProto(message: MsgChannelUpgradeAckResponse): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeAckResponse): MsgChannelUpgradeAckResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeConfirm defines the request type for the ChannelUpgradeConfirm rpc
 * @name MsgChannelUpgradeConfirm
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeConfirm
 */
export declare const MsgChannelUpgradeConfirm: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeConfirm";
    aminoType: "cosmos-sdk/MsgChannelUpgradeConfirm";
    is(o: any): o is MsgChannelUpgradeConfirm;
    isSDK(o: any): o is MsgChannelUpgradeConfirmSDKType;
    encode(message: MsgChannelUpgradeConfirm, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeConfirm;
    fromJSON(object: any): MsgChannelUpgradeConfirm;
    toJSON(message: MsgChannelUpgradeConfirm): JsonSafe<MsgChannelUpgradeConfirm>;
    fromPartial(object: Partial<MsgChannelUpgradeConfirm>): MsgChannelUpgradeConfirm;
    fromProtoMsg(message: MsgChannelUpgradeConfirmProtoMsg): MsgChannelUpgradeConfirm;
    toProto(message: MsgChannelUpgradeConfirm): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeConfirm): MsgChannelUpgradeConfirmProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeConfirmResponse defines MsgChannelUpgradeConfirm response type
 * @name MsgChannelUpgradeConfirmResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse
 */
export declare const MsgChannelUpgradeConfirmResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeConfirmResponse";
    aminoType: "cosmos-sdk/MsgChannelUpgradeConfirmResponse";
    is(o: any): o is MsgChannelUpgradeConfirmResponse;
    isSDK(o: any): o is MsgChannelUpgradeConfirmResponseSDKType;
    encode(message: MsgChannelUpgradeConfirmResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeConfirmResponse;
    fromJSON(object: any): MsgChannelUpgradeConfirmResponse;
    toJSON(message: MsgChannelUpgradeConfirmResponse): JsonSafe<MsgChannelUpgradeConfirmResponse>;
    fromPartial(object: Partial<MsgChannelUpgradeConfirmResponse>): MsgChannelUpgradeConfirmResponse;
    fromProtoMsg(message: MsgChannelUpgradeConfirmResponseProtoMsg): MsgChannelUpgradeConfirmResponse;
    toProto(message: MsgChannelUpgradeConfirmResponse): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeConfirmResponse): MsgChannelUpgradeConfirmResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeOpen defines the request type for the ChannelUpgradeOpen rpc
 * @name MsgChannelUpgradeOpen
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeOpen
 */
export declare const MsgChannelUpgradeOpen: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeOpen";
    aminoType: "cosmos-sdk/MsgChannelUpgradeOpen";
    is(o: any): o is MsgChannelUpgradeOpen;
    isSDK(o: any): o is MsgChannelUpgradeOpenSDKType;
    encode(message: MsgChannelUpgradeOpen, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeOpen;
    fromJSON(object: any): MsgChannelUpgradeOpen;
    toJSON(message: MsgChannelUpgradeOpen): JsonSafe<MsgChannelUpgradeOpen>;
    fromPartial(object: Partial<MsgChannelUpgradeOpen>): MsgChannelUpgradeOpen;
    fromProtoMsg(message: MsgChannelUpgradeOpenProtoMsg): MsgChannelUpgradeOpen;
    toProto(message: MsgChannelUpgradeOpen): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeOpen): MsgChannelUpgradeOpenProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeOpenResponse defines the MsgChannelUpgradeOpen response type
 * @name MsgChannelUpgradeOpenResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeOpenResponse
 */
export declare const MsgChannelUpgradeOpenResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeOpenResponse";
    aminoType: "cosmos-sdk/MsgChannelUpgradeOpenResponse";
    is(o: any): o is MsgChannelUpgradeOpenResponse;
    isSDK(o: any): o is MsgChannelUpgradeOpenResponseSDKType;
    encode(_: MsgChannelUpgradeOpenResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeOpenResponse;
    fromJSON(_: any): MsgChannelUpgradeOpenResponse;
    toJSON(_: MsgChannelUpgradeOpenResponse): JsonSafe<MsgChannelUpgradeOpenResponse>;
    fromPartial(_: Partial<MsgChannelUpgradeOpenResponse>): MsgChannelUpgradeOpenResponse;
    fromProtoMsg(message: MsgChannelUpgradeOpenResponseProtoMsg): MsgChannelUpgradeOpenResponse;
    toProto(message: MsgChannelUpgradeOpenResponse): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeOpenResponse): MsgChannelUpgradeOpenResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeTimeout defines the request type for the ChannelUpgradeTimeout rpc
 * @name MsgChannelUpgradeTimeout
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTimeout
 */
export declare const MsgChannelUpgradeTimeout: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeTimeout";
    aminoType: "cosmos-sdk/MsgChannelUpgradeTimeout";
    is(o: any): o is MsgChannelUpgradeTimeout;
    isSDK(o: any): o is MsgChannelUpgradeTimeoutSDKType;
    encode(message: MsgChannelUpgradeTimeout, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeTimeout;
    fromJSON(object: any): MsgChannelUpgradeTimeout;
    toJSON(message: MsgChannelUpgradeTimeout): JsonSafe<MsgChannelUpgradeTimeout>;
    fromPartial(object: Partial<MsgChannelUpgradeTimeout>): MsgChannelUpgradeTimeout;
    fromProtoMsg(message: MsgChannelUpgradeTimeoutProtoMsg): MsgChannelUpgradeTimeout;
    toProto(message: MsgChannelUpgradeTimeout): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeTimeout): MsgChannelUpgradeTimeoutProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeTimeoutRepsonse defines the MsgChannelUpgradeTimeout response type
 * @name MsgChannelUpgradeTimeoutResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse
 */
export declare const MsgChannelUpgradeTimeoutResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeTimeoutResponse";
    aminoType: "cosmos-sdk/MsgChannelUpgradeTimeoutResponse";
    is(o: any): o is MsgChannelUpgradeTimeoutResponse;
    isSDK(o: any): o is MsgChannelUpgradeTimeoutResponseSDKType;
    encode(_: MsgChannelUpgradeTimeoutResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeTimeoutResponse;
    fromJSON(_: any): MsgChannelUpgradeTimeoutResponse;
    toJSON(_: MsgChannelUpgradeTimeoutResponse): JsonSafe<MsgChannelUpgradeTimeoutResponse>;
    fromPartial(_: Partial<MsgChannelUpgradeTimeoutResponse>): MsgChannelUpgradeTimeoutResponse;
    fromProtoMsg(message: MsgChannelUpgradeTimeoutResponseProtoMsg): MsgChannelUpgradeTimeoutResponse;
    toProto(message: MsgChannelUpgradeTimeoutResponse): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeTimeoutResponse): MsgChannelUpgradeTimeoutResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeCancel defines the request type for the ChannelUpgradeCancel rpc
 * @name MsgChannelUpgradeCancel
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeCancel
 */
export declare const MsgChannelUpgradeCancel: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeCancel";
    aminoType: "cosmos-sdk/MsgChannelUpgradeCancel";
    is(o: any): o is MsgChannelUpgradeCancel;
    isSDK(o: any): o is MsgChannelUpgradeCancelSDKType;
    encode(message: MsgChannelUpgradeCancel, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeCancel;
    fromJSON(object: any): MsgChannelUpgradeCancel;
    toJSON(message: MsgChannelUpgradeCancel): JsonSafe<MsgChannelUpgradeCancel>;
    fromPartial(object: Partial<MsgChannelUpgradeCancel>): MsgChannelUpgradeCancel;
    fromProtoMsg(message: MsgChannelUpgradeCancelProtoMsg): MsgChannelUpgradeCancel;
    toProto(message: MsgChannelUpgradeCancel): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeCancel): MsgChannelUpgradeCancelProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgChannelUpgradeCancelResponse defines the MsgChannelUpgradeCancel response type
 * @name MsgChannelUpgradeCancelResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgChannelUpgradeCancelResponse
 */
export declare const MsgChannelUpgradeCancelResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgChannelUpgradeCancelResponse";
    aminoType: "cosmos-sdk/MsgChannelUpgradeCancelResponse";
    is(o: any): o is MsgChannelUpgradeCancelResponse;
    isSDK(o: any): o is MsgChannelUpgradeCancelResponseSDKType;
    encode(_: MsgChannelUpgradeCancelResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChannelUpgradeCancelResponse;
    fromJSON(_: any): MsgChannelUpgradeCancelResponse;
    toJSON(_: MsgChannelUpgradeCancelResponse): JsonSafe<MsgChannelUpgradeCancelResponse>;
    fromPartial(_: Partial<MsgChannelUpgradeCancelResponse>): MsgChannelUpgradeCancelResponse;
    fromProtoMsg(message: MsgChannelUpgradeCancelResponseProtoMsg): MsgChannelUpgradeCancelResponse;
    toProto(message: MsgChannelUpgradeCancelResponse): Uint8Array;
    toProtoMsg(message: MsgChannelUpgradeCancelResponse): MsgChannelUpgradeCancelResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams is the MsgUpdateParams request type.
 * @name MsgUpdateParams
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/ibc.core.channel.v1.MsgUpdateParams";
    aminoType: "cosmos-sdk/MsgUpdateParams";
    is(o: any): o is MsgUpdateParams;
    isSDK(o: any): o is MsgUpdateParamsSDKType;
    encode(message: MsgUpdateParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams;
    fromJSON(object: any): MsgUpdateParams;
    toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams>;
    fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams;
    fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams;
    toProto(message: MsgUpdateParams): Uint8Array;
    toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgUpdateParamsResponse";
    aminoType: "cosmos-sdk/MsgUpdateParamsResponse";
    is(o: any): o is MsgUpdateParamsResponse;
    isSDK(o: any): o is MsgUpdateParamsResponseSDKType;
    encode(_: MsgUpdateParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParamsResponse;
    fromJSON(_: any): MsgUpdateParamsResponse;
    toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse>;
    fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse;
    fromProtoMsg(message: MsgUpdateParamsResponseProtoMsg): MsgUpdateParamsResponse;
    toProto(message: MsgUpdateParamsResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateParamsResponse): MsgUpdateParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgPruneAcknowledgements defines the request type for the PruneAcknowledgements rpc.
 * @name MsgPruneAcknowledgements
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgPruneAcknowledgements
 */
export declare const MsgPruneAcknowledgements: {
    typeUrl: "/ibc.core.channel.v1.MsgPruneAcknowledgements";
    aminoType: "cosmos-sdk/MsgPruneAcknowledgements";
    is(o: any): o is MsgPruneAcknowledgements;
    isSDK(o: any): o is MsgPruneAcknowledgementsSDKType;
    encode(message: MsgPruneAcknowledgements, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPruneAcknowledgements;
    fromJSON(object: any): MsgPruneAcknowledgements;
    toJSON(message: MsgPruneAcknowledgements): JsonSafe<MsgPruneAcknowledgements>;
    fromPartial(object: Partial<MsgPruneAcknowledgements>): MsgPruneAcknowledgements;
    fromProtoMsg(message: MsgPruneAcknowledgementsProtoMsg): MsgPruneAcknowledgements;
    toProto(message: MsgPruneAcknowledgements): Uint8Array;
    toProtoMsg(message: MsgPruneAcknowledgements): MsgPruneAcknowledgementsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgPruneAcknowledgementsResponse defines the response type for the PruneAcknowledgements rpc.
 * @name MsgPruneAcknowledgementsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.MsgPruneAcknowledgementsResponse
 */
export declare const MsgPruneAcknowledgementsResponse: {
    typeUrl: "/ibc.core.channel.v1.MsgPruneAcknowledgementsResponse";
    aminoType: "cosmos-sdk/MsgPruneAcknowledgementsResponse";
    is(o: any): o is MsgPruneAcknowledgementsResponse;
    isSDK(o: any): o is MsgPruneAcknowledgementsResponseSDKType;
    encode(message: MsgPruneAcknowledgementsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgPruneAcknowledgementsResponse;
    fromJSON(object: any): MsgPruneAcknowledgementsResponse;
    toJSON(message: MsgPruneAcknowledgementsResponse): JsonSafe<MsgPruneAcknowledgementsResponse>;
    fromPartial(object: Partial<MsgPruneAcknowledgementsResponse>): MsgPruneAcknowledgementsResponse;
    fromProtoMsg(message: MsgPruneAcknowledgementsResponseProtoMsg): MsgPruneAcknowledgementsResponse;
    toProto(message: MsgPruneAcknowledgementsResponse): Uint8Array;
    toProtoMsg(message: MsgPruneAcknowledgementsResponse): MsgPruneAcknowledgementsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map