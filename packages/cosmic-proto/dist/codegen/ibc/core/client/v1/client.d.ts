import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { Plan, type PlanSDKType } from '../../../../cosmos/upgrade/v1beta1/upgrade.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * IdentifiedClientState defines a client state with an additional client
 * identifier field.
 * @name IdentifiedClientState
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedClientState
 */
export interface IdentifiedClientState {
    /**
     * client identifier
     */
    clientId: string;
    /**
     * client state
     */
    clientState?: Any;
}
export interface IdentifiedClientStateProtoMsg {
    typeUrl: '/ibc.core.client.v1.IdentifiedClientState';
    value: Uint8Array;
}
/**
 * IdentifiedClientState defines a client state with an additional client
 * identifier field.
 * @name IdentifiedClientStateSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedClientState
 */
export interface IdentifiedClientStateSDKType {
    client_id: string;
    client_state?: AnySDKType;
}
/**
 * ConsensusStateWithHeight defines a consensus state with an additional height
 * field.
 * @name ConsensusStateWithHeight
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ConsensusStateWithHeight
 */
export interface ConsensusStateWithHeight {
    /**
     * consensus state height
     */
    height: Height;
    /**
     * consensus state
     */
    consensusState?: Any;
}
export interface ConsensusStateWithHeightProtoMsg {
    typeUrl: '/ibc.core.client.v1.ConsensusStateWithHeight';
    value: Uint8Array;
}
/**
 * ConsensusStateWithHeight defines a consensus state with an additional height
 * field.
 * @name ConsensusStateWithHeightSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ConsensusStateWithHeight
 */
export interface ConsensusStateWithHeightSDKType {
    height: HeightSDKType;
    consensus_state?: AnySDKType;
}
/**
 * ClientConsensusStates defines all the stored consensus states for a given
 * client.
 * @name ClientConsensusStates
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientConsensusStates
 */
export interface ClientConsensusStates {
    /**
     * client identifier
     */
    clientId: string;
    /**
     * consensus states and their heights associated with the client
     */
    consensusStates: ConsensusStateWithHeight[];
}
export interface ClientConsensusStatesProtoMsg {
    typeUrl: '/ibc.core.client.v1.ClientConsensusStates';
    value: Uint8Array;
}
/**
 * ClientConsensusStates defines all the stored consensus states for a given
 * client.
 * @name ClientConsensusStatesSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientConsensusStates
 */
export interface ClientConsensusStatesSDKType {
    client_id: string;
    consensus_states: ConsensusStateWithHeightSDKType[];
}
/**
 * Height is a monotonically increasing data type
 * that can be compared against another Height for the purposes of updating and
 * freezing clients
 *
 * Normally the RevisionHeight is incremented at each height while keeping
 * RevisionNumber the same. However some consensus algorithms may choose to
 * reset the height in certain conditions e.g. hard forks, state-machine
 * breaking changes In these cases, the RevisionNumber is incremented so that
 * height continues to be monitonically increasing even as the RevisionHeight
 * gets reset
 * @name Height
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Height
 */
export interface Height {
    /**
     * the revision that the client is currently on
     */
    revisionNumber: bigint;
    /**
     * the height within the given revision
     */
    revisionHeight: bigint;
}
export interface HeightProtoMsg {
    typeUrl: '/ibc.core.client.v1.Height';
    value: Uint8Array;
}
/**
 * Height is a monotonically increasing data type
 * that can be compared against another Height for the purposes of updating and
 * freezing clients
 *
 * Normally the RevisionHeight is incremented at each height while keeping
 * RevisionNumber the same. However some consensus algorithms may choose to
 * reset the height in certain conditions e.g. hard forks, state-machine
 * breaking changes In these cases, the RevisionNumber is incremented so that
 * height continues to be monitonically increasing even as the RevisionHeight
 * gets reset
 * @name HeightSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Height
 */
export interface HeightSDKType {
    revision_number: bigint;
    revision_height: bigint;
}
/**
 * Params defines the set of IBC light client parameters.
 * @name Params
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Params
 */
export interface Params {
    /**
     * allowed_clients defines the list of allowed client state types which can be created
     * and interacted with. If a client type is removed from the allowed clients list, usage
     * of this client will be disabled until it is added again to the list.
     */
    allowedClients: string[];
}
export interface ParamsProtoMsg {
    typeUrl: '/ibc.core.client.v1.Params';
    value: Uint8Array;
}
/**
 * Params defines the set of IBC light client parameters.
 * @name ParamsSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Params
 */
export interface ParamsSDKType {
    allowed_clients: string[];
}
/**
 * ClientUpdateProposal is a legacy governance proposal. If it passes, the substitute
 * client's latest consensus state is copied over to the subject client. The proposal
 * handler may fail if the subject and the substitute do not match in client and
 * chain parameters (with exception to latest height, frozen height, and chain-id).
 *
 * Deprecated: Please use MsgRecoverClient in favour of this message type.
 * @name ClientUpdateProposal
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientUpdateProposal
 * @deprecated
 */
export interface ClientUpdateProposal {
    $typeUrl?: '/ibc.core.client.v1.ClientUpdateProposal';
    /**
     * the title of the update proposal
     */
    title: string;
    /**
     * the description of the proposal
     */
    description: string;
    /**
     * the client identifier for the client to be updated if the proposal passes
     */
    subjectClientId: string;
    /**
     * the substitute client identifier for the client standing in for the subject
     * client
     */
    substituteClientId: string;
}
export interface ClientUpdateProposalProtoMsg {
    typeUrl: '/ibc.core.client.v1.ClientUpdateProposal';
    value: Uint8Array;
}
/**
 * ClientUpdateProposal is a legacy governance proposal. If it passes, the substitute
 * client's latest consensus state is copied over to the subject client. The proposal
 * handler may fail if the subject and the substitute do not match in client and
 * chain parameters (with exception to latest height, frozen height, and chain-id).
 *
 * Deprecated: Please use MsgRecoverClient in favour of this message type.
 * @name ClientUpdateProposalSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientUpdateProposal
 * @deprecated
 */
export interface ClientUpdateProposalSDKType {
    $typeUrl?: '/ibc.core.client.v1.ClientUpdateProposal';
    title: string;
    description: string;
    subject_client_id: string;
    substitute_client_id: string;
}
/**
 * UpgradeProposal is a gov Content type for initiating an IBC breaking
 * upgrade.
 *
 * Deprecated: Please use MsgIBCSoftwareUpgrade in favour of this message type.
 * @name UpgradeProposal
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.UpgradeProposal
 * @deprecated
 */
export interface UpgradeProposal {
    $typeUrl?: '/ibc.core.client.v1.UpgradeProposal';
    title: string;
    description: string;
    plan: Plan;
    /**
     * An UpgradedClientState must be provided to perform an IBC breaking upgrade.
     * This will make the chain commit to the correct upgraded (self) client state
     * before the upgrade occurs, so that connecting chains can verify that the
     * new upgraded client is valid by verifying a proof on the previous version
     * of the chain. This will allow IBC connections to persist smoothly across
     * planned chain upgrades
     */
    upgradedClientState?: Any;
}
export interface UpgradeProposalProtoMsg {
    typeUrl: '/ibc.core.client.v1.UpgradeProposal';
    value: Uint8Array;
}
/**
 * UpgradeProposal is a gov Content type for initiating an IBC breaking
 * upgrade.
 *
 * Deprecated: Please use MsgIBCSoftwareUpgrade in favour of this message type.
 * @name UpgradeProposalSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.UpgradeProposal
 * @deprecated
 */
export interface UpgradeProposalSDKType {
    $typeUrl?: '/ibc.core.client.v1.UpgradeProposal';
    title: string;
    description: string;
    plan: PlanSDKType;
    upgraded_client_state?: AnySDKType;
}
/**
 * IdentifiedClientState defines a client state with an additional client
 * identifier field.
 * @name IdentifiedClientState
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.IdentifiedClientState
 */
export declare const IdentifiedClientState: {
    typeUrl: "/ibc.core.client.v1.IdentifiedClientState";
    aminoType: "cosmos-sdk/IdentifiedClientState";
    is(o: any): o is IdentifiedClientState;
    isSDK(o: any): o is IdentifiedClientStateSDKType;
    encode(message: IdentifiedClientState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): IdentifiedClientState;
    fromJSON(object: any): IdentifiedClientState;
    toJSON(message: IdentifiedClientState): JsonSafe<IdentifiedClientState>;
    fromPartial(object: Partial<IdentifiedClientState>): IdentifiedClientState;
    fromProtoMsg(message: IdentifiedClientStateProtoMsg): IdentifiedClientState;
    toProto(message: IdentifiedClientState): Uint8Array;
    toProtoMsg(message: IdentifiedClientState): IdentifiedClientStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConsensusStateWithHeight defines a consensus state with an additional height
 * field.
 * @name ConsensusStateWithHeight
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ConsensusStateWithHeight
 */
export declare const ConsensusStateWithHeight: {
    typeUrl: "/ibc.core.client.v1.ConsensusStateWithHeight";
    aminoType: "cosmos-sdk/ConsensusStateWithHeight";
    is(o: any): o is ConsensusStateWithHeight;
    isSDK(o: any): o is ConsensusStateWithHeightSDKType;
    encode(message: ConsensusStateWithHeight, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConsensusStateWithHeight;
    fromJSON(object: any): ConsensusStateWithHeight;
    toJSON(message: ConsensusStateWithHeight): JsonSafe<ConsensusStateWithHeight>;
    fromPartial(object: Partial<ConsensusStateWithHeight>): ConsensusStateWithHeight;
    fromProtoMsg(message: ConsensusStateWithHeightProtoMsg): ConsensusStateWithHeight;
    toProto(message: ConsensusStateWithHeight): Uint8Array;
    toProtoMsg(message: ConsensusStateWithHeight): ConsensusStateWithHeightProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ClientConsensusStates defines all the stored consensus states for a given
 * client.
 * @name ClientConsensusStates
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientConsensusStates
 */
export declare const ClientConsensusStates: {
    typeUrl: "/ibc.core.client.v1.ClientConsensusStates";
    aminoType: "cosmos-sdk/ClientConsensusStates";
    is(o: any): o is ClientConsensusStates;
    isSDK(o: any): o is ClientConsensusStatesSDKType;
    encode(message: ClientConsensusStates, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClientConsensusStates;
    fromJSON(object: any): ClientConsensusStates;
    toJSON(message: ClientConsensusStates): JsonSafe<ClientConsensusStates>;
    fromPartial(object: Partial<ClientConsensusStates>): ClientConsensusStates;
    fromProtoMsg(message: ClientConsensusStatesProtoMsg): ClientConsensusStates;
    toProto(message: ClientConsensusStates): Uint8Array;
    toProtoMsg(message: ClientConsensusStates): ClientConsensusStatesProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Height is a monotonically increasing data type
 * that can be compared against another Height for the purposes of updating and
 * freezing clients
 *
 * Normally the RevisionHeight is incremented at each height while keeping
 * RevisionNumber the same. However some consensus algorithms may choose to
 * reset the height in certain conditions e.g. hard forks, state-machine
 * breaking changes In these cases, the RevisionNumber is incremented so that
 * height continues to be monitonically increasing even as the RevisionHeight
 * gets reset
 * @name Height
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Height
 */
export declare const Height: {
    typeUrl: "/ibc.core.client.v1.Height";
    aminoType: "cosmos-sdk/Height";
    is(o: any): o is Height;
    isSDK(o: any): o is HeightSDKType;
    encode(message: Height, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Height;
    fromJSON(object: any): Height;
    toJSON(message: Height): JsonSafe<Height>;
    fromPartial(object: Partial<Height>): Height;
    fromProtoMsg(message: HeightProtoMsg): Height;
    toProto(message: Height): Uint8Array;
    toProtoMsg(message: Height): HeightProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Params defines the set of IBC light client parameters.
 * @name Params
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.Params
 */
export declare const Params: {
    typeUrl: "/ibc.core.client.v1.Params";
    aminoType: "cosmos-sdk/Params";
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
 * ClientUpdateProposal is a legacy governance proposal. If it passes, the substitute
 * client's latest consensus state is copied over to the subject client. The proposal
 * handler may fail if the subject and the substitute do not match in client and
 * chain parameters (with exception to latest height, frozen height, and chain-id).
 *
 * Deprecated: Please use MsgRecoverClient in favour of this message type.
 * @name ClientUpdateProposal
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.ClientUpdateProposal
 * @deprecated
 */
export declare const ClientUpdateProposal: {
    typeUrl: "/ibc.core.client.v1.ClientUpdateProposal";
    aminoType: "cosmos-sdk/ClientUpdateProposal";
    is(o: any): o is ClientUpdateProposal;
    isSDK(o: any): o is ClientUpdateProposalSDKType;
    encode(message: ClientUpdateProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClientUpdateProposal;
    fromJSON(object: any): ClientUpdateProposal;
    toJSON(message: ClientUpdateProposal): JsonSafe<ClientUpdateProposal>;
    fromPartial(object: Partial<ClientUpdateProposal>): ClientUpdateProposal;
    fromProtoMsg(message: ClientUpdateProposalProtoMsg): ClientUpdateProposal;
    toProto(message: ClientUpdateProposal): Uint8Array;
    toProtoMsg(message: ClientUpdateProposal): ClientUpdateProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * UpgradeProposal is a gov Content type for initiating an IBC breaking
 * upgrade.
 *
 * Deprecated: Please use MsgIBCSoftwareUpgrade in favour of this message type.
 * @name UpgradeProposal
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.UpgradeProposal
 * @deprecated
 */
export declare const UpgradeProposal: {
    typeUrl: "/ibc.core.client.v1.UpgradeProposal";
    aminoType: "cosmos-sdk/UpgradeProposal";
    is(o: any): o is UpgradeProposal;
    isSDK(o: any): o is UpgradeProposalSDKType;
    encode(message: UpgradeProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): UpgradeProposal;
    fromJSON(object: any): UpgradeProposal;
    toJSON(message: UpgradeProposal): JsonSafe<UpgradeProposal>;
    fromPartial(object: Partial<UpgradeProposal>): UpgradeProposal;
    fromProtoMsg(message: UpgradeProposalProtoMsg): UpgradeProposal;
    toProto(message: UpgradeProposal): Uint8Array;
    toProtoMsg(message: UpgradeProposal): UpgradeProposalProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=client.d.ts.map