import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name Proof
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.Proof
 */
export interface Proof {
    total: bigint;
    index: bigint;
    leafHash: Uint8Array;
    aunts: Uint8Array[];
}
export interface ProofProtoMsg {
    typeUrl: '/tendermint.crypto.Proof';
    value: Uint8Array;
}
/**
 * @name ProofSDKType
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.Proof
 */
export interface ProofSDKType {
    total: bigint;
    index: bigint;
    leaf_hash: Uint8Array;
    aunts: Uint8Array[];
}
/**
 * @name ValueOp
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ValueOp
 */
export interface ValueOp {
    /**
     * Encoded in ProofOp.Key.
     */
    key: Uint8Array;
    /**
     * To encode in ProofOp.Data
     */
    proof?: Proof;
}
export interface ValueOpProtoMsg {
    typeUrl: '/tendermint.crypto.ValueOp';
    value: Uint8Array;
}
/**
 * @name ValueOpSDKType
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ValueOp
 */
export interface ValueOpSDKType {
    key: Uint8Array;
    proof?: ProofSDKType;
}
/**
 * @name DominoOp
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.DominoOp
 */
export interface DominoOp {
    key: string;
    input: string;
    output: string;
}
export interface DominoOpProtoMsg {
    typeUrl: '/tendermint.crypto.DominoOp';
    value: Uint8Array;
}
/**
 * @name DominoOpSDKType
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.DominoOp
 */
export interface DominoOpSDKType {
    key: string;
    input: string;
    output: string;
}
/**
 * ProofOp defines an operation used for calculating Merkle root
 * The data could be arbitrary format, providing nessecary data
 * for example neighbouring node hash
 * @name ProofOp
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ProofOp
 */
export interface ProofOp {
    type: string;
    key: Uint8Array;
    data: Uint8Array;
}
export interface ProofOpProtoMsg {
    typeUrl: '/tendermint.crypto.ProofOp';
    value: Uint8Array;
}
/**
 * ProofOp defines an operation used for calculating Merkle root
 * The data could be arbitrary format, providing nessecary data
 * for example neighbouring node hash
 * @name ProofOpSDKType
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ProofOp
 */
export interface ProofOpSDKType {
    type: string;
    key: Uint8Array;
    data: Uint8Array;
}
/**
 * ProofOps is Merkle proof defined by the list of ProofOps
 * @name ProofOps
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ProofOps
 */
export interface ProofOps {
    ops: ProofOp[];
}
export interface ProofOpsProtoMsg {
    typeUrl: '/tendermint.crypto.ProofOps';
    value: Uint8Array;
}
/**
 * ProofOps is Merkle proof defined by the list of ProofOps
 * @name ProofOpsSDKType
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ProofOps
 */
export interface ProofOpsSDKType {
    ops: ProofOpSDKType[];
}
/**
 * @name Proof
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.Proof
 */
export declare const Proof: {
    typeUrl: "/tendermint.crypto.Proof";
    is(o: any): o is Proof;
    isSDK(o: any): o is ProofSDKType;
    encode(message: Proof, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Proof;
    fromJSON(object: any): Proof;
    toJSON(message: Proof): JsonSafe<Proof>;
    fromPartial(object: Partial<Proof>): Proof;
    fromProtoMsg(message: ProofProtoMsg): Proof;
    toProto(message: Proof): Uint8Array;
    toProtoMsg(message: Proof): ProofProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ValueOp
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ValueOp
 */
export declare const ValueOp: {
    typeUrl: "/tendermint.crypto.ValueOp";
    is(o: any): o is ValueOp;
    isSDK(o: any): o is ValueOpSDKType;
    encode(message: ValueOp, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ValueOp;
    fromJSON(object: any): ValueOp;
    toJSON(message: ValueOp): JsonSafe<ValueOp>;
    fromPartial(object: Partial<ValueOp>): ValueOp;
    fromProtoMsg(message: ValueOpProtoMsg): ValueOp;
    toProto(message: ValueOp): Uint8Array;
    toProtoMsg(message: ValueOp): ValueOpProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name DominoOp
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.DominoOp
 */
export declare const DominoOp: {
    typeUrl: "/tendermint.crypto.DominoOp";
    is(o: any): o is DominoOp;
    isSDK(o: any): o is DominoOpSDKType;
    encode(message: DominoOp, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DominoOp;
    fromJSON(object: any): DominoOp;
    toJSON(message: DominoOp): JsonSafe<DominoOp>;
    fromPartial(object: Partial<DominoOp>): DominoOp;
    fromProtoMsg(message: DominoOpProtoMsg): DominoOp;
    toProto(message: DominoOp): Uint8Array;
    toProtoMsg(message: DominoOp): DominoOpProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ProofOp defines an operation used for calculating Merkle root
 * The data could be arbitrary format, providing nessecary data
 * for example neighbouring node hash
 * @name ProofOp
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ProofOp
 */
export declare const ProofOp: {
    typeUrl: "/tendermint.crypto.ProofOp";
    is(o: any): o is ProofOp;
    isSDK(o: any): o is ProofOpSDKType;
    encode(message: ProofOp, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ProofOp;
    fromJSON(object: any): ProofOp;
    toJSON(message: ProofOp): JsonSafe<ProofOp>;
    fromPartial(object: Partial<ProofOp>): ProofOp;
    fromProtoMsg(message: ProofOpProtoMsg): ProofOp;
    toProto(message: ProofOp): Uint8Array;
    toProtoMsg(message: ProofOp): ProofOpProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ProofOps is Merkle proof defined by the list of ProofOps
 * @name ProofOps
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.ProofOps
 */
export declare const ProofOps: {
    typeUrl: "/tendermint.crypto.ProofOps";
    is(o: any): o is ProofOps;
    isSDK(o: any): o is ProofOpsSDKType;
    encode(message: ProofOps, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ProofOps;
    fromJSON(object: any): ProofOps;
    toJSON(message: ProofOps): JsonSafe<ProofOps>;
    fromPartial(object: Partial<ProofOps>): ProofOps;
    fromProtoMsg(message: ProofOpsProtoMsg): ProofOps;
    toProto(message: ProofOps): Uint8Array;
    toProtoMsg(message: ProofOps): ProofOpsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=proof.d.ts.map