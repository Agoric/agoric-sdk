//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/**
 * Emitted when an attester is enabled
 * @param attester newly enabled attester
 * @name AttesterEnabled
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterEnabled
 */
export interface AttesterEnabled {
  attester: string;
}
export interface AttesterEnabledProtoMsg {
  typeUrl: '/circle.cctp.v1.AttesterEnabled';
  value: Uint8Array;
}
/**
 * Emitted when an attester is enabled
 * @param attester newly enabled attester
 * @name AttesterEnabledSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterEnabled
 */
export interface AttesterEnabledSDKType {
  attester: string;
}
/**
 * Emitted when an attester is disabled
 * @param attester newly disabled attester
 * @name AttesterDisabled
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterDisabled
 */
export interface AttesterDisabled {
  attester: string;
}
export interface AttesterDisabledProtoMsg {
  typeUrl: '/circle.cctp.v1.AttesterDisabled';
  value: Uint8Array;
}
/**
 * Emitted when an attester is disabled
 * @param attester newly disabled attester
 * @name AttesterDisabledSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterDisabled
 */
export interface AttesterDisabledSDKType {
  attester: string;
}
/**
 * Emitted when threshold number of attestations (m in m/n multisig) is updated
 * @param old_signature_threshold old signature threshold
 * @param new_signature_threshold new signature threshold
 * @name SignatureThresholdUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SignatureThresholdUpdated
 */
export interface SignatureThresholdUpdated {
  oldSignatureThreshold: bigint;
  newSignatureThreshold: bigint;
}
export interface SignatureThresholdUpdatedProtoMsg {
  typeUrl: '/circle.cctp.v1.SignatureThresholdUpdated';
  value: Uint8Array;
}
/**
 * Emitted when threshold number of attestations (m in m/n multisig) is updated
 * @param old_signature_threshold old signature threshold
 * @param new_signature_threshold new signature threshold
 * @name SignatureThresholdUpdatedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SignatureThresholdUpdated
 */
export interface SignatureThresholdUpdatedSDKType {
  old_signature_threshold: bigint;
  new_signature_threshold: bigint;
}
/**
 * Emitted when owner address is updated
 * @param previous_owner representing the address of the previous owner
 * @param new_owner representing the address of the new owner
 * @name OwnerUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnerUpdated
 */
export interface OwnerUpdated {
  previousOwner: string;
  newOwner: string;
}
export interface OwnerUpdatedProtoMsg {
  typeUrl: '/circle.cctp.v1.OwnerUpdated';
  value: Uint8Array;
}
/**
 * Emitted when owner address is updated
 * @param previous_owner representing the address of the previous owner
 * @param new_owner representing the address of the new owner
 * @name OwnerUpdatedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnerUpdated
 */
export interface OwnerUpdatedSDKType {
  previous_owner: string;
  new_owner: string;
}
/**
 * Emitted when starting the two stage transfer ownership process
 * @param previousOwner representing the address of the previous owner
 * @param newOwner representing the address of the new owner
 * @name OwnershipTransferStarted
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnershipTransferStarted
 */
export interface OwnershipTransferStarted {
  previousOwner: string;
  newOwner: string;
}
export interface OwnershipTransferStartedProtoMsg {
  typeUrl: '/circle.cctp.v1.OwnershipTransferStarted';
  value: Uint8Array;
}
/**
 * Emitted when starting the two stage transfer ownership process
 * @param previousOwner representing the address of the previous owner
 * @param newOwner representing the address of the new owner
 * @name OwnershipTransferStartedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnershipTransferStarted
 */
export interface OwnershipTransferStartedSDKType {
  previous_owner: string;
  new_owner: string;
}
/**
 * Emitted when pauser address is updated
 * @param previous_pauser representing the address of the previous pauser
 * @param new_pauser representing the address of the new pauser
 * @name PauserUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.PauserUpdated
 */
export interface PauserUpdated {
  previousPauser: string;
  newPauser: string;
}
export interface PauserUpdatedProtoMsg {
  typeUrl: '/circle.cctp.v1.PauserUpdated';
  value: Uint8Array;
}
/**
 * Emitted when pauser address is updated
 * @param previous_pauser representing the address of the previous pauser
 * @param new_pauser representing the address of the new pauser
 * @name PauserUpdatedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.PauserUpdated
 */
export interface PauserUpdatedSDKType {
  previous_pauser: string;
  new_pauser: string;
}
/**
 * Emitted when attester manager address is updated
 * @param previous_attester_manager representing the address of the previous
 * attester manager
 * @param new_attester_manager representing the address of the new attester
 * manager
 * @name AttesterManagerUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterManagerUpdated
 */
export interface AttesterManagerUpdated {
  previousAttesterManager: string;
  newAttesterManager: string;
}
export interface AttesterManagerUpdatedProtoMsg {
  typeUrl: '/circle.cctp.v1.AttesterManagerUpdated';
  value: Uint8Array;
}
/**
 * Emitted when attester manager address is updated
 * @param previous_attester_manager representing the address of the previous
 * attester manager
 * @param new_attester_manager representing the address of the new attester
 * manager
 * @name AttesterManagerUpdatedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterManagerUpdated
 */
export interface AttesterManagerUpdatedSDKType {
  previous_attester_manager: string;
  new_attester_manager: string;
}
/**
 * Emitted when token controller address is updated
 * @param previous_token_controller representing the address of the previous
 * token controller
 * @param new_token_controller representing the address of the new token
 * controller
 * @name TokenControllerUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenControllerUpdated
 */
export interface TokenControllerUpdated {
  previousTokenController: string;
  newTokenController: string;
}
export interface TokenControllerUpdatedProtoMsg {
  typeUrl: '/circle.cctp.v1.TokenControllerUpdated';
  value: Uint8Array;
}
/**
 * Emitted when token controller address is updated
 * @param previous_token_controller representing the address of the previous
 * token controller
 * @param new_token_controller representing the address of the new token
 * controller
 * @name TokenControllerUpdatedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenControllerUpdated
 */
export interface TokenControllerUpdatedSDKType {
  previous_token_controller: string;
  new_token_controller: string;
}
/**
 * Emitted when burning and minting tokens is paused
 * @name BurningAndMintingPausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingPausedEvent
 */
export interface BurningAndMintingPausedEvent {}
export interface BurningAndMintingPausedEventProtoMsg {
  typeUrl: '/circle.cctp.v1.BurningAndMintingPausedEvent';
  value: Uint8Array;
}
/**
 * Emitted when burning and minting tokens is paused
 * @name BurningAndMintingPausedEventSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingPausedEvent
 */
export interface BurningAndMintingPausedEventSDKType {}
/**
 * Emitted when burning and minting tokens is unpaused
 * @name BurningAndMintingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingUnpausedEvent
 */
export interface BurningAndMintingUnpausedEvent {}
export interface BurningAndMintingUnpausedEventProtoMsg {
  typeUrl: '/circle.cctp.v1.BurningAndMintingUnpausedEvent';
  value: Uint8Array;
}
/**
 * Emitted when burning and minting tokens is unpaused
 * @name BurningAndMintingUnpausedEventSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingUnpausedEvent
 */
export interface BurningAndMintingUnpausedEventSDKType {}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingPausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingPausedEvent
 */
export interface SendingAndReceivingPausedEvent {}
export interface SendingAndReceivingPausedEventProtoMsg {
  typeUrl: '/circle.cctp.v1.SendingAndReceivingPausedEvent';
  value: Uint8Array;
}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingPausedEventSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingPausedEvent
 */
export interface SendingAndReceivingPausedEventSDKType {}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingUnpausedEvent
 */
export interface SendingAndReceivingUnpausedEvent {}
export interface SendingAndReceivingUnpausedEventProtoMsg {
  typeUrl: '/circle.cctp.v1.SendingAndReceivingUnpausedEvent';
  value: Uint8Array;
}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingUnpausedEventSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingUnpausedEvent
 */
export interface SendingAndReceivingUnpausedEventSDKType {}
/**
 * Emitted when a DepositForBurn message is sent
 * @param nonce unique nonce reserved by message
 * @param burn_token address of token burnt on source domain
 * @param amount deposit amount
 * @param depositor address where deposit is transferred from
 * @param mint_recipient address receiving minted tokens on destination domain
 * as bytes32
 * @param destination_domain destination domain
 * @param destination_token_messenger address of TokenMessenger on destination
 * domain as bytes32
 * @param destination_caller authorized caller as bytes32 of receiveMessage() on
 * destination domain, if not equal to bytes32(0). If equal to bytes32(0), any
 * address can call receiveMessage().
 * @name DepositForBurn
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.DepositForBurn
 */
export interface DepositForBurn {
  nonce: bigint;
  burnToken: string;
  amount: string;
  depositor: string;
  mintRecipient: Uint8Array;
  destinationDomain: number;
  destinationTokenMessenger: Uint8Array;
  destinationCaller: Uint8Array;
}
export interface DepositForBurnProtoMsg {
  typeUrl: '/circle.cctp.v1.DepositForBurn';
  value: Uint8Array;
}
/**
 * Emitted when a DepositForBurn message is sent
 * @param nonce unique nonce reserved by message
 * @param burn_token address of token burnt on source domain
 * @param amount deposit amount
 * @param depositor address where deposit is transferred from
 * @param mint_recipient address receiving minted tokens on destination domain
 * as bytes32
 * @param destination_domain destination domain
 * @param destination_token_messenger address of TokenMessenger on destination
 * domain as bytes32
 * @param destination_caller authorized caller as bytes32 of receiveMessage() on
 * destination domain, if not equal to bytes32(0). If equal to bytes32(0), any
 * address can call receiveMessage().
 * @name DepositForBurnSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.DepositForBurn
 */
export interface DepositForBurnSDKType {
  nonce: bigint;
  burn_token: string;
  amount: string;
  depositor: string;
  mint_recipient: Uint8Array;
  destination_domain: number;
  destination_token_messenger: Uint8Array;
  destination_caller: Uint8Array;
}
/**
 * Emitted when tokens are minted
 * @param mint_recipient recipient address of minted tokens
 * @param amount amount of minted tokens
 * @param mint_token contract address of minted token
 * @name MintAndWithdraw
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MintAndWithdraw
 */
export interface MintAndWithdraw {
  mintRecipient: Uint8Array;
  amount: string;
  mintToken: string;
}
export interface MintAndWithdrawProtoMsg {
  typeUrl: '/circle.cctp.v1.MintAndWithdraw';
  value: Uint8Array;
}
/**
 * Emitted when tokens are minted
 * @param mint_recipient recipient address of minted tokens
 * @param amount amount of minted tokens
 * @param mint_token contract address of minted token
 * @name MintAndWithdrawSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MintAndWithdraw
 */
export interface MintAndWithdrawSDKType {
  mint_recipient: Uint8Array;
  amount: string;
  mint_token: string;
}
/**
 * Emitted when a token pair is linked
 * @param local_token local token to support
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` corresponding to `localToken`
 * @name TokenPairLinked
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairLinked
 */
export interface TokenPairLinked {
  localToken: string;
  remoteDomain: number;
  remoteToken: Uint8Array;
}
export interface TokenPairLinkedProtoMsg {
  typeUrl: '/circle.cctp.v1.TokenPairLinked';
  value: Uint8Array;
}
/**
 * Emitted when a token pair is linked
 * @param local_token local token to support
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` corresponding to `localToken`
 * @name TokenPairLinkedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairLinked
 */
export interface TokenPairLinkedSDKType {
  local_token: string;
  remote_domain: number;
  remote_token: Uint8Array;
}
/**
 * Emitted when a token pair is unlinked
 * @param local_token local token address
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` unlinked from `localToken`
 * @name TokenPairUnlinked
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairUnlinked
 */
export interface TokenPairUnlinked {
  localToken: string;
  remoteDomain: number;
  remoteToken: Uint8Array;
}
export interface TokenPairUnlinkedProtoMsg {
  typeUrl: '/circle.cctp.v1.TokenPairUnlinked';
  value: Uint8Array;
}
/**
 * Emitted when a token pair is unlinked
 * @param local_token local token address
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` unlinked from `localToken`
 * @name TokenPairUnlinkedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairUnlinked
 */
export interface TokenPairUnlinkedSDKType {
  local_token: string;
  remote_domain: number;
  remote_token: Uint8Array;
}
/**
 * Emitted when a new message is dispatched
 * @param message Raw bytes of message
 * @name MessageSent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MessageSent
 */
export interface MessageSent {
  message: Uint8Array;
}
export interface MessageSentProtoMsg {
  typeUrl: '/circle.cctp.v1.MessageSent';
  value: Uint8Array;
}
/**
 * Emitted when a new message is dispatched
 * @param message Raw bytes of message
 * @name MessageSentSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MessageSent
 */
export interface MessageSentSDKType {
  message: Uint8Array;
}
/**
 * Emitted when a new message is received
 * @param caller caller (msg.sender) on destination domain
 * @param source_domain the source domain this message originated from
 * @param nonce the nonce unique to this message
 * @param sender the sender of this message
 * @param message_body message body bytes
 * @name MessageReceived
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MessageReceived
 */
export interface MessageReceived {
  caller: string;
  sourceDomain: number;
  nonce: bigint;
  sender: Uint8Array;
  messageBody: Uint8Array;
}
export interface MessageReceivedProtoMsg {
  typeUrl: '/circle.cctp.v1.MessageReceived';
  value: Uint8Array;
}
/**
 * Emitted when a new message is received
 * @param caller caller (msg.sender) on destination domain
 * @param source_domain the source domain this message originated from
 * @param nonce the nonce unique to this message
 * @param sender the sender of this message
 * @param message_body message body bytes
 * @name MessageReceivedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MessageReceived
 */
export interface MessageReceivedSDKType {
  caller: string;
  source_domain: number;
  nonce: bigint;
  sender: Uint8Array;
  message_body: Uint8Array;
}
/**
 * Emitted when max message body size is updated
 * @param new_max_message_body_size new maximum message body size, in bytes
 * @name MaxMessageBodySizeUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MaxMessageBodySizeUpdated
 */
export interface MaxMessageBodySizeUpdated {
  newMaxMessageBodySize: bigint;
}
export interface MaxMessageBodySizeUpdatedProtoMsg {
  typeUrl: '/circle.cctp.v1.MaxMessageBodySizeUpdated';
  value: Uint8Array;
}
/**
 * Emitted when max message body size is updated
 * @param new_max_message_body_size new maximum message body size, in bytes
 * @name MaxMessageBodySizeUpdatedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MaxMessageBodySizeUpdated
 */
export interface MaxMessageBodySizeUpdatedSDKType {
  new_max_message_body_size: bigint;
}
/**
 * Emitted when a RemoteTokenMessenger is added
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerAdded
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerAdded
 */
export interface RemoteTokenMessengerAdded {
  domain: number;
  remoteTokenMessenger: Uint8Array;
}
export interface RemoteTokenMessengerAddedProtoMsg {
  typeUrl: '/circle.cctp.v1.RemoteTokenMessengerAdded';
  value: Uint8Array;
}
/**
 * Emitted when a RemoteTokenMessenger is added
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerAddedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerAdded
 */
export interface RemoteTokenMessengerAddedSDKType {
  domain: number;
  remote_token_messenger: Uint8Array;
}
/**
 * Emitted when a RemoteTokenMessenger is removed
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerRemoved
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerRemoved
 */
export interface RemoteTokenMessengerRemoved {
  domain: number;
  remoteTokenMessenger: Uint8Array;
}
export interface RemoteTokenMessengerRemovedProtoMsg {
  typeUrl: '/circle.cctp.v1.RemoteTokenMessengerRemoved';
  value: Uint8Array;
}
/**
 * Emitted when a RemoteTokenMessenger is removed
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerRemovedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerRemoved
 */
export interface RemoteTokenMessengerRemovedSDKType {
  domain: number;
  remote_token_messenger: Uint8Array;
}
/**
 * Emitted when max burn amount per message is updated
 * @param local_token
 * @param old_amount old max burn amount
 * @param new_amount new max burn amount
 * @name SetBurnLimitPerMessage
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SetBurnLimitPerMessage
 */
export interface SetBurnLimitPerMessage {
  token: string;
  burnLimitPerMessage: string;
}
export interface SetBurnLimitPerMessageProtoMsg {
  typeUrl: '/circle.cctp.v1.SetBurnLimitPerMessage';
  value: Uint8Array;
}
/**
 * Emitted when max burn amount per message is updated
 * @param local_token
 * @param old_amount old max burn amount
 * @param new_amount new max burn amount
 * @name SetBurnLimitPerMessageSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SetBurnLimitPerMessage
 */
export interface SetBurnLimitPerMessageSDKType {
  token: string;
  burn_limit_per_message: string;
}
function createBaseAttesterEnabled(): AttesterEnabled {
  return {
    attester: '',
  };
}
/**
 * Emitted when an attester is enabled
 * @param attester newly enabled attester
 * @name AttesterEnabled
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterEnabled
 */
export const AttesterEnabled = {
  typeUrl: '/circle.cctp.v1.AttesterEnabled' as const,
  is(o: any): o is AttesterEnabled {
    return (
      o &&
      (o.$typeUrl === AttesterEnabled.typeUrl || typeof o.attester === 'string')
    );
  },
  isSDK(o: any): o is AttesterEnabledSDKType {
    return (
      o &&
      (o.$typeUrl === AttesterEnabled.typeUrl || typeof o.attester === 'string')
    );
  },
  encode(
    message: AttesterEnabled,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.attester !== '') {
      writer.uint32(10).string(message.attester);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AttesterEnabled {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAttesterEnabled();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.attester = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AttesterEnabled {
    return {
      attester: isSet(object.attester) ? String(object.attester) : '',
    };
  },
  toJSON(message: AttesterEnabled): JsonSafe<AttesterEnabled> {
    const obj: any = {};
    message.attester !== undefined && (obj.attester = message.attester);
    return obj;
  },
  fromPartial(object: Partial<AttesterEnabled>): AttesterEnabled {
    const message = createBaseAttesterEnabled();
    message.attester = object.attester ?? '';
    return message;
  },
  fromProtoMsg(message: AttesterEnabledProtoMsg): AttesterEnabled {
    return AttesterEnabled.decode(message.value);
  },
  toProto(message: AttesterEnabled): Uint8Array {
    return AttesterEnabled.encode(message).finish();
  },
  toProtoMsg(message: AttesterEnabled): AttesterEnabledProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.AttesterEnabled',
      value: AttesterEnabled.encode(message).finish(),
    };
  },
};
function createBaseAttesterDisabled(): AttesterDisabled {
  return {
    attester: '',
  };
}
/**
 * Emitted when an attester is disabled
 * @param attester newly disabled attester
 * @name AttesterDisabled
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterDisabled
 */
export const AttesterDisabled = {
  typeUrl: '/circle.cctp.v1.AttesterDisabled' as const,
  is(o: any): o is AttesterDisabled {
    return (
      o &&
      (o.$typeUrl === AttesterDisabled.typeUrl ||
        typeof o.attester === 'string')
    );
  },
  isSDK(o: any): o is AttesterDisabledSDKType {
    return (
      o &&
      (o.$typeUrl === AttesterDisabled.typeUrl ||
        typeof o.attester === 'string')
    );
  },
  encode(
    message: AttesterDisabled,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.attester !== '') {
      writer.uint32(10).string(message.attester);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AttesterDisabled {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAttesterDisabled();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.attester = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AttesterDisabled {
    return {
      attester: isSet(object.attester) ? String(object.attester) : '',
    };
  },
  toJSON(message: AttesterDisabled): JsonSafe<AttesterDisabled> {
    const obj: any = {};
    message.attester !== undefined && (obj.attester = message.attester);
    return obj;
  },
  fromPartial(object: Partial<AttesterDisabled>): AttesterDisabled {
    const message = createBaseAttesterDisabled();
    message.attester = object.attester ?? '';
    return message;
  },
  fromProtoMsg(message: AttesterDisabledProtoMsg): AttesterDisabled {
    return AttesterDisabled.decode(message.value);
  },
  toProto(message: AttesterDisabled): Uint8Array {
    return AttesterDisabled.encode(message).finish();
  },
  toProtoMsg(message: AttesterDisabled): AttesterDisabledProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.AttesterDisabled',
      value: AttesterDisabled.encode(message).finish(),
    };
  },
};
function createBaseSignatureThresholdUpdated(): SignatureThresholdUpdated {
  return {
    oldSignatureThreshold: BigInt(0),
    newSignatureThreshold: BigInt(0),
  };
}
/**
 * Emitted when threshold number of attestations (m in m/n multisig) is updated
 * @param old_signature_threshold old signature threshold
 * @param new_signature_threshold new signature threshold
 * @name SignatureThresholdUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SignatureThresholdUpdated
 */
export const SignatureThresholdUpdated = {
  typeUrl: '/circle.cctp.v1.SignatureThresholdUpdated' as const,
  is(o: any): o is SignatureThresholdUpdated {
    return (
      o &&
      (o.$typeUrl === SignatureThresholdUpdated.typeUrl ||
        (typeof o.oldSignatureThreshold === 'bigint' &&
          typeof o.newSignatureThreshold === 'bigint'))
    );
  },
  isSDK(o: any): o is SignatureThresholdUpdatedSDKType {
    return (
      o &&
      (o.$typeUrl === SignatureThresholdUpdated.typeUrl ||
        (typeof o.old_signature_threshold === 'bigint' &&
          typeof o.new_signature_threshold === 'bigint'))
    );
  },
  encode(
    message: SignatureThresholdUpdated,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.oldSignatureThreshold !== BigInt(0)) {
      writer.uint32(8).uint64(message.oldSignatureThreshold);
    }
    if (message.newSignatureThreshold !== BigInt(0)) {
      writer.uint32(16).uint64(message.newSignatureThreshold);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SignatureThresholdUpdated {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSignatureThresholdUpdated();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.oldSignatureThreshold = reader.uint64();
          break;
        case 2:
          message.newSignatureThreshold = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SignatureThresholdUpdated {
    return {
      oldSignatureThreshold: isSet(object.oldSignatureThreshold)
        ? BigInt(object.oldSignatureThreshold.toString())
        : BigInt(0),
      newSignatureThreshold: isSet(object.newSignatureThreshold)
        ? BigInt(object.newSignatureThreshold.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: SignatureThresholdUpdated,
  ): JsonSafe<SignatureThresholdUpdated> {
    const obj: any = {};
    message.oldSignatureThreshold !== undefined &&
      (obj.oldSignatureThreshold = (
        message.oldSignatureThreshold || BigInt(0)
      ).toString());
    message.newSignatureThreshold !== undefined &&
      (obj.newSignatureThreshold = (
        message.newSignatureThreshold || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(
    object: Partial<SignatureThresholdUpdated>,
  ): SignatureThresholdUpdated {
    const message = createBaseSignatureThresholdUpdated();
    message.oldSignatureThreshold =
      object.oldSignatureThreshold !== undefined &&
      object.oldSignatureThreshold !== null
        ? BigInt(object.oldSignatureThreshold.toString())
        : BigInt(0);
    message.newSignatureThreshold =
      object.newSignatureThreshold !== undefined &&
      object.newSignatureThreshold !== null
        ? BigInt(object.newSignatureThreshold.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: SignatureThresholdUpdatedProtoMsg,
  ): SignatureThresholdUpdated {
    return SignatureThresholdUpdated.decode(message.value);
  },
  toProto(message: SignatureThresholdUpdated): Uint8Array {
    return SignatureThresholdUpdated.encode(message).finish();
  },
  toProtoMsg(
    message: SignatureThresholdUpdated,
  ): SignatureThresholdUpdatedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.SignatureThresholdUpdated',
      value: SignatureThresholdUpdated.encode(message).finish(),
    };
  },
};
function createBaseOwnerUpdated(): OwnerUpdated {
  return {
    previousOwner: '',
    newOwner: '',
  };
}
/**
 * Emitted when owner address is updated
 * @param previous_owner representing the address of the previous owner
 * @param new_owner representing the address of the new owner
 * @name OwnerUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnerUpdated
 */
export const OwnerUpdated = {
  typeUrl: '/circle.cctp.v1.OwnerUpdated' as const,
  is(o: any): o is OwnerUpdated {
    return (
      o &&
      (o.$typeUrl === OwnerUpdated.typeUrl ||
        (typeof o.previousOwner === 'string' && typeof o.newOwner === 'string'))
    );
  },
  isSDK(o: any): o is OwnerUpdatedSDKType {
    return (
      o &&
      (o.$typeUrl === OwnerUpdated.typeUrl ||
        (typeof o.previous_owner === 'string' &&
          typeof o.new_owner === 'string'))
    );
  },
  encode(
    message: OwnerUpdated,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.previousOwner !== '') {
      writer.uint32(10).string(message.previousOwner);
    }
    if (message.newOwner !== '') {
      writer.uint32(18).string(message.newOwner);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): OwnerUpdated {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOwnerUpdated();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.previousOwner = reader.string();
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
  fromJSON(object: any): OwnerUpdated {
    return {
      previousOwner: isSet(object.previousOwner)
        ? String(object.previousOwner)
        : '',
      newOwner: isSet(object.newOwner) ? String(object.newOwner) : '',
    };
  },
  toJSON(message: OwnerUpdated): JsonSafe<OwnerUpdated> {
    const obj: any = {};
    message.previousOwner !== undefined &&
      (obj.previousOwner = message.previousOwner);
    message.newOwner !== undefined && (obj.newOwner = message.newOwner);
    return obj;
  },
  fromPartial(object: Partial<OwnerUpdated>): OwnerUpdated {
    const message = createBaseOwnerUpdated();
    message.previousOwner = object.previousOwner ?? '';
    message.newOwner = object.newOwner ?? '';
    return message;
  },
  fromProtoMsg(message: OwnerUpdatedProtoMsg): OwnerUpdated {
    return OwnerUpdated.decode(message.value);
  },
  toProto(message: OwnerUpdated): Uint8Array {
    return OwnerUpdated.encode(message).finish();
  },
  toProtoMsg(message: OwnerUpdated): OwnerUpdatedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.OwnerUpdated',
      value: OwnerUpdated.encode(message).finish(),
    };
  },
};
function createBaseOwnershipTransferStarted(): OwnershipTransferStarted {
  return {
    previousOwner: '',
    newOwner: '',
  };
}
/**
 * Emitted when starting the two stage transfer ownership process
 * @param previousOwner representing the address of the previous owner
 * @param newOwner representing the address of the new owner
 * @name OwnershipTransferStarted
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnershipTransferStarted
 */
export const OwnershipTransferStarted = {
  typeUrl: '/circle.cctp.v1.OwnershipTransferStarted' as const,
  is(o: any): o is OwnershipTransferStarted {
    return (
      o &&
      (o.$typeUrl === OwnershipTransferStarted.typeUrl ||
        (typeof o.previousOwner === 'string' && typeof o.newOwner === 'string'))
    );
  },
  isSDK(o: any): o is OwnershipTransferStartedSDKType {
    return (
      o &&
      (o.$typeUrl === OwnershipTransferStarted.typeUrl ||
        (typeof o.previous_owner === 'string' &&
          typeof o.new_owner === 'string'))
    );
  },
  encode(
    message: OwnershipTransferStarted,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.previousOwner !== '') {
      writer.uint32(10).string(message.previousOwner);
    }
    if (message.newOwner !== '') {
      writer.uint32(18).string(message.newOwner);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): OwnershipTransferStarted {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOwnershipTransferStarted();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.previousOwner = reader.string();
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
  fromJSON(object: any): OwnershipTransferStarted {
    return {
      previousOwner: isSet(object.previousOwner)
        ? String(object.previousOwner)
        : '',
      newOwner: isSet(object.newOwner) ? String(object.newOwner) : '',
    };
  },
  toJSON(
    message: OwnershipTransferStarted,
  ): JsonSafe<OwnershipTransferStarted> {
    const obj: any = {};
    message.previousOwner !== undefined &&
      (obj.previousOwner = message.previousOwner);
    message.newOwner !== undefined && (obj.newOwner = message.newOwner);
    return obj;
  },
  fromPartial(
    object: Partial<OwnershipTransferStarted>,
  ): OwnershipTransferStarted {
    const message = createBaseOwnershipTransferStarted();
    message.previousOwner = object.previousOwner ?? '';
    message.newOwner = object.newOwner ?? '';
    return message;
  },
  fromProtoMsg(
    message: OwnershipTransferStartedProtoMsg,
  ): OwnershipTransferStarted {
    return OwnershipTransferStarted.decode(message.value);
  },
  toProto(message: OwnershipTransferStarted): Uint8Array {
    return OwnershipTransferStarted.encode(message).finish();
  },
  toProtoMsg(
    message: OwnershipTransferStarted,
  ): OwnershipTransferStartedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.OwnershipTransferStarted',
      value: OwnershipTransferStarted.encode(message).finish(),
    };
  },
};
function createBasePauserUpdated(): PauserUpdated {
  return {
    previousPauser: '',
    newPauser: '',
  };
}
/**
 * Emitted when pauser address is updated
 * @param previous_pauser representing the address of the previous pauser
 * @param new_pauser representing the address of the new pauser
 * @name PauserUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.PauserUpdated
 */
export const PauserUpdated = {
  typeUrl: '/circle.cctp.v1.PauserUpdated' as const,
  is(o: any): o is PauserUpdated {
    return (
      o &&
      (o.$typeUrl === PauserUpdated.typeUrl ||
        (typeof o.previousPauser === 'string' &&
          typeof o.newPauser === 'string'))
    );
  },
  isSDK(o: any): o is PauserUpdatedSDKType {
    return (
      o &&
      (o.$typeUrl === PauserUpdated.typeUrl ||
        (typeof o.previous_pauser === 'string' &&
          typeof o.new_pauser === 'string'))
    );
  },
  encode(
    message: PauserUpdated,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.previousPauser !== '') {
      writer.uint32(10).string(message.previousPauser);
    }
    if (message.newPauser !== '') {
      writer.uint32(18).string(message.newPauser);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PauserUpdated {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePauserUpdated();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.previousPauser = reader.string();
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
  fromJSON(object: any): PauserUpdated {
    return {
      previousPauser: isSet(object.previousPauser)
        ? String(object.previousPauser)
        : '',
      newPauser: isSet(object.newPauser) ? String(object.newPauser) : '',
    };
  },
  toJSON(message: PauserUpdated): JsonSafe<PauserUpdated> {
    const obj: any = {};
    message.previousPauser !== undefined &&
      (obj.previousPauser = message.previousPauser);
    message.newPauser !== undefined && (obj.newPauser = message.newPauser);
    return obj;
  },
  fromPartial(object: Partial<PauserUpdated>): PauserUpdated {
    const message = createBasePauserUpdated();
    message.previousPauser = object.previousPauser ?? '';
    message.newPauser = object.newPauser ?? '';
    return message;
  },
  fromProtoMsg(message: PauserUpdatedProtoMsg): PauserUpdated {
    return PauserUpdated.decode(message.value);
  },
  toProto(message: PauserUpdated): Uint8Array {
    return PauserUpdated.encode(message).finish();
  },
  toProtoMsg(message: PauserUpdated): PauserUpdatedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.PauserUpdated',
      value: PauserUpdated.encode(message).finish(),
    };
  },
};
function createBaseAttesterManagerUpdated(): AttesterManagerUpdated {
  return {
    previousAttesterManager: '',
    newAttesterManager: '',
  };
}
/**
 * Emitted when attester manager address is updated
 * @param previous_attester_manager representing the address of the previous
 * attester manager
 * @param new_attester_manager representing the address of the new attester
 * manager
 * @name AttesterManagerUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterManagerUpdated
 */
export const AttesterManagerUpdated = {
  typeUrl: '/circle.cctp.v1.AttesterManagerUpdated' as const,
  is(o: any): o is AttesterManagerUpdated {
    return (
      o &&
      (o.$typeUrl === AttesterManagerUpdated.typeUrl ||
        (typeof o.previousAttesterManager === 'string' &&
          typeof o.newAttesterManager === 'string'))
    );
  },
  isSDK(o: any): o is AttesterManagerUpdatedSDKType {
    return (
      o &&
      (o.$typeUrl === AttesterManagerUpdated.typeUrl ||
        (typeof o.previous_attester_manager === 'string' &&
          typeof o.new_attester_manager === 'string'))
    );
  },
  encode(
    message: AttesterManagerUpdated,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.previousAttesterManager !== '') {
      writer.uint32(10).string(message.previousAttesterManager);
    }
    if (message.newAttesterManager !== '') {
      writer.uint32(18).string(message.newAttesterManager);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AttesterManagerUpdated {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAttesterManagerUpdated();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.previousAttesterManager = reader.string();
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
  fromJSON(object: any): AttesterManagerUpdated {
    return {
      previousAttesterManager: isSet(object.previousAttesterManager)
        ? String(object.previousAttesterManager)
        : '',
      newAttesterManager: isSet(object.newAttesterManager)
        ? String(object.newAttesterManager)
        : '',
    };
  },
  toJSON(message: AttesterManagerUpdated): JsonSafe<AttesterManagerUpdated> {
    const obj: any = {};
    message.previousAttesterManager !== undefined &&
      (obj.previousAttesterManager = message.previousAttesterManager);
    message.newAttesterManager !== undefined &&
      (obj.newAttesterManager = message.newAttesterManager);
    return obj;
  },
  fromPartial(object: Partial<AttesterManagerUpdated>): AttesterManagerUpdated {
    const message = createBaseAttesterManagerUpdated();
    message.previousAttesterManager = object.previousAttesterManager ?? '';
    message.newAttesterManager = object.newAttesterManager ?? '';
    return message;
  },
  fromProtoMsg(
    message: AttesterManagerUpdatedProtoMsg,
  ): AttesterManagerUpdated {
    return AttesterManagerUpdated.decode(message.value);
  },
  toProto(message: AttesterManagerUpdated): Uint8Array {
    return AttesterManagerUpdated.encode(message).finish();
  },
  toProtoMsg(message: AttesterManagerUpdated): AttesterManagerUpdatedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.AttesterManagerUpdated',
      value: AttesterManagerUpdated.encode(message).finish(),
    };
  },
};
function createBaseTokenControllerUpdated(): TokenControllerUpdated {
  return {
    previousTokenController: '',
    newTokenController: '',
  };
}
/**
 * Emitted when token controller address is updated
 * @param previous_token_controller representing the address of the previous
 * token controller
 * @param new_token_controller representing the address of the new token
 * controller
 * @name TokenControllerUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenControllerUpdated
 */
export const TokenControllerUpdated = {
  typeUrl: '/circle.cctp.v1.TokenControllerUpdated' as const,
  is(o: any): o is TokenControllerUpdated {
    return (
      o &&
      (o.$typeUrl === TokenControllerUpdated.typeUrl ||
        (typeof o.previousTokenController === 'string' &&
          typeof o.newTokenController === 'string'))
    );
  },
  isSDK(o: any): o is TokenControllerUpdatedSDKType {
    return (
      o &&
      (o.$typeUrl === TokenControllerUpdated.typeUrl ||
        (typeof o.previous_token_controller === 'string' &&
          typeof o.new_token_controller === 'string'))
    );
  },
  encode(
    message: TokenControllerUpdated,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.previousTokenController !== '') {
      writer.uint32(10).string(message.previousTokenController);
    }
    if (message.newTokenController !== '') {
      writer.uint32(18).string(message.newTokenController);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TokenControllerUpdated {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTokenControllerUpdated();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.previousTokenController = reader.string();
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
  fromJSON(object: any): TokenControllerUpdated {
    return {
      previousTokenController: isSet(object.previousTokenController)
        ? String(object.previousTokenController)
        : '',
      newTokenController: isSet(object.newTokenController)
        ? String(object.newTokenController)
        : '',
    };
  },
  toJSON(message: TokenControllerUpdated): JsonSafe<TokenControllerUpdated> {
    const obj: any = {};
    message.previousTokenController !== undefined &&
      (obj.previousTokenController = message.previousTokenController);
    message.newTokenController !== undefined &&
      (obj.newTokenController = message.newTokenController);
    return obj;
  },
  fromPartial(object: Partial<TokenControllerUpdated>): TokenControllerUpdated {
    const message = createBaseTokenControllerUpdated();
    message.previousTokenController = object.previousTokenController ?? '';
    message.newTokenController = object.newTokenController ?? '';
    return message;
  },
  fromProtoMsg(
    message: TokenControllerUpdatedProtoMsg,
  ): TokenControllerUpdated {
    return TokenControllerUpdated.decode(message.value);
  },
  toProto(message: TokenControllerUpdated): Uint8Array {
    return TokenControllerUpdated.encode(message).finish();
  },
  toProtoMsg(message: TokenControllerUpdated): TokenControllerUpdatedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.TokenControllerUpdated',
      value: TokenControllerUpdated.encode(message).finish(),
    };
  },
};
function createBaseBurningAndMintingPausedEvent(): BurningAndMintingPausedEvent {
  return {};
}
/**
 * Emitted when burning and minting tokens is paused
 * @name BurningAndMintingPausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingPausedEvent
 */
export const BurningAndMintingPausedEvent = {
  typeUrl: '/circle.cctp.v1.BurningAndMintingPausedEvent' as const,
  is(o: any): o is BurningAndMintingPausedEvent {
    return o && o.$typeUrl === BurningAndMintingPausedEvent.typeUrl;
  },
  isSDK(o: any): o is BurningAndMintingPausedEventSDKType {
    return o && o.$typeUrl === BurningAndMintingPausedEvent.typeUrl;
  },
  encode(
    _: BurningAndMintingPausedEvent,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): BurningAndMintingPausedEvent {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBurningAndMintingPausedEvent();
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
  fromJSON(_: any): BurningAndMintingPausedEvent {
    return {};
  },
  toJSON(
    _: BurningAndMintingPausedEvent,
  ): JsonSafe<BurningAndMintingPausedEvent> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<BurningAndMintingPausedEvent>,
  ): BurningAndMintingPausedEvent {
    const message = createBaseBurningAndMintingPausedEvent();
    return message;
  },
  fromProtoMsg(
    message: BurningAndMintingPausedEventProtoMsg,
  ): BurningAndMintingPausedEvent {
    return BurningAndMintingPausedEvent.decode(message.value);
  },
  toProto(message: BurningAndMintingPausedEvent): Uint8Array {
    return BurningAndMintingPausedEvent.encode(message).finish();
  },
  toProtoMsg(
    message: BurningAndMintingPausedEvent,
  ): BurningAndMintingPausedEventProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.BurningAndMintingPausedEvent',
      value: BurningAndMintingPausedEvent.encode(message).finish(),
    };
  },
};
function createBaseBurningAndMintingUnpausedEvent(): BurningAndMintingUnpausedEvent {
  return {};
}
/**
 * Emitted when burning and minting tokens is unpaused
 * @name BurningAndMintingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingUnpausedEvent
 */
export const BurningAndMintingUnpausedEvent = {
  typeUrl: '/circle.cctp.v1.BurningAndMintingUnpausedEvent' as const,
  is(o: any): o is BurningAndMintingUnpausedEvent {
    return o && o.$typeUrl === BurningAndMintingUnpausedEvent.typeUrl;
  },
  isSDK(o: any): o is BurningAndMintingUnpausedEventSDKType {
    return o && o.$typeUrl === BurningAndMintingUnpausedEvent.typeUrl;
  },
  encode(
    _: BurningAndMintingUnpausedEvent,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): BurningAndMintingUnpausedEvent {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBurningAndMintingUnpausedEvent();
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
  fromJSON(_: any): BurningAndMintingUnpausedEvent {
    return {};
  },
  toJSON(
    _: BurningAndMintingUnpausedEvent,
  ): JsonSafe<BurningAndMintingUnpausedEvent> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<BurningAndMintingUnpausedEvent>,
  ): BurningAndMintingUnpausedEvent {
    const message = createBaseBurningAndMintingUnpausedEvent();
    return message;
  },
  fromProtoMsg(
    message: BurningAndMintingUnpausedEventProtoMsg,
  ): BurningAndMintingUnpausedEvent {
    return BurningAndMintingUnpausedEvent.decode(message.value);
  },
  toProto(message: BurningAndMintingUnpausedEvent): Uint8Array {
    return BurningAndMintingUnpausedEvent.encode(message).finish();
  },
  toProtoMsg(
    message: BurningAndMintingUnpausedEvent,
  ): BurningAndMintingUnpausedEventProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.BurningAndMintingUnpausedEvent',
      value: BurningAndMintingUnpausedEvent.encode(message).finish(),
    };
  },
};
function createBaseSendingAndReceivingPausedEvent(): SendingAndReceivingPausedEvent {
  return {};
}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingPausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingPausedEvent
 */
export const SendingAndReceivingPausedEvent = {
  typeUrl: '/circle.cctp.v1.SendingAndReceivingPausedEvent' as const,
  is(o: any): o is SendingAndReceivingPausedEvent {
    return o && o.$typeUrl === SendingAndReceivingPausedEvent.typeUrl;
  },
  isSDK(o: any): o is SendingAndReceivingPausedEventSDKType {
    return o && o.$typeUrl === SendingAndReceivingPausedEvent.typeUrl;
  },
  encode(
    _: SendingAndReceivingPausedEvent,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SendingAndReceivingPausedEvent {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSendingAndReceivingPausedEvent();
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
  fromJSON(_: any): SendingAndReceivingPausedEvent {
    return {};
  },
  toJSON(
    _: SendingAndReceivingPausedEvent,
  ): JsonSafe<SendingAndReceivingPausedEvent> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<SendingAndReceivingPausedEvent>,
  ): SendingAndReceivingPausedEvent {
    const message = createBaseSendingAndReceivingPausedEvent();
    return message;
  },
  fromProtoMsg(
    message: SendingAndReceivingPausedEventProtoMsg,
  ): SendingAndReceivingPausedEvent {
    return SendingAndReceivingPausedEvent.decode(message.value);
  },
  toProto(message: SendingAndReceivingPausedEvent): Uint8Array {
    return SendingAndReceivingPausedEvent.encode(message).finish();
  },
  toProtoMsg(
    message: SendingAndReceivingPausedEvent,
  ): SendingAndReceivingPausedEventProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.SendingAndReceivingPausedEvent',
      value: SendingAndReceivingPausedEvent.encode(message).finish(),
    };
  },
};
function createBaseSendingAndReceivingUnpausedEvent(): SendingAndReceivingUnpausedEvent {
  return {};
}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingUnpausedEvent
 */
export const SendingAndReceivingUnpausedEvent = {
  typeUrl: '/circle.cctp.v1.SendingAndReceivingUnpausedEvent' as const,
  is(o: any): o is SendingAndReceivingUnpausedEvent {
    return o && o.$typeUrl === SendingAndReceivingUnpausedEvent.typeUrl;
  },
  isSDK(o: any): o is SendingAndReceivingUnpausedEventSDKType {
    return o && o.$typeUrl === SendingAndReceivingUnpausedEvent.typeUrl;
  },
  encode(
    _: SendingAndReceivingUnpausedEvent,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SendingAndReceivingUnpausedEvent {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSendingAndReceivingUnpausedEvent();
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
  fromJSON(_: any): SendingAndReceivingUnpausedEvent {
    return {};
  },
  toJSON(
    _: SendingAndReceivingUnpausedEvent,
  ): JsonSafe<SendingAndReceivingUnpausedEvent> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<SendingAndReceivingUnpausedEvent>,
  ): SendingAndReceivingUnpausedEvent {
    const message = createBaseSendingAndReceivingUnpausedEvent();
    return message;
  },
  fromProtoMsg(
    message: SendingAndReceivingUnpausedEventProtoMsg,
  ): SendingAndReceivingUnpausedEvent {
    return SendingAndReceivingUnpausedEvent.decode(message.value);
  },
  toProto(message: SendingAndReceivingUnpausedEvent): Uint8Array {
    return SendingAndReceivingUnpausedEvent.encode(message).finish();
  },
  toProtoMsg(
    message: SendingAndReceivingUnpausedEvent,
  ): SendingAndReceivingUnpausedEventProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.SendingAndReceivingUnpausedEvent',
      value: SendingAndReceivingUnpausedEvent.encode(message).finish(),
    };
  },
};
function createBaseDepositForBurn(): DepositForBurn {
  return {
    nonce: BigInt(0),
    burnToken: '',
    amount: '',
    depositor: '',
    mintRecipient: new Uint8Array(),
    destinationDomain: 0,
    destinationTokenMessenger: new Uint8Array(),
    destinationCaller: new Uint8Array(),
  };
}
/**
 * Emitted when a DepositForBurn message is sent
 * @param nonce unique nonce reserved by message
 * @param burn_token address of token burnt on source domain
 * @param amount deposit amount
 * @param depositor address where deposit is transferred from
 * @param mint_recipient address receiving minted tokens on destination domain
 * as bytes32
 * @param destination_domain destination domain
 * @param destination_token_messenger address of TokenMessenger on destination
 * domain as bytes32
 * @param destination_caller authorized caller as bytes32 of receiveMessage() on
 * destination domain, if not equal to bytes32(0). If equal to bytes32(0), any
 * address can call receiveMessage().
 * @name DepositForBurn
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.DepositForBurn
 */
export const DepositForBurn = {
  typeUrl: '/circle.cctp.v1.DepositForBurn' as const,
  is(o: any): o is DepositForBurn {
    return (
      o &&
      (o.$typeUrl === DepositForBurn.typeUrl ||
        (typeof o.nonce === 'bigint' &&
          typeof o.burnToken === 'string' &&
          typeof o.amount === 'string' &&
          typeof o.depositor === 'string' &&
          (o.mintRecipient instanceof Uint8Array ||
            typeof o.mintRecipient === 'string') &&
          typeof o.destinationDomain === 'number' &&
          (o.destinationTokenMessenger instanceof Uint8Array ||
            typeof o.destinationTokenMessenger === 'string') &&
          (o.destinationCaller instanceof Uint8Array ||
            typeof o.destinationCaller === 'string')))
    );
  },
  isSDK(o: any): o is DepositForBurnSDKType {
    return (
      o &&
      (o.$typeUrl === DepositForBurn.typeUrl ||
        (typeof o.nonce === 'bigint' &&
          typeof o.burn_token === 'string' &&
          typeof o.amount === 'string' &&
          typeof o.depositor === 'string' &&
          (o.mint_recipient instanceof Uint8Array ||
            typeof o.mint_recipient === 'string') &&
          typeof o.destination_domain === 'number' &&
          (o.destination_token_messenger instanceof Uint8Array ||
            typeof o.destination_token_messenger === 'string') &&
          (o.destination_caller instanceof Uint8Array ||
            typeof o.destination_caller === 'string')))
    );
  },
  encode(
    message: DepositForBurn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== BigInt(0)) {
      writer.uint32(8).uint64(message.nonce);
    }
    if (message.burnToken !== '') {
      writer.uint32(18).string(message.burnToken);
    }
    if (message.amount !== '') {
      writer.uint32(26).string(message.amount);
    }
    if (message.depositor !== '') {
      writer.uint32(34).string(message.depositor);
    }
    if (message.mintRecipient.length !== 0) {
      writer.uint32(42).bytes(message.mintRecipient);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(48).uint32(message.destinationDomain);
    }
    if (message.destinationTokenMessenger.length !== 0) {
      writer.uint32(58).bytes(message.destinationTokenMessenger);
    }
    if (message.destinationCaller.length !== 0) {
      writer.uint32(66).bytes(message.destinationCaller);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DepositForBurn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDepositForBurn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = reader.uint64();
          break;
        case 2:
          message.burnToken = reader.string();
          break;
        case 3:
          message.amount = reader.string();
          break;
        case 4:
          message.depositor = reader.string();
          break;
        case 5:
          message.mintRecipient = reader.bytes();
          break;
        case 6:
          message.destinationDomain = reader.uint32();
          break;
        case 7:
          message.destinationTokenMessenger = reader.bytes();
          break;
        case 8:
          message.destinationCaller = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DepositForBurn {
    return {
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
      burnToken: isSet(object.burnToken) ? String(object.burnToken) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
      depositor: isSet(object.depositor) ? String(object.depositor) : '',
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(),
      destinationDomain: isSet(object.destinationDomain)
        ? Number(object.destinationDomain)
        : 0,
      destinationTokenMessenger: isSet(object.destinationTokenMessenger)
        ? bytesFromBase64(object.destinationTokenMessenger)
        : new Uint8Array(),
      destinationCaller: isSet(object.destinationCaller)
        ? bytesFromBase64(object.destinationCaller)
        : new Uint8Array(),
    };
  },
  toJSON(message: DepositForBurn): JsonSafe<DepositForBurn> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    message.burnToken !== undefined && (obj.burnToken = message.burnToken);
    message.amount !== undefined && (obj.amount = message.amount);
    message.depositor !== undefined && (obj.depositor = message.depositor);
    message.mintRecipient !== undefined &&
      (obj.mintRecipient = base64FromBytes(
        message.mintRecipient !== undefined
          ? message.mintRecipient
          : new Uint8Array(),
      ));
    message.destinationDomain !== undefined &&
      (obj.destinationDomain = Math.round(message.destinationDomain));
    message.destinationTokenMessenger !== undefined &&
      (obj.destinationTokenMessenger = base64FromBytes(
        message.destinationTokenMessenger !== undefined
          ? message.destinationTokenMessenger
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
  fromPartial(object: Partial<DepositForBurn>): DepositForBurn {
    const message = createBaseDepositForBurn();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    message.burnToken = object.burnToken ?? '';
    message.amount = object.amount ?? '';
    message.depositor = object.depositor ?? '';
    message.mintRecipient = object.mintRecipient ?? new Uint8Array();
    message.destinationDomain = object.destinationDomain ?? 0;
    message.destinationTokenMessenger =
      object.destinationTokenMessenger ?? new Uint8Array();
    message.destinationCaller = object.destinationCaller ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: DepositForBurnProtoMsg): DepositForBurn {
    return DepositForBurn.decode(message.value);
  },
  toProto(message: DepositForBurn): Uint8Array {
    return DepositForBurn.encode(message).finish();
  },
  toProtoMsg(message: DepositForBurn): DepositForBurnProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.DepositForBurn',
      value: DepositForBurn.encode(message).finish(),
    };
  },
};
function createBaseMintAndWithdraw(): MintAndWithdraw {
  return {
    mintRecipient: new Uint8Array(),
    amount: '',
    mintToken: '',
  };
}
/**
 * Emitted when tokens are minted
 * @param mint_recipient recipient address of minted tokens
 * @param amount amount of minted tokens
 * @param mint_token contract address of minted token
 * @name MintAndWithdraw
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MintAndWithdraw
 */
export const MintAndWithdraw = {
  typeUrl: '/circle.cctp.v1.MintAndWithdraw' as const,
  is(o: any): o is MintAndWithdraw {
    return (
      o &&
      (o.$typeUrl === MintAndWithdraw.typeUrl ||
        ((o.mintRecipient instanceof Uint8Array ||
          typeof o.mintRecipient === 'string') &&
          typeof o.amount === 'string' &&
          typeof o.mintToken === 'string'))
    );
  },
  isSDK(o: any): o is MintAndWithdrawSDKType {
    return (
      o &&
      (o.$typeUrl === MintAndWithdraw.typeUrl ||
        ((o.mint_recipient instanceof Uint8Array ||
          typeof o.mint_recipient === 'string') &&
          typeof o.amount === 'string' &&
          typeof o.mint_token === 'string'))
    );
  },
  encode(
    message: MintAndWithdraw,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.mintRecipient.length !== 0) {
      writer.uint32(10).bytes(message.mintRecipient);
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    if (message.mintToken !== '') {
      writer.uint32(26).string(message.mintToken);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MintAndWithdraw {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMintAndWithdraw();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.mintRecipient = reader.bytes();
          break;
        case 2:
          message.amount = reader.string();
          break;
        case 3:
          message.mintToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MintAndWithdraw {
    return {
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(),
      amount: isSet(object.amount) ? String(object.amount) : '',
      mintToken: isSet(object.mintToken) ? String(object.mintToken) : '',
    };
  },
  toJSON(message: MintAndWithdraw): JsonSafe<MintAndWithdraw> {
    const obj: any = {};
    message.mintRecipient !== undefined &&
      (obj.mintRecipient = base64FromBytes(
        message.mintRecipient !== undefined
          ? message.mintRecipient
          : new Uint8Array(),
      ));
    message.amount !== undefined && (obj.amount = message.amount);
    message.mintToken !== undefined && (obj.mintToken = message.mintToken);
    return obj;
  },
  fromPartial(object: Partial<MintAndWithdraw>): MintAndWithdraw {
    const message = createBaseMintAndWithdraw();
    message.mintRecipient = object.mintRecipient ?? new Uint8Array();
    message.amount = object.amount ?? '';
    message.mintToken = object.mintToken ?? '';
    return message;
  },
  fromProtoMsg(message: MintAndWithdrawProtoMsg): MintAndWithdraw {
    return MintAndWithdraw.decode(message.value);
  },
  toProto(message: MintAndWithdraw): Uint8Array {
    return MintAndWithdraw.encode(message).finish();
  },
  toProtoMsg(message: MintAndWithdraw): MintAndWithdrawProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MintAndWithdraw',
      value: MintAndWithdraw.encode(message).finish(),
    };
  },
};
function createBaseTokenPairLinked(): TokenPairLinked {
  return {
    localToken: '',
    remoteDomain: 0,
    remoteToken: new Uint8Array(),
  };
}
/**
 * Emitted when a token pair is linked
 * @param local_token local token to support
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` corresponding to `localToken`
 * @name TokenPairLinked
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairLinked
 */
export const TokenPairLinked = {
  typeUrl: '/circle.cctp.v1.TokenPairLinked' as const,
  is(o: any): o is TokenPairLinked {
    return (
      o &&
      (o.$typeUrl === TokenPairLinked.typeUrl ||
        (typeof o.localToken === 'string' &&
          typeof o.remoteDomain === 'number' &&
          (o.remoteToken instanceof Uint8Array ||
            typeof o.remoteToken === 'string')))
    );
  },
  isSDK(o: any): o is TokenPairLinkedSDKType {
    return (
      o &&
      (o.$typeUrl === TokenPairLinked.typeUrl ||
        (typeof o.local_token === 'string' &&
          typeof o.remote_domain === 'number' &&
          (o.remote_token instanceof Uint8Array ||
            typeof o.remote_token === 'string')))
    );
  },
  encode(
    message: TokenPairLinked,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.localToken !== '') {
      writer.uint32(10).string(message.localToken);
    }
    if (message.remoteDomain !== 0) {
      writer.uint32(16).uint32(message.remoteDomain);
    }
    if (message.remoteToken.length !== 0) {
      writer.uint32(26).bytes(message.remoteToken);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TokenPairLinked {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTokenPairLinked();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.localToken = reader.string();
          break;
        case 2:
          message.remoteDomain = reader.uint32();
          break;
        case 3:
          message.remoteToken = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TokenPairLinked {
    return {
      localToken: isSet(object.localToken) ? String(object.localToken) : '',
      remoteDomain: isSet(object.remoteDomain)
        ? Number(object.remoteDomain)
        : 0,
      remoteToken: isSet(object.remoteToken)
        ? bytesFromBase64(object.remoteToken)
        : new Uint8Array(),
    };
  },
  toJSON(message: TokenPairLinked): JsonSafe<TokenPairLinked> {
    const obj: any = {};
    message.localToken !== undefined && (obj.localToken = message.localToken);
    message.remoteDomain !== undefined &&
      (obj.remoteDomain = Math.round(message.remoteDomain));
    message.remoteToken !== undefined &&
      (obj.remoteToken = base64FromBytes(
        message.remoteToken !== undefined
          ? message.remoteToken
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<TokenPairLinked>): TokenPairLinked {
    const message = createBaseTokenPairLinked();
    message.localToken = object.localToken ?? '';
    message.remoteDomain = object.remoteDomain ?? 0;
    message.remoteToken = object.remoteToken ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: TokenPairLinkedProtoMsg): TokenPairLinked {
    return TokenPairLinked.decode(message.value);
  },
  toProto(message: TokenPairLinked): Uint8Array {
    return TokenPairLinked.encode(message).finish();
  },
  toProtoMsg(message: TokenPairLinked): TokenPairLinkedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.TokenPairLinked',
      value: TokenPairLinked.encode(message).finish(),
    };
  },
};
function createBaseTokenPairUnlinked(): TokenPairUnlinked {
  return {
    localToken: '',
    remoteDomain: 0,
    remoteToken: new Uint8Array(),
  };
}
/**
 * Emitted when a token pair is unlinked
 * @param local_token local token address
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` unlinked from `localToken`
 * @name TokenPairUnlinked
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairUnlinked
 */
export const TokenPairUnlinked = {
  typeUrl: '/circle.cctp.v1.TokenPairUnlinked' as const,
  is(o: any): o is TokenPairUnlinked {
    return (
      o &&
      (o.$typeUrl === TokenPairUnlinked.typeUrl ||
        (typeof o.localToken === 'string' &&
          typeof o.remoteDomain === 'number' &&
          (o.remoteToken instanceof Uint8Array ||
            typeof o.remoteToken === 'string')))
    );
  },
  isSDK(o: any): o is TokenPairUnlinkedSDKType {
    return (
      o &&
      (o.$typeUrl === TokenPairUnlinked.typeUrl ||
        (typeof o.local_token === 'string' &&
          typeof o.remote_domain === 'number' &&
          (o.remote_token instanceof Uint8Array ||
            typeof o.remote_token === 'string')))
    );
  },
  encode(
    message: TokenPairUnlinked,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.localToken !== '') {
      writer.uint32(10).string(message.localToken);
    }
    if (message.remoteDomain !== 0) {
      writer.uint32(16).uint32(message.remoteDomain);
    }
    if (message.remoteToken.length !== 0) {
      writer.uint32(26).bytes(message.remoteToken);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TokenPairUnlinked {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTokenPairUnlinked();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.localToken = reader.string();
          break;
        case 2:
          message.remoteDomain = reader.uint32();
          break;
        case 3:
          message.remoteToken = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TokenPairUnlinked {
    return {
      localToken: isSet(object.localToken) ? String(object.localToken) : '',
      remoteDomain: isSet(object.remoteDomain)
        ? Number(object.remoteDomain)
        : 0,
      remoteToken: isSet(object.remoteToken)
        ? bytesFromBase64(object.remoteToken)
        : new Uint8Array(),
    };
  },
  toJSON(message: TokenPairUnlinked): JsonSafe<TokenPairUnlinked> {
    const obj: any = {};
    message.localToken !== undefined && (obj.localToken = message.localToken);
    message.remoteDomain !== undefined &&
      (obj.remoteDomain = Math.round(message.remoteDomain));
    message.remoteToken !== undefined &&
      (obj.remoteToken = base64FromBytes(
        message.remoteToken !== undefined
          ? message.remoteToken
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<TokenPairUnlinked>): TokenPairUnlinked {
    const message = createBaseTokenPairUnlinked();
    message.localToken = object.localToken ?? '';
    message.remoteDomain = object.remoteDomain ?? 0;
    message.remoteToken = object.remoteToken ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: TokenPairUnlinkedProtoMsg): TokenPairUnlinked {
    return TokenPairUnlinked.decode(message.value);
  },
  toProto(message: TokenPairUnlinked): Uint8Array {
    return TokenPairUnlinked.encode(message).finish();
  },
  toProtoMsg(message: TokenPairUnlinked): TokenPairUnlinkedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.TokenPairUnlinked',
      value: TokenPairUnlinked.encode(message).finish(),
    };
  },
};
function createBaseMessageSent(): MessageSent {
  return {
    message: new Uint8Array(),
  };
}
/**
 * Emitted when a new message is dispatched
 * @param message Raw bytes of message
 * @name MessageSent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MessageSent
 */
export const MessageSent = {
  typeUrl: '/circle.cctp.v1.MessageSent' as const,
  is(o: any): o is MessageSent {
    return (
      o &&
      (o.$typeUrl === MessageSent.typeUrl ||
        o.message instanceof Uint8Array ||
        typeof o.message === 'string')
    );
  },
  isSDK(o: any): o is MessageSentSDKType {
    return (
      o &&
      (o.$typeUrl === MessageSent.typeUrl ||
        o.message instanceof Uint8Array ||
        typeof o.message === 'string')
    );
  },
  encode(
    message: MessageSent,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.message.length !== 0) {
      writer.uint32(10).bytes(message.message);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MessageSent {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMessageSent();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.message = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MessageSent {
    return {
      message: isSet(object.message)
        ? bytesFromBase64(object.message)
        : new Uint8Array(),
    };
  },
  toJSON(message: MessageSent): JsonSafe<MessageSent> {
    const obj: any = {};
    message.message !== undefined &&
      (obj.message = base64FromBytes(
        message.message !== undefined ? message.message : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MessageSent>): MessageSent {
    const message = createBaseMessageSent();
    message.message = object.message ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MessageSentProtoMsg): MessageSent {
    return MessageSent.decode(message.value);
  },
  toProto(message: MessageSent): Uint8Array {
    return MessageSent.encode(message).finish();
  },
  toProtoMsg(message: MessageSent): MessageSentProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MessageSent',
      value: MessageSent.encode(message).finish(),
    };
  },
};
function createBaseMessageReceived(): MessageReceived {
  return {
    caller: '',
    sourceDomain: 0,
    nonce: BigInt(0),
    sender: new Uint8Array(),
    messageBody: new Uint8Array(),
  };
}
/**
 * Emitted when a new message is received
 * @param caller caller (msg.sender) on destination domain
 * @param source_domain the source domain this message originated from
 * @param nonce the nonce unique to this message
 * @param sender the sender of this message
 * @param message_body message body bytes
 * @name MessageReceived
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MessageReceived
 */
export const MessageReceived = {
  typeUrl: '/circle.cctp.v1.MessageReceived' as const,
  is(o: any): o is MessageReceived {
    return (
      o &&
      (o.$typeUrl === MessageReceived.typeUrl ||
        (typeof o.caller === 'string' &&
          typeof o.sourceDomain === 'number' &&
          typeof o.nonce === 'bigint' &&
          (o.sender instanceof Uint8Array || typeof o.sender === 'string') &&
          (o.messageBody instanceof Uint8Array ||
            typeof o.messageBody === 'string')))
    );
  },
  isSDK(o: any): o is MessageReceivedSDKType {
    return (
      o &&
      (o.$typeUrl === MessageReceived.typeUrl ||
        (typeof o.caller === 'string' &&
          typeof o.source_domain === 'number' &&
          typeof o.nonce === 'bigint' &&
          (o.sender instanceof Uint8Array || typeof o.sender === 'string') &&
          (o.message_body instanceof Uint8Array ||
            typeof o.message_body === 'string')))
    );
  },
  encode(
    message: MessageReceived,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.caller !== '') {
      writer.uint32(10).string(message.caller);
    }
    if (message.sourceDomain !== 0) {
      writer.uint32(16).uint32(message.sourceDomain);
    }
    if (message.nonce !== BigInt(0)) {
      writer.uint32(24).uint64(message.nonce);
    }
    if (message.sender.length !== 0) {
      writer.uint32(34).bytes(message.sender);
    }
    if (message.messageBody.length !== 0) {
      writer.uint32(42).bytes(message.messageBody);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MessageReceived {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMessageReceived();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.caller = reader.string();
          break;
        case 2:
          message.sourceDomain = reader.uint32();
          break;
        case 3:
          message.nonce = reader.uint64();
          break;
        case 4:
          message.sender = reader.bytes();
          break;
        case 5:
          message.messageBody = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MessageReceived {
    return {
      caller: isSet(object.caller) ? String(object.caller) : '',
      sourceDomain: isSet(object.sourceDomain)
        ? Number(object.sourceDomain)
        : 0,
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
      sender: isSet(object.sender)
        ? bytesFromBase64(object.sender)
        : new Uint8Array(),
      messageBody: isSet(object.messageBody)
        ? bytesFromBase64(object.messageBody)
        : new Uint8Array(),
    };
  },
  toJSON(message: MessageReceived): JsonSafe<MessageReceived> {
    const obj: any = {};
    message.caller !== undefined && (obj.caller = message.caller);
    message.sourceDomain !== undefined &&
      (obj.sourceDomain = Math.round(message.sourceDomain));
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    message.sender !== undefined &&
      (obj.sender = base64FromBytes(
        message.sender !== undefined ? message.sender : new Uint8Array(),
      ));
    message.messageBody !== undefined &&
      (obj.messageBody = base64FromBytes(
        message.messageBody !== undefined
          ? message.messageBody
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MessageReceived>): MessageReceived {
    const message = createBaseMessageReceived();
    message.caller = object.caller ?? '';
    message.sourceDomain = object.sourceDomain ?? 0;
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    message.sender = object.sender ?? new Uint8Array();
    message.messageBody = object.messageBody ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MessageReceivedProtoMsg): MessageReceived {
    return MessageReceived.decode(message.value);
  },
  toProto(message: MessageReceived): Uint8Array {
    return MessageReceived.encode(message).finish();
  },
  toProtoMsg(message: MessageReceived): MessageReceivedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MessageReceived',
      value: MessageReceived.encode(message).finish(),
    };
  },
};
function createBaseMaxMessageBodySizeUpdated(): MaxMessageBodySizeUpdated {
  return {
    newMaxMessageBodySize: BigInt(0),
  };
}
/**
 * Emitted when max message body size is updated
 * @param new_max_message_body_size new maximum message body size, in bytes
 * @name MaxMessageBodySizeUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MaxMessageBodySizeUpdated
 */
export const MaxMessageBodySizeUpdated = {
  typeUrl: '/circle.cctp.v1.MaxMessageBodySizeUpdated' as const,
  is(o: any): o is MaxMessageBodySizeUpdated {
    return (
      o &&
      (o.$typeUrl === MaxMessageBodySizeUpdated.typeUrl ||
        typeof o.newMaxMessageBodySize === 'bigint')
    );
  },
  isSDK(o: any): o is MaxMessageBodySizeUpdatedSDKType {
    return (
      o &&
      (o.$typeUrl === MaxMessageBodySizeUpdated.typeUrl ||
        typeof o.new_max_message_body_size === 'bigint')
    );
  },
  encode(
    message: MaxMessageBodySizeUpdated,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.newMaxMessageBodySize !== BigInt(0)) {
      writer.uint32(8).uint64(message.newMaxMessageBodySize);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MaxMessageBodySizeUpdated {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMaxMessageBodySizeUpdated();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.newMaxMessageBodySize = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MaxMessageBodySizeUpdated {
    return {
      newMaxMessageBodySize: isSet(object.newMaxMessageBodySize)
        ? BigInt(object.newMaxMessageBodySize.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MaxMessageBodySizeUpdated,
  ): JsonSafe<MaxMessageBodySizeUpdated> {
    const obj: any = {};
    message.newMaxMessageBodySize !== undefined &&
      (obj.newMaxMessageBodySize = (
        message.newMaxMessageBodySize || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MaxMessageBodySizeUpdated>,
  ): MaxMessageBodySizeUpdated {
    const message = createBaseMaxMessageBodySizeUpdated();
    message.newMaxMessageBodySize =
      object.newMaxMessageBodySize !== undefined &&
      object.newMaxMessageBodySize !== null
        ? BigInt(object.newMaxMessageBodySize.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MaxMessageBodySizeUpdatedProtoMsg,
  ): MaxMessageBodySizeUpdated {
    return MaxMessageBodySizeUpdated.decode(message.value);
  },
  toProto(message: MaxMessageBodySizeUpdated): Uint8Array {
    return MaxMessageBodySizeUpdated.encode(message).finish();
  },
  toProtoMsg(
    message: MaxMessageBodySizeUpdated,
  ): MaxMessageBodySizeUpdatedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MaxMessageBodySizeUpdated',
      value: MaxMessageBodySizeUpdated.encode(message).finish(),
    };
  },
};
function createBaseRemoteTokenMessengerAdded(): RemoteTokenMessengerAdded {
  return {
    domain: 0,
    remoteTokenMessenger: new Uint8Array(),
  };
}
/**
 * Emitted when a RemoteTokenMessenger is added
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerAdded
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerAdded
 */
export const RemoteTokenMessengerAdded = {
  typeUrl: '/circle.cctp.v1.RemoteTokenMessengerAdded' as const,
  is(o: any): o is RemoteTokenMessengerAdded {
    return (
      o &&
      (o.$typeUrl === RemoteTokenMessengerAdded.typeUrl ||
        (typeof o.domain === 'number' &&
          (o.remoteTokenMessenger instanceof Uint8Array ||
            typeof o.remoteTokenMessenger === 'string')))
    );
  },
  isSDK(o: any): o is RemoteTokenMessengerAddedSDKType {
    return (
      o &&
      (o.$typeUrl === RemoteTokenMessengerAdded.typeUrl ||
        (typeof o.domain === 'number' &&
          (o.remote_token_messenger instanceof Uint8Array ||
            typeof o.remote_token_messenger === 'string')))
    );
  },
  encode(
    message: RemoteTokenMessengerAdded,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.domain !== 0) {
      writer.uint32(8).uint32(message.domain);
    }
    if (message.remoteTokenMessenger.length !== 0) {
      writer.uint32(18).bytes(message.remoteTokenMessenger);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RemoteTokenMessengerAdded {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRemoteTokenMessengerAdded();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.domain = reader.uint32();
          break;
        case 2:
          message.remoteTokenMessenger = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RemoteTokenMessengerAdded {
    return {
      domain: isSet(object.domain) ? Number(object.domain) : 0,
      remoteTokenMessenger: isSet(object.remoteTokenMessenger)
        ? bytesFromBase64(object.remoteTokenMessenger)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: RemoteTokenMessengerAdded,
  ): JsonSafe<RemoteTokenMessengerAdded> {
    const obj: any = {};
    message.domain !== undefined && (obj.domain = Math.round(message.domain));
    message.remoteTokenMessenger !== undefined &&
      (obj.remoteTokenMessenger = base64FromBytes(
        message.remoteTokenMessenger !== undefined
          ? message.remoteTokenMessenger
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<RemoteTokenMessengerAdded>,
  ): RemoteTokenMessengerAdded {
    const message = createBaseRemoteTokenMessengerAdded();
    message.domain = object.domain ?? 0;
    message.remoteTokenMessenger =
      object.remoteTokenMessenger ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: RemoteTokenMessengerAddedProtoMsg,
  ): RemoteTokenMessengerAdded {
    return RemoteTokenMessengerAdded.decode(message.value);
  },
  toProto(message: RemoteTokenMessengerAdded): Uint8Array {
    return RemoteTokenMessengerAdded.encode(message).finish();
  },
  toProtoMsg(
    message: RemoteTokenMessengerAdded,
  ): RemoteTokenMessengerAddedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.RemoteTokenMessengerAdded',
      value: RemoteTokenMessengerAdded.encode(message).finish(),
    };
  },
};
function createBaseRemoteTokenMessengerRemoved(): RemoteTokenMessengerRemoved {
  return {
    domain: 0,
    remoteTokenMessenger: new Uint8Array(),
  };
}
/**
 * Emitted when a RemoteTokenMessenger is removed
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerRemoved
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerRemoved
 */
export const RemoteTokenMessengerRemoved = {
  typeUrl: '/circle.cctp.v1.RemoteTokenMessengerRemoved' as const,
  is(o: any): o is RemoteTokenMessengerRemoved {
    return (
      o &&
      (o.$typeUrl === RemoteTokenMessengerRemoved.typeUrl ||
        (typeof o.domain === 'number' &&
          (o.remoteTokenMessenger instanceof Uint8Array ||
            typeof o.remoteTokenMessenger === 'string')))
    );
  },
  isSDK(o: any): o is RemoteTokenMessengerRemovedSDKType {
    return (
      o &&
      (o.$typeUrl === RemoteTokenMessengerRemoved.typeUrl ||
        (typeof o.domain === 'number' &&
          (o.remote_token_messenger instanceof Uint8Array ||
            typeof o.remote_token_messenger === 'string')))
    );
  },
  encode(
    message: RemoteTokenMessengerRemoved,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.domain !== 0) {
      writer.uint32(8).uint32(message.domain);
    }
    if (message.remoteTokenMessenger.length !== 0) {
      writer.uint32(18).bytes(message.remoteTokenMessenger);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RemoteTokenMessengerRemoved {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRemoteTokenMessengerRemoved();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.domain = reader.uint32();
          break;
        case 2:
          message.remoteTokenMessenger = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RemoteTokenMessengerRemoved {
    return {
      domain: isSet(object.domain) ? Number(object.domain) : 0,
      remoteTokenMessenger: isSet(object.remoteTokenMessenger)
        ? bytesFromBase64(object.remoteTokenMessenger)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: RemoteTokenMessengerRemoved,
  ): JsonSafe<RemoteTokenMessengerRemoved> {
    const obj: any = {};
    message.domain !== undefined && (obj.domain = Math.round(message.domain));
    message.remoteTokenMessenger !== undefined &&
      (obj.remoteTokenMessenger = base64FromBytes(
        message.remoteTokenMessenger !== undefined
          ? message.remoteTokenMessenger
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<RemoteTokenMessengerRemoved>,
  ): RemoteTokenMessengerRemoved {
    const message = createBaseRemoteTokenMessengerRemoved();
    message.domain = object.domain ?? 0;
    message.remoteTokenMessenger =
      object.remoteTokenMessenger ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: RemoteTokenMessengerRemovedProtoMsg,
  ): RemoteTokenMessengerRemoved {
    return RemoteTokenMessengerRemoved.decode(message.value);
  },
  toProto(message: RemoteTokenMessengerRemoved): Uint8Array {
    return RemoteTokenMessengerRemoved.encode(message).finish();
  },
  toProtoMsg(
    message: RemoteTokenMessengerRemoved,
  ): RemoteTokenMessengerRemovedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.RemoteTokenMessengerRemoved',
      value: RemoteTokenMessengerRemoved.encode(message).finish(),
    };
  },
};
function createBaseSetBurnLimitPerMessage(): SetBurnLimitPerMessage {
  return {
    token: '',
    burnLimitPerMessage: '',
  };
}
/**
 * Emitted when max burn amount per message is updated
 * @param local_token
 * @param old_amount old max burn amount
 * @param new_amount new max burn amount
 * @name SetBurnLimitPerMessage
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SetBurnLimitPerMessage
 */
export const SetBurnLimitPerMessage = {
  typeUrl: '/circle.cctp.v1.SetBurnLimitPerMessage' as const,
  is(o: any): o is SetBurnLimitPerMessage {
    return (
      o &&
      (o.$typeUrl === SetBurnLimitPerMessage.typeUrl ||
        (typeof o.token === 'string' &&
          typeof o.burnLimitPerMessage === 'string'))
    );
  },
  isSDK(o: any): o is SetBurnLimitPerMessageSDKType {
    return (
      o &&
      (o.$typeUrl === SetBurnLimitPerMessage.typeUrl ||
        (typeof o.token === 'string' &&
          typeof o.burn_limit_per_message === 'string'))
    );
  },
  encode(
    message: SetBurnLimitPerMessage,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.token !== '') {
      writer.uint32(10).string(message.token);
    }
    if (message.burnLimitPerMessage !== '') {
      writer.uint32(18).string(message.burnLimitPerMessage);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SetBurnLimitPerMessage {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSetBurnLimitPerMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.token = reader.string();
          break;
        case 2:
          message.burnLimitPerMessage = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SetBurnLimitPerMessage {
    return {
      token: isSet(object.token) ? String(object.token) : '',
      burnLimitPerMessage: isSet(object.burnLimitPerMessage)
        ? String(object.burnLimitPerMessage)
        : '',
    };
  },
  toJSON(message: SetBurnLimitPerMessage): JsonSafe<SetBurnLimitPerMessage> {
    const obj: any = {};
    message.token !== undefined && (obj.token = message.token);
    message.burnLimitPerMessage !== undefined &&
      (obj.burnLimitPerMessage = message.burnLimitPerMessage);
    return obj;
  },
  fromPartial(object: Partial<SetBurnLimitPerMessage>): SetBurnLimitPerMessage {
    const message = createBaseSetBurnLimitPerMessage();
    message.token = object.token ?? '';
    message.burnLimitPerMessage = object.burnLimitPerMessage ?? '';
    return message;
  },
  fromProtoMsg(
    message: SetBurnLimitPerMessageProtoMsg,
  ): SetBurnLimitPerMessage {
    return SetBurnLimitPerMessage.decode(message.value);
  },
  toProto(message: SetBurnLimitPerMessage): Uint8Array {
    return SetBurnLimitPerMessage.encode(message).finish();
  },
  toProtoMsg(message: SetBurnLimitPerMessage): SetBurnLimitPerMessageProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.SetBurnLimitPerMessage',
      value: SetBurnLimitPerMessage.encode(message).finish(),
    };
  },
};
