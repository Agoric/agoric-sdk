import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { VoteOption, WeightedVoteOption, type WeightedVoteOptionSDKType, Params, type ParamsSDKType } from './gov.js';
import { Timestamp, type TimestampSDKType } from '../../../google/protobuf/timestamp.js';
import { ClientUpdateProposal, type ClientUpdateProposalSDKType, UpgradeProposal, type UpgradeProposalSDKType } from '../../../ibc/core/client/v1/client.js';
import { SoftwareUpgradeProposal, type SoftwareUpgradeProposalSDKType, CancelSoftwareUpgradeProposal, type CancelSoftwareUpgradeProposalSDKType } from '../../upgrade/v1beta1/upgrade.js';
import { ParameterChangeProposal, type ParameterChangeProposalSDKType } from '../../params/v1beta1/params.js';
import { TextProposal, type TextProposalSDKType } from '../v1beta1/gov.js';
import { CommunityPoolSpendProposal, type CommunityPoolSpendProposalSDKType, CommunityPoolSpendProposalWithDeposit, type CommunityPoolSpendProposalWithDepositSDKType } from '../../distribution/v1beta1/distribution.js';
import { CoreEvalProposal, type CoreEvalProposalSDKType } from '../../../agoric/swingset/swingset.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 * @name MsgSubmitProposal
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgSubmitProposal
 */
export interface MsgSubmitProposal {
    /**
     * messages are the arbitrary messages to be executed if proposal passes.
     */
    messages: Any[];
    /**
     * initial_deposit is the deposit value that must be paid at proposal submission.
     */
    initialDeposit: Coin[];
    /**
     * proposer is the account address of the proposer.
     */
    proposer: string;
    /**
     * metadata is any arbitrary metadata attached to the proposal.
     */
    metadata: string;
    /**
     * title is the title of the proposal.
     *
     * Since: cosmos-sdk 0.47
     */
    title: string;
    /**
     * summary is the summary of the proposal
     *
     * Since: cosmos-sdk 0.47
     */
    summary: string;
    /**
     * expedited defines if the proposal is expedited or not
     *
     * Since: cosmos-sdk 0.50
     */
    expedited: boolean;
}
export interface MsgSubmitProposalProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgSubmitProposal';
    value: Uint8Array;
}
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 * @name MsgSubmitProposalSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgSubmitProposal
 */
export interface MsgSubmitProposalSDKType {
    messages: AnySDKType[];
    initial_deposit: CoinSDKType[];
    proposer: string;
    metadata: string;
    title: string;
    summary: string;
    expedited: boolean;
}
/**
 * MsgSubmitProposalResponse defines the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgSubmitProposalResponse
 */
export interface MsgSubmitProposalResponse {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
}
export interface MsgSubmitProposalResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgSubmitProposalResponse';
    value: Uint8Array;
}
/**
 * MsgSubmitProposalResponse defines the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgSubmitProposalResponse
 */
export interface MsgSubmitProposalResponseSDKType {
    proposal_id: bigint;
}
/**
 * MsgExecLegacyContent is used to wrap the legacy content field into a message.
 * This ensures backwards compatibility with v1beta1.MsgSubmitProposal.
 * @name MsgExecLegacyContent
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgExecLegacyContent
 */
export interface MsgExecLegacyContent {
    /**
     * content is the proposal's content.
     */
    content?: ClientUpdateProposal | UpgradeProposal | SoftwareUpgradeProposal | CancelSoftwareUpgradeProposal | ParameterChangeProposal | TextProposal | CommunityPoolSpendProposal | CommunityPoolSpendProposalWithDeposit | CoreEvalProposal | Any | undefined;
    /**
     * authority must be the gov module address.
     */
    authority: string;
}
export interface MsgExecLegacyContentProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgExecLegacyContent';
    value: Uint8Array;
}
/**
 * MsgExecLegacyContent is used to wrap the legacy content field into a message.
 * This ensures backwards compatibility with v1beta1.MsgSubmitProposal.
 * @name MsgExecLegacyContentSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgExecLegacyContent
 */
export interface MsgExecLegacyContentSDKType {
    content?: ClientUpdateProposalSDKType | UpgradeProposalSDKType | SoftwareUpgradeProposalSDKType | CancelSoftwareUpgradeProposalSDKType | ParameterChangeProposalSDKType | TextProposalSDKType | CommunityPoolSpendProposalSDKType | CommunityPoolSpendProposalWithDepositSDKType | CoreEvalProposalSDKType | AnySDKType | undefined;
    authority: string;
}
/**
 * MsgExecLegacyContentResponse defines the Msg/ExecLegacyContent response type.
 * @name MsgExecLegacyContentResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgExecLegacyContentResponse
 */
export interface MsgExecLegacyContentResponse {
}
export interface MsgExecLegacyContentResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgExecLegacyContentResponse';
    value: Uint8Array;
}
/**
 * MsgExecLegacyContentResponse defines the Msg/ExecLegacyContent response type.
 * @name MsgExecLegacyContentResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgExecLegacyContentResponse
 */
export interface MsgExecLegacyContentResponseSDKType {
}
/**
 * MsgVote defines a message to cast a vote.
 * @name MsgVote
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVote
 */
export interface MsgVote {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * voter is the voter address for the proposal.
     */
    voter: string;
    /**
     * option defines the vote option.
     */
    option: VoteOption;
    /**
     * metadata is any arbitrary metadata attached to the Vote.
     */
    metadata: string;
}
export interface MsgVoteProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgVote';
    value: Uint8Array;
}
/**
 * MsgVote defines a message to cast a vote.
 * @name MsgVoteSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVote
 */
export interface MsgVoteSDKType {
    proposal_id: bigint;
    voter: string;
    option: VoteOption;
    metadata: string;
}
/**
 * MsgVoteResponse defines the Msg/Vote response type.
 * @name MsgVoteResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteResponse
 */
export interface MsgVoteResponse {
}
export interface MsgVoteResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgVoteResponse';
    value: Uint8Array;
}
/**
 * MsgVoteResponse defines the Msg/Vote response type.
 * @name MsgVoteResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteResponse
 */
export interface MsgVoteResponseSDKType {
}
/**
 * MsgVoteWeighted defines a message to cast a vote.
 * @name MsgVoteWeighted
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteWeighted
 */
export interface MsgVoteWeighted {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * voter is the voter address for the proposal.
     */
    voter: string;
    /**
     * options defines the weighted vote options.
     */
    options: WeightedVoteOption[];
    /**
     * metadata is any arbitrary metadata attached to the VoteWeighted.
     */
    metadata: string;
}
export interface MsgVoteWeightedProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgVoteWeighted';
    value: Uint8Array;
}
/**
 * MsgVoteWeighted defines a message to cast a vote.
 * @name MsgVoteWeightedSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteWeighted
 */
export interface MsgVoteWeightedSDKType {
    proposal_id: bigint;
    voter: string;
    options: WeightedVoteOptionSDKType[];
    metadata: string;
}
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 * @name MsgVoteWeightedResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteWeightedResponse
 */
export interface MsgVoteWeightedResponse {
}
export interface MsgVoteWeightedResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgVoteWeightedResponse';
    value: Uint8Array;
}
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 * @name MsgVoteWeightedResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteWeightedResponse
 */
export interface MsgVoteWeightedResponseSDKType {
}
/**
 * MsgDeposit defines a message to submit a deposit to an existing proposal.
 * @name MsgDeposit
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgDeposit
 */
export interface MsgDeposit {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * depositor defines the deposit addresses from the proposals.
     */
    depositor: string;
    /**
     * amount to be deposited by depositor.
     */
    amount: Coin[];
}
export interface MsgDepositProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgDeposit';
    value: Uint8Array;
}
/**
 * MsgDeposit defines a message to submit a deposit to an existing proposal.
 * @name MsgDepositSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgDeposit
 */
export interface MsgDepositSDKType {
    proposal_id: bigint;
    depositor: string;
    amount: CoinSDKType[];
}
/**
 * MsgDepositResponse defines the Msg/Deposit response type.
 * @name MsgDepositResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgDepositResponse
 */
export interface MsgDepositResponse {
}
export interface MsgDepositResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgDepositResponse';
    value: Uint8Array;
}
/**
 * MsgDepositResponse defines the Msg/Deposit response type.
 * @name MsgDepositResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgDepositResponse
 */
export interface MsgDepositResponseSDKType {
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
    authority: string;
    /**
     * params defines the x/gov parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    authority: string;
    params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgCancelProposal is the Msg/CancelProposal request type.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgCancelProposal
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgCancelProposal
 */
export interface MsgCancelProposal {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * proposer is the account address of the proposer.
     */
    proposer: string;
}
export interface MsgCancelProposalProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgCancelProposal';
    value: Uint8Array;
}
/**
 * MsgCancelProposal is the Msg/CancelProposal request type.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgCancelProposalSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgCancelProposal
 */
export interface MsgCancelProposalSDKType {
    proposal_id: bigint;
    proposer: string;
}
/**
 * MsgCancelProposalResponse defines the response structure for executing a
 * MsgCancelProposal message.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgCancelProposalResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgCancelProposalResponse
 */
export interface MsgCancelProposalResponse {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
    /**
     * canceled_time is the time when proposal is canceled.
     */
    canceledTime: Timestamp;
    /**
     * canceled_height defines the block height at which the proposal is canceled.
     */
    canceledHeight: bigint;
}
export interface MsgCancelProposalResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1.MsgCancelProposalResponse';
    value: Uint8Array;
}
/**
 * MsgCancelProposalResponse defines the response structure for executing a
 * MsgCancelProposal message.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgCancelProposalResponseSDKType
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgCancelProposalResponse
 */
export interface MsgCancelProposalResponseSDKType {
    proposal_id: bigint;
    canceled_time: TimestampSDKType;
    canceled_height: bigint;
}
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 * @name MsgSubmitProposal
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgSubmitProposal
 */
export declare const MsgSubmitProposal: {
    typeUrl: "/cosmos.gov.v1.MsgSubmitProposal";
    aminoType: "cosmos-sdk/v1/MsgSubmitProposal";
    is(o: any): o is MsgSubmitProposal;
    isSDK(o: any): o is MsgSubmitProposalSDKType;
    encode(message: MsgSubmitProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSubmitProposal;
    fromJSON(object: any): MsgSubmitProposal;
    toJSON(message: MsgSubmitProposal): JsonSafe<MsgSubmitProposal>;
    fromPartial(object: Partial<MsgSubmitProposal>): MsgSubmitProposal;
    fromProtoMsg(message: MsgSubmitProposalProtoMsg): MsgSubmitProposal;
    toProto(message: MsgSubmitProposal): Uint8Array;
    toProtoMsg(message: MsgSubmitProposal): MsgSubmitProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSubmitProposalResponse defines the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgSubmitProposalResponse
 */
export declare const MsgSubmitProposalResponse: {
    typeUrl: "/cosmos.gov.v1.MsgSubmitProposalResponse";
    aminoType: "cosmos-sdk/v1/MsgSubmitProposalResponse";
    is(o: any): o is MsgSubmitProposalResponse;
    isSDK(o: any): o is MsgSubmitProposalResponseSDKType;
    encode(message: MsgSubmitProposalResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSubmitProposalResponse;
    fromJSON(object: any): MsgSubmitProposalResponse;
    toJSON(message: MsgSubmitProposalResponse): JsonSafe<MsgSubmitProposalResponse>;
    fromPartial(object: Partial<MsgSubmitProposalResponse>): MsgSubmitProposalResponse;
    fromProtoMsg(message: MsgSubmitProposalResponseProtoMsg): MsgSubmitProposalResponse;
    toProto(message: MsgSubmitProposalResponse): Uint8Array;
    toProtoMsg(message: MsgSubmitProposalResponse): MsgSubmitProposalResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgExecLegacyContent is used to wrap the legacy content field into a message.
 * This ensures backwards compatibility with v1beta1.MsgSubmitProposal.
 * @name MsgExecLegacyContent
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgExecLegacyContent
 */
export declare const MsgExecLegacyContent: {
    typeUrl: "/cosmos.gov.v1.MsgExecLegacyContent";
    aminoType: "cosmos-sdk/v1/MsgExecLegacyContent";
    is(o: any): o is MsgExecLegacyContent;
    isSDK(o: any): o is MsgExecLegacyContentSDKType;
    encode(message: MsgExecLegacyContent, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgExecLegacyContent;
    fromJSON(object: any): MsgExecLegacyContent;
    toJSON(message: MsgExecLegacyContent): JsonSafe<MsgExecLegacyContent>;
    fromPartial(object: Partial<MsgExecLegacyContent>): MsgExecLegacyContent;
    fromProtoMsg(message: MsgExecLegacyContentProtoMsg): MsgExecLegacyContent;
    toProto(message: MsgExecLegacyContent): Uint8Array;
    toProtoMsg(message: MsgExecLegacyContent): MsgExecLegacyContentProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgExecLegacyContentResponse defines the Msg/ExecLegacyContent response type.
 * @name MsgExecLegacyContentResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgExecLegacyContentResponse
 */
export declare const MsgExecLegacyContentResponse: {
    typeUrl: "/cosmos.gov.v1.MsgExecLegacyContentResponse";
    aminoType: "cosmos-sdk/v1/MsgExecLegacyContentResponse";
    is(o: any): o is MsgExecLegacyContentResponse;
    isSDK(o: any): o is MsgExecLegacyContentResponseSDKType;
    encode(_: MsgExecLegacyContentResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgExecLegacyContentResponse;
    fromJSON(_: any): MsgExecLegacyContentResponse;
    toJSON(_: MsgExecLegacyContentResponse): JsonSafe<MsgExecLegacyContentResponse>;
    fromPartial(_: Partial<MsgExecLegacyContentResponse>): MsgExecLegacyContentResponse;
    fromProtoMsg(message: MsgExecLegacyContentResponseProtoMsg): MsgExecLegacyContentResponse;
    toProto(message: MsgExecLegacyContentResponse): Uint8Array;
    toProtoMsg(message: MsgExecLegacyContentResponse): MsgExecLegacyContentResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgVote defines a message to cast a vote.
 * @name MsgVote
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVote
 */
export declare const MsgVote: {
    typeUrl: "/cosmos.gov.v1.MsgVote";
    aminoType: "cosmos-sdk/v1/MsgVote";
    is(o: any): o is MsgVote;
    isSDK(o: any): o is MsgVoteSDKType;
    encode(message: MsgVote, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgVote;
    fromJSON(object: any): MsgVote;
    toJSON(message: MsgVote): JsonSafe<MsgVote>;
    fromPartial(object: Partial<MsgVote>): MsgVote;
    fromProtoMsg(message: MsgVoteProtoMsg): MsgVote;
    toProto(message: MsgVote): Uint8Array;
    toProtoMsg(message: MsgVote): MsgVoteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgVoteResponse defines the Msg/Vote response type.
 * @name MsgVoteResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteResponse
 */
export declare const MsgVoteResponse: {
    typeUrl: "/cosmos.gov.v1.MsgVoteResponse";
    aminoType: "cosmos-sdk/v1/MsgVoteResponse";
    is(o: any): o is MsgVoteResponse;
    isSDK(o: any): o is MsgVoteResponseSDKType;
    encode(_: MsgVoteResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgVoteResponse;
    fromJSON(_: any): MsgVoteResponse;
    toJSON(_: MsgVoteResponse): JsonSafe<MsgVoteResponse>;
    fromPartial(_: Partial<MsgVoteResponse>): MsgVoteResponse;
    fromProtoMsg(message: MsgVoteResponseProtoMsg): MsgVoteResponse;
    toProto(message: MsgVoteResponse): Uint8Array;
    toProtoMsg(message: MsgVoteResponse): MsgVoteResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgVoteWeighted defines a message to cast a vote.
 * @name MsgVoteWeighted
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteWeighted
 */
export declare const MsgVoteWeighted: {
    typeUrl: "/cosmos.gov.v1.MsgVoteWeighted";
    aminoType: "cosmos-sdk/v1/MsgVoteWeighted";
    is(o: any): o is MsgVoteWeighted;
    isSDK(o: any): o is MsgVoteWeightedSDKType;
    encode(message: MsgVoteWeighted, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgVoteWeighted;
    fromJSON(object: any): MsgVoteWeighted;
    toJSON(message: MsgVoteWeighted): JsonSafe<MsgVoteWeighted>;
    fromPartial(object: Partial<MsgVoteWeighted>): MsgVoteWeighted;
    fromProtoMsg(message: MsgVoteWeightedProtoMsg): MsgVoteWeighted;
    toProto(message: MsgVoteWeighted): Uint8Array;
    toProtoMsg(message: MsgVoteWeighted): MsgVoteWeightedProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 * @name MsgVoteWeightedResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgVoteWeightedResponse
 */
export declare const MsgVoteWeightedResponse: {
    typeUrl: "/cosmos.gov.v1.MsgVoteWeightedResponse";
    aminoType: "cosmos-sdk/v1/MsgVoteWeightedResponse";
    is(o: any): o is MsgVoteWeightedResponse;
    isSDK(o: any): o is MsgVoteWeightedResponseSDKType;
    encode(_: MsgVoteWeightedResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgVoteWeightedResponse;
    fromJSON(_: any): MsgVoteWeightedResponse;
    toJSON(_: MsgVoteWeightedResponse): JsonSafe<MsgVoteWeightedResponse>;
    fromPartial(_: Partial<MsgVoteWeightedResponse>): MsgVoteWeightedResponse;
    fromProtoMsg(message: MsgVoteWeightedResponseProtoMsg): MsgVoteWeightedResponse;
    toProto(message: MsgVoteWeightedResponse): Uint8Array;
    toProtoMsg(message: MsgVoteWeightedResponse): MsgVoteWeightedResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgDeposit defines a message to submit a deposit to an existing proposal.
 * @name MsgDeposit
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgDeposit
 */
export declare const MsgDeposit: {
    typeUrl: "/cosmos.gov.v1.MsgDeposit";
    aminoType: "cosmos-sdk/v1/MsgDeposit";
    is(o: any): o is MsgDeposit;
    isSDK(o: any): o is MsgDepositSDKType;
    encode(message: MsgDeposit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDeposit;
    fromJSON(object: any): MsgDeposit;
    toJSON(message: MsgDeposit): JsonSafe<MsgDeposit>;
    fromPartial(object: Partial<MsgDeposit>): MsgDeposit;
    fromProtoMsg(message: MsgDepositProtoMsg): MsgDeposit;
    toProto(message: MsgDeposit): Uint8Array;
    toProtoMsg(message: MsgDeposit): MsgDepositProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgDepositResponse defines the Msg/Deposit response type.
 * @name MsgDepositResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgDepositResponse
 */
export declare const MsgDepositResponse: {
    typeUrl: "/cosmos.gov.v1.MsgDepositResponse";
    aminoType: "cosmos-sdk/v1/MsgDepositResponse";
    is(o: any): o is MsgDepositResponse;
    isSDK(o: any): o is MsgDepositResponseSDKType;
    encode(_: MsgDepositResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositResponse;
    fromJSON(_: any): MsgDepositResponse;
    toJSON(_: MsgDepositResponse): JsonSafe<MsgDepositResponse>;
    fromPartial(_: Partial<MsgDepositResponse>): MsgDepositResponse;
    fromProtoMsg(message: MsgDepositResponseProtoMsg): MsgDepositResponse;
    toProto(message: MsgDepositResponse): Uint8Array;
    toProtoMsg(message: MsgDepositResponse): MsgDepositResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/cosmos.gov.v1.MsgUpdateParams";
    aminoType: "cosmos-sdk/x/gov/v1/MsgUpdateParams";
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
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/cosmos.gov.v1.MsgUpdateParamsResponse";
    aminoType: "cosmos-sdk/v1/MsgUpdateParamsResponse";
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
 * MsgCancelProposal is the Msg/CancelProposal request type.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgCancelProposal
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgCancelProposal
 */
export declare const MsgCancelProposal: {
    typeUrl: "/cosmos.gov.v1.MsgCancelProposal";
    aminoType: "cosmos-sdk/v1/MsgCancelProposal";
    is(o: any): o is MsgCancelProposal;
    isSDK(o: any): o is MsgCancelProposalSDKType;
    encode(message: MsgCancelProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCancelProposal;
    fromJSON(object: any): MsgCancelProposal;
    toJSON(message: MsgCancelProposal): JsonSafe<MsgCancelProposal>;
    fromPartial(object: Partial<MsgCancelProposal>): MsgCancelProposal;
    fromProtoMsg(message: MsgCancelProposalProtoMsg): MsgCancelProposal;
    toProto(message: MsgCancelProposal): Uint8Array;
    toProtoMsg(message: MsgCancelProposal): MsgCancelProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCancelProposalResponse defines the response structure for executing a
 * MsgCancelProposal message.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgCancelProposalResponse
 * @package cosmos.gov.v1
 * @see proto type: cosmos.gov.v1.MsgCancelProposalResponse
 */
export declare const MsgCancelProposalResponse: {
    typeUrl: "/cosmos.gov.v1.MsgCancelProposalResponse";
    aminoType: "cosmos-sdk/v1/MsgCancelProposalResponse";
    is(o: any): o is MsgCancelProposalResponse;
    isSDK(o: any): o is MsgCancelProposalResponseSDKType;
    encode(message: MsgCancelProposalResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCancelProposalResponse;
    fromJSON(object: any): MsgCancelProposalResponse;
    toJSON(message: MsgCancelProposalResponse): JsonSafe<MsgCancelProposalResponse>;
    fromPartial(object: Partial<MsgCancelProposalResponse>): MsgCancelProposalResponse;
    fromProtoMsg(message: MsgCancelProposalResponseProtoMsg): MsgCancelProposalResponse;
    toProto(message: MsgCancelProposalResponse): Uint8Array;
    toProtoMsg(message: MsgCancelProposalResponse): MsgCancelProposalResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map