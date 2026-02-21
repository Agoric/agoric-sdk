import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * MsgDeliverInbound defines an SDK message for delivering an eventual send
 * @name MsgDeliverInbound
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgDeliverInbound
 */
export interface MsgDeliverInbound {
    messages: string[];
    nums: bigint[];
    ack: bigint;
    submitter: Uint8Array;
}
export interface MsgDeliverInboundProtoMsg {
    typeUrl: '/agoric.swingset.MsgDeliverInbound';
    value: Uint8Array;
}
/**
 * MsgDeliverInbound defines an SDK message for delivering an eventual send
 * @name MsgDeliverInboundSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgDeliverInbound
 */
export interface MsgDeliverInboundSDKType {
    messages: string[];
    nums: bigint[];
    ack: bigint;
    submitter: Uint8Array;
}
/**
 * MsgDeliverInboundResponse is an empty reply.
 * @name MsgDeliverInboundResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgDeliverInboundResponse
 */
export interface MsgDeliverInboundResponse {
}
export interface MsgDeliverInboundResponseProtoMsg {
    typeUrl: '/agoric.swingset.MsgDeliverInboundResponse';
    value: Uint8Array;
}
/**
 * MsgDeliverInboundResponse is an empty reply.
 * @name MsgDeliverInboundResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgDeliverInboundResponse
 */
export interface MsgDeliverInboundResponseSDKType {
}
/**
 * MsgWalletAction defines an SDK message for the on-chain wallet to perform an
 * action that *does not* spend any assets (other than gas fees/stamps).  This
 * message type is typically protected by feegrant budgets.
 * @name MsgWalletAction
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletAction
 */
export interface MsgWalletAction {
    owner: Uint8Array;
    /**
     * The action to perform, as JSON-stringified marshalled data.
     */
    action: string;
}
export interface MsgWalletActionProtoMsg {
    typeUrl: '/agoric.swingset.MsgWalletAction';
    value: Uint8Array;
}
/**
 * MsgWalletAction defines an SDK message for the on-chain wallet to perform an
 * action that *does not* spend any assets (other than gas fees/stamps).  This
 * message type is typically protected by feegrant budgets.
 * @name MsgWalletActionSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletAction
 */
export interface MsgWalletActionSDKType {
    owner: Uint8Array;
    action: string;
}
/**
 * MsgWalletActionResponse is an empty reply.
 * @name MsgWalletActionResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletActionResponse
 */
export interface MsgWalletActionResponse {
}
export interface MsgWalletActionResponseProtoMsg {
    typeUrl: '/agoric.swingset.MsgWalletActionResponse';
    value: Uint8Array;
}
/**
 * MsgWalletActionResponse is an empty reply.
 * @name MsgWalletActionResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletActionResponse
 */
export interface MsgWalletActionResponseSDKType {
}
/**
 * MsgWalletSpendAction defines an SDK message for the on-chain wallet to
 * perform an action that *does spend the owner's assets.*  This message type is
 * typically protected by explicit confirmation by the user.
 * @name MsgWalletSpendAction
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletSpendAction
 */
export interface MsgWalletSpendAction {
    owner: Uint8Array;
    /**
     * The action to perform, as JSON-stringified marshalled data.
     */
    spendAction: string;
}
export interface MsgWalletSpendActionProtoMsg {
    typeUrl: '/agoric.swingset.MsgWalletSpendAction';
    value: Uint8Array;
}
/**
 * MsgWalletSpendAction defines an SDK message for the on-chain wallet to
 * perform an action that *does spend the owner's assets.*  This message type is
 * typically protected by explicit confirmation by the user.
 * @name MsgWalletSpendActionSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletSpendAction
 */
export interface MsgWalletSpendActionSDKType {
    owner: Uint8Array;
    spend_action: string;
}
/**
 * MsgWalletSpendActionResponse is an empty reply.
 * @name MsgWalletSpendActionResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletSpendActionResponse
 */
export interface MsgWalletSpendActionResponse {
}
export interface MsgWalletSpendActionResponseProtoMsg {
    typeUrl: '/agoric.swingset.MsgWalletSpendActionResponse';
    value: Uint8Array;
}
/**
 * MsgWalletSpendActionResponse is an empty reply.
 * @name MsgWalletSpendActionResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletSpendActionResponse
 */
export interface MsgWalletSpendActionResponseSDKType {
}
/**
 * MsgProvision defines an SDK message for provisioning a client to the chain
 * @name MsgProvision
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgProvision
 */
export interface MsgProvision {
    nickname: string;
    address: Uint8Array;
    powerFlags: string[];
    submitter: Uint8Array;
}
export interface MsgProvisionProtoMsg {
    typeUrl: '/agoric.swingset.MsgProvision';
    value: Uint8Array;
}
/**
 * MsgProvision defines an SDK message for provisioning a client to the chain
 * @name MsgProvisionSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgProvision
 */
export interface MsgProvisionSDKType {
    nickname: string;
    address: Uint8Array;
    power_flags: string[];
    submitter: Uint8Array;
}
/**
 * MsgProvisionResponse is an empty reply.
 * @name MsgProvisionResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgProvisionResponse
 */
export interface MsgProvisionResponse {
}
export interface MsgProvisionResponseProtoMsg {
    typeUrl: '/agoric.swingset.MsgProvisionResponse';
    value: Uint8Array;
}
/**
 * MsgProvisionResponse is an empty reply.
 * @name MsgProvisionResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgProvisionResponse
 */
export interface MsgProvisionResponseSDKType {
}
/**
 * MsgInstallBundle carries a signed bundle to SwingSet.
 * @name MsgInstallBundle
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgInstallBundle
 */
export interface MsgInstallBundle {
    bundle: string;
    submitter: Uint8Array;
    /**
     * Either bundle or compressed_bundle will be set.
     * Default compression algorithm is gzip.
     */
    compressedBundle: Uint8Array;
    /**
     * Size in bytes of uncompression of compressed_bundle.
     */
    uncompressedSize: bigint;
}
export interface MsgInstallBundleProtoMsg {
    typeUrl: '/agoric.swingset.MsgInstallBundle';
    value: Uint8Array;
}
/**
 * MsgInstallBundle carries a signed bundle to SwingSet.
 * @name MsgInstallBundleSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgInstallBundle
 */
export interface MsgInstallBundleSDKType {
    bundle: string;
    submitter: Uint8Array;
    compressed_bundle: Uint8Array;
    uncompressed_size: bigint;
}
/**
 * MsgInstallBundleResponse is an empty acknowledgement that an install bundle
 * message has been queued for the SwingSet kernel's consideration.
 * @name MsgInstallBundleResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgInstallBundleResponse
 */
export interface MsgInstallBundleResponse {
}
export interface MsgInstallBundleResponseProtoMsg {
    typeUrl: '/agoric.swingset.MsgInstallBundleResponse';
    value: Uint8Array;
}
/**
 * MsgInstallBundleResponse is an empty acknowledgement that an install bundle
 * message has been queued for the SwingSet kernel's consideration.
 * @name MsgInstallBundleResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgInstallBundleResponse
 */
export interface MsgInstallBundleResponseSDKType {
}
/**
 * MsgCoreEval defines an SDK message for a core eval.
 * @name MsgCoreEval
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgCoreEval
 */
export interface MsgCoreEval {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
    authority: string;
    /**
     * The JSON-stringified core bootstrap permits to grant to the jsCode, as the
     * `powers` endowment.
     */
    jsonPermits: string;
    /**
     * Evaluate this JavaScript code in a Compartment endowed with `powers` as
     * well as some powerless helpers.
     */
    jsCode: string;
}
export interface MsgCoreEvalProtoMsg {
    typeUrl: '/agoric.swingset.MsgCoreEval';
    value: Uint8Array;
}
/**
 * MsgCoreEval defines an SDK message for a core eval.
 * @name MsgCoreEvalSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgCoreEval
 */
export interface MsgCoreEvalSDKType {
    authority: string;
    json_permits: string;
    js_code: string;
}
/**
 * MsgCoreEvalResponse is an empty reply.
 * @name MsgCoreEvalResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgCoreEvalResponse
 */
export interface MsgCoreEvalResponse {
    /**
     * The result of the core eval.
     */
    result: string;
}
export interface MsgCoreEvalResponseProtoMsg {
    typeUrl: '/agoric.swingset.MsgCoreEvalResponse';
    value: Uint8Array;
}
/**
 * MsgCoreEvalResponse is an empty reply.
 * @name MsgCoreEvalResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgCoreEvalResponse
 */
export interface MsgCoreEvalResponseSDKType {
    result: string;
}
/**
 * MsgDeliverInbound defines an SDK message for delivering an eventual send
 * @name MsgDeliverInbound
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgDeliverInbound
 */
export declare const MsgDeliverInbound: {
    typeUrl: "/agoric.swingset.MsgDeliverInbound";
    aminoType: "swingset/DeliverInbound";
    is(o: any): o is MsgDeliverInbound;
    isSDK(o: any): o is MsgDeliverInboundSDKType;
    encode(message: MsgDeliverInbound, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDeliverInbound;
    fromJSON(object: any): MsgDeliverInbound;
    toJSON(message: MsgDeliverInbound): JsonSafe<MsgDeliverInbound>;
    fromPartial(object: Partial<MsgDeliverInbound>): MsgDeliverInbound;
    fromProtoMsg(message: MsgDeliverInboundProtoMsg): MsgDeliverInbound;
    toProto(message: MsgDeliverInbound): Uint8Array;
    toProtoMsg(message: MsgDeliverInbound): MsgDeliverInboundProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgDeliverInboundResponse is an empty reply.
 * @name MsgDeliverInboundResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgDeliverInboundResponse
 */
export declare const MsgDeliverInboundResponse: {
    typeUrl: "/agoric.swingset.MsgDeliverInboundResponse";
    is(o: any): o is MsgDeliverInboundResponse;
    isSDK(o: any): o is MsgDeliverInboundResponseSDKType;
    encode(_: MsgDeliverInboundResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDeliverInboundResponse;
    fromJSON(_: any): MsgDeliverInboundResponse;
    toJSON(_: MsgDeliverInboundResponse): JsonSafe<MsgDeliverInboundResponse>;
    fromPartial(_: Partial<MsgDeliverInboundResponse>): MsgDeliverInboundResponse;
    fromProtoMsg(message: MsgDeliverInboundResponseProtoMsg): MsgDeliverInboundResponse;
    toProto(message: MsgDeliverInboundResponse): Uint8Array;
    toProtoMsg(message: MsgDeliverInboundResponse): MsgDeliverInboundResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWalletAction defines an SDK message for the on-chain wallet to perform an
 * action that *does not* spend any assets (other than gas fees/stamps).  This
 * message type is typically protected by feegrant budgets.
 * @name MsgWalletAction
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletAction
 */
export declare const MsgWalletAction: {
    typeUrl: "/agoric.swingset.MsgWalletAction";
    aminoType: "swingset/WalletAction";
    is(o: any): o is MsgWalletAction;
    isSDK(o: any): o is MsgWalletActionSDKType;
    encode(message: MsgWalletAction, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWalletAction;
    fromJSON(object: any): MsgWalletAction;
    toJSON(message: MsgWalletAction): JsonSafe<MsgWalletAction>;
    fromPartial(object: Partial<MsgWalletAction>): MsgWalletAction;
    fromProtoMsg(message: MsgWalletActionProtoMsg): MsgWalletAction;
    toProto(message: MsgWalletAction): Uint8Array;
    toProtoMsg(message: MsgWalletAction): MsgWalletActionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWalletActionResponse is an empty reply.
 * @name MsgWalletActionResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletActionResponse
 */
export declare const MsgWalletActionResponse: {
    typeUrl: "/agoric.swingset.MsgWalletActionResponse";
    is(o: any): o is MsgWalletActionResponse;
    isSDK(o: any): o is MsgWalletActionResponseSDKType;
    encode(_: MsgWalletActionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWalletActionResponse;
    fromJSON(_: any): MsgWalletActionResponse;
    toJSON(_: MsgWalletActionResponse): JsonSafe<MsgWalletActionResponse>;
    fromPartial(_: Partial<MsgWalletActionResponse>): MsgWalletActionResponse;
    fromProtoMsg(message: MsgWalletActionResponseProtoMsg): MsgWalletActionResponse;
    toProto(message: MsgWalletActionResponse): Uint8Array;
    toProtoMsg(message: MsgWalletActionResponse): MsgWalletActionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWalletSpendAction defines an SDK message for the on-chain wallet to
 * perform an action that *does spend the owner's assets.*  This message type is
 * typically protected by explicit confirmation by the user.
 * @name MsgWalletSpendAction
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletSpendAction
 */
export declare const MsgWalletSpendAction: {
    typeUrl: "/agoric.swingset.MsgWalletSpendAction";
    aminoType: "swingset/WalletSpendAction";
    is(o: any): o is MsgWalletSpendAction;
    isSDK(o: any): o is MsgWalletSpendActionSDKType;
    encode(message: MsgWalletSpendAction, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWalletSpendAction;
    fromJSON(object: any): MsgWalletSpendAction;
    toJSON(message: MsgWalletSpendAction): JsonSafe<MsgWalletSpendAction>;
    fromPartial(object: Partial<MsgWalletSpendAction>): MsgWalletSpendAction;
    fromProtoMsg(message: MsgWalletSpendActionProtoMsg): MsgWalletSpendAction;
    toProto(message: MsgWalletSpendAction): Uint8Array;
    toProtoMsg(message: MsgWalletSpendAction): MsgWalletSpendActionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWalletSpendActionResponse is an empty reply.
 * @name MsgWalletSpendActionResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgWalletSpendActionResponse
 */
export declare const MsgWalletSpendActionResponse: {
    typeUrl: "/agoric.swingset.MsgWalletSpendActionResponse";
    is(o: any): o is MsgWalletSpendActionResponse;
    isSDK(o: any): o is MsgWalletSpendActionResponseSDKType;
    encode(_: MsgWalletSpendActionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWalletSpendActionResponse;
    fromJSON(_: any): MsgWalletSpendActionResponse;
    toJSON(_: MsgWalletSpendActionResponse): JsonSafe<MsgWalletSpendActionResponse>;
    fromPartial(_: Partial<MsgWalletSpendActionResponse>): MsgWalletSpendActionResponse;
    fromProtoMsg(message: MsgWalletSpendActionResponseProtoMsg): MsgWalletSpendActionResponse;
    toProto(message: MsgWalletSpendActionResponse): Uint8Array;
    toProtoMsg(message: MsgWalletSpendActionResponse): MsgWalletSpendActionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgProvision defines an SDK message for provisioning a client to the chain
 * @name MsgProvision
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgProvision
 */
export declare const MsgProvision: {
    typeUrl: "/agoric.swingset.MsgProvision";
    aminoType: "swingset/Provision";
    is(o: any): o is MsgProvision;
    isSDK(o: any): o is MsgProvisionSDKType;
    encode(message: MsgProvision, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgProvision;
    fromJSON(object: any): MsgProvision;
    toJSON(message: MsgProvision): JsonSafe<MsgProvision>;
    fromPartial(object: Partial<MsgProvision>): MsgProvision;
    fromProtoMsg(message: MsgProvisionProtoMsg): MsgProvision;
    toProto(message: MsgProvision): Uint8Array;
    toProtoMsg(message: MsgProvision): MsgProvisionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgProvisionResponse is an empty reply.
 * @name MsgProvisionResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgProvisionResponse
 */
export declare const MsgProvisionResponse: {
    typeUrl: "/agoric.swingset.MsgProvisionResponse";
    is(o: any): o is MsgProvisionResponse;
    isSDK(o: any): o is MsgProvisionResponseSDKType;
    encode(_: MsgProvisionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgProvisionResponse;
    fromJSON(_: any): MsgProvisionResponse;
    toJSON(_: MsgProvisionResponse): JsonSafe<MsgProvisionResponse>;
    fromPartial(_: Partial<MsgProvisionResponse>): MsgProvisionResponse;
    fromProtoMsg(message: MsgProvisionResponseProtoMsg): MsgProvisionResponse;
    toProto(message: MsgProvisionResponse): Uint8Array;
    toProtoMsg(message: MsgProvisionResponse): MsgProvisionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgInstallBundle carries a signed bundle to SwingSet.
 * @name MsgInstallBundle
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgInstallBundle
 */
export declare const MsgInstallBundle: {
    typeUrl: "/agoric.swingset.MsgInstallBundle";
    aminoType: "swingset/InstallBundle";
    is(o: any): o is MsgInstallBundle;
    isSDK(o: any): o is MsgInstallBundleSDKType;
    encode(message: MsgInstallBundle, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgInstallBundle;
    fromJSON(object: any): MsgInstallBundle;
    toJSON(message: MsgInstallBundle): JsonSafe<MsgInstallBundle>;
    fromPartial(object: Partial<MsgInstallBundle>): MsgInstallBundle;
    fromProtoMsg(message: MsgInstallBundleProtoMsg): MsgInstallBundle;
    toProto(message: MsgInstallBundle): Uint8Array;
    toProtoMsg(message: MsgInstallBundle): MsgInstallBundleProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgInstallBundleResponse is an empty acknowledgement that an install bundle
 * message has been queued for the SwingSet kernel's consideration.
 * @name MsgInstallBundleResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgInstallBundleResponse
 */
export declare const MsgInstallBundleResponse: {
    typeUrl: "/agoric.swingset.MsgInstallBundleResponse";
    is(o: any): o is MsgInstallBundleResponse;
    isSDK(o: any): o is MsgInstallBundleResponseSDKType;
    encode(_: MsgInstallBundleResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgInstallBundleResponse;
    fromJSON(_: any): MsgInstallBundleResponse;
    toJSON(_: MsgInstallBundleResponse): JsonSafe<MsgInstallBundleResponse>;
    fromPartial(_: Partial<MsgInstallBundleResponse>): MsgInstallBundleResponse;
    fromProtoMsg(message: MsgInstallBundleResponseProtoMsg): MsgInstallBundleResponse;
    toProto(message: MsgInstallBundleResponse): Uint8Array;
    toProtoMsg(message: MsgInstallBundleResponse): MsgInstallBundleResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCoreEval defines an SDK message for a core eval.
 * @name MsgCoreEval
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgCoreEval
 */
export declare const MsgCoreEval: {
    typeUrl: "/agoric.swingset.MsgCoreEval";
    aminoType: "cosmos-sdk/x/swingset/MsgCoreEval";
    is(o: any): o is MsgCoreEval;
    isSDK(o: any): o is MsgCoreEvalSDKType;
    encode(message: MsgCoreEval, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCoreEval;
    fromJSON(object: any): MsgCoreEval;
    toJSON(message: MsgCoreEval): JsonSafe<MsgCoreEval>;
    fromPartial(object: Partial<MsgCoreEval>): MsgCoreEval;
    fromProtoMsg(message: MsgCoreEvalProtoMsg): MsgCoreEval;
    toProto(message: MsgCoreEval): Uint8Array;
    toProtoMsg(message: MsgCoreEval): MsgCoreEvalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCoreEvalResponse is an empty reply.
 * @name MsgCoreEvalResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.MsgCoreEvalResponse
 */
export declare const MsgCoreEvalResponse: {
    typeUrl: "/agoric.swingset.MsgCoreEvalResponse";
    is(o: any): o is MsgCoreEvalResponse;
    isSDK(o: any): o is MsgCoreEvalResponseSDKType;
    encode(message: MsgCoreEvalResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCoreEvalResponse;
    fromJSON(object: any): MsgCoreEvalResponse;
    toJSON(message: MsgCoreEvalResponse): JsonSafe<MsgCoreEvalResponse>;
    fromPartial(object: Partial<MsgCoreEvalResponse>): MsgCoreEvalResponse;
    fromProtoMsg(message: MsgCoreEvalResponseProtoMsg): MsgCoreEvalResponse;
    toProto(message: MsgCoreEvalResponse): Uint8Array;
    toProtoMsg(message: MsgCoreEvalResponse): MsgCoreEvalResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=msgs.d.ts.map