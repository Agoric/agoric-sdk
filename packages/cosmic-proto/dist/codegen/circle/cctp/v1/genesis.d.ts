import { Attester, type AttesterSDKType } from './attester.js';
import { PerMessageBurnLimit, type PerMessageBurnLimitSDKType } from './per_message_burn_limit.js';
import { BurningAndMintingPaused, type BurningAndMintingPausedSDKType } from './burning_and_minting_paused.js';
import { SendingAndReceivingMessagesPaused, type SendingAndReceivingMessagesPausedSDKType } from './sending_and_receiving_messages_paused.js';
import { MaxMessageBodySize, type MaxMessageBodySizeSDKType } from './max_message_body_size.js';
import { Nonce, type NonceSDKType } from './nonce.js';
import { SignatureThreshold, type SignatureThresholdSDKType } from './signature_threshold.js';
import { TokenPair, type TokenPairSDKType } from './token_pair.js';
import { RemoteTokenMessenger, type RemoteTokenMessengerSDKType } from './remote_token_messenger.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the cctp module's genesis state.
 * @name GenesisState
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.GenesisState
 */
export interface GenesisState {
    owner: string;
    attesterManager: string;
    pauser: string;
    tokenController: string;
    attesterList: Attester[];
    perMessageBurnLimitList: PerMessageBurnLimit[];
    burningAndMintingPaused?: BurningAndMintingPaused;
    sendingAndReceivingMessagesPaused?: SendingAndReceivingMessagesPaused;
    maxMessageBodySize?: MaxMessageBodySize;
    nextAvailableNonce?: Nonce;
    signatureThreshold?: SignatureThreshold;
    tokenPairList: TokenPair[];
    usedNoncesList: Nonce[];
    tokenMessengerList: RemoteTokenMessenger[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/circle.cctp.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the cctp module's genesis state.
 * @name GenesisStateSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.GenesisState
 */
export interface GenesisStateSDKType {
    owner: string;
    attester_manager: string;
    pauser: string;
    token_controller: string;
    attester_list: AttesterSDKType[];
    per_message_burn_limit_list: PerMessageBurnLimitSDKType[];
    burning_and_minting_paused?: BurningAndMintingPausedSDKType;
    sending_and_receiving_messages_paused?: SendingAndReceivingMessagesPausedSDKType;
    max_message_body_size?: MaxMessageBodySizeSDKType;
    next_available_nonce?: NonceSDKType;
    signature_threshold?: SignatureThresholdSDKType;
    token_pair_list: TokenPairSDKType[];
    used_nonces_list: NonceSDKType[];
    token_messenger_list: RemoteTokenMessengerSDKType[];
}
/**
 * GenesisState defines the cctp module's genesis state.
 * @name GenesisState
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/circle.cctp.v1.GenesisState";
    is(o: any): o is GenesisState;
    isSDK(o: any): o is GenesisStateSDKType;
    encode(message: GenesisState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenesisState;
    fromJSON(object: any): GenesisState;
    toJSON(message: GenesisState): JsonSafe<GenesisState>;
    fromPartial(object: Partial<GenesisState>): GenesisState;
    fromProtoMsg(message: GenesisStateProtoMsg): GenesisState;
    toProto(message: GenesisState): Uint8Array;
    toProtoMsg(message: GenesisState): GenesisStateProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map