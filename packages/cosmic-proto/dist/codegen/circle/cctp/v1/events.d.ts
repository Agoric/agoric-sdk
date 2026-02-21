import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
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
export interface BurningAndMintingPausedEvent {
}
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
export interface BurningAndMintingPausedEventSDKType {
}
/**
 * Emitted when burning and minting tokens is unpaused
 * @name BurningAndMintingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingUnpausedEvent
 */
export interface BurningAndMintingUnpausedEvent {
}
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
export interface BurningAndMintingUnpausedEventSDKType {
}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingPausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingPausedEvent
 */
export interface SendingAndReceivingPausedEvent {
}
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
export interface SendingAndReceivingPausedEventSDKType {
}
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingUnpausedEvent
 */
export interface SendingAndReceivingUnpausedEvent {
}
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
export interface SendingAndReceivingUnpausedEventSDKType {
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
/**
 * Emitted when an attester is enabled
 * @param attester newly enabled attester
 * @name AttesterEnabled
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterEnabled
 */
export declare const AttesterEnabled: {
    typeUrl: "/circle.cctp.v1.AttesterEnabled";
    is(o: any): o is AttesterEnabled;
    isSDK(o: any): o is AttesterEnabledSDKType;
    encode(message: AttesterEnabled, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AttesterEnabled;
    fromJSON(object: any): AttesterEnabled;
    toJSON(message: AttesterEnabled): JsonSafe<AttesterEnabled>;
    fromPartial(object: Partial<AttesterEnabled>): AttesterEnabled;
    fromProtoMsg(message: AttesterEnabledProtoMsg): AttesterEnabled;
    toProto(message: AttesterEnabled): Uint8Array;
    toProtoMsg(message: AttesterEnabled): AttesterEnabledProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when an attester is disabled
 * @param attester newly disabled attester
 * @name AttesterDisabled
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.AttesterDisabled
 */
export declare const AttesterDisabled: {
    typeUrl: "/circle.cctp.v1.AttesterDisabled";
    is(o: any): o is AttesterDisabled;
    isSDK(o: any): o is AttesterDisabledSDKType;
    encode(message: AttesterDisabled, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AttesterDisabled;
    fromJSON(object: any): AttesterDisabled;
    toJSON(message: AttesterDisabled): JsonSafe<AttesterDisabled>;
    fromPartial(object: Partial<AttesterDisabled>): AttesterDisabled;
    fromProtoMsg(message: AttesterDisabledProtoMsg): AttesterDisabled;
    toProto(message: AttesterDisabled): Uint8Array;
    toProtoMsg(message: AttesterDisabled): AttesterDisabledProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when threshold number of attestations (m in m/n multisig) is updated
 * @param old_signature_threshold old signature threshold
 * @param new_signature_threshold new signature threshold
 * @name SignatureThresholdUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SignatureThresholdUpdated
 */
export declare const SignatureThresholdUpdated: {
    typeUrl: "/circle.cctp.v1.SignatureThresholdUpdated";
    is(o: any): o is SignatureThresholdUpdated;
    isSDK(o: any): o is SignatureThresholdUpdatedSDKType;
    encode(message: SignatureThresholdUpdated, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SignatureThresholdUpdated;
    fromJSON(object: any): SignatureThresholdUpdated;
    toJSON(message: SignatureThresholdUpdated): JsonSafe<SignatureThresholdUpdated>;
    fromPartial(object: Partial<SignatureThresholdUpdated>): SignatureThresholdUpdated;
    fromProtoMsg(message: SignatureThresholdUpdatedProtoMsg): SignatureThresholdUpdated;
    toProto(message: SignatureThresholdUpdated): Uint8Array;
    toProtoMsg(message: SignatureThresholdUpdated): SignatureThresholdUpdatedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when owner address is updated
 * @param previous_owner representing the address of the previous owner
 * @param new_owner representing the address of the new owner
 * @name OwnerUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnerUpdated
 */
export declare const OwnerUpdated: {
    typeUrl: "/circle.cctp.v1.OwnerUpdated";
    is(o: any): o is OwnerUpdated;
    isSDK(o: any): o is OwnerUpdatedSDKType;
    encode(message: OwnerUpdated, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): OwnerUpdated;
    fromJSON(object: any): OwnerUpdated;
    toJSON(message: OwnerUpdated): JsonSafe<OwnerUpdated>;
    fromPartial(object: Partial<OwnerUpdated>): OwnerUpdated;
    fromProtoMsg(message: OwnerUpdatedProtoMsg): OwnerUpdated;
    toProto(message: OwnerUpdated): Uint8Array;
    toProtoMsg(message: OwnerUpdated): OwnerUpdatedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when starting the two stage transfer ownership process
 * @param previousOwner representing the address of the previous owner
 * @param newOwner representing the address of the new owner
 * @name OwnershipTransferStarted
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.OwnershipTransferStarted
 */
export declare const OwnershipTransferStarted: {
    typeUrl: "/circle.cctp.v1.OwnershipTransferStarted";
    is(o: any): o is OwnershipTransferStarted;
    isSDK(o: any): o is OwnershipTransferStartedSDKType;
    encode(message: OwnershipTransferStarted, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): OwnershipTransferStarted;
    fromJSON(object: any): OwnershipTransferStarted;
    toJSON(message: OwnershipTransferStarted): JsonSafe<OwnershipTransferStarted>;
    fromPartial(object: Partial<OwnershipTransferStarted>): OwnershipTransferStarted;
    fromProtoMsg(message: OwnershipTransferStartedProtoMsg): OwnershipTransferStarted;
    toProto(message: OwnershipTransferStarted): Uint8Array;
    toProtoMsg(message: OwnershipTransferStarted): OwnershipTransferStartedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when pauser address is updated
 * @param previous_pauser representing the address of the previous pauser
 * @param new_pauser representing the address of the new pauser
 * @name PauserUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.PauserUpdated
 */
export declare const PauserUpdated: {
    typeUrl: "/circle.cctp.v1.PauserUpdated";
    is(o: any): o is PauserUpdated;
    isSDK(o: any): o is PauserUpdatedSDKType;
    encode(message: PauserUpdated, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PauserUpdated;
    fromJSON(object: any): PauserUpdated;
    toJSON(message: PauserUpdated): JsonSafe<PauserUpdated>;
    fromPartial(object: Partial<PauserUpdated>): PauserUpdated;
    fromProtoMsg(message: PauserUpdatedProtoMsg): PauserUpdated;
    toProto(message: PauserUpdated): Uint8Array;
    toProtoMsg(message: PauserUpdated): PauserUpdatedProtoMsg;
    registerTypeUrl(): void;
};
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
export declare const AttesterManagerUpdated: {
    typeUrl: "/circle.cctp.v1.AttesterManagerUpdated";
    is(o: any): o is AttesterManagerUpdated;
    isSDK(o: any): o is AttesterManagerUpdatedSDKType;
    encode(message: AttesterManagerUpdated, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AttesterManagerUpdated;
    fromJSON(object: any): AttesterManagerUpdated;
    toJSON(message: AttesterManagerUpdated): JsonSafe<AttesterManagerUpdated>;
    fromPartial(object: Partial<AttesterManagerUpdated>): AttesterManagerUpdated;
    fromProtoMsg(message: AttesterManagerUpdatedProtoMsg): AttesterManagerUpdated;
    toProto(message: AttesterManagerUpdated): Uint8Array;
    toProtoMsg(message: AttesterManagerUpdated): AttesterManagerUpdatedProtoMsg;
    registerTypeUrl(): void;
};
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
export declare const TokenControllerUpdated: {
    typeUrl: "/circle.cctp.v1.TokenControllerUpdated";
    is(o: any): o is TokenControllerUpdated;
    isSDK(o: any): o is TokenControllerUpdatedSDKType;
    encode(message: TokenControllerUpdated, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TokenControllerUpdated;
    fromJSON(object: any): TokenControllerUpdated;
    toJSON(message: TokenControllerUpdated): JsonSafe<TokenControllerUpdated>;
    fromPartial(object: Partial<TokenControllerUpdated>): TokenControllerUpdated;
    fromProtoMsg(message: TokenControllerUpdatedProtoMsg): TokenControllerUpdated;
    toProto(message: TokenControllerUpdated): Uint8Array;
    toProtoMsg(message: TokenControllerUpdated): TokenControllerUpdatedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when burning and minting tokens is paused
 * @name BurningAndMintingPausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingPausedEvent
 */
export declare const BurningAndMintingPausedEvent: {
    typeUrl: "/circle.cctp.v1.BurningAndMintingPausedEvent";
    is(o: any): o is BurningAndMintingPausedEvent;
    isSDK(o: any): o is BurningAndMintingPausedEventSDKType;
    encode(_: BurningAndMintingPausedEvent, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BurningAndMintingPausedEvent;
    fromJSON(_: any): BurningAndMintingPausedEvent;
    toJSON(_: BurningAndMintingPausedEvent): JsonSafe<BurningAndMintingPausedEvent>;
    fromPartial(_: Partial<BurningAndMintingPausedEvent>): BurningAndMintingPausedEvent;
    fromProtoMsg(message: BurningAndMintingPausedEventProtoMsg): BurningAndMintingPausedEvent;
    toProto(message: BurningAndMintingPausedEvent): Uint8Array;
    toProtoMsg(message: BurningAndMintingPausedEvent): BurningAndMintingPausedEventProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when burning and minting tokens is unpaused
 * @name BurningAndMintingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingUnpausedEvent
 */
export declare const BurningAndMintingUnpausedEvent: {
    typeUrl: "/circle.cctp.v1.BurningAndMintingUnpausedEvent";
    is(o: any): o is BurningAndMintingUnpausedEvent;
    isSDK(o: any): o is BurningAndMintingUnpausedEventSDKType;
    encode(_: BurningAndMintingUnpausedEvent, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BurningAndMintingUnpausedEvent;
    fromJSON(_: any): BurningAndMintingUnpausedEvent;
    toJSON(_: BurningAndMintingUnpausedEvent): JsonSafe<BurningAndMintingUnpausedEvent>;
    fromPartial(_: Partial<BurningAndMintingUnpausedEvent>): BurningAndMintingUnpausedEvent;
    fromProtoMsg(message: BurningAndMintingUnpausedEventProtoMsg): BurningAndMintingUnpausedEvent;
    toProto(message: BurningAndMintingUnpausedEvent): Uint8Array;
    toProtoMsg(message: BurningAndMintingUnpausedEvent): BurningAndMintingUnpausedEventProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingPausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingPausedEvent
 */
export declare const SendingAndReceivingPausedEvent: {
    typeUrl: "/circle.cctp.v1.SendingAndReceivingPausedEvent";
    is(o: any): o is SendingAndReceivingPausedEvent;
    isSDK(o: any): o is SendingAndReceivingPausedEventSDKType;
    encode(_: SendingAndReceivingPausedEvent, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SendingAndReceivingPausedEvent;
    fromJSON(_: any): SendingAndReceivingPausedEvent;
    toJSON(_: SendingAndReceivingPausedEvent): JsonSafe<SendingAndReceivingPausedEvent>;
    fromPartial(_: Partial<SendingAndReceivingPausedEvent>): SendingAndReceivingPausedEvent;
    fromProtoMsg(message: SendingAndReceivingPausedEventProtoMsg): SendingAndReceivingPausedEvent;
    toProto(message: SendingAndReceivingPausedEvent): Uint8Array;
    toProtoMsg(message: SendingAndReceivingPausedEvent): SendingAndReceivingPausedEventProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when sending and receiving messages is paused
 * @name SendingAndReceivingUnpausedEvent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingUnpausedEvent
 */
export declare const SendingAndReceivingUnpausedEvent: {
    typeUrl: "/circle.cctp.v1.SendingAndReceivingUnpausedEvent";
    is(o: any): o is SendingAndReceivingUnpausedEvent;
    isSDK(o: any): o is SendingAndReceivingUnpausedEventSDKType;
    encode(_: SendingAndReceivingUnpausedEvent, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SendingAndReceivingUnpausedEvent;
    fromJSON(_: any): SendingAndReceivingUnpausedEvent;
    toJSON(_: SendingAndReceivingUnpausedEvent): JsonSafe<SendingAndReceivingUnpausedEvent>;
    fromPartial(_: Partial<SendingAndReceivingUnpausedEvent>): SendingAndReceivingUnpausedEvent;
    fromProtoMsg(message: SendingAndReceivingUnpausedEventProtoMsg): SendingAndReceivingUnpausedEvent;
    toProto(message: SendingAndReceivingUnpausedEvent): Uint8Array;
    toProtoMsg(message: SendingAndReceivingUnpausedEvent): SendingAndReceivingUnpausedEventProtoMsg;
    registerTypeUrl(): void;
};
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
export declare const DepositForBurn: {
    typeUrl: "/circle.cctp.v1.DepositForBurn";
    is(o: any): o is DepositForBurn;
    isSDK(o: any): o is DepositForBurnSDKType;
    encode(message: DepositForBurn, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DepositForBurn;
    fromJSON(object: any): DepositForBurn;
    toJSON(message: DepositForBurn): JsonSafe<DepositForBurn>;
    fromPartial(object: Partial<DepositForBurn>): DepositForBurn;
    fromProtoMsg(message: DepositForBurnProtoMsg): DepositForBurn;
    toProto(message: DepositForBurn): Uint8Array;
    toProtoMsg(message: DepositForBurn): DepositForBurnProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when tokens are minted
 * @param mint_recipient recipient address of minted tokens
 * @param amount amount of minted tokens
 * @param mint_token contract address of minted token
 * @name MintAndWithdraw
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MintAndWithdraw
 */
export declare const MintAndWithdraw: {
    typeUrl: "/circle.cctp.v1.MintAndWithdraw";
    is(o: any): o is MintAndWithdraw;
    isSDK(o: any): o is MintAndWithdrawSDKType;
    encode(message: MintAndWithdraw, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MintAndWithdraw;
    fromJSON(object: any): MintAndWithdraw;
    toJSON(message: MintAndWithdraw): JsonSafe<MintAndWithdraw>;
    fromPartial(object: Partial<MintAndWithdraw>): MintAndWithdraw;
    fromProtoMsg(message: MintAndWithdrawProtoMsg): MintAndWithdraw;
    toProto(message: MintAndWithdraw): Uint8Array;
    toProtoMsg(message: MintAndWithdraw): MintAndWithdrawProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when a token pair is linked
 * @param local_token local token to support
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` corresponding to `localToken`
 * @name TokenPairLinked
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairLinked
 */
export declare const TokenPairLinked: {
    typeUrl: "/circle.cctp.v1.TokenPairLinked";
    is(o: any): o is TokenPairLinked;
    isSDK(o: any): o is TokenPairLinkedSDKType;
    encode(message: TokenPairLinked, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TokenPairLinked;
    fromJSON(object: any): TokenPairLinked;
    toJSON(message: TokenPairLinked): JsonSafe<TokenPairLinked>;
    fromPartial(object: Partial<TokenPairLinked>): TokenPairLinked;
    fromProtoMsg(message: TokenPairLinkedProtoMsg): TokenPairLinked;
    toProto(message: TokenPairLinked): Uint8Array;
    toProtoMsg(message: TokenPairLinked): TokenPairLinkedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when a token pair is unlinked
 * @param local_token local token address
 * @param remote_domain remote domain
 * @param remote_token token on `remoteDomain` unlinked from `localToken`
 * @name TokenPairUnlinked
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPairUnlinked
 */
export declare const TokenPairUnlinked: {
    typeUrl: "/circle.cctp.v1.TokenPairUnlinked";
    is(o: any): o is TokenPairUnlinked;
    isSDK(o: any): o is TokenPairUnlinkedSDKType;
    encode(message: TokenPairUnlinked, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TokenPairUnlinked;
    fromJSON(object: any): TokenPairUnlinked;
    toJSON(message: TokenPairUnlinked): JsonSafe<TokenPairUnlinked>;
    fromPartial(object: Partial<TokenPairUnlinked>): TokenPairUnlinked;
    fromProtoMsg(message: TokenPairUnlinkedProtoMsg): TokenPairUnlinked;
    toProto(message: TokenPairUnlinked): Uint8Array;
    toProtoMsg(message: TokenPairUnlinked): TokenPairUnlinkedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when a new message is dispatched
 * @param message Raw bytes of message
 * @name MessageSent
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MessageSent
 */
export declare const MessageSent: {
    typeUrl: "/circle.cctp.v1.MessageSent";
    is(o: any): o is MessageSent;
    isSDK(o: any): o is MessageSentSDKType;
    encode(message: MessageSent, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MessageSent;
    fromJSON(object: any): MessageSent;
    toJSON(message: MessageSent): JsonSafe<MessageSent>;
    fromPartial(object: Partial<MessageSent>): MessageSent;
    fromProtoMsg(message: MessageSentProtoMsg): MessageSent;
    toProto(message: MessageSent): Uint8Array;
    toProtoMsg(message: MessageSent): MessageSentProtoMsg;
    registerTypeUrl(): void;
};
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
export declare const MessageReceived: {
    typeUrl: "/circle.cctp.v1.MessageReceived";
    is(o: any): o is MessageReceived;
    isSDK(o: any): o is MessageReceivedSDKType;
    encode(message: MessageReceived, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MessageReceived;
    fromJSON(object: any): MessageReceived;
    toJSON(message: MessageReceived): JsonSafe<MessageReceived>;
    fromPartial(object: Partial<MessageReceived>): MessageReceived;
    fromProtoMsg(message: MessageReceivedProtoMsg): MessageReceived;
    toProto(message: MessageReceived): Uint8Array;
    toProtoMsg(message: MessageReceived): MessageReceivedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when max message body size is updated
 * @param new_max_message_body_size new maximum message body size, in bytes
 * @name MaxMessageBodySizeUpdated
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MaxMessageBodySizeUpdated
 */
export declare const MaxMessageBodySizeUpdated: {
    typeUrl: "/circle.cctp.v1.MaxMessageBodySizeUpdated";
    is(o: any): o is MaxMessageBodySizeUpdated;
    isSDK(o: any): o is MaxMessageBodySizeUpdatedSDKType;
    encode(message: MaxMessageBodySizeUpdated, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MaxMessageBodySizeUpdated;
    fromJSON(object: any): MaxMessageBodySizeUpdated;
    toJSON(message: MaxMessageBodySizeUpdated): JsonSafe<MaxMessageBodySizeUpdated>;
    fromPartial(object: Partial<MaxMessageBodySizeUpdated>): MaxMessageBodySizeUpdated;
    fromProtoMsg(message: MaxMessageBodySizeUpdatedProtoMsg): MaxMessageBodySizeUpdated;
    toProto(message: MaxMessageBodySizeUpdated): Uint8Array;
    toProtoMsg(message: MaxMessageBodySizeUpdated): MaxMessageBodySizeUpdatedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when a RemoteTokenMessenger is added
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerAdded
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerAdded
 */
export declare const RemoteTokenMessengerAdded: {
    typeUrl: "/circle.cctp.v1.RemoteTokenMessengerAdded";
    is(o: any): o is RemoteTokenMessengerAdded;
    isSDK(o: any): o is RemoteTokenMessengerAddedSDKType;
    encode(message: RemoteTokenMessengerAdded, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RemoteTokenMessengerAdded;
    fromJSON(object: any): RemoteTokenMessengerAdded;
    toJSON(message: RemoteTokenMessengerAdded): JsonSafe<RemoteTokenMessengerAdded>;
    fromPartial(object: Partial<RemoteTokenMessengerAdded>): RemoteTokenMessengerAdded;
    fromProtoMsg(message: RemoteTokenMessengerAddedProtoMsg): RemoteTokenMessengerAdded;
    toProto(message: RemoteTokenMessengerAdded): Uint8Array;
    toProtoMsg(message: RemoteTokenMessengerAdded): RemoteTokenMessengerAddedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when a RemoteTokenMessenger is removed
 * @param domain remote domain
 * @param remote_token_messenger RemoteTokenMessenger on domain
 * @name RemoteTokenMessengerRemoved
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessengerRemoved
 */
export declare const RemoteTokenMessengerRemoved: {
    typeUrl: "/circle.cctp.v1.RemoteTokenMessengerRemoved";
    is(o: any): o is RemoteTokenMessengerRemoved;
    isSDK(o: any): o is RemoteTokenMessengerRemovedSDKType;
    encode(message: RemoteTokenMessengerRemoved, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RemoteTokenMessengerRemoved;
    fromJSON(object: any): RemoteTokenMessengerRemoved;
    toJSON(message: RemoteTokenMessengerRemoved): JsonSafe<RemoteTokenMessengerRemoved>;
    fromPartial(object: Partial<RemoteTokenMessengerRemoved>): RemoteTokenMessengerRemoved;
    fromProtoMsg(message: RemoteTokenMessengerRemovedProtoMsg): RemoteTokenMessengerRemoved;
    toProto(message: RemoteTokenMessengerRemoved): Uint8Array;
    toProtoMsg(message: RemoteTokenMessengerRemoved): RemoteTokenMessengerRemovedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Emitted when max burn amount per message is updated
 * @param local_token
 * @param old_amount old max burn amount
 * @param new_amount new max burn amount
 * @name SetBurnLimitPerMessage
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SetBurnLimitPerMessage
 */
export declare const SetBurnLimitPerMessage: {
    typeUrl: "/circle.cctp.v1.SetBurnLimitPerMessage";
    is(o: any): o is SetBurnLimitPerMessage;
    isSDK(o: any): o is SetBurnLimitPerMessageSDKType;
    encode(message: SetBurnLimitPerMessage, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SetBurnLimitPerMessage;
    fromJSON(object: any): SetBurnLimitPerMessage;
    toJSON(message: SetBurnLimitPerMessage): JsonSafe<SetBurnLimitPerMessage>;
    fromPartial(object: Partial<SetBurnLimitPerMessage>): SetBurnLimitPerMessage;
    fromProtoMsg(message: SetBurnLimitPerMessageProtoMsg): SetBurnLimitPerMessage;
    toProto(message: SetBurnLimitPerMessage): Uint8Array;
    toProtoMsg(message: SetBurnLimitPerMessage): SetBurnLimitPerMessageProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=events.d.ts.map