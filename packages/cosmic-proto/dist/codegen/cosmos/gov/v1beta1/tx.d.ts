import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { VoteOption, WeightedVoteOption, type WeightedVoteOptionSDKType, TextProposal, type TextProposalSDKType } from './gov.js';
import { ClientUpdateProposal, type ClientUpdateProposalSDKType, UpgradeProposal, type UpgradeProposalSDKType } from '../../../ibc/core/client/v1/client.js';
import { SoftwareUpgradeProposal, type SoftwareUpgradeProposalSDKType, CancelSoftwareUpgradeProposal, type CancelSoftwareUpgradeProposalSDKType } from '../../upgrade/v1beta1/upgrade.js';
import { ParameterChangeProposal, type ParameterChangeProposalSDKType } from '../../params/v1beta1/params.js';
import { CommunityPoolSpendProposal, type CommunityPoolSpendProposalSDKType, CommunityPoolSpendProposalWithDeposit, type CommunityPoolSpendProposalWithDepositSDKType } from '../../distribution/v1beta1/distribution.js';
import { CoreEvalProposal, type CoreEvalProposalSDKType } from '../../../agoric/swingset/swingset.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 * @name MsgSubmitProposal
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgSubmitProposal
 */
export interface MsgSubmitProposal {
    /**
     * content is the proposal's content.
     */
    content?: ClientUpdateProposal | UpgradeProposal | SoftwareUpgradeProposal | CancelSoftwareUpgradeProposal | ParameterChangeProposal | TextProposal | CommunityPoolSpendProposal | CommunityPoolSpendProposalWithDeposit | CoreEvalProposal | Any | undefined;
    /**
     * initial_deposit is the deposit value that must be paid at proposal submission.
     */
    initialDeposit: Coin[];
    /**
     * proposer is the account address of the proposer.
     */
    proposer: string;
}
export interface MsgSubmitProposalProtoMsg {
    typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal';
    value: Uint8Array;
}
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 * @name MsgSubmitProposalSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgSubmitProposal
 */
export interface MsgSubmitProposalSDKType {
    content?: ClientUpdateProposalSDKType | UpgradeProposalSDKType | SoftwareUpgradeProposalSDKType | CancelSoftwareUpgradeProposalSDKType | ParameterChangeProposalSDKType | TextProposalSDKType | CommunityPoolSpendProposalSDKType | CommunityPoolSpendProposalWithDepositSDKType | CoreEvalProposalSDKType | AnySDKType | undefined;
    initial_deposit: CoinSDKType[];
    proposer: string;
}
/**
 * MsgSubmitProposalResponse defines the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponse
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgSubmitProposalResponse
 */
export interface MsgSubmitProposalResponse {
    /**
     * proposal_id defines the unique id of the proposal.
     */
    proposalId: bigint;
}
export interface MsgSubmitProposalResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposalResponse';
    value: Uint8Array;
}
/**
 * MsgSubmitProposalResponse defines the Msg/SubmitProposal response type.
 * @name MsgSubmitProposalResponseSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgSubmitProposalResponse
 */
export interface MsgSubmitProposalResponseSDKType {
    proposal_id: bigint;
}
/**
 * MsgVote defines a message to cast a vote.
 * @name MsgVote
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVote
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
}
export interface MsgVoteProtoMsg {
    typeUrl: '/cosmos.gov.v1beta1.MsgVote';
    value: Uint8Array;
}
/**
 * MsgVote defines a message to cast a vote.
 * @name MsgVoteSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVote
 */
export interface MsgVoteSDKType {
    proposal_id: bigint;
    voter: string;
    option: VoteOption;
}
/**
 * MsgVoteResponse defines the Msg/Vote response type.
 * @name MsgVoteResponse
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteResponse
 */
export interface MsgVoteResponse {
}
export interface MsgVoteResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1beta1.MsgVoteResponse';
    value: Uint8Array;
}
/**
 * MsgVoteResponse defines the Msg/Vote response type.
 * @name MsgVoteResponseSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteResponse
 */
export interface MsgVoteResponseSDKType {
}
/**
 * MsgVoteWeighted defines a message to cast a vote.
 *
 * Since: cosmos-sdk 0.43
 * @name MsgVoteWeighted
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteWeighted
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
}
export interface MsgVoteWeightedProtoMsg {
    typeUrl: '/cosmos.gov.v1beta1.MsgVoteWeighted';
    value: Uint8Array;
}
/**
 * MsgVoteWeighted defines a message to cast a vote.
 *
 * Since: cosmos-sdk 0.43
 * @name MsgVoteWeightedSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteWeighted
 */
export interface MsgVoteWeightedSDKType {
    proposal_id: bigint;
    voter: string;
    options: WeightedVoteOptionSDKType[];
}
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 *
 * Since: cosmos-sdk 0.43
 * @name MsgVoteWeightedResponse
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteWeightedResponse
 */
export interface MsgVoteWeightedResponse {
}
export interface MsgVoteWeightedResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1beta1.MsgVoteWeightedResponse';
    value: Uint8Array;
}
/**
 * MsgVoteWeightedResponse defines the Msg/VoteWeighted response type.
 *
 * Since: cosmos-sdk 0.43
 * @name MsgVoteWeightedResponseSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteWeightedResponse
 */
export interface MsgVoteWeightedResponseSDKType {
}
/**
 * MsgDeposit defines a message to submit a deposit to an existing proposal.
 * @name MsgDeposit
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgDeposit
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
    typeUrl: '/cosmos.gov.v1beta1.MsgDeposit';
    value: Uint8Array;
}
/**
 * MsgDeposit defines a message to submit a deposit to an existing proposal.
 * @name MsgDepositSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgDeposit
 */
export interface MsgDepositSDKType {
    proposal_id: bigint;
    depositor: string;
    amount: CoinSDKType[];
}
/**
 * MsgDepositResponse defines the Msg/Deposit response type.
 * @name MsgDepositResponse
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgDepositResponse
 */
export interface MsgDepositResponse {
}
export interface MsgDepositResponseProtoMsg {
    typeUrl: '/cosmos.gov.v1beta1.MsgDepositResponse';
    value: Uint8Array;
}
/**
 * MsgDepositResponse defines the Msg/Deposit response type.
 * @name MsgDepositResponseSDKType
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgDepositResponse
 */
export interface MsgDepositResponseSDKType {
}
/**
 * MsgSubmitProposal defines an sdk.Msg type that supports submitting arbitrary
 * proposal Content.
 * @name MsgSubmitProposal
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgSubmitProposal
 */
export declare const MsgSubmitProposal: {
    typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposal";
    aminoType: "cosmos-sdk/MsgSubmitProposal";
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
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgSubmitProposalResponse
 */
export declare const MsgSubmitProposalResponse: {
    typeUrl: "/cosmos.gov.v1beta1.MsgSubmitProposalResponse";
    aminoType: "cosmos-sdk/MsgSubmitProposalResponse";
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
 * MsgVote defines a message to cast a vote.
 * @name MsgVote
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVote
 */
export declare const MsgVote: {
    typeUrl: "/cosmos.gov.v1beta1.MsgVote";
    aminoType: "cosmos-sdk/MsgVote";
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
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteResponse
 */
export declare const MsgVoteResponse: {
    typeUrl: "/cosmos.gov.v1beta1.MsgVoteResponse";
    aminoType: "cosmos-sdk/MsgVoteResponse";
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
 *
 * Since: cosmos-sdk 0.43
 * @name MsgVoteWeighted
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteWeighted
 */
export declare const MsgVoteWeighted: {
    typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeighted";
    aminoType: "cosmos-sdk/MsgVoteWeighted";
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
 *
 * Since: cosmos-sdk 0.43
 * @name MsgVoteWeightedResponse
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgVoteWeightedResponse
 */
export declare const MsgVoteWeightedResponse: {
    typeUrl: "/cosmos.gov.v1beta1.MsgVoteWeightedResponse";
    aminoType: "cosmos-sdk/MsgVoteWeightedResponse";
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
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgDeposit
 */
export declare const MsgDeposit: {
    typeUrl: "/cosmos.gov.v1beta1.MsgDeposit";
    aminoType: "cosmos-sdk/MsgDeposit";
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
 * @package cosmos.gov.v1beta1
 * @see proto type: cosmos.gov.v1beta1.MsgDepositResponse
 */
export declare const MsgDepositResponse: {
    typeUrl: "/cosmos.gov.v1beta1.MsgDepositResponse";
    aminoType: "cosmos-sdk/MsgDepositResponse";
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
//# sourceMappingURL=tx.d.ts.map