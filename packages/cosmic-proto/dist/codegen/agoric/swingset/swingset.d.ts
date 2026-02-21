import { Coin, type CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * CoreEvalProposal is a gov Content type for evaluating code in the SwingSet
 * core.
 * See `bridgeCoreEval` in agoric-sdk packages/vats/src/core/chain-behaviors.js.
 * @name CoreEvalProposal
 * @package agoric.swingset
 * @see proto type: agoric.swingset.CoreEvalProposal
 */
export interface CoreEvalProposal {
    $typeUrl?: '/agoric.swingset.CoreEvalProposal';
    title: string;
    description: string;
    /**
     * Although evals are sequential, they may run concurrently, since they each
     * can return a Promise.
     */
    evals: CoreEval[];
}
export interface CoreEvalProposalProtoMsg {
    typeUrl: '/agoric.swingset.CoreEvalProposal';
    value: Uint8Array;
}
/**
 * CoreEvalProposal is a gov Content type for evaluating code in the SwingSet
 * core.
 * See `bridgeCoreEval` in agoric-sdk packages/vats/src/core/chain-behaviors.js.
 * @name CoreEvalProposalSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.CoreEvalProposal
 */
export interface CoreEvalProposalSDKType {
    $typeUrl?: '/agoric.swingset.CoreEvalProposal';
    title: string;
    description: string;
    evals: CoreEvalSDKType[];
}
/**
 * CoreEval defines an individual SwingSet core evaluation, for use in
 * CoreEvalProposal.
 * @name CoreEval
 * @package agoric.swingset
 * @see proto type: agoric.swingset.CoreEval
 */
export interface CoreEval {
    /**
     * Grant these JSON-stringified core bootstrap permits to the jsCode, as the
     * `powers` endowment.
     */
    jsonPermits: string;
    /**
     * Evaluate this JavaScript code in a Compartment endowed with `powers` as
     * well as some powerless helpers.
     */
    jsCode: string;
}
export interface CoreEvalProtoMsg {
    typeUrl: '/agoric.swingset.CoreEval';
    value: Uint8Array;
}
/**
 * CoreEval defines an individual SwingSet core evaluation, for use in
 * CoreEvalProposal.
 * @name CoreEvalSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.CoreEval
 */
export interface CoreEvalSDKType {
    json_permits: string;
    js_code: string;
}
/**
 * Params are the swingset configuration/governance parameters.
 * @name Params
 * @package agoric.swingset
 * @see proto type: agoric.swingset.Params
 */
export interface Params {
    /**
     * Map from unit name to a value in SwingSet "beans".
     * Must not be negative.
     *
     * These values are used by SwingSet to normalize named per-resource charges
     * (maybe rent) in a single Nat usage unit, the "bean".
     *
     * There is no required order to this list of entries, but all the chain
     * nodes must all serialize and deserialize the existing order without
     * permuting it.
     */
    beansPerUnit: StringBeans[];
    /**
     * The price in Coins per the unit named "fee".  This value is used by
     * cosmic-swingset JS code to decide how many tokens to charge.
     *
     * cost = beans_used * fee_unit_price / beans_per_unit["fee"]
     */
    feeUnitPrice: Coin[];
    /**
     * The SwingSet bootstrap vat configuration file.  Not usefully modifiable
     * via governance as it is only referenced by the chain's initial
     * construction.
     */
    bootstrapVatConfig: string;
    /**
     * If the provision submitter doesn't hold a provisionpass, their requested
     * power flags are looked up in this fee menu (first match wins) and the sum
     * is charged.  If any power flag is not found in this menu, the request is
     * rejected.
     */
    powerFlagFees: PowerFlagFee[];
    /**
     * Maximum sizes for queues.
     * These values are used by SwingSet to compute how many messages should be
     * accepted in a block.
     *
     * There is no required order to this list of entries, but all the chain
     * nodes must all serialize and deserialize the existing order without
     * permuting it.
     */
    queueMax: QueueSize[];
    /**
     * Vat cleanup budget values.
     * These values are used by SwingSet to control the pace of removing data
     * associated with a terminated vat as described at
     * https://github.com/Agoric/agoric-sdk/blob/master/packages/SwingSet/docs/run-policy.md#terminated-vat-cleanup
     *
     * There is no required order to this list of entries, but all the chain
     * nodes must all serialize and deserialize the existing order without
     * permuting it.
     */
    vatCleanupBudget: UintMapEntry[];
}
export interface ParamsProtoMsg {
    typeUrl: '/agoric.swingset.Params';
    value: Uint8Array;
}
/**
 * Params are the swingset configuration/governance parameters.
 * @name ParamsSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.Params
 */
export interface ParamsSDKType {
    beans_per_unit: StringBeansSDKType[];
    fee_unit_price: CoinSDKType[];
    bootstrap_vat_config: string;
    power_flag_fees: PowerFlagFeeSDKType[];
    queue_max: QueueSizeSDKType[];
    vat_cleanup_budget: UintMapEntrySDKType[];
}
/**
 * The current state of the module.
 * @name State
 * @package agoric.swingset
 * @see proto type: agoric.swingset.State
 */
export interface State {
    /**
     * The allowed number of items to add to queues, as determined by SwingSet.
     * Transactions which attempt to enqueue more should be rejected.
     */
    queueAllowed: QueueSize[];
}
export interface StateProtoMsg {
    typeUrl: '/agoric.swingset.State';
    value: Uint8Array;
}
/**
 * The current state of the module.
 * @name StateSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.State
 */
export interface StateSDKType {
    queue_allowed: QueueSizeSDKType[];
}
/**
 * Map element of a string key to a Nat bean count.
 * @name StringBeans
 * @package agoric.swingset
 * @see proto type: agoric.swingset.StringBeans
 */
export interface StringBeans {
    /**
     * What the beans are for.
     */
    key: string;
    /**
     * The actual bean value.
     */
    beans: string;
}
export interface StringBeansProtoMsg {
    typeUrl: '/agoric.swingset.StringBeans';
    value: Uint8Array;
}
/**
 * Map element of a string key to a Nat bean count.
 * @name StringBeansSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.StringBeans
 */
export interface StringBeansSDKType {
    key: string;
    beans: string;
}
/**
 * Map a provisioning power flag to its corresponding fee.
 * @name PowerFlagFee
 * @package agoric.swingset
 * @see proto type: agoric.swingset.PowerFlagFee
 */
export interface PowerFlagFee {
    powerFlag: string;
    fee: Coin[];
}
export interface PowerFlagFeeProtoMsg {
    typeUrl: '/agoric.swingset.PowerFlagFee';
    value: Uint8Array;
}
/**
 * Map a provisioning power flag to its corresponding fee.
 * @name PowerFlagFeeSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.PowerFlagFee
 */
export interface PowerFlagFeeSDKType {
    power_flag: string;
    fee: CoinSDKType[];
}
/**
 * Map element of a string key to a size.
 * TODO: Replace with UintMapEntry?
 * @name QueueSize
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueueSize
 */
export interface QueueSize {
    /**
     * What the size is for.
     */
    key: string;
    /**
     * The actual size value.
     */
    size: number;
}
export interface QueueSizeProtoMsg {
    typeUrl: '/agoric.swingset.QueueSize';
    value: Uint8Array;
}
/**
 * Map element of a string key to a size.
 * TODO: Replace with UintMapEntry?
 * @name QueueSizeSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueueSize
 */
export interface QueueSizeSDKType {
    key: string;
    size: number;
}
/**
 * Map element of a string key to an unsigned integer.
 * The value uses cosmos-sdk Uint rather than a native Go type to ensure that
 * zeroes survive "omitempty" JSON serialization.
 * @name UintMapEntry
 * @package agoric.swingset
 * @see proto type: agoric.swingset.UintMapEntry
 */
export interface UintMapEntry {
    key: string;
    value: string;
}
export interface UintMapEntryProtoMsg {
    typeUrl: '/agoric.swingset.UintMapEntry';
    value: Uint8Array;
}
/**
 * Map element of a string key to an unsigned integer.
 * The value uses cosmos-sdk Uint rather than a native Go type to ensure that
 * zeroes survive "omitempty" JSON serialization.
 * @name UintMapEntrySDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.UintMapEntry
 */
export interface UintMapEntrySDKType {
    key: string;
    value: string;
}
/**
 * Egress is the format for a swingset egress.
 * @name Egress
 * @package agoric.swingset
 * @see proto type: agoric.swingset.Egress
 */
export interface Egress {
    nickname: string;
    peer: Uint8Array;
    /**
     * TODO: Remove these power flags as they are deprecated and have no effect.
     */
    powerFlags: string[];
}
export interface EgressProtoMsg {
    typeUrl: '/agoric.swingset.Egress';
    value: Uint8Array;
}
/**
 * Egress is the format for a swingset egress.
 * @name EgressSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.Egress
 */
export interface EgressSDKType {
    nickname: string;
    peer: Uint8Array;
    power_flags: string[];
}
/**
 * SwingStoreArtifact encodes an artifact of a swing-store export.
 * Artifacts may be stored or transmitted in any order. Most handlers do
 * maintain the artifact order from their original source as an effect of how
 * they handle the artifacts.
 * @name SwingStoreArtifact
 * @package agoric.swingset
 * @see proto type: agoric.swingset.SwingStoreArtifact
 */
export interface SwingStoreArtifact {
    name: string;
    data: Uint8Array;
}
export interface SwingStoreArtifactProtoMsg {
    typeUrl: '/agoric.swingset.SwingStoreArtifact';
    value: Uint8Array;
}
/**
 * SwingStoreArtifact encodes an artifact of a swing-store export.
 * Artifacts may be stored or transmitted in any order. Most handlers do
 * maintain the artifact order from their original source as an effect of how
 * they handle the artifacts.
 * @name SwingStoreArtifactSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.SwingStoreArtifact
 */
export interface SwingStoreArtifactSDKType {
    name: string;
    data: Uint8Array;
}
/**
 * CoreEvalProposal is a gov Content type for evaluating code in the SwingSet
 * core.
 * See `bridgeCoreEval` in agoric-sdk packages/vats/src/core/chain-behaviors.js.
 * @name CoreEvalProposal
 * @package agoric.swingset
 * @see proto type: agoric.swingset.CoreEvalProposal
 */
export declare const CoreEvalProposal: {
    typeUrl: "/agoric.swingset.CoreEvalProposal";
    aminoType: "swingset/CoreEvalProposal";
    is(o: any): o is CoreEvalProposal;
    isSDK(o: any): o is CoreEvalProposalSDKType;
    encode(message: CoreEvalProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CoreEvalProposal;
    fromJSON(object: any): CoreEvalProposal;
    toJSON(message: CoreEvalProposal): JsonSafe<CoreEvalProposal>;
    fromPartial(object: Partial<CoreEvalProposal>): CoreEvalProposal;
    fromProtoMsg(message: CoreEvalProposalProtoMsg): CoreEvalProposal;
    toProto(message: CoreEvalProposal): Uint8Array;
    toProtoMsg(message: CoreEvalProposal): CoreEvalProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * CoreEval defines an individual SwingSet core evaluation, for use in
 * CoreEvalProposal.
 * @name CoreEval
 * @package agoric.swingset
 * @see proto type: agoric.swingset.CoreEval
 */
export declare const CoreEval: {
    typeUrl: "/agoric.swingset.CoreEval";
    is(o: any): o is CoreEval;
    isSDK(o: any): o is CoreEvalSDKType;
    encode(message: CoreEval, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CoreEval;
    fromJSON(object: any): CoreEval;
    toJSON(message: CoreEval): JsonSafe<CoreEval>;
    fromPartial(object: Partial<CoreEval>): CoreEval;
    fromProtoMsg(message: CoreEvalProtoMsg): CoreEval;
    toProto(message: CoreEval): Uint8Array;
    toProtoMsg(message: CoreEval): CoreEvalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Params are the swingset configuration/governance parameters.
 * @name Params
 * @package agoric.swingset
 * @see proto type: agoric.swingset.Params
 */
export declare const Params: {
    typeUrl: "/agoric.swingset.Params";
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
/**
 * The current state of the module.
 * @name State
 * @package agoric.swingset
 * @see proto type: agoric.swingset.State
 */
export declare const State: {
    typeUrl: "/agoric.swingset.State";
    is(o: any): o is State;
    isSDK(o: any): o is StateSDKType;
    encode(message: State, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): State;
    fromJSON(object: any): State;
    toJSON(message: State): JsonSafe<State>;
    fromPartial(object: Partial<State>): State;
    fromProtoMsg(message: StateProtoMsg): State;
    toProto(message: State): Uint8Array;
    toProtoMsg(message: State): StateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Map element of a string key to a Nat bean count.
 * @name StringBeans
 * @package agoric.swingset
 * @see proto type: agoric.swingset.StringBeans
 */
export declare const StringBeans: {
    typeUrl: "/agoric.swingset.StringBeans";
    is(o: any): o is StringBeans;
    isSDK(o: any): o is StringBeansSDKType;
    encode(message: StringBeans, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): StringBeans;
    fromJSON(object: any): StringBeans;
    toJSON(message: StringBeans): JsonSafe<StringBeans>;
    fromPartial(object: Partial<StringBeans>): StringBeans;
    fromProtoMsg(message: StringBeansProtoMsg): StringBeans;
    toProto(message: StringBeans): Uint8Array;
    toProtoMsg(message: StringBeans): StringBeansProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Map a provisioning power flag to its corresponding fee.
 * @name PowerFlagFee
 * @package agoric.swingset
 * @see proto type: agoric.swingset.PowerFlagFee
 */
export declare const PowerFlagFee: {
    typeUrl: "/agoric.swingset.PowerFlagFee";
    is(o: any): o is PowerFlagFee;
    isSDK(o: any): o is PowerFlagFeeSDKType;
    encode(message: PowerFlagFee, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PowerFlagFee;
    fromJSON(object: any): PowerFlagFee;
    toJSON(message: PowerFlagFee): JsonSafe<PowerFlagFee>;
    fromPartial(object: Partial<PowerFlagFee>): PowerFlagFee;
    fromProtoMsg(message: PowerFlagFeeProtoMsg): PowerFlagFee;
    toProto(message: PowerFlagFee): Uint8Array;
    toProtoMsg(message: PowerFlagFee): PowerFlagFeeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Map element of a string key to a size.
 * TODO: Replace with UintMapEntry?
 * @name QueueSize
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueueSize
 */
export declare const QueueSize: {
    typeUrl: "/agoric.swingset.QueueSize";
    is(o: any): o is QueueSize;
    isSDK(o: any): o is QueueSizeSDKType;
    encode(message: QueueSize, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueueSize;
    fromJSON(object: any): QueueSize;
    toJSON(message: QueueSize): JsonSafe<QueueSize>;
    fromPartial(object: Partial<QueueSize>): QueueSize;
    fromProtoMsg(message: QueueSizeProtoMsg): QueueSize;
    toProto(message: QueueSize): Uint8Array;
    toProtoMsg(message: QueueSize): QueueSizeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Map element of a string key to an unsigned integer.
 * The value uses cosmos-sdk Uint rather than a native Go type to ensure that
 * zeroes survive "omitempty" JSON serialization.
 * @name UintMapEntry
 * @package agoric.swingset
 * @see proto type: agoric.swingset.UintMapEntry
 */
export declare const UintMapEntry: {
    typeUrl: "/agoric.swingset.UintMapEntry";
    is(o: any): o is UintMapEntry;
    isSDK(o: any): o is UintMapEntrySDKType;
    encode(message: UintMapEntry, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): UintMapEntry;
    fromJSON(object: any): UintMapEntry;
    toJSON(message: UintMapEntry): JsonSafe<UintMapEntry>;
    fromPartial(object: Partial<UintMapEntry>): UintMapEntry;
    fromProtoMsg(message: UintMapEntryProtoMsg): UintMapEntry;
    toProto(message: UintMapEntry): Uint8Array;
    toProtoMsg(message: UintMapEntry): UintMapEntryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Egress is the format for a swingset egress.
 * @name Egress
 * @package agoric.swingset
 * @see proto type: agoric.swingset.Egress
 */
export declare const Egress: {
    typeUrl: "/agoric.swingset.Egress";
    is(o: any): o is Egress;
    isSDK(o: any): o is EgressSDKType;
    encode(message: Egress, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Egress;
    fromJSON(object: any): Egress;
    toJSON(message: Egress): JsonSafe<Egress>;
    fromPartial(object: Partial<Egress>): Egress;
    fromProtoMsg(message: EgressProtoMsg): Egress;
    toProto(message: Egress): Uint8Array;
    toProtoMsg(message: Egress): EgressProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SwingStoreArtifact encodes an artifact of a swing-store export.
 * Artifacts may be stored or transmitted in any order. Most handlers do
 * maintain the artifact order from their original source as an effect of how
 * they handle the artifacts.
 * @name SwingStoreArtifact
 * @package agoric.swingset
 * @see proto type: agoric.swingset.SwingStoreArtifact
 */
export declare const SwingStoreArtifact: {
    typeUrl: "/agoric.swingset.SwingStoreArtifact";
    is(o: any): o is SwingStoreArtifact;
    isSDK(o: any): o is SwingStoreArtifactSDKType;
    encode(message: SwingStoreArtifact, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SwingStoreArtifact;
    fromJSON(object: any): SwingStoreArtifact;
    toJSON(message: SwingStoreArtifact): JsonSafe<SwingStoreArtifact>;
    fromPartial(object: Partial<SwingStoreArtifact>): SwingStoreArtifact;
    fromProtoMsg(message: SwingStoreArtifactProtoMsg): SwingStoreArtifact;
    toProto(message: SwingStoreArtifact): Uint8Array;
    toProtoMsg(message: SwingStoreArtifact): SwingStoreArtifactProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=swingset.d.ts.map