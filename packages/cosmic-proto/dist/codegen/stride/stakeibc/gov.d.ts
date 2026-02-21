import { Validator, type ValidatorSDKType } from './validator.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name AddValidatorsProposal
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.AddValidatorsProposal
 */
export interface AddValidatorsProposal {
    title: string;
    description: string;
    hostZone: string;
    validators: Validator[];
    deposit: string;
}
export interface AddValidatorsProposalProtoMsg {
    typeUrl: '/stride.stakeibc.AddValidatorsProposal';
    value: Uint8Array;
}
/**
 * @name AddValidatorsProposalSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.AddValidatorsProposal
 */
export interface AddValidatorsProposalSDKType {
    title: string;
    description: string;
    host_zone: string;
    validators: ValidatorSDKType[];
    deposit: string;
}
/**
 * @name ToggleLSMProposal
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ToggleLSMProposal
 */
export interface ToggleLSMProposal {
    title: string;
    description: string;
    hostZone: string;
    enabled: boolean;
    deposit: string;
}
export interface ToggleLSMProposalProtoMsg {
    typeUrl: '/stride.stakeibc.ToggleLSMProposal';
    value: Uint8Array;
}
/**
 * @name ToggleLSMProposalSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ToggleLSMProposal
 */
export interface ToggleLSMProposalSDKType {
    title: string;
    description: string;
    host_zone: string;
    enabled: boolean;
    deposit: string;
}
/**
 * @name AddValidatorsProposal
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.AddValidatorsProposal
 */
export declare const AddValidatorsProposal: {
    typeUrl: "/stride.stakeibc.AddValidatorsProposal";
    is(o: any): o is AddValidatorsProposal;
    isSDK(o: any): o is AddValidatorsProposalSDKType;
    encode(message: AddValidatorsProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AddValidatorsProposal;
    fromJSON(object: any): AddValidatorsProposal;
    toJSON(message: AddValidatorsProposal): JsonSafe<AddValidatorsProposal>;
    fromPartial(object: Partial<AddValidatorsProposal>): AddValidatorsProposal;
    fromProtoMsg(message: AddValidatorsProposalProtoMsg): AddValidatorsProposal;
    toProto(message: AddValidatorsProposal): Uint8Array;
    toProtoMsg(message: AddValidatorsProposal): AddValidatorsProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ToggleLSMProposal
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ToggleLSMProposal
 */
export declare const ToggleLSMProposal: {
    typeUrl: "/stride.stakeibc.ToggleLSMProposal";
    is(o: any): o is ToggleLSMProposal;
    isSDK(o: any): o is ToggleLSMProposalSDKType;
    encode(message: ToggleLSMProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ToggleLSMProposal;
    fromJSON(object: any): ToggleLSMProposal;
    toJSON(message: ToggleLSMProposal): JsonSafe<ToggleLSMProposal>;
    fromPartial(object: Partial<ToggleLSMProposal>): ToggleLSMProposal;
    fromProtoMsg(message: ToggleLSMProposalProtoMsg): ToggleLSMProposal;
    toProto(message: ToggleLSMProposal): Uint8Array;
    toProtoMsg(message: ToggleLSMProposal): ToggleLSMProposalProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=gov.d.ts.map