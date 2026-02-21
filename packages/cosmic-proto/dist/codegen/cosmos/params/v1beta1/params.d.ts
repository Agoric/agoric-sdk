import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * ParameterChangeProposal defines a proposal to change one or more parameters.
 * @name ParameterChangeProposal
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.ParameterChangeProposal
 */
export interface ParameterChangeProposal {
    $typeUrl?: '/cosmos.params.v1beta1.ParameterChangeProposal';
    title: string;
    description: string;
    changes: ParamChange[];
}
export interface ParameterChangeProposalProtoMsg {
    typeUrl: '/cosmos.params.v1beta1.ParameterChangeProposal';
    value: Uint8Array;
}
/**
 * ParameterChangeProposal defines a proposal to change one or more parameters.
 * @name ParameterChangeProposalSDKType
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.ParameterChangeProposal
 */
export interface ParameterChangeProposalSDKType {
    $typeUrl?: '/cosmos.params.v1beta1.ParameterChangeProposal';
    title: string;
    description: string;
    changes: ParamChangeSDKType[];
}
/**
 * ParamChange defines an individual parameter change, for use in
 * ParameterChangeProposal.
 * @name ParamChange
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.ParamChange
 */
export interface ParamChange {
    subspace: string;
    key: string;
    value: string;
}
export interface ParamChangeProtoMsg {
    typeUrl: '/cosmos.params.v1beta1.ParamChange';
    value: Uint8Array;
}
/**
 * ParamChange defines an individual parameter change, for use in
 * ParameterChangeProposal.
 * @name ParamChangeSDKType
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.ParamChange
 */
export interface ParamChangeSDKType {
    subspace: string;
    key: string;
    value: string;
}
/**
 * ParameterChangeProposal defines a proposal to change one or more parameters.
 * @name ParameterChangeProposal
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.ParameterChangeProposal
 */
export declare const ParameterChangeProposal: {
    typeUrl: "/cosmos.params.v1beta1.ParameterChangeProposal";
    aminoType: "cosmos-sdk/ParameterChangeProposal";
    is(o: any): o is ParameterChangeProposal;
    isSDK(o: any): o is ParameterChangeProposalSDKType;
    encode(message: ParameterChangeProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ParameterChangeProposal;
    fromJSON(object: any): ParameterChangeProposal;
    toJSON(message: ParameterChangeProposal): JsonSafe<ParameterChangeProposal>;
    fromPartial(object: Partial<ParameterChangeProposal>): ParameterChangeProposal;
    fromProtoMsg(message: ParameterChangeProposalProtoMsg): ParameterChangeProposal;
    toProto(message: ParameterChangeProposal): Uint8Array;
    toProtoMsg(message: ParameterChangeProposal): ParameterChangeProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ParamChange defines an individual parameter change, for use in
 * ParameterChangeProposal.
 * @name ParamChange
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.ParamChange
 */
export declare const ParamChange: {
    typeUrl: "/cosmos.params.v1beta1.ParamChange";
    aminoType: "cosmos-sdk/ParamChange";
    is(o: any): o is ParamChange;
    isSDK(o: any): o is ParamChangeSDKType;
    encode(message: ParamChange, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ParamChange;
    fromJSON(object: any): ParamChange;
    toJSON(message: ParamChange): JsonSafe<ParamChange>;
    fromPartial(object: Partial<ParamChange>): ParamChange;
    fromProtoMsg(message: ParamChangeProtoMsg): ParamChange;
    toProto(message: ParamChange): Uint8Array;
    toProtoMsg(message: ParamChange): ParamChangeProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=params.d.ts.map