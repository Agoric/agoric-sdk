//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, bytesFromBase64, base64FromBytes } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
export interface MsgUpdateOwner {
  from: string;
  newOwner: string;
}
export interface MsgUpdateOwnerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateOwner';
  value: Uint8Array;
}
export interface MsgUpdateOwnerSDKType {
  from: string;
  new_owner: string;
}
export interface MsgUpdateOwnerResponse {}
export interface MsgUpdateOwnerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateOwnerResponse';
  value: Uint8Array;
}
export interface MsgUpdateOwnerResponseSDKType {}
export interface MsgUpdateAttesterManager {
  from: string;
  newAttesterManager: string;
}
export interface MsgUpdateAttesterManagerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateAttesterManager';
  value: Uint8Array;
}
export interface MsgUpdateAttesterManagerSDKType {
  from: string;
  new_attester_manager: string;
}
export interface MsgUpdateAttesterManagerResponse {}
export interface MsgUpdateAttesterManagerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateAttesterManagerResponse';
  value: Uint8Array;
}
export interface MsgUpdateAttesterManagerResponseSDKType {}
export interface MsgUpdateTokenController {
  from: string;
  newTokenController: string;
}
export interface MsgUpdateTokenControllerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateTokenController';
  value: Uint8Array;
}
export interface MsgUpdateTokenControllerSDKType {
  from: string;
  new_token_controller: string;
}
export interface MsgUpdateTokenControllerResponse {}
export interface MsgUpdateTokenControllerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateTokenControllerResponse';
  value: Uint8Array;
}
export interface MsgUpdateTokenControllerResponseSDKType {}
export interface MsgUpdatePauser {
  from: string;
  newPauser: string;
}
export interface MsgUpdatePauserProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdatePauser';
  value: Uint8Array;
}
export interface MsgUpdatePauserSDKType {
  from: string;
  new_pauser: string;
}
export interface MsgUpdatePauserResponse {}
export interface MsgUpdatePauserResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdatePauserResponse';
  value: Uint8Array;
}
export interface MsgUpdatePauserResponseSDKType {}
export interface MsgAcceptOwner {
  from: string;
}
export interface MsgAcceptOwnerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgAcceptOwner';
  value: Uint8Array;
}
export interface MsgAcceptOwnerSDKType {
  from: string;
}
export interface MsgAcceptOwnerResponse {}
export interface MsgAcceptOwnerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgAcceptOwnerResponse';
  value: Uint8Array;
}
export interface MsgAcceptOwnerResponseSDKType {}
export interface MsgEnableAttester {
  from: string;
  attester: string;
}
export interface MsgEnableAttesterProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgEnableAttester';
  value: Uint8Array;
}
export interface MsgEnableAttesterSDKType {
  from: string;
  attester: string;
}
export interface MsgEnableAttesterResponse {}
export interface MsgEnableAttesterResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgEnableAttesterResponse';
  value: Uint8Array;
}
export interface MsgEnableAttesterResponseSDKType {}
export interface MsgDisableAttester {
  from: string;
  attester: string;
}
export interface MsgDisableAttesterProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDisableAttester';
  value: Uint8Array;
}
export interface MsgDisableAttesterSDKType {
  from: string;
  attester: string;
}
export interface MsgDisableAttesterResponse {}
export interface MsgDisableAttesterResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDisableAttesterResponse';
  value: Uint8Array;
}
export interface MsgDisableAttesterResponseSDKType {}
export interface MsgPauseBurningAndMinting {
  from: string;
}
export interface MsgPauseBurningAndMintingProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgPauseBurningAndMinting';
  value: Uint8Array;
}
export interface MsgPauseBurningAndMintingSDKType {
  from: string;
}
export interface MsgPauseBurningAndMintingResponse {}
export interface MsgPauseBurningAndMintingResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgPauseBurningAndMintingResponse';
  value: Uint8Array;
}
export interface MsgPauseBurningAndMintingResponseSDKType {}
export interface MsgUnpauseBurningAndMinting {
  from: string;
}
export interface MsgUnpauseBurningAndMintingProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUnpauseBurningAndMinting';
  value: Uint8Array;
}
export interface MsgUnpauseBurningAndMintingSDKType {
  from: string;
}
export interface MsgUnpauseBurningAndMintingResponse {}
export interface MsgUnpauseBurningAndMintingResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUnpauseBurningAndMintingResponse';
  value: Uint8Array;
}
export interface MsgUnpauseBurningAndMintingResponseSDKType {}
export interface MsgPauseSendingAndReceivingMessages {
  from: string;
}
export interface MsgPauseSendingAndReceivingMessagesProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgPauseSendingAndReceivingMessages';
  value: Uint8Array;
}
export interface MsgPauseSendingAndReceivingMessagesSDKType {
  from: string;
}
export interface MsgPauseSendingAndReceivingMessagesResponse {}
export interface MsgPauseSendingAndReceivingMessagesResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgPauseSendingAndReceivingMessagesResponse';
  value: Uint8Array;
}
export interface MsgPauseSendingAndReceivingMessagesResponseSDKType {}
export interface MsgUnpauseSendingAndReceivingMessages {
  from: string;
}
export interface MsgUnpauseSendingAndReceivingMessagesProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUnpauseSendingAndReceivingMessages';
  value: Uint8Array;
}
export interface MsgUnpauseSendingAndReceivingMessagesSDKType {
  from: string;
}
export interface MsgUnpauseSendingAndReceivingMessagesResponse {}
export interface MsgUnpauseSendingAndReceivingMessagesResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUnpauseSendingAndReceivingMessagesResponse';
  value: Uint8Array;
}
export interface MsgUnpauseSendingAndReceivingMessagesResponseSDKType {}
export interface MsgUpdateMaxMessageBodySize {
  from: string;
  messageSize: bigint;
}
export interface MsgUpdateMaxMessageBodySizeProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateMaxMessageBodySize';
  value: Uint8Array;
}
export interface MsgUpdateMaxMessageBodySizeSDKType {
  from: string;
  message_size: bigint;
}
export interface MsgUpdateMaxMessageBodySizeResponse {}
export interface MsgUpdateMaxMessageBodySizeResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateMaxMessageBodySizeResponse';
  value: Uint8Array;
}
export interface MsgUpdateMaxMessageBodySizeResponseSDKType {}
export interface MsgSetMaxBurnAmountPerMessage {
  from: string;
  localToken: string;
  amount: string;
}
export interface MsgSetMaxBurnAmountPerMessageProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgSetMaxBurnAmountPerMessage';
  value: Uint8Array;
}
export interface MsgSetMaxBurnAmountPerMessageSDKType {
  from: string;
  local_token: string;
  amount: string;
}
export interface MsgSetMaxBurnAmountPerMessageResponse {}
export interface MsgSetMaxBurnAmountPerMessageResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgSetMaxBurnAmountPerMessageResponse';
  value: Uint8Array;
}
export interface MsgSetMaxBurnAmountPerMessageResponseSDKType {}
export interface MsgDepositForBurn {
  from: string;
  amount: string;
  destinationDomain: number;
  mintRecipient: Uint8Array;
  burnToken: string;
}
export interface MsgDepositForBurnProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurn';
  value: Uint8Array;
}
export interface MsgDepositForBurnSDKType {
  from: string;
  amount: string;
  destination_domain: number;
  mint_recipient: Uint8Array;
  burn_token: string;
}
export interface MsgDepositForBurnResponse {
  nonce: bigint;
}
export interface MsgDepositForBurnResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnResponse';
  value: Uint8Array;
}
export interface MsgDepositForBurnResponseSDKType {
  nonce: bigint;
}
export interface MsgDepositForBurnWithCaller {
  from: string;
  amount: string;
  destinationDomain: number;
  mintRecipient: Uint8Array;
  burnToken: string;
  destinationCaller: Uint8Array;
}
export interface MsgDepositForBurnWithCallerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCaller';
  value: Uint8Array;
}
export interface MsgDepositForBurnWithCallerSDKType {
  from: string;
  amount: string;
  destination_domain: number;
  mint_recipient: Uint8Array;
  burn_token: string;
  destination_caller: Uint8Array;
}
export interface MsgDepositForBurnWithCallerResponse {
  nonce: bigint;
}
export interface MsgDepositForBurnWithCallerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCallerResponse';
  value: Uint8Array;
}
export interface MsgDepositForBurnWithCallerResponseSDKType {
  nonce: bigint;
}
export interface MsgReplaceDepositForBurn {
  from: string;
  originalMessage: Uint8Array;
  originalAttestation: Uint8Array;
  newDestinationCaller: Uint8Array;
  newMintRecipient: Uint8Array;
}
export interface MsgReplaceDepositForBurnProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgReplaceDepositForBurn';
  value: Uint8Array;
}
export interface MsgReplaceDepositForBurnSDKType {
  from: string;
  original_message: Uint8Array;
  original_attestation: Uint8Array;
  new_destination_caller: Uint8Array;
  new_mint_recipient: Uint8Array;
}
export interface MsgReplaceDepositForBurnResponse {}
export interface MsgReplaceDepositForBurnResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgReplaceDepositForBurnResponse';
  value: Uint8Array;
}
export interface MsgReplaceDepositForBurnResponseSDKType {}
export interface MsgReceiveMessage {
  from: string;
  message: Uint8Array;
  attestation: Uint8Array;
}
export interface MsgReceiveMessageProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgReceiveMessage';
  value: Uint8Array;
}
export interface MsgReceiveMessageSDKType {
  from: string;
  message: Uint8Array;
  attestation: Uint8Array;
}
export interface MsgReceiveMessageResponse {
  success: boolean;
}
export interface MsgReceiveMessageResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgReceiveMessageResponse';
  value: Uint8Array;
}
export interface MsgReceiveMessageResponseSDKType {
  success: boolean;
}
export interface MsgSendMessage {
  from: string;
  destinationDomain: number;
  recipient: Uint8Array;
  messageBody: Uint8Array;
}
export interface MsgSendMessageProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgSendMessage';
  value: Uint8Array;
}
export interface MsgSendMessageSDKType {
  from: string;
  destination_domain: number;
  recipient: Uint8Array;
  message_body: Uint8Array;
}
export interface MsgSendMessageResponse {
  nonce: bigint;
}
export interface MsgSendMessageResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgSendMessageResponse';
  value: Uint8Array;
}
export interface MsgSendMessageResponseSDKType {
  nonce: bigint;
}
export interface MsgSendMessageWithCaller {
  from: string;
  destinationDomain: number;
  recipient: Uint8Array;
  messageBody: Uint8Array;
  destinationCaller: Uint8Array;
}
export interface MsgSendMessageWithCallerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgSendMessageWithCaller';
  value: Uint8Array;
}
export interface MsgSendMessageWithCallerSDKType {
  from: string;
  destination_domain: number;
  recipient: Uint8Array;
  message_body: Uint8Array;
  destination_caller: Uint8Array;
}
export interface MsgSendMessageWithCallerResponse {
  nonce: bigint;
}
export interface MsgSendMessageWithCallerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgSendMessageWithCallerResponse';
  value: Uint8Array;
}
export interface MsgSendMessageWithCallerResponseSDKType {
  nonce: bigint;
}
export interface MsgReplaceMessage {
  from: string;
  originalMessage: Uint8Array;
  originalAttestation: Uint8Array;
  newMessageBody: Uint8Array;
  newDestinationCaller: Uint8Array;
}
export interface MsgReplaceMessageProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgReplaceMessage';
  value: Uint8Array;
}
export interface MsgReplaceMessageSDKType {
  from: string;
  original_message: Uint8Array;
  original_attestation: Uint8Array;
  new_message_body: Uint8Array;
  new_destination_caller: Uint8Array;
}
export interface MsgReplaceMessageResponse {}
export interface MsgReplaceMessageResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgReplaceMessageResponse';
  value: Uint8Array;
}
export interface MsgReplaceMessageResponseSDKType {}
export interface MsgUpdateSignatureThreshold {
  from: string;
  amount: number;
}
export interface MsgUpdateSignatureThresholdProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateSignatureThreshold';
  value: Uint8Array;
}
export interface MsgUpdateSignatureThresholdSDKType {
  from: string;
  amount: number;
}
export interface MsgUpdateSignatureThresholdResponse {}
export interface MsgUpdateSignatureThresholdResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUpdateSignatureThresholdResponse';
  value: Uint8Array;
}
export interface MsgUpdateSignatureThresholdResponseSDKType {}
export interface MsgLinkTokenPair {
  from: string;
  remoteDomain: number;
  remoteToken: Uint8Array;
  localToken: string;
}
export interface MsgLinkTokenPairProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgLinkTokenPair';
  value: Uint8Array;
}
export interface MsgLinkTokenPairSDKType {
  from: string;
  remote_domain: number;
  remote_token: Uint8Array;
  local_token: string;
}
export interface MsgLinkTokenPairResponse {}
export interface MsgLinkTokenPairResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgLinkTokenPairResponse';
  value: Uint8Array;
}
export interface MsgLinkTokenPairResponseSDKType {}
export interface MsgUnlinkTokenPair {
  from: string;
  remoteDomain: number;
  remoteToken: Uint8Array;
  localToken: string;
}
export interface MsgUnlinkTokenPairProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUnlinkTokenPair';
  value: Uint8Array;
}
export interface MsgUnlinkTokenPairSDKType {
  from: string;
  remote_domain: number;
  remote_token: Uint8Array;
  local_token: string;
}
export interface MsgUnlinkTokenPairResponse {}
export interface MsgUnlinkTokenPairResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgUnlinkTokenPairResponse';
  value: Uint8Array;
}
export interface MsgUnlinkTokenPairResponseSDKType {}
export interface MsgAddRemoteTokenMessenger {
  from: string;
  domainId: number;
  address: Uint8Array;
}
export interface MsgAddRemoteTokenMessengerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgAddRemoteTokenMessenger';
  value: Uint8Array;
}
export interface MsgAddRemoteTokenMessengerSDKType {
  from: string;
  domain_id: number;
  address: Uint8Array;
}
export interface MsgAddRemoteTokenMessengerResponse {}
export interface MsgAddRemoteTokenMessengerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgAddRemoteTokenMessengerResponse';
  value: Uint8Array;
}
export interface MsgAddRemoteTokenMessengerResponseSDKType {}
export interface MsgRemoveRemoteTokenMessenger {
  from: string;
  domainId: number;
}
export interface MsgRemoveRemoteTokenMessengerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgRemoveRemoteTokenMessenger';
  value: Uint8Array;
}
export interface MsgRemoveRemoteTokenMessengerSDKType {
  from: string;
  domain_id: number;
}
export interface MsgRemoveRemoteTokenMessengerResponse {}
export interface MsgRemoveRemoteTokenMessengerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgRemoveRemoteTokenMessengerResponse';
  value: Uint8Array;
}
export interface MsgRemoveRemoteTokenMessengerResponseSDKType {}
function createBaseMsgUpdateOwner(): MsgUpdateOwner {
  return {
    from: '',
    newOwner: '',
  };
}
export const MsgUpdateOwner = {
  typeUrl: '/circle.cctp.v1.MsgUpdateOwner',
  encode(
    message: MsgUpdateOwner,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.newOwner !== '') {
      writer.uint32(18).string(message.newOwner);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateOwner {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateOwner();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.newOwner = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateOwner {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      newOwner: isSet(object.newOwner) ? String(object.newOwner) : '',
    };
  },
  toJSON(message: MsgUpdateOwner): JsonSafe<MsgUpdateOwner> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.newOwner !== undefined && (obj.newOwner = message.newOwner);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateOwner>): MsgUpdateOwner {
    const message = createBaseMsgUpdateOwner();
    message.from = object.from ?? '';
    message.newOwner = object.newOwner ?? '';
    return message;
  },
  fromProtoMsg(message: MsgUpdateOwnerProtoMsg): MsgUpdateOwner {
    return MsgUpdateOwner.decode(message.value);
  },
  toProto(message: MsgUpdateOwner): Uint8Array {
    return MsgUpdateOwner.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateOwner): MsgUpdateOwnerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateOwner',
      value: MsgUpdateOwner.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateOwnerResponse(): MsgUpdateOwnerResponse {
  return {};
}
export const MsgUpdateOwnerResponse = {
  typeUrl: '/circle.cctp.v1.MsgUpdateOwnerResponse',
  encode(
    _: MsgUpdateOwnerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateOwnerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateOwnerResponse();
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
  fromJSON(_: any): MsgUpdateOwnerResponse {
    return {};
  },
  toJSON(_: MsgUpdateOwnerResponse): JsonSafe<MsgUpdateOwnerResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgUpdateOwnerResponse>): MsgUpdateOwnerResponse {
    const message = createBaseMsgUpdateOwnerResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateOwnerResponseProtoMsg,
  ): MsgUpdateOwnerResponse {
    return MsgUpdateOwnerResponse.decode(message.value);
  },
  toProto(message: MsgUpdateOwnerResponse): Uint8Array {
    return MsgUpdateOwnerResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateOwnerResponse): MsgUpdateOwnerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateOwnerResponse',
      value: MsgUpdateOwnerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateAttesterManager(): MsgUpdateAttesterManager {
  return {
    from: '',
    newAttesterManager: '',
  };
}
export const MsgUpdateAttesterManager = {
  typeUrl: '/circle.cctp.v1.MsgUpdateAttesterManager',
  encode(
    message: MsgUpdateAttesterManager,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.newAttesterManager !== '') {
      writer.uint32(18).string(message.newAttesterManager);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateAttesterManager {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateAttesterManager();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.newAttesterManager = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateAttesterManager {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      newAttesterManager: isSet(object.newAttesterManager)
        ? String(object.newAttesterManager)
        : '',
    };
  },
  toJSON(
    message: MsgUpdateAttesterManager,
  ): JsonSafe<MsgUpdateAttesterManager> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.newAttesterManager !== undefined &&
      (obj.newAttesterManager = message.newAttesterManager);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateAttesterManager>,
  ): MsgUpdateAttesterManager {
    const message = createBaseMsgUpdateAttesterManager();
    message.from = object.from ?? '';
    message.newAttesterManager = object.newAttesterManager ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateAttesterManagerProtoMsg,
  ): MsgUpdateAttesterManager {
    return MsgUpdateAttesterManager.decode(message.value);
  },
  toProto(message: MsgUpdateAttesterManager): Uint8Array {
    return MsgUpdateAttesterManager.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateAttesterManager,
  ): MsgUpdateAttesterManagerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateAttesterManager',
      value: MsgUpdateAttesterManager.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateAttesterManagerResponse(): MsgUpdateAttesterManagerResponse {
  return {};
}
export const MsgUpdateAttesterManagerResponse = {
  typeUrl: '/circle.cctp.v1.MsgUpdateAttesterManagerResponse',
  encode(
    _: MsgUpdateAttesterManagerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateAttesterManagerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateAttesterManagerResponse();
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
  fromJSON(_: any): MsgUpdateAttesterManagerResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateAttesterManagerResponse,
  ): JsonSafe<MsgUpdateAttesterManagerResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateAttesterManagerResponse>,
  ): MsgUpdateAttesterManagerResponse {
    const message = createBaseMsgUpdateAttesterManagerResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateAttesterManagerResponseProtoMsg,
  ): MsgUpdateAttesterManagerResponse {
    return MsgUpdateAttesterManagerResponse.decode(message.value);
  },
  toProto(message: MsgUpdateAttesterManagerResponse): Uint8Array {
    return MsgUpdateAttesterManagerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateAttesterManagerResponse,
  ): MsgUpdateAttesterManagerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateAttesterManagerResponse',
      value: MsgUpdateAttesterManagerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateTokenController(): MsgUpdateTokenController {
  return {
    from: '',
    newTokenController: '',
  };
}
export const MsgUpdateTokenController = {
  typeUrl: '/circle.cctp.v1.MsgUpdateTokenController',
  encode(
    message: MsgUpdateTokenController,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.newTokenController !== '') {
      writer.uint32(18).string(message.newTokenController);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateTokenController {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateTokenController();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.newTokenController = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateTokenController {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      newTokenController: isSet(object.newTokenController)
        ? String(object.newTokenController)
        : '',
    };
  },
  toJSON(
    message: MsgUpdateTokenController,
  ): JsonSafe<MsgUpdateTokenController> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.newTokenController !== undefined &&
      (obj.newTokenController = message.newTokenController);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateTokenController>,
  ): MsgUpdateTokenController {
    const message = createBaseMsgUpdateTokenController();
    message.from = object.from ?? '';
    message.newTokenController = object.newTokenController ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateTokenControllerProtoMsg,
  ): MsgUpdateTokenController {
    return MsgUpdateTokenController.decode(message.value);
  },
  toProto(message: MsgUpdateTokenController): Uint8Array {
    return MsgUpdateTokenController.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateTokenController,
  ): MsgUpdateTokenControllerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateTokenController',
      value: MsgUpdateTokenController.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateTokenControllerResponse(): MsgUpdateTokenControllerResponse {
  return {};
}
export const MsgUpdateTokenControllerResponse = {
  typeUrl: '/circle.cctp.v1.MsgUpdateTokenControllerResponse',
  encode(
    _: MsgUpdateTokenControllerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateTokenControllerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateTokenControllerResponse();
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
  fromJSON(_: any): MsgUpdateTokenControllerResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateTokenControllerResponse,
  ): JsonSafe<MsgUpdateTokenControllerResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateTokenControllerResponse>,
  ): MsgUpdateTokenControllerResponse {
    const message = createBaseMsgUpdateTokenControllerResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateTokenControllerResponseProtoMsg,
  ): MsgUpdateTokenControllerResponse {
    return MsgUpdateTokenControllerResponse.decode(message.value);
  },
  toProto(message: MsgUpdateTokenControllerResponse): Uint8Array {
    return MsgUpdateTokenControllerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateTokenControllerResponse,
  ): MsgUpdateTokenControllerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateTokenControllerResponse',
      value: MsgUpdateTokenControllerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdatePauser(): MsgUpdatePauser {
  return {
    from: '',
    newPauser: '',
  };
}
export const MsgUpdatePauser = {
  typeUrl: '/circle.cctp.v1.MsgUpdatePauser',
  encode(
    message: MsgUpdatePauser,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.newPauser !== '') {
      writer.uint32(18).string(message.newPauser);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdatePauser {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdatePauser();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.newPauser = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdatePauser {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      newPauser: isSet(object.newPauser) ? String(object.newPauser) : '',
    };
  },
  toJSON(message: MsgUpdatePauser): JsonSafe<MsgUpdatePauser> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.newPauser !== undefined && (obj.newPauser = message.newPauser);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdatePauser>): MsgUpdatePauser {
    const message = createBaseMsgUpdatePauser();
    message.from = object.from ?? '';
    message.newPauser = object.newPauser ?? '';
    return message;
  },
  fromProtoMsg(message: MsgUpdatePauserProtoMsg): MsgUpdatePauser {
    return MsgUpdatePauser.decode(message.value);
  },
  toProto(message: MsgUpdatePauser): Uint8Array {
    return MsgUpdatePauser.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdatePauser): MsgUpdatePauserProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdatePauser',
      value: MsgUpdatePauser.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdatePauserResponse(): MsgUpdatePauserResponse {
  return {};
}
export const MsgUpdatePauserResponse = {
  typeUrl: '/circle.cctp.v1.MsgUpdatePauserResponse',
  encode(
    _: MsgUpdatePauserResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdatePauserResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdatePauserResponse();
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
  fromJSON(_: any): MsgUpdatePauserResponse {
    return {};
  },
  toJSON(_: MsgUpdatePauserResponse): JsonSafe<MsgUpdatePauserResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgUpdatePauserResponse>): MsgUpdatePauserResponse {
    const message = createBaseMsgUpdatePauserResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdatePauserResponseProtoMsg,
  ): MsgUpdatePauserResponse {
    return MsgUpdatePauserResponse.decode(message.value);
  },
  toProto(message: MsgUpdatePauserResponse): Uint8Array {
    return MsgUpdatePauserResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdatePauserResponse,
  ): MsgUpdatePauserResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdatePauserResponse',
      value: MsgUpdatePauserResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgAcceptOwner(): MsgAcceptOwner {
  return {
    from: '',
  };
}
export const MsgAcceptOwner = {
  typeUrl: '/circle.cctp.v1.MsgAcceptOwner',
  encode(
    message: MsgAcceptOwner,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgAcceptOwner {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAcceptOwner();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAcceptOwner {
    return {
      from: isSet(object.from) ? String(object.from) : '',
    };
  },
  toJSON(message: MsgAcceptOwner): JsonSafe<MsgAcceptOwner> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    return obj;
  },
  fromPartial(object: Partial<MsgAcceptOwner>): MsgAcceptOwner {
    const message = createBaseMsgAcceptOwner();
    message.from = object.from ?? '';
    return message;
  },
  fromProtoMsg(message: MsgAcceptOwnerProtoMsg): MsgAcceptOwner {
    return MsgAcceptOwner.decode(message.value);
  },
  toProto(message: MsgAcceptOwner): Uint8Array {
    return MsgAcceptOwner.encode(message).finish();
  },
  toProtoMsg(message: MsgAcceptOwner): MsgAcceptOwnerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgAcceptOwner',
      value: MsgAcceptOwner.encode(message).finish(),
    };
  },
};
function createBaseMsgAcceptOwnerResponse(): MsgAcceptOwnerResponse {
  return {};
}
export const MsgAcceptOwnerResponse = {
  typeUrl: '/circle.cctp.v1.MsgAcceptOwnerResponse',
  encode(
    _: MsgAcceptOwnerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAcceptOwnerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAcceptOwnerResponse();
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
  fromJSON(_: any): MsgAcceptOwnerResponse {
    return {};
  },
  toJSON(_: MsgAcceptOwnerResponse): JsonSafe<MsgAcceptOwnerResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgAcceptOwnerResponse>): MsgAcceptOwnerResponse {
    const message = createBaseMsgAcceptOwnerResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgAcceptOwnerResponseProtoMsg,
  ): MsgAcceptOwnerResponse {
    return MsgAcceptOwnerResponse.decode(message.value);
  },
  toProto(message: MsgAcceptOwnerResponse): Uint8Array {
    return MsgAcceptOwnerResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgAcceptOwnerResponse): MsgAcceptOwnerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgAcceptOwnerResponse',
      value: MsgAcceptOwnerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgEnableAttester(): MsgEnableAttester {
  return {
    from: '',
    attester: '',
  };
}
export const MsgEnableAttester = {
  typeUrl: '/circle.cctp.v1.MsgEnableAttester',
  encode(
    message: MsgEnableAttester,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.attester !== '') {
      writer.uint32(18).string(message.attester);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgEnableAttester {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgEnableAttester();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.attester = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgEnableAttester {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      attester: isSet(object.attester) ? String(object.attester) : '',
    };
  },
  toJSON(message: MsgEnableAttester): JsonSafe<MsgEnableAttester> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.attester !== undefined && (obj.attester = message.attester);
    return obj;
  },
  fromPartial(object: Partial<MsgEnableAttester>): MsgEnableAttester {
    const message = createBaseMsgEnableAttester();
    message.from = object.from ?? '';
    message.attester = object.attester ?? '';
    return message;
  },
  fromProtoMsg(message: MsgEnableAttesterProtoMsg): MsgEnableAttester {
    return MsgEnableAttester.decode(message.value);
  },
  toProto(message: MsgEnableAttester): Uint8Array {
    return MsgEnableAttester.encode(message).finish();
  },
  toProtoMsg(message: MsgEnableAttester): MsgEnableAttesterProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgEnableAttester',
      value: MsgEnableAttester.encode(message).finish(),
    };
  },
};
function createBaseMsgEnableAttesterResponse(): MsgEnableAttesterResponse {
  return {};
}
export const MsgEnableAttesterResponse = {
  typeUrl: '/circle.cctp.v1.MsgEnableAttesterResponse',
  encode(
    _: MsgEnableAttesterResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgEnableAttesterResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgEnableAttesterResponse();
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
  fromJSON(_: any): MsgEnableAttesterResponse {
    return {};
  },
  toJSON(_: MsgEnableAttesterResponse): JsonSafe<MsgEnableAttesterResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgEnableAttesterResponse>,
  ): MsgEnableAttesterResponse {
    const message = createBaseMsgEnableAttesterResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgEnableAttesterResponseProtoMsg,
  ): MsgEnableAttesterResponse {
    return MsgEnableAttesterResponse.decode(message.value);
  },
  toProto(message: MsgEnableAttesterResponse): Uint8Array {
    return MsgEnableAttesterResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgEnableAttesterResponse,
  ): MsgEnableAttesterResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgEnableAttesterResponse',
      value: MsgEnableAttesterResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgDisableAttester(): MsgDisableAttester {
  return {
    from: '',
    attester: '',
  };
}
export const MsgDisableAttester = {
  typeUrl: '/circle.cctp.v1.MsgDisableAttester',
  encode(
    message: MsgDisableAttester,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.attester !== '') {
      writer.uint32(18).string(message.attester);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDisableAttester {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDisableAttester();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.attester = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDisableAttester {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      attester: isSet(object.attester) ? String(object.attester) : '',
    };
  },
  toJSON(message: MsgDisableAttester): JsonSafe<MsgDisableAttester> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.attester !== undefined && (obj.attester = message.attester);
    return obj;
  },
  fromPartial(object: Partial<MsgDisableAttester>): MsgDisableAttester {
    const message = createBaseMsgDisableAttester();
    message.from = object.from ?? '';
    message.attester = object.attester ?? '';
    return message;
  },
  fromProtoMsg(message: MsgDisableAttesterProtoMsg): MsgDisableAttester {
    return MsgDisableAttester.decode(message.value);
  },
  toProto(message: MsgDisableAttester): Uint8Array {
    return MsgDisableAttester.encode(message).finish();
  },
  toProtoMsg(message: MsgDisableAttester): MsgDisableAttesterProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDisableAttester',
      value: MsgDisableAttester.encode(message).finish(),
    };
  },
};
function createBaseMsgDisableAttesterResponse(): MsgDisableAttesterResponse {
  return {};
}
export const MsgDisableAttesterResponse = {
  typeUrl: '/circle.cctp.v1.MsgDisableAttesterResponse',
  encode(
    _: MsgDisableAttesterResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDisableAttesterResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDisableAttesterResponse();
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
  fromJSON(_: any): MsgDisableAttesterResponse {
    return {};
  },
  toJSON(_: MsgDisableAttesterResponse): JsonSafe<MsgDisableAttesterResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgDisableAttesterResponse>,
  ): MsgDisableAttesterResponse {
    const message = createBaseMsgDisableAttesterResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgDisableAttesterResponseProtoMsg,
  ): MsgDisableAttesterResponse {
    return MsgDisableAttesterResponse.decode(message.value);
  },
  toProto(message: MsgDisableAttesterResponse): Uint8Array {
    return MsgDisableAttesterResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDisableAttesterResponse,
  ): MsgDisableAttesterResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDisableAttesterResponse',
      value: MsgDisableAttesterResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseBurningAndMinting(): MsgPauseBurningAndMinting {
  return {
    from: '',
  };
}
export const MsgPauseBurningAndMinting = {
  typeUrl: '/circle.cctp.v1.MsgPauseBurningAndMinting',
  encode(
    message: MsgPauseBurningAndMinting,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPauseBurningAndMinting {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseBurningAndMinting();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPauseBurningAndMinting {
    return {
      from: isSet(object.from) ? String(object.from) : '',
    };
  },
  toJSON(
    message: MsgPauseBurningAndMinting,
  ): JsonSafe<MsgPauseBurningAndMinting> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    return obj;
  },
  fromPartial(
    object: Partial<MsgPauseBurningAndMinting>,
  ): MsgPauseBurningAndMinting {
    const message = createBaseMsgPauseBurningAndMinting();
    message.from = object.from ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgPauseBurningAndMintingProtoMsg,
  ): MsgPauseBurningAndMinting {
    return MsgPauseBurningAndMinting.decode(message.value);
  },
  toProto(message: MsgPauseBurningAndMinting): Uint8Array {
    return MsgPauseBurningAndMinting.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPauseBurningAndMinting,
  ): MsgPauseBurningAndMintingProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgPauseBurningAndMinting',
      value: MsgPauseBurningAndMinting.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseBurningAndMintingResponse(): MsgPauseBurningAndMintingResponse {
  return {};
}
export const MsgPauseBurningAndMintingResponse = {
  typeUrl: '/circle.cctp.v1.MsgPauseBurningAndMintingResponse',
  encode(
    _: MsgPauseBurningAndMintingResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPauseBurningAndMintingResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseBurningAndMintingResponse();
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
  fromJSON(_: any): MsgPauseBurningAndMintingResponse {
    return {};
  },
  toJSON(
    _: MsgPauseBurningAndMintingResponse,
  ): JsonSafe<MsgPauseBurningAndMintingResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgPauseBurningAndMintingResponse>,
  ): MsgPauseBurningAndMintingResponse {
    const message = createBaseMsgPauseBurningAndMintingResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgPauseBurningAndMintingResponseProtoMsg,
  ): MsgPauseBurningAndMintingResponse {
    return MsgPauseBurningAndMintingResponse.decode(message.value);
  },
  toProto(message: MsgPauseBurningAndMintingResponse): Uint8Array {
    return MsgPauseBurningAndMintingResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPauseBurningAndMintingResponse,
  ): MsgPauseBurningAndMintingResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgPauseBurningAndMintingResponse',
      value: MsgPauseBurningAndMintingResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseBurningAndMinting(): MsgUnpauseBurningAndMinting {
  return {
    from: '',
  };
}
export const MsgUnpauseBurningAndMinting = {
  typeUrl: '/circle.cctp.v1.MsgUnpauseBurningAndMinting',
  encode(
    message: MsgUnpauseBurningAndMinting,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseBurningAndMinting {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseBurningAndMinting();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnpauseBurningAndMinting {
    return {
      from: isSet(object.from) ? String(object.from) : '',
    };
  },
  toJSON(
    message: MsgUnpauseBurningAndMinting,
  ): JsonSafe<MsgUnpauseBurningAndMinting> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUnpauseBurningAndMinting>,
  ): MsgUnpauseBurningAndMinting {
    const message = createBaseMsgUnpauseBurningAndMinting();
    message.from = object.from ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUnpauseBurningAndMintingProtoMsg,
  ): MsgUnpauseBurningAndMinting {
    return MsgUnpauseBurningAndMinting.decode(message.value);
  },
  toProto(message: MsgUnpauseBurningAndMinting): Uint8Array {
    return MsgUnpauseBurningAndMinting.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnpauseBurningAndMinting,
  ): MsgUnpauseBurningAndMintingProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUnpauseBurningAndMinting',
      value: MsgUnpauseBurningAndMinting.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseBurningAndMintingResponse(): MsgUnpauseBurningAndMintingResponse {
  return {};
}
export const MsgUnpauseBurningAndMintingResponse = {
  typeUrl: '/circle.cctp.v1.MsgUnpauseBurningAndMintingResponse',
  encode(
    _: MsgUnpauseBurningAndMintingResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseBurningAndMintingResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseBurningAndMintingResponse();
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
  fromJSON(_: any): MsgUnpauseBurningAndMintingResponse {
    return {};
  },
  toJSON(
    _: MsgUnpauseBurningAndMintingResponse,
  ): JsonSafe<MsgUnpauseBurningAndMintingResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUnpauseBurningAndMintingResponse>,
  ): MsgUnpauseBurningAndMintingResponse {
    const message = createBaseMsgUnpauseBurningAndMintingResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUnpauseBurningAndMintingResponseProtoMsg,
  ): MsgUnpauseBurningAndMintingResponse {
    return MsgUnpauseBurningAndMintingResponse.decode(message.value);
  },
  toProto(message: MsgUnpauseBurningAndMintingResponse): Uint8Array {
    return MsgUnpauseBurningAndMintingResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnpauseBurningAndMintingResponse,
  ): MsgUnpauseBurningAndMintingResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUnpauseBurningAndMintingResponse',
      value: MsgUnpauseBurningAndMintingResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseSendingAndReceivingMessages(): MsgPauseSendingAndReceivingMessages {
  return {
    from: '',
  };
}
export const MsgPauseSendingAndReceivingMessages = {
  typeUrl: '/circle.cctp.v1.MsgPauseSendingAndReceivingMessages',
  encode(
    message: MsgPauseSendingAndReceivingMessages,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPauseSendingAndReceivingMessages {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseSendingAndReceivingMessages();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgPauseSendingAndReceivingMessages {
    return {
      from: isSet(object.from) ? String(object.from) : '',
    };
  },
  toJSON(
    message: MsgPauseSendingAndReceivingMessages,
  ): JsonSafe<MsgPauseSendingAndReceivingMessages> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    return obj;
  },
  fromPartial(
    object: Partial<MsgPauseSendingAndReceivingMessages>,
  ): MsgPauseSendingAndReceivingMessages {
    const message = createBaseMsgPauseSendingAndReceivingMessages();
    message.from = object.from ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgPauseSendingAndReceivingMessagesProtoMsg,
  ): MsgPauseSendingAndReceivingMessages {
    return MsgPauseSendingAndReceivingMessages.decode(message.value);
  },
  toProto(message: MsgPauseSendingAndReceivingMessages): Uint8Array {
    return MsgPauseSendingAndReceivingMessages.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPauseSendingAndReceivingMessages,
  ): MsgPauseSendingAndReceivingMessagesProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgPauseSendingAndReceivingMessages',
      value: MsgPauseSendingAndReceivingMessages.encode(message).finish(),
    };
  },
};
function createBaseMsgPauseSendingAndReceivingMessagesResponse(): MsgPauseSendingAndReceivingMessagesResponse {
  return {};
}
export const MsgPauseSendingAndReceivingMessagesResponse = {
  typeUrl: '/circle.cctp.v1.MsgPauseSendingAndReceivingMessagesResponse',
  encode(
    _: MsgPauseSendingAndReceivingMessagesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgPauseSendingAndReceivingMessagesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgPauseSendingAndReceivingMessagesResponse();
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
  fromJSON(_: any): MsgPauseSendingAndReceivingMessagesResponse {
    return {};
  },
  toJSON(
    _: MsgPauseSendingAndReceivingMessagesResponse,
  ): JsonSafe<MsgPauseSendingAndReceivingMessagesResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgPauseSendingAndReceivingMessagesResponse>,
  ): MsgPauseSendingAndReceivingMessagesResponse {
    const message = createBaseMsgPauseSendingAndReceivingMessagesResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgPauseSendingAndReceivingMessagesResponseProtoMsg,
  ): MsgPauseSendingAndReceivingMessagesResponse {
    return MsgPauseSendingAndReceivingMessagesResponse.decode(message.value);
  },
  toProto(message: MsgPauseSendingAndReceivingMessagesResponse): Uint8Array {
    return MsgPauseSendingAndReceivingMessagesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgPauseSendingAndReceivingMessagesResponse,
  ): MsgPauseSendingAndReceivingMessagesResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgPauseSendingAndReceivingMessagesResponse',
      value:
        MsgPauseSendingAndReceivingMessagesResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseSendingAndReceivingMessages(): MsgUnpauseSendingAndReceivingMessages {
  return {
    from: '',
  };
}
export const MsgUnpauseSendingAndReceivingMessages = {
  typeUrl: '/circle.cctp.v1.MsgUnpauseSendingAndReceivingMessages',
  encode(
    message: MsgUnpauseSendingAndReceivingMessages,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseSendingAndReceivingMessages {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseSendingAndReceivingMessages();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnpauseSendingAndReceivingMessages {
    return {
      from: isSet(object.from) ? String(object.from) : '',
    };
  },
  toJSON(
    message: MsgUnpauseSendingAndReceivingMessages,
  ): JsonSafe<MsgUnpauseSendingAndReceivingMessages> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUnpauseSendingAndReceivingMessages>,
  ): MsgUnpauseSendingAndReceivingMessages {
    const message = createBaseMsgUnpauseSendingAndReceivingMessages();
    message.from = object.from ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUnpauseSendingAndReceivingMessagesProtoMsg,
  ): MsgUnpauseSendingAndReceivingMessages {
    return MsgUnpauseSendingAndReceivingMessages.decode(message.value);
  },
  toProto(message: MsgUnpauseSendingAndReceivingMessages): Uint8Array {
    return MsgUnpauseSendingAndReceivingMessages.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnpauseSendingAndReceivingMessages,
  ): MsgUnpauseSendingAndReceivingMessagesProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUnpauseSendingAndReceivingMessages',
      value: MsgUnpauseSendingAndReceivingMessages.encode(message).finish(),
    };
  },
};
function createBaseMsgUnpauseSendingAndReceivingMessagesResponse(): MsgUnpauseSendingAndReceivingMessagesResponse {
  return {};
}
export const MsgUnpauseSendingAndReceivingMessagesResponse = {
  typeUrl: '/circle.cctp.v1.MsgUnpauseSendingAndReceivingMessagesResponse',
  encode(
    _: MsgUnpauseSendingAndReceivingMessagesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnpauseSendingAndReceivingMessagesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnpauseSendingAndReceivingMessagesResponse();
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
  fromJSON(_: any): MsgUnpauseSendingAndReceivingMessagesResponse {
    return {};
  },
  toJSON(
    _: MsgUnpauseSendingAndReceivingMessagesResponse,
  ): JsonSafe<MsgUnpauseSendingAndReceivingMessagesResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUnpauseSendingAndReceivingMessagesResponse>,
  ): MsgUnpauseSendingAndReceivingMessagesResponse {
    const message = createBaseMsgUnpauseSendingAndReceivingMessagesResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUnpauseSendingAndReceivingMessagesResponseProtoMsg,
  ): MsgUnpauseSendingAndReceivingMessagesResponse {
    return MsgUnpauseSendingAndReceivingMessagesResponse.decode(message.value);
  },
  toProto(message: MsgUnpauseSendingAndReceivingMessagesResponse): Uint8Array {
    return MsgUnpauseSendingAndReceivingMessagesResponse.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: MsgUnpauseSendingAndReceivingMessagesResponse,
  ): MsgUnpauseSendingAndReceivingMessagesResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUnpauseSendingAndReceivingMessagesResponse',
      value:
        MsgUnpauseSendingAndReceivingMessagesResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateMaxMessageBodySize(): MsgUpdateMaxMessageBodySize {
  return {
    from: '',
    messageSize: BigInt(0),
  };
}
export const MsgUpdateMaxMessageBodySize = {
  typeUrl: '/circle.cctp.v1.MsgUpdateMaxMessageBodySize',
  encode(
    message: MsgUpdateMaxMessageBodySize,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.messageSize !== BigInt(0)) {
      writer.uint32(16).uint64(message.messageSize);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateMaxMessageBodySize {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateMaxMessageBodySize();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.messageSize = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateMaxMessageBodySize {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      messageSize: isSet(object.messageSize)
        ? BigInt(object.messageSize.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgUpdateMaxMessageBodySize,
  ): JsonSafe<MsgUpdateMaxMessageBodySize> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.messageSize !== undefined &&
      (obj.messageSize = (message.messageSize || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateMaxMessageBodySize>,
  ): MsgUpdateMaxMessageBodySize {
    const message = createBaseMsgUpdateMaxMessageBodySize();
    message.from = object.from ?? '';
    message.messageSize =
      object.messageSize !== undefined && object.messageSize !== null
        ? BigInt(object.messageSize.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateMaxMessageBodySizeProtoMsg,
  ): MsgUpdateMaxMessageBodySize {
    return MsgUpdateMaxMessageBodySize.decode(message.value);
  },
  toProto(message: MsgUpdateMaxMessageBodySize): Uint8Array {
    return MsgUpdateMaxMessageBodySize.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateMaxMessageBodySize,
  ): MsgUpdateMaxMessageBodySizeProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateMaxMessageBodySize',
      value: MsgUpdateMaxMessageBodySize.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateMaxMessageBodySizeResponse(): MsgUpdateMaxMessageBodySizeResponse {
  return {};
}
export const MsgUpdateMaxMessageBodySizeResponse = {
  typeUrl: '/circle.cctp.v1.MsgUpdateMaxMessageBodySizeResponse',
  encode(
    _: MsgUpdateMaxMessageBodySizeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateMaxMessageBodySizeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateMaxMessageBodySizeResponse();
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
  fromJSON(_: any): MsgUpdateMaxMessageBodySizeResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateMaxMessageBodySizeResponse,
  ): JsonSafe<MsgUpdateMaxMessageBodySizeResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateMaxMessageBodySizeResponse>,
  ): MsgUpdateMaxMessageBodySizeResponse {
    const message = createBaseMsgUpdateMaxMessageBodySizeResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateMaxMessageBodySizeResponseProtoMsg,
  ): MsgUpdateMaxMessageBodySizeResponse {
    return MsgUpdateMaxMessageBodySizeResponse.decode(message.value);
  },
  toProto(message: MsgUpdateMaxMessageBodySizeResponse): Uint8Array {
    return MsgUpdateMaxMessageBodySizeResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateMaxMessageBodySizeResponse,
  ): MsgUpdateMaxMessageBodySizeResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateMaxMessageBodySizeResponse',
      value: MsgUpdateMaxMessageBodySizeResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSetMaxBurnAmountPerMessage(): MsgSetMaxBurnAmountPerMessage {
  return {
    from: '',
    localToken: '',
    amount: '',
  };
}
export const MsgSetMaxBurnAmountPerMessage = {
  typeUrl: '/circle.cctp.v1.MsgSetMaxBurnAmountPerMessage',
  encode(
    message: MsgSetMaxBurnAmountPerMessage,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.localToken !== '') {
      writer.uint32(18).string(message.localToken);
    }
    if (message.amount !== '') {
      writer.uint32(26).string(message.amount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetMaxBurnAmountPerMessage {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetMaxBurnAmountPerMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.localToken = reader.string();
          break;
        case 3:
          message.amount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetMaxBurnAmountPerMessage {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      localToken: isSet(object.localToken) ? String(object.localToken) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
    };
  },
  toJSON(
    message: MsgSetMaxBurnAmountPerMessage,
  ): JsonSafe<MsgSetMaxBurnAmountPerMessage> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.localToken !== undefined && (obj.localToken = message.localToken);
    message.amount !== undefined && (obj.amount = message.amount);
    return obj;
  },
  fromPartial(
    object: Partial<MsgSetMaxBurnAmountPerMessage>,
  ): MsgSetMaxBurnAmountPerMessage {
    const message = createBaseMsgSetMaxBurnAmountPerMessage();
    message.from = object.from ?? '';
    message.localToken = object.localToken ?? '';
    message.amount = object.amount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgSetMaxBurnAmountPerMessageProtoMsg,
  ): MsgSetMaxBurnAmountPerMessage {
    return MsgSetMaxBurnAmountPerMessage.decode(message.value);
  },
  toProto(message: MsgSetMaxBurnAmountPerMessage): Uint8Array {
    return MsgSetMaxBurnAmountPerMessage.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetMaxBurnAmountPerMessage,
  ): MsgSetMaxBurnAmountPerMessageProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgSetMaxBurnAmountPerMessage',
      value: MsgSetMaxBurnAmountPerMessage.encode(message).finish(),
    };
  },
};
function createBaseMsgSetMaxBurnAmountPerMessageResponse(): MsgSetMaxBurnAmountPerMessageResponse {
  return {};
}
export const MsgSetMaxBurnAmountPerMessageResponse = {
  typeUrl: '/circle.cctp.v1.MsgSetMaxBurnAmountPerMessageResponse',
  encode(
    _: MsgSetMaxBurnAmountPerMessageResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetMaxBurnAmountPerMessageResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetMaxBurnAmountPerMessageResponse();
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
  fromJSON(_: any): MsgSetMaxBurnAmountPerMessageResponse {
    return {};
  },
  toJSON(
    _: MsgSetMaxBurnAmountPerMessageResponse,
  ): JsonSafe<MsgSetMaxBurnAmountPerMessageResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetMaxBurnAmountPerMessageResponse>,
  ): MsgSetMaxBurnAmountPerMessageResponse {
    const message = createBaseMsgSetMaxBurnAmountPerMessageResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetMaxBurnAmountPerMessageResponseProtoMsg,
  ): MsgSetMaxBurnAmountPerMessageResponse {
    return MsgSetMaxBurnAmountPerMessageResponse.decode(message.value);
  },
  toProto(message: MsgSetMaxBurnAmountPerMessageResponse): Uint8Array {
    return MsgSetMaxBurnAmountPerMessageResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetMaxBurnAmountPerMessageResponse,
  ): MsgSetMaxBurnAmountPerMessageResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgSetMaxBurnAmountPerMessageResponse',
      value: MsgSetMaxBurnAmountPerMessageResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositForBurn(): MsgDepositForBurn {
  return {
    from: '',
    amount: '',
    destinationDomain: 0,
    mintRecipient: new Uint8Array(),
    burnToken: '',
  };
}
export const MsgDepositForBurn = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
  encode(
    message: MsgDepositForBurn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(24).uint32(message.destinationDomain);
    }
    if (message.mintRecipient.length !== 0) {
      writer.uint32(34).bytes(message.mintRecipient);
    }
    if (message.burnToken !== '') {
      writer.uint32(42).string(message.burnToken);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositForBurn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.amount = reader.string();
          break;
        case 3:
          message.destinationDomain = reader.uint32();
          break;
        case 4:
          message.mintRecipient = reader.bytes();
          break;
        case 5:
          message.burnToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurn {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
      destinationDomain: isSet(object.destinationDomain)
        ? Number(object.destinationDomain)
        : 0,
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(),
      burnToken: isSet(object.burnToken) ? String(object.burnToken) : '',
    };
  },
  toJSON(message: MsgDepositForBurn): JsonSafe<MsgDepositForBurn> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.amount !== undefined && (obj.amount = message.amount);
    message.destinationDomain !== undefined &&
      (obj.destinationDomain = Math.round(message.destinationDomain));
    message.mintRecipient !== undefined &&
      (obj.mintRecipient = base64FromBytes(
        message.mintRecipient !== undefined
          ? message.mintRecipient
          : new Uint8Array(),
      ));
    message.burnToken !== undefined && (obj.burnToken = message.burnToken);
    return obj;
  },
  fromPartial(object: Partial<MsgDepositForBurn>): MsgDepositForBurn {
    const message = createBaseMsgDepositForBurn();
    message.from = object.from ?? '';
    message.amount = object.amount ?? '';
    message.destinationDomain = object.destinationDomain ?? 0;
    message.mintRecipient = object.mintRecipient ?? new Uint8Array();
    message.burnToken = object.burnToken ?? '';
    return message;
  },
  fromProtoMsg(message: MsgDepositForBurnProtoMsg): MsgDepositForBurn {
    return MsgDepositForBurn.decode(message.value);
  },
  toProto(message: MsgDepositForBurn): Uint8Array {
    return MsgDepositForBurn.encode(message).finish();
  },
  toProtoMsg(message: MsgDepositForBurn): MsgDepositForBurnProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
      value: MsgDepositForBurn.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositForBurnResponse(): MsgDepositForBurnResponse {
  return {
    nonce: BigInt(0),
  };
}
export const MsgDepositForBurnResponse = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnResponse',
  encode(
    message: MsgDepositForBurnResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== BigInt(0)) {
      writer.uint32(8).uint64(message.nonce);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositForBurnResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurnResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurnResponse {
    return {
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: MsgDepositForBurnResponse,
  ): JsonSafe<MsgDepositForBurnResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgDepositForBurnResponse>,
  ): MsgDepositForBurnResponse {
    const message = createBaseMsgDepositForBurnResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgDepositForBurnResponseProtoMsg,
  ): MsgDepositForBurnResponse {
    return MsgDepositForBurnResponse.decode(message.value);
  },
  toProto(message: MsgDepositForBurnResponse): Uint8Array {
    return MsgDepositForBurnResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositForBurnResponse,
  ): MsgDepositForBurnResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurnResponse',
      value: MsgDepositForBurnResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositForBurnWithCaller(): MsgDepositForBurnWithCaller {
  return {
    from: '',
    amount: '',
    destinationDomain: 0,
    mintRecipient: new Uint8Array(),
    burnToken: '',
    destinationCaller: new Uint8Array(),
  };
}
export const MsgDepositForBurnWithCaller = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCaller',
  encode(
    message: MsgDepositForBurnWithCaller,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(24).uint32(message.destinationDomain);
    }
    if (message.mintRecipient.length !== 0) {
      writer.uint32(34).bytes(message.mintRecipient);
    }
    if (message.burnToken !== '') {
      writer.uint32(42).string(message.burnToken);
    }
    if (message.destinationCaller.length !== 0) {
      writer.uint32(50).bytes(message.destinationCaller);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositForBurnWithCaller {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurnWithCaller();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.amount = reader.string();
          break;
        case 3:
          message.destinationDomain = reader.uint32();
          break;
        case 4:
          message.mintRecipient = reader.bytes();
          break;
        case 5:
          message.burnToken = reader.string();
          break;
        case 6:
          message.destinationCaller = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurnWithCaller {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
      destinationDomain: isSet(object.destinationDomain)
        ? Number(object.destinationDomain)
        : 0,
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(),
      burnToken: isSet(object.burnToken) ? String(object.burnToken) : '',
      destinationCaller: isSet(object.destinationCaller)
        ? bytesFromBase64(object.destinationCaller)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: MsgDepositForBurnWithCaller,
  ): JsonSafe<MsgDepositForBurnWithCaller> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.amount !== undefined && (obj.amount = message.amount);
    message.destinationDomain !== undefined &&
      (obj.destinationDomain = Math.round(message.destinationDomain));
    message.mintRecipient !== undefined &&
      (obj.mintRecipient = base64FromBytes(
        message.mintRecipient !== undefined
          ? message.mintRecipient
          : new Uint8Array(),
      ));
    message.burnToken !== undefined && (obj.burnToken = message.burnToken);
    message.destinationCaller !== undefined &&
      (obj.destinationCaller = base64FromBytes(
        message.destinationCaller !== undefined
          ? message.destinationCaller
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<MsgDepositForBurnWithCaller>,
  ): MsgDepositForBurnWithCaller {
    const message = createBaseMsgDepositForBurnWithCaller();
    message.from = object.from ?? '';
    message.amount = object.amount ?? '';
    message.destinationDomain = object.destinationDomain ?? 0;
    message.mintRecipient = object.mintRecipient ?? new Uint8Array();
    message.burnToken = object.burnToken ?? '';
    message.destinationCaller = object.destinationCaller ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: MsgDepositForBurnWithCallerProtoMsg,
  ): MsgDepositForBurnWithCaller {
    return MsgDepositForBurnWithCaller.decode(message.value);
  },
  toProto(message: MsgDepositForBurnWithCaller): Uint8Array {
    return MsgDepositForBurnWithCaller.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositForBurnWithCaller,
  ): MsgDepositForBurnWithCallerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCaller',
      value: MsgDepositForBurnWithCaller.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositForBurnWithCallerResponse(): MsgDepositForBurnWithCallerResponse {
  return {
    nonce: BigInt(0),
  };
}
export const MsgDepositForBurnWithCallerResponse = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCallerResponse',
  encode(
    message: MsgDepositForBurnWithCallerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== BigInt(0)) {
      writer.uint32(8).uint64(message.nonce);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositForBurnWithCallerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurnWithCallerResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurnWithCallerResponse {
    return {
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: MsgDepositForBurnWithCallerResponse,
  ): JsonSafe<MsgDepositForBurnWithCallerResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgDepositForBurnWithCallerResponse>,
  ): MsgDepositForBurnWithCallerResponse {
    const message = createBaseMsgDepositForBurnWithCallerResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgDepositForBurnWithCallerResponseProtoMsg,
  ): MsgDepositForBurnWithCallerResponse {
    return MsgDepositForBurnWithCallerResponse.decode(message.value);
  },
  toProto(message: MsgDepositForBurnWithCallerResponse): Uint8Array {
    return MsgDepositForBurnWithCallerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositForBurnWithCallerResponse,
  ): MsgDepositForBurnWithCallerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCallerResponse',
      value: MsgDepositForBurnWithCallerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgReplaceDepositForBurn(): MsgReplaceDepositForBurn {
  return {
    from: '',
    originalMessage: new Uint8Array(),
    originalAttestation: new Uint8Array(),
    newDestinationCaller: new Uint8Array(),
    newMintRecipient: new Uint8Array(),
  };
}
export const MsgReplaceDepositForBurn = {
  typeUrl: '/circle.cctp.v1.MsgReplaceDepositForBurn',
  encode(
    message: MsgReplaceDepositForBurn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.originalMessage.length !== 0) {
      writer.uint32(18).bytes(message.originalMessage);
    }
    if (message.originalAttestation.length !== 0) {
      writer.uint32(26).bytes(message.originalAttestation);
    }
    if (message.newDestinationCaller.length !== 0) {
      writer.uint32(34).bytes(message.newDestinationCaller);
    }
    if (message.newMintRecipient.length !== 0) {
      writer.uint32(42).bytes(message.newMintRecipient);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgReplaceDepositForBurn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgReplaceDepositForBurn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.originalMessage = reader.bytes();
          break;
        case 3:
          message.originalAttestation = reader.bytes();
          break;
        case 4:
          message.newDestinationCaller = reader.bytes();
          break;
        case 5:
          message.newMintRecipient = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgReplaceDepositForBurn {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      originalMessage: isSet(object.originalMessage)
        ? bytesFromBase64(object.originalMessage)
        : new Uint8Array(),
      originalAttestation: isSet(object.originalAttestation)
        ? bytesFromBase64(object.originalAttestation)
        : new Uint8Array(),
      newDestinationCaller: isSet(object.newDestinationCaller)
        ? bytesFromBase64(object.newDestinationCaller)
        : new Uint8Array(),
      newMintRecipient: isSet(object.newMintRecipient)
        ? bytesFromBase64(object.newMintRecipient)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: MsgReplaceDepositForBurn,
  ): JsonSafe<MsgReplaceDepositForBurn> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.originalMessage !== undefined &&
      (obj.originalMessage = base64FromBytes(
        message.originalMessage !== undefined
          ? message.originalMessage
          : new Uint8Array(),
      ));
    message.originalAttestation !== undefined &&
      (obj.originalAttestation = base64FromBytes(
        message.originalAttestation !== undefined
          ? message.originalAttestation
          : new Uint8Array(),
      ));
    message.newDestinationCaller !== undefined &&
      (obj.newDestinationCaller = base64FromBytes(
        message.newDestinationCaller !== undefined
          ? message.newDestinationCaller
          : new Uint8Array(),
      ));
    message.newMintRecipient !== undefined &&
      (obj.newMintRecipient = base64FromBytes(
        message.newMintRecipient !== undefined
          ? message.newMintRecipient
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<MsgReplaceDepositForBurn>,
  ): MsgReplaceDepositForBurn {
    const message = createBaseMsgReplaceDepositForBurn();
    message.from = object.from ?? '';
    message.originalMessage = object.originalMessage ?? new Uint8Array();
    message.originalAttestation =
      object.originalAttestation ?? new Uint8Array();
    message.newDestinationCaller =
      object.newDestinationCaller ?? new Uint8Array();
    message.newMintRecipient = object.newMintRecipient ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: MsgReplaceDepositForBurnProtoMsg,
  ): MsgReplaceDepositForBurn {
    return MsgReplaceDepositForBurn.decode(message.value);
  },
  toProto(message: MsgReplaceDepositForBurn): Uint8Array {
    return MsgReplaceDepositForBurn.encode(message).finish();
  },
  toProtoMsg(
    message: MsgReplaceDepositForBurn,
  ): MsgReplaceDepositForBurnProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgReplaceDepositForBurn',
      value: MsgReplaceDepositForBurn.encode(message).finish(),
    };
  },
};
function createBaseMsgReplaceDepositForBurnResponse(): MsgReplaceDepositForBurnResponse {
  return {};
}
export const MsgReplaceDepositForBurnResponse = {
  typeUrl: '/circle.cctp.v1.MsgReplaceDepositForBurnResponse',
  encode(
    _: MsgReplaceDepositForBurnResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgReplaceDepositForBurnResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgReplaceDepositForBurnResponse();
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
  fromJSON(_: any): MsgReplaceDepositForBurnResponse {
    return {};
  },
  toJSON(
    _: MsgReplaceDepositForBurnResponse,
  ): JsonSafe<MsgReplaceDepositForBurnResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgReplaceDepositForBurnResponse>,
  ): MsgReplaceDepositForBurnResponse {
    const message = createBaseMsgReplaceDepositForBurnResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgReplaceDepositForBurnResponseProtoMsg,
  ): MsgReplaceDepositForBurnResponse {
    return MsgReplaceDepositForBurnResponse.decode(message.value);
  },
  toProto(message: MsgReplaceDepositForBurnResponse): Uint8Array {
    return MsgReplaceDepositForBurnResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgReplaceDepositForBurnResponse,
  ): MsgReplaceDepositForBurnResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgReplaceDepositForBurnResponse',
      value: MsgReplaceDepositForBurnResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgReceiveMessage(): MsgReceiveMessage {
  return {
    from: '',
    message: new Uint8Array(),
    attestation: new Uint8Array(),
  };
}
export const MsgReceiveMessage = {
  typeUrl: '/circle.cctp.v1.MsgReceiveMessage',
  encode(
    message: MsgReceiveMessage,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.message.length !== 0) {
      writer.uint32(18).bytes(message.message);
    }
    if (message.attestation.length !== 0) {
      writer.uint32(26).bytes(message.attestation);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgReceiveMessage {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgReceiveMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.message = reader.bytes();
          break;
        case 3:
          message.attestation = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgReceiveMessage {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      message: isSet(object.message)
        ? bytesFromBase64(object.message)
        : new Uint8Array(),
      attestation: isSet(object.attestation)
        ? bytesFromBase64(object.attestation)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgReceiveMessage): JsonSafe<MsgReceiveMessage> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.message !== undefined &&
      (obj.message = base64FromBytes(
        message.message !== undefined ? message.message : new Uint8Array(),
      ));
    message.attestation !== undefined &&
      (obj.attestation = base64FromBytes(
        message.attestation !== undefined
          ? message.attestation
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgReceiveMessage>): MsgReceiveMessage {
    const message = createBaseMsgReceiveMessage();
    message.from = object.from ?? '';
    message.message = object.message ?? new Uint8Array();
    message.attestation = object.attestation ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgReceiveMessageProtoMsg): MsgReceiveMessage {
    return MsgReceiveMessage.decode(message.value);
  },
  toProto(message: MsgReceiveMessage): Uint8Array {
    return MsgReceiveMessage.encode(message).finish();
  },
  toProtoMsg(message: MsgReceiveMessage): MsgReceiveMessageProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgReceiveMessage',
      value: MsgReceiveMessage.encode(message).finish(),
    };
  },
};
function createBaseMsgReceiveMessageResponse(): MsgReceiveMessageResponse {
  return {
    success: false,
  };
}
export const MsgReceiveMessageResponse = {
  typeUrl: '/circle.cctp.v1.MsgReceiveMessageResponse',
  encode(
    message: MsgReceiveMessageResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.success === true) {
      writer.uint32(8).bool(message.success);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgReceiveMessageResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgReceiveMessageResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.success = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgReceiveMessageResponse {
    return {
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },
  toJSON(
    message: MsgReceiveMessageResponse,
  ): JsonSafe<MsgReceiveMessageResponse> {
    const obj: any = {};
    message.success !== undefined && (obj.success = message.success);
    return obj;
  },
  fromPartial(
    object: Partial<MsgReceiveMessageResponse>,
  ): MsgReceiveMessageResponse {
    const message = createBaseMsgReceiveMessageResponse();
    message.success = object.success ?? false;
    return message;
  },
  fromProtoMsg(
    message: MsgReceiveMessageResponseProtoMsg,
  ): MsgReceiveMessageResponse {
    return MsgReceiveMessageResponse.decode(message.value);
  },
  toProto(message: MsgReceiveMessageResponse): Uint8Array {
    return MsgReceiveMessageResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgReceiveMessageResponse,
  ): MsgReceiveMessageResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgReceiveMessageResponse',
      value: MsgReceiveMessageResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSendMessage(): MsgSendMessage {
  return {
    from: '',
    destinationDomain: 0,
    recipient: new Uint8Array(),
    messageBody: new Uint8Array(),
  };
}
export const MsgSendMessage = {
  typeUrl: '/circle.cctp.v1.MsgSendMessage',
  encode(
    message: MsgSendMessage,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(16).uint32(message.destinationDomain);
    }
    if (message.recipient.length !== 0) {
      writer.uint32(26).bytes(message.recipient);
    }
    if (message.messageBody.length !== 0) {
      writer.uint32(34).bytes(message.messageBody);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSendMessage {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.destinationDomain = reader.uint32();
          break;
        case 3:
          message.recipient = reader.bytes();
          break;
        case 4:
          message.messageBody = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendMessage {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      destinationDomain: isSet(object.destinationDomain)
        ? Number(object.destinationDomain)
        : 0,
      recipient: isSet(object.recipient)
        ? bytesFromBase64(object.recipient)
        : new Uint8Array(),
      messageBody: isSet(object.messageBody)
        ? bytesFromBase64(object.messageBody)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgSendMessage): JsonSafe<MsgSendMessage> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.destinationDomain !== undefined &&
      (obj.destinationDomain = Math.round(message.destinationDomain));
    message.recipient !== undefined &&
      (obj.recipient = base64FromBytes(
        message.recipient !== undefined ? message.recipient : new Uint8Array(),
      ));
    message.messageBody !== undefined &&
      (obj.messageBody = base64FromBytes(
        message.messageBody !== undefined
          ? message.messageBody
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgSendMessage>): MsgSendMessage {
    const message = createBaseMsgSendMessage();
    message.from = object.from ?? '';
    message.destinationDomain = object.destinationDomain ?? 0;
    message.recipient = object.recipient ?? new Uint8Array();
    message.messageBody = object.messageBody ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgSendMessageProtoMsg): MsgSendMessage {
    return MsgSendMessage.decode(message.value);
  },
  toProto(message: MsgSendMessage): Uint8Array {
    return MsgSendMessage.encode(message).finish();
  },
  toProtoMsg(message: MsgSendMessage): MsgSendMessageProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgSendMessage',
      value: MsgSendMessage.encode(message).finish(),
    };
  },
};
function createBaseMsgSendMessageResponse(): MsgSendMessageResponse {
  return {
    nonce: BigInt(0),
  };
}
export const MsgSendMessageResponse = {
  typeUrl: '/circle.cctp.v1.MsgSendMessageResponse',
  encode(
    message: MsgSendMessageResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== BigInt(0)) {
      writer.uint32(8).uint64(message.nonce);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSendMessageResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendMessageResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendMessageResponse {
    return {
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(message: MsgSendMessageResponse): JsonSafe<MsgSendMessageResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgSendMessageResponse>): MsgSendMessageResponse {
    const message = createBaseMsgSendMessageResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgSendMessageResponseProtoMsg,
  ): MsgSendMessageResponse {
    return MsgSendMessageResponse.decode(message.value);
  },
  toProto(message: MsgSendMessageResponse): Uint8Array {
    return MsgSendMessageResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgSendMessageResponse): MsgSendMessageResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgSendMessageResponse',
      value: MsgSendMessageResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSendMessageWithCaller(): MsgSendMessageWithCaller {
  return {
    from: '',
    destinationDomain: 0,
    recipient: new Uint8Array(),
    messageBody: new Uint8Array(),
    destinationCaller: new Uint8Array(),
  };
}
export const MsgSendMessageWithCaller = {
  typeUrl: '/circle.cctp.v1.MsgSendMessageWithCaller',
  encode(
    message: MsgSendMessageWithCaller,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(16).uint32(message.destinationDomain);
    }
    if (message.recipient.length !== 0) {
      writer.uint32(26).bytes(message.recipient);
    }
    if (message.messageBody.length !== 0) {
      writer.uint32(34).bytes(message.messageBody);
    }
    if (message.destinationCaller.length !== 0) {
      writer.uint32(42).bytes(message.destinationCaller);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSendMessageWithCaller {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendMessageWithCaller();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.destinationDomain = reader.uint32();
          break;
        case 3:
          message.recipient = reader.bytes();
          break;
        case 4:
          message.messageBody = reader.bytes();
          break;
        case 5:
          message.destinationCaller = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendMessageWithCaller {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      destinationDomain: isSet(object.destinationDomain)
        ? Number(object.destinationDomain)
        : 0,
      recipient: isSet(object.recipient)
        ? bytesFromBase64(object.recipient)
        : new Uint8Array(),
      messageBody: isSet(object.messageBody)
        ? bytesFromBase64(object.messageBody)
        : new Uint8Array(),
      destinationCaller: isSet(object.destinationCaller)
        ? bytesFromBase64(object.destinationCaller)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: MsgSendMessageWithCaller,
  ): JsonSafe<MsgSendMessageWithCaller> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.destinationDomain !== undefined &&
      (obj.destinationDomain = Math.round(message.destinationDomain));
    message.recipient !== undefined &&
      (obj.recipient = base64FromBytes(
        message.recipient !== undefined ? message.recipient : new Uint8Array(),
      ));
    message.messageBody !== undefined &&
      (obj.messageBody = base64FromBytes(
        message.messageBody !== undefined
          ? message.messageBody
          : new Uint8Array(),
      ));
    message.destinationCaller !== undefined &&
      (obj.destinationCaller = base64FromBytes(
        message.destinationCaller !== undefined
          ? message.destinationCaller
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<MsgSendMessageWithCaller>,
  ): MsgSendMessageWithCaller {
    const message = createBaseMsgSendMessageWithCaller();
    message.from = object.from ?? '';
    message.destinationDomain = object.destinationDomain ?? 0;
    message.recipient = object.recipient ?? new Uint8Array();
    message.messageBody = object.messageBody ?? new Uint8Array();
    message.destinationCaller = object.destinationCaller ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: MsgSendMessageWithCallerProtoMsg,
  ): MsgSendMessageWithCaller {
    return MsgSendMessageWithCaller.decode(message.value);
  },
  toProto(message: MsgSendMessageWithCaller): Uint8Array {
    return MsgSendMessageWithCaller.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSendMessageWithCaller,
  ): MsgSendMessageWithCallerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgSendMessageWithCaller',
      value: MsgSendMessageWithCaller.encode(message).finish(),
    };
  },
};
function createBaseMsgSendMessageWithCallerResponse(): MsgSendMessageWithCallerResponse {
  return {
    nonce: BigInt(0),
  };
}
export const MsgSendMessageWithCallerResponse = {
  typeUrl: '/circle.cctp.v1.MsgSendMessageWithCallerResponse',
  encode(
    message: MsgSendMessageWithCallerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== BigInt(0)) {
      writer.uint32(8).uint64(message.nonce);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSendMessageWithCallerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendMessageWithCallerResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendMessageWithCallerResponse {
    return {
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: MsgSendMessageWithCallerResponse,
  ): JsonSafe<MsgSendMessageWithCallerResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgSendMessageWithCallerResponse>,
  ): MsgSendMessageWithCallerResponse {
    const message = createBaseMsgSendMessageWithCallerResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgSendMessageWithCallerResponseProtoMsg,
  ): MsgSendMessageWithCallerResponse {
    return MsgSendMessageWithCallerResponse.decode(message.value);
  },
  toProto(message: MsgSendMessageWithCallerResponse): Uint8Array {
    return MsgSendMessageWithCallerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSendMessageWithCallerResponse,
  ): MsgSendMessageWithCallerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgSendMessageWithCallerResponse',
      value: MsgSendMessageWithCallerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgReplaceMessage(): MsgReplaceMessage {
  return {
    from: '',
    originalMessage: new Uint8Array(),
    originalAttestation: new Uint8Array(),
    newMessageBody: new Uint8Array(),
    newDestinationCaller: new Uint8Array(),
  };
}
export const MsgReplaceMessage = {
  typeUrl: '/circle.cctp.v1.MsgReplaceMessage',
  encode(
    message: MsgReplaceMessage,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.originalMessage.length !== 0) {
      writer.uint32(18).bytes(message.originalMessage);
    }
    if (message.originalAttestation.length !== 0) {
      writer.uint32(26).bytes(message.originalAttestation);
    }
    if (message.newMessageBody.length !== 0) {
      writer.uint32(34).bytes(message.newMessageBody);
    }
    if (message.newDestinationCaller.length !== 0) {
      writer.uint32(42).bytes(message.newDestinationCaller);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgReplaceMessage {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgReplaceMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.originalMessage = reader.bytes();
          break;
        case 3:
          message.originalAttestation = reader.bytes();
          break;
        case 4:
          message.newMessageBody = reader.bytes();
          break;
        case 5:
          message.newDestinationCaller = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgReplaceMessage {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      originalMessage: isSet(object.originalMessage)
        ? bytesFromBase64(object.originalMessage)
        : new Uint8Array(),
      originalAttestation: isSet(object.originalAttestation)
        ? bytesFromBase64(object.originalAttestation)
        : new Uint8Array(),
      newMessageBody: isSet(object.newMessageBody)
        ? bytesFromBase64(object.newMessageBody)
        : new Uint8Array(),
      newDestinationCaller: isSet(object.newDestinationCaller)
        ? bytesFromBase64(object.newDestinationCaller)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgReplaceMessage): JsonSafe<MsgReplaceMessage> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.originalMessage !== undefined &&
      (obj.originalMessage = base64FromBytes(
        message.originalMessage !== undefined
          ? message.originalMessage
          : new Uint8Array(),
      ));
    message.originalAttestation !== undefined &&
      (obj.originalAttestation = base64FromBytes(
        message.originalAttestation !== undefined
          ? message.originalAttestation
          : new Uint8Array(),
      ));
    message.newMessageBody !== undefined &&
      (obj.newMessageBody = base64FromBytes(
        message.newMessageBody !== undefined
          ? message.newMessageBody
          : new Uint8Array(),
      ));
    message.newDestinationCaller !== undefined &&
      (obj.newDestinationCaller = base64FromBytes(
        message.newDestinationCaller !== undefined
          ? message.newDestinationCaller
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgReplaceMessage>): MsgReplaceMessage {
    const message = createBaseMsgReplaceMessage();
    message.from = object.from ?? '';
    message.originalMessage = object.originalMessage ?? new Uint8Array();
    message.originalAttestation =
      object.originalAttestation ?? new Uint8Array();
    message.newMessageBody = object.newMessageBody ?? new Uint8Array();
    message.newDestinationCaller =
      object.newDestinationCaller ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgReplaceMessageProtoMsg): MsgReplaceMessage {
    return MsgReplaceMessage.decode(message.value);
  },
  toProto(message: MsgReplaceMessage): Uint8Array {
    return MsgReplaceMessage.encode(message).finish();
  },
  toProtoMsg(message: MsgReplaceMessage): MsgReplaceMessageProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgReplaceMessage',
      value: MsgReplaceMessage.encode(message).finish(),
    };
  },
};
function createBaseMsgReplaceMessageResponse(): MsgReplaceMessageResponse {
  return {};
}
export const MsgReplaceMessageResponse = {
  typeUrl: '/circle.cctp.v1.MsgReplaceMessageResponse',
  encode(
    _: MsgReplaceMessageResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgReplaceMessageResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgReplaceMessageResponse();
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
  fromJSON(_: any): MsgReplaceMessageResponse {
    return {};
  },
  toJSON(_: MsgReplaceMessageResponse): JsonSafe<MsgReplaceMessageResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgReplaceMessageResponse>,
  ): MsgReplaceMessageResponse {
    const message = createBaseMsgReplaceMessageResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgReplaceMessageResponseProtoMsg,
  ): MsgReplaceMessageResponse {
    return MsgReplaceMessageResponse.decode(message.value);
  },
  toProto(message: MsgReplaceMessageResponse): Uint8Array {
    return MsgReplaceMessageResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgReplaceMessageResponse,
  ): MsgReplaceMessageResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgReplaceMessageResponse',
      value: MsgReplaceMessageResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateSignatureThreshold(): MsgUpdateSignatureThreshold {
  return {
    from: '',
    amount: 0,
  };
}
export const MsgUpdateSignatureThreshold = {
  typeUrl: '/circle.cctp.v1.MsgUpdateSignatureThreshold',
  encode(
    message: MsgUpdateSignatureThreshold,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.amount !== 0) {
      writer.uint32(16).uint32(message.amount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateSignatureThreshold {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateSignatureThreshold();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.amount = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateSignatureThreshold {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      amount: isSet(object.amount) ? Number(object.amount) : 0,
    };
  },
  toJSON(
    message: MsgUpdateSignatureThreshold,
  ): JsonSafe<MsgUpdateSignatureThreshold> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.amount !== undefined && (obj.amount = Math.round(message.amount));
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateSignatureThreshold>,
  ): MsgUpdateSignatureThreshold {
    const message = createBaseMsgUpdateSignatureThreshold();
    message.from = object.from ?? '';
    message.amount = object.amount ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateSignatureThresholdProtoMsg,
  ): MsgUpdateSignatureThreshold {
    return MsgUpdateSignatureThreshold.decode(message.value);
  },
  toProto(message: MsgUpdateSignatureThreshold): Uint8Array {
    return MsgUpdateSignatureThreshold.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateSignatureThreshold,
  ): MsgUpdateSignatureThresholdProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateSignatureThreshold',
      value: MsgUpdateSignatureThreshold.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateSignatureThresholdResponse(): MsgUpdateSignatureThresholdResponse {
  return {};
}
export const MsgUpdateSignatureThresholdResponse = {
  typeUrl: '/circle.cctp.v1.MsgUpdateSignatureThresholdResponse',
  encode(
    _: MsgUpdateSignatureThresholdResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateSignatureThresholdResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateSignatureThresholdResponse();
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
  fromJSON(_: any): MsgUpdateSignatureThresholdResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateSignatureThresholdResponse,
  ): JsonSafe<MsgUpdateSignatureThresholdResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateSignatureThresholdResponse>,
  ): MsgUpdateSignatureThresholdResponse {
    const message = createBaseMsgUpdateSignatureThresholdResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateSignatureThresholdResponseProtoMsg,
  ): MsgUpdateSignatureThresholdResponse {
    return MsgUpdateSignatureThresholdResponse.decode(message.value);
  },
  toProto(message: MsgUpdateSignatureThresholdResponse): Uint8Array {
    return MsgUpdateSignatureThresholdResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateSignatureThresholdResponse,
  ): MsgUpdateSignatureThresholdResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUpdateSignatureThresholdResponse',
      value: MsgUpdateSignatureThresholdResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgLinkTokenPair(): MsgLinkTokenPair {
  return {
    from: '',
    remoteDomain: 0,
    remoteToken: new Uint8Array(),
    localToken: '',
  };
}
export const MsgLinkTokenPair = {
  typeUrl: '/circle.cctp.v1.MsgLinkTokenPair',
  encode(
    message: MsgLinkTokenPair,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.remoteDomain !== 0) {
      writer.uint32(16).uint32(message.remoteDomain);
    }
    if (message.remoteToken.length !== 0) {
      writer.uint32(26).bytes(message.remoteToken);
    }
    if (message.localToken !== '') {
      writer.uint32(34).string(message.localToken);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgLinkTokenPair {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLinkTokenPair();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.remoteDomain = reader.uint32();
          break;
        case 3:
          message.remoteToken = reader.bytes();
          break;
        case 4:
          message.localToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLinkTokenPair {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      remoteDomain: isSet(object.remoteDomain)
        ? Number(object.remoteDomain)
        : 0,
      remoteToken: isSet(object.remoteToken)
        ? bytesFromBase64(object.remoteToken)
        : new Uint8Array(),
      localToken: isSet(object.localToken) ? String(object.localToken) : '',
    };
  },
  toJSON(message: MsgLinkTokenPair): JsonSafe<MsgLinkTokenPair> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.remoteDomain !== undefined &&
      (obj.remoteDomain = Math.round(message.remoteDomain));
    message.remoteToken !== undefined &&
      (obj.remoteToken = base64FromBytes(
        message.remoteToken !== undefined
          ? message.remoteToken
          : new Uint8Array(),
      ));
    message.localToken !== undefined && (obj.localToken = message.localToken);
    return obj;
  },
  fromPartial(object: Partial<MsgLinkTokenPair>): MsgLinkTokenPair {
    const message = createBaseMsgLinkTokenPair();
    message.from = object.from ?? '';
    message.remoteDomain = object.remoteDomain ?? 0;
    message.remoteToken = object.remoteToken ?? new Uint8Array();
    message.localToken = object.localToken ?? '';
    return message;
  },
  fromProtoMsg(message: MsgLinkTokenPairProtoMsg): MsgLinkTokenPair {
    return MsgLinkTokenPair.decode(message.value);
  },
  toProto(message: MsgLinkTokenPair): Uint8Array {
    return MsgLinkTokenPair.encode(message).finish();
  },
  toProtoMsg(message: MsgLinkTokenPair): MsgLinkTokenPairProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgLinkTokenPair',
      value: MsgLinkTokenPair.encode(message).finish(),
    };
  },
};
function createBaseMsgLinkTokenPairResponse(): MsgLinkTokenPairResponse {
  return {};
}
export const MsgLinkTokenPairResponse = {
  typeUrl: '/circle.cctp.v1.MsgLinkTokenPairResponse',
  encode(
    _: MsgLinkTokenPairResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgLinkTokenPairResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLinkTokenPairResponse();
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
  fromJSON(_: any): MsgLinkTokenPairResponse {
    return {};
  },
  toJSON(_: MsgLinkTokenPairResponse): JsonSafe<MsgLinkTokenPairResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgLinkTokenPairResponse>): MsgLinkTokenPairResponse {
    const message = createBaseMsgLinkTokenPairResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgLinkTokenPairResponseProtoMsg,
  ): MsgLinkTokenPairResponse {
    return MsgLinkTokenPairResponse.decode(message.value);
  },
  toProto(message: MsgLinkTokenPairResponse): Uint8Array {
    return MsgLinkTokenPairResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgLinkTokenPairResponse,
  ): MsgLinkTokenPairResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgLinkTokenPairResponse',
      value: MsgLinkTokenPairResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUnlinkTokenPair(): MsgUnlinkTokenPair {
  return {
    from: '',
    remoteDomain: 0,
    remoteToken: new Uint8Array(),
    localToken: '',
  };
}
export const MsgUnlinkTokenPair = {
  typeUrl: '/circle.cctp.v1.MsgUnlinkTokenPair',
  encode(
    message: MsgUnlinkTokenPair,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.remoteDomain !== 0) {
      writer.uint32(16).uint32(message.remoteDomain);
    }
    if (message.remoteToken.length !== 0) {
      writer.uint32(26).bytes(message.remoteToken);
    }
    if (message.localToken !== '') {
      writer.uint32(34).string(message.localToken);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnlinkTokenPair {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnlinkTokenPair();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.remoteDomain = reader.uint32();
          break;
        case 3:
          message.remoteToken = reader.bytes();
          break;
        case 4:
          message.localToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUnlinkTokenPair {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      remoteDomain: isSet(object.remoteDomain)
        ? Number(object.remoteDomain)
        : 0,
      remoteToken: isSet(object.remoteToken)
        ? bytesFromBase64(object.remoteToken)
        : new Uint8Array(),
      localToken: isSet(object.localToken) ? String(object.localToken) : '',
    };
  },
  toJSON(message: MsgUnlinkTokenPair): JsonSafe<MsgUnlinkTokenPair> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.remoteDomain !== undefined &&
      (obj.remoteDomain = Math.round(message.remoteDomain));
    message.remoteToken !== undefined &&
      (obj.remoteToken = base64FromBytes(
        message.remoteToken !== undefined
          ? message.remoteToken
          : new Uint8Array(),
      ));
    message.localToken !== undefined && (obj.localToken = message.localToken);
    return obj;
  },
  fromPartial(object: Partial<MsgUnlinkTokenPair>): MsgUnlinkTokenPair {
    const message = createBaseMsgUnlinkTokenPair();
    message.from = object.from ?? '';
    message.remoteDomain = object.remoteDomain ?? 0;
    message.remoteToken = object.remoteToken ?? new Uint8Array();
    message.localToken = object.localToken ?? '';
    return message;
  },
  fromProtoMsg(message: MsgUnlinkTokenPairProtoMsg): MsgUnlinkTokenPair {
    return MsgUnlinkTokenPair.decode(message.value);
  },
  toProto(message: MsgUnlinkTokenPair): Uint8Array {
    return MsgUnlinkTokenPair.encode(message).finish();
  },
  toProtoMsg(message: MsgUnlinkTokenPair): MsgUnlinkTokenPairProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUnlinkTokenPair',
      value: MsgUnlinkTokenPair.encode(message).finish(),
    };
  },
};
function createBaseMsgUnlinkTokenPairResponse(): MsgUnlinkTokenPairResponse {
  return {};
}
export const MsgUnlinkTokenPairResponse = {
  typeUrl: '/circle.cctp.v1.MsgUnlinkTokenPairResponse',
  encode(
    _: MsgUnlinkTokenPairResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUnlinkTokenPairResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUnlinkTokenPairResponse();
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
  fromJSON(_: any): MsgUnlinkTokenPairResponse {
    return {};
  },
  toJSON(_: MsgUnlinkTokenPairResponse): JsonSafe<MsgUnlinkTokenPairResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUnlinkTokenPairResponse>,
  ): MsgUnlinkTokenPairResponse {
    const message = createBaseMsgUnlinkTokenPairResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUnlinkTokenPairResponseProtoMsg,
  ): MsgUnlinkTokenPairResponse {
    return MsgUnlinkTokenPairResponse.decode(message.value);
  },
  toProto(message: MsgUnlinkTokenPairResponse): Uint8Array {
    return MsgUnlinkTokenPairResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUnlinkTokenPairResponse,
  ): MsgUnlinkTokenPairResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgUnlinkTokenPairResponse',
      value: MsgUnlinkTokenPairResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgAddRemoteTokenMessenger(): MsgAddRemoteTokenMessenger {
  return {
    from: '',
    domainId: 0,
    address: new Uint8Array(),
  };
}
export const MsgAddRemoteTokenMessenger = {
  typeUrl: '/circle.cctp.v1.MsgAddRemoteTokenMessenger',
  encode(
    message: MsgAddRemoteTokenMessenger,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.domainId !== 0) {
      writer.uint32(16).uint32(message.domainId);
    }
    if (message.address.length !== 0) {
      writer.uint32(26).bytes(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAddRemoteTokenMessenger {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAddRemoteTokenMessenger();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.domainId = reader.uint32();
          break;
        case 3:
          message.address = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAddRemoteTokenMessenger {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      domainId: isSet(object.domainId) ? Number(object.domainId) : 0,
      address: isSet(object.address)
        ? bytesFromBase64(object.address)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: MsgAddRemoteTokenMessenger,
  ): JsonSafe<MsgAddRemoteTokenMessenger> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.domainId !== undefined &&
      (obj.domainId = Math.round(message.domainId));
    message.address !== undefined &&
      (obj.address = base64FromBytes(
        message.address !== undefined ? message.address : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<MsgAddRemoteTokenMessenger>,
  ): MsgAddRemoteTokenMessenger {
    const message = createBaseMsgAddRemoteTokenMessenger();
    message.from = object.from ?? '';
    message.domainId = object.domainId ?? 0;
    message.address = object.address ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: MsgAddRemoteTokenMessengerProtoMsg,
  ): MsgAddRemoteTokenMessenger {
    return MsgAddRemoteTokenMessenger.decode(message.value);
  },
  toProto(message: MsgAddRemoteTokenMessenger): Uint8Array {
    return MsgAddRemoteTokenMessenger.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAddRemoteTokenMessenger,
  ): MsgAddRemoteTokenMessengerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgAddRemoteTokenMessenger',
      value: MsgAddRemoteTokenMessenger.encode(message).finish(),
    };
  },
};
function createBaseMsgAddRemoteTokenMessengerResponse(): MsgAddRemoteTokenMessengerResponse {
  return {};
}
export const MsgAddRemoteTokenMessengerResponse = {
  typeUrl: '/circle.cctp.v1.MsgAddRemoteTokenMessengerResponse',
  encode(
    _: MsgAddRemoteTokenMessengerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAddRemoteTokenMessengerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAddRemoteTokenMessengerResponse();
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
  fromJSON(_: any): MsgAddRemoteTokenMessengerResponse {
    return {};
  },
  toJSON(
    _: MsgAddRemoteTokenMessengerResponse,
  ): JsonSafe<MsgAddRemoteTokenMessengerResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgAddRemoteTokenMessengerResponse>,
  ): MsgAddRemoteTokenMessengerResponse {
    const message = createBaseMsgAddRemoteTokenMessengerResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgAddRemoteTokenMessengerResponseProtoMsg,
  ): MsgAddRemoteTokenMessengerResponse {
    return MsgAddRemoteTokenMessengerResponse.decode(message.value);
  },
  toProto(message: MsgAddRemoteTokenMessengerResponse): Uint8Array {
    return MsgAddRemoteTokenMessengerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAddRemoteTokenMessengerResponse,
  ): MsgAddRemoteTokenMessengerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgAddRemoteTokenMessengerResponse',
      value: MsgAddRemoteTokenMessengerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRemoveRemoteTokenMessenger(): MsgRemoveRemoteTokenMessenger {
  return {
    from: '',
    domainId: 0,
  };
}
export const MsgRemoveRemoteTokenMessenger = {
  typeUrl: '/circle.cctp.v1.MsgRemoveRemoteTokenMessenger',
  encode(
    message: MsgRemoveRemoteTokenMessenger,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.domainId !== 0) {
      writer.uint32(16).uint32(message.domainId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRemoveRemoteTokenMessenger {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveRemoteTokenMessenger();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.domainId = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRemoveRemoteTokenMessenger {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      domainId: isSet(object.domainId) ? Number(object.domainId) : 0,
    };
  },
  toJSON(
    message: MsgRemoveRemoteTokenMessenger,
  ): JsonSafe<MsgRemoveRemoteTokenMessenger> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.domainId !== undefined &&
      (obj.domainId = Math.round(message.domainId));
    return obj;
  },
  fromPartial(
    object: Partial<MsgRemoveRemoteTokenMessenger>,
  ): MsgRemoveRemoteTokenMessenger {
    const message = createBaseMsgRemoveRemoteTokenMessenger();
    message.from = object.from ?? '';
    message.domainId = object.domainId ?? 0;
    return message;
  },
  fromProtoMsg(
    message: MsgRemoveRemoteTokenMessengerProtoMsg,
  ): MsgRemoveRemoteTokenMessenger {
    return MsgRemoveRemoteTokenMessenger.decode(message.value);
  },
  toProto(message: MsgRemoveRemoteTokenMessenger): Uint8Array {
    return MsgRemoveRemoteTokenMessenger.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRemoveRemoteTokenMessenger,
  ): MsgRemoveRemoteTokenMessengerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgRemoveRemoteTokenMessenger',
      value: MsgRemoveRemoteTokenMessenger.encode(message).finish(),
    };
  },
};
function createBaseMsgRemoveRemoteTokenMessengerResponse(): MsgRemoveRemoteTokenMessengerResponse {
  return {};
}
export const MsgRemoveRemoteTokenMessengerResponse = {
  typeUrl: '/circle.cctp.v1.MsgRemoveRemoteTokenMessengerResponse',
  encode(
    _: MsgRemoveRemoteTokenMessengerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRemoveRemoteTokenMessengerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveRemoteTokenMessengerResponse();
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
  fromJSON(_: any): MsgRemoveRemoteTokenMessengerResponse {
    return {};
  },
  toJSON(
    _: MsgRemoveRemoteTokenMessengerResponse,
  ): JsonSafe<MsgRemoveRemoteTokenMessengerResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgRemoveRemoteTokenMessengerResponse>,
  ): MsgRemoveRemoteTokenMessengerResponse {
    const message = createBaseMsgRemoveRemoteTokenMessengerResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgRemoveRemoteTokenMessengerResponseProtoMsg,
  ): MsgRemoveRemoteTokenMessengerResponse {
    return MsgRemoveRemoteTokenMessengerResponse.decode(message.value);
  },
  toProto(message: MsgRemoveRemoteTokenMessengerResponse): Uint8Array {
    return MsgRemoveRemoteTokenMessengerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRemoveRemoteTokenMessengerResponse,
  ): MsgRemoveRemoteTokenMessengerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgRemoveRemoteTokenMessengerResponse',
      value: MsgRemoveRemoteTokenMessengerResponse.encode(message).finish(),
    };
  },
};
