import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Minter represents the minting state.
 * @name Minter
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.Minter
 */
export interface Minter {
    /**
     * current annual inflation rate
     */
    inflation: string;
    /**
     * current annual expected provisions
     */
    annualProvisions: string;
}
export interface MinterProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.Minter';
    value: Uint8Array;
}
/**
 * Minter represents the minting state.
 * @name MinterSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.Minter
 */
export interface MinterSDKType {
    inflation: string;
    annual_provisions: string;
}
/**
 * Params defines the parameters for the x/mint module.
 * @name Params
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.Params
 */
export interface Params {
    /**
     * type of coin to mint
     */
    mintDenom: string;
    /**
     * maximum annual change in inflation rate
     */
    inflationRateChange: string;
    /**
     * maximum inflation rate
     */
    inflationMax: string;
    /**
     * minimum inflation rate
     */
    inflationMin: string;
    /**
     * goal of percent bonded atoms
     */
    goalBonded: string;
    /**
     * expected blocks per year
     */
    blocksPerYear: bigint;
}
export interface ParamsProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.Params';
    value: Uint8Array;
}
/**
 * Params defines the parameters for the x/mint module.
 * @name ParamsSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.Params
 */
export interface ParamsSDKType {
    mint_denom: string;
    inflation_rate_change: string;
    inflation_max: string;
    inflation_min: string;
    goal_bonded: string;
    blocks_per_year: bigint;
}
/**
 * Minter represents the minting state.
 * @name Minter
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.Minter
 */
export declare const Minter: {
    typeUrl: "/cosmos.mint.v1beta1.Minter";
    aminoType: "cosmos-sdk/Minter";
    is(o: any): o is Minter;
    isSDK(o: any): o is MinterSDKType;
    encode(message: Minter, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Minter;
    fromJSON(object: any): Minter;
    toJSON(message: Minter): JsonSafe<Minter>;
    fromPartial(object: Partial<Minter>): Minter;
    fromProtoMsg(message: MinterProtoMsg): Minter;
    toProto(message: Minter): Uint8Array;
    toProtoMsg(message: Minter): MinterProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Params defines the parameters for the x/mint module.
 * @name Params
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.Params
 */
export declare const Params: {
    typeUrl: "/cosmos.mint.v1beta1.Params";
    aminoType: "cosmos-sdk/x/mint/Params";
    is(o: any): o is Params;
    isSDK(o: any): o is ParamsSDKType;
    encode(message: Params, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Params;
    fromJSON(object: any): Params;
    toJSON(message: Params): JsonSafe<Params>;
    fromPartial(object: Partial<Params>): Params;
    fromProtoMsg(message: ParamsProtoMsg): Params;
    toProto(message: Params): Uint8Array;
    toProtoMsg(message: Params): ParamsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=mint.d.ts.map