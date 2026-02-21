import { PublicKey, type PublicKeySDKType } from '../crypto/keys.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/** BlockIdFlag indicates which BlockID the signature is for */
export declare enum BlockIDFlag {
    /** BLOCK_ID_FLAG_UNKNOWN - indicates an error condition */
    BLOCK_ID_FLAG_UNKNOWN = 0,
    /** BLOCK_ID_FLAG_ABSENT - the vote was not received */
    BLOCK_ID_FLAG_ABSENT = 1,
    BLOCK_ID_FLAG_COMMIT = 2,
    /** BLOCK_ID_FLAG_NIL - voted for nil */
    BLOCK_ID_FLAG_NIL = 3,
    UNRECOGNIZED = -1
}
export declare const BlockIDFlagSDKType: typeof BlockIDFlag;
export declare function blockIDFlagFromJSON(object: any): BlockIDFlag;
export declare function blockIDFlagToJSON(object: BlockIDFlag): string;
/**
 * @name ValidatorSet
 * @package tendermint.types
 * @see proto type: tendermint.types.ValidatorSet
 */
export interface ValidatorSet {
    validators: Validator[];
    proposer?: Validator;
    totalVotingPower: bigint;
}
export interface ValidatorSetProtoMsg {
    typeUrl: '/tendermint.types.ValidatorSet';
    value: Uint8Array;
}
/**
 * @name ValidatorSetSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.ValidatorSet
 */
export interface ValidatorSetSDKType {
    validators: ValidatorSDKType[];
    proposer?: ValidatorSDKType;
    total_voting_power: bigint;
}
/**
 * @name Validator
 * @package tendermint.types
 * @see proto type: tendermint.types.Validator
 */
export interface Validator {
    address: Uint8Array;
    pubKey: PublicKey;
    votingPower: bigint;
    proposerPriority: bigint;
}
export interface ValidatorProtoMsg {
    typeUrl: '/tendermint.types.Validator';
    value: Uint8Array;
}
/**
 * @name ValidatorSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Validator
 */
export interface ValidatorSDKType {
    address: Uint8Array;
    pub_key: PublicKeySDKType;
    voting_power: bigint;
    proposer_priority: bigint;
}
/**
 * @name SimpleValidator
 * @package tendermint.types
 * @see proto type: tendermint.types.SimpleValidator
 */
export interface SimpleValidator {
    pubKey?: PublicKey;
    votingPower: bigint;
}
export interface SimpleValidatorProtoMsg {
    typeUrl: '/tendermint.types.SimpleValidator';
    value: Uint8Array;
}
/**
 * @name SimpleValidatorSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.SimpleValidator
 */
export interface SimpleValidatorSDKType {
    pub_key?: PublicKeySDKType;
    voting_power: bigint;
}
/**
 * @name ValidatorSet
 * @package tendermint.types
 * @see proto type: tendermint.types.ValidatorSet
 */
export declare const ValidatorSet: {
    typeUrl: "/tendermint.types.ValidatorSet";
    is(o: any): o is ValidatorSet;
    isSDK(o: any): o is ValidatorSetSDKType;
    encode(message: ValidatorSet, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ValidatorSet;
    fromJSON(object: any): ValidatorSet;
    toJSON(message: ValidatorSet): JsonSafe<ValidatorSet>;
    fromPartial(object: Partial<ValidatorSet>): ValidatorSet;
    fromProtoMsg(message: ValidatorSetProtoMsg): ValidatorSet;
    toProto(message: ValidatorSet): Uint8Array;
    toProtoMsg(message: ValidatorSet): ValidatorSetProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Validator
 * @package tendermint.types
 * @see proto type: tendermint.types.Validator
 */
export declare const Validator: {
    typeUrl: "/tendermint.types.Validator";
    is(o: any): o is Validator;
    isSDK(o: any): o is ValidatorSDKType;
    encode(message: Validator, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Validator;
    fromJSON(object: any): Validator;
    toJSON(message: Validator): JsonSafe<Validator>;
    fromPartial(object: Partial<Validator>): Validator;
    fromProtoMsg(message: ValidatorProtoMsg): Validator;
    toProto(message: Validator): Uint8Array;
    toProtoMsg(message: Validator): ValidatorProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name SimpleValidator
 * @package tendermint.types
 * @see proto type: tendermint.types.SimpleValidator
 */
export declare const SimpleValidator: {
    typeUrl: "/tendermint.types.SimpleValidator";
    is(o: any): o is SimpleValidator;
    isSDK(o: any): o is SimpleValidatorSDKType;
    encode(message: SimpleValidator, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SimpleValidator;
    fromJSON(object: any): SimpleValidator;
    toJSON(message: SimpleValidator): JsonSafe<SimpleValidator>;
    fromPartial(object: Partial<SimpleValidator>): SimpleValidator;
    fromProtoMsg(message: SimpleValidatorProtoMsg): SimpleValidator;
    toProto(message: SimpleValidator): Uint8Array;
    toProtoMsg(message: SimpleValidator): SimpleValidatorProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=validator.d.ts.map