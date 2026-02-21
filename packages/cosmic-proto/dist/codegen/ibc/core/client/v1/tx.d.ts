import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { Plan, type PlanSDKType } from '../../../../cosmos/upgrade/v1beta1/upgrade.js';
import { Params, type ParamsSDKType } from './client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MsgCreateClient defines a message to create an IBC client
 * @name MsgCreateClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgCreateClient
 */
export interface MsgCreateClient {
    /**
     * light client state
     */
    clientState?: Any;
    /**
     * consensus state associated with the client that corresponds to a given
     * height.
     */
    consensusState?: Any;
    /**
     * signer address
     */
    signer: string;
}
export interface MsgCreateClientProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgCreateClient';
    value: Uint8Array;
}
/**
 * MsgCreateClient defines a message to create an IBC client
 * @name MsgCreateClientSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgCreateClient
 */
export interface MsgCreateClientSDKType {
    client_state?: AnySDKType;
    consensus_state?: AnySDKType;
    signer: string;
}
/**
 * MsgCreateClientResponse defines the Msg/CreateClient response type.
 * @name MsgCreateClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgCreateClientResponse
 */
export interface MsgCreateClientResponse {
}
export interface MsgCreateClientResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgCreateClientResponse';
    value: Uint8Array;
}
/**
 * MsgCreateClientResponse defines the Msg/CreateClient response type.
 * @name MsgCreateClientResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgCreateClientResponse
 */
export interface MsgCreateClientResponseSDKType {
}
/**
 * MsgUpdateClient defines an sdk.Msg to update a IBC client state using
 * the given client message.
 * @name MsgUpdateClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateClient
 */
export interface MsgUpdateClient {
    /**
     * client unique identifier
     */
    clientId: string;
    /**
     * client message to update the light client
     */
    clientMessage?: Any;
    /**
     * signer address
     */
    signer: string;
}
export interface MsgUpdateClientProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgUpdateClient';
    value: Uint8Array;
}
/**
 * MsgUpdateClient defines an sdk.Msg to update a IBC client state using
 * the given client message.
 * @name MsgUpdateClientSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateClient
 */
export interface MsgUpdateClientSDKType {
    client_id: string;
    client_message?: AnySDKType;
    signer: string;
}
/**
 * MsgUpdateClientResponse defines the Msg/UpdateClient response type.
 * @name MsgUpdateClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateClientResponse
 */
export interface MsgUpdateClientResponse {
}
export interface MsgUpdateClientResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgUpdateClientResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateClientResponse defines the Msg/UpdateClient response type.
 * @name MsgUpdateClientResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateClientResponse
 */
export interface MsgUpdateClientResponseSDKType {
}
/**
 * MsgUpgradeClient defines an sdk.Msg to upgrade an IBC client to a new client
 * state
 * @name MsgUpgradeClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpgradeClient
 */
export interface MsgUpgradeClient {
    /**
     * client unique identifier
     */
    clientId: string;
    /**
     * upgraded client state
     */
    clientState?: Any;
    /**
     * upgraded consensus state, only contains enough information to serve as a
     * basis of trust in update logic
     */
    consensusState?: Any;
    /**
     * proof that old chain committed to new client
     */
    proofUpgradeClient: Uint8Array;
    /**
     * proof that old chain committed to new consensus state
     */
    proofUpgradeConsensusState: Uint8Array;
    /**
     * signer address
     */
    signer: string;
}
export interface MsgUpgradeClientProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgUpgradeClient';
    value: Uint8Array;
}
/**
 * MsgUpgradeClient defines an sdk.Msg to upgrade an IBC client to a new client
 * state
 * @name MsgUpgradeClientSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpgradeClient
 */
export interface MsgUpgradeClientSDKType {
    client_id: string;
    client_state?: AnySDKType;
    consensus_state?: AnySDKType;
    proof_upgrade_client: Uint8Array;
    proof_upgrade_consensus_state: Uint8Array;
    signer: string;
}
/**
 * MsgUpgradeClientResponse defines the Msg/UpgradeClient response type.
 * @name MsgUpgradeClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpgradeClientResponse
 */
export interface MsgUpgradeClientResponse {
}
export interface MsgUpgradeClientResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgUpgradeClientResponse';
    value: Uint8Array;
}
/**
 * MsgUpgradeClientResponse defines the Msg/UpgradeClient response type.
 * @name MsgUpgradeClientResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpgradeClientResponse
 */
export interface MsgUpgradeClientResponseSDKType {
}
/**
 * MsgSubmitMisbehaviour defines an sdk.Msg type that submits Evidence for
 * light client misbehaviour.
 * This message has been deprecated. Use MsgUpdateClient instead.
 * @name MsgSubmitMisbehaviour
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgSubmitMisbehaviour
 * @deprecated
 */
export interface MsgSubmitMisbehaviour {
    /**
     * client unique identifier
     */
    clientId: string;
    /**
     * misbehaviour used for freezing the light client
     */
    misbehaviour?: Any;
    /**
     * signer address
     */
    signer: string;
}
export interface MsgSubmitMisbehaviourProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgSubmitMisbehaviour';
    value: Uint8Array;
}
/**
 * MsgSubmitMisbehaviour defines an sdk.Msg type that submits Evidence for
 * light client misbehaviour.
 * This message has been deprecated. Use MsgUpdateClient instead.
 * @name MsgSubmitMisbehaviourSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgSubmitMisbehaviour
 * @deprecated
 */
export interface MsgSubmitMisbehaviourSDKType {
    client_id: string;
    misbehaviour?: AnySDKType;
    signer: string;
}
/**
 * MsgSubmitMisbehaviourResponse defines the Msg/SubmitMisbehaviour response
 * type.
 * @name MsgSubmitMisbehaviourResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgSubmitMisbehaviourResponse
 */
export interface MsgSubmitMisbehaviourResponse {
}
export interface MsgSubmitMisbehaviourResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgSubmitMisbehaviourResponse';
    value: Uint8Array;
}
/**
 * MsgSubmitMisbehaviourResponse defines the Msg/SubmitMisbehaviour response
 * type.
 * @name MsgSubmitMisbehaviourResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgSubmitMisbehaviourResponse
 */
export interface MsgSubmitMisbehaviourResponseSDKType {
}
/**
 * MsgRecoverClient defines the message used to recover a frozen or expired client.
 * @name MsgRecoverClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgRecoverClient
 */
export interface MsgRecoverClient {
    /**
     * the client identifier for the client to be updated if the proposal passes
     */
    subjectClientId: string;
    /**
     * the substitute client identifier for the client which will replace the subject
     * client
     */
    substituteClientId: string;
    /**
     * signer address
     */
    signer: string;
}
export interface MsgRecoverClientProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgRecoverClient';
    value: Uint8Array;
}
/**
 * MsgRecoverClient defines the message used to recover a frozen or expired client.
 * @name MsgRecoverClientSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgRecoverClient
 */
export interface MsgRecoverClientSDKType {
    subject_client_id: string;
    substitute_client_id: string;
    signer: string;
}
/**
 * MsgRecoverClientResponse defines the Msg/RecoverClient response type.
 * @name MsgRecoverClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgRecoverClientResponse
 */
export interface MsgRecoverClientResponse {
}
export interface MsgRecoverClientResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgRecoverClientResponse';
    value: Uint8Array;
}
/**
 * MsgRecoverClientResponse defines the Msg/RecoverClient response type.
 * @name MsgRecoverClientResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgRecoverClientResponse
 */
export interface MsgRecoverClientResponseSDKType {
}
/**
 * MsgIBCSoftwareUpgrade defines the message used to schedule an upgrade of an IBC client using a v1 governance proposal
 * @name MsgIBCSoftwareUpgrade
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgIBCSoftwareUpgrade
 */
export interface MsgIBCSoftwareUpgrade {
    plan: Plan;
    /**
     * An UpgradedClientState must be provided to perform an IBC breaking upgrade.
     * This will make the chain commit to the correct upgraded (self) client state
     * before the upgrade occurs, so that connecting chains can verify that the
     * new upgraded client is valid by verifying a proof on the previous version
     * of the chain. This will allow IBC connections to persist smoothly across
     * planned chain upgrades. Correspondingly, the UpgradedClientState field has been
     * deprecated in the Cosmos SDK to allow for this logic to exist solely in
     * the 02-client module.
     */
    upgradedClientState?: Any;
    /**
     * signer address
     */
    signer: string;
}
export interface MsgIBCSoftwareUpgradeProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgIBCSoftwareUpgrade';
    value: Uint8Array;
}
/**
 * MsgIBCSoftwareUpgrade defines the message used to schedule an upgrade of an IBC client using a v1 governance proposal
 * @name MsgIBCSoftwareUpgradeSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgIBCSoftwareUpgrade
 */
export interface MsgIBCSoftwareUpgradeSDKType {
    plan: PlanSDKType;
    upgraded_client_state?: AnySDKType;
    signer: string;
}
/**
 * MsgIBCSoftwareUpgradeResponse defines the Msg/IBCSoftwareUpgrade response type.
 * @name MsgIBCSoftwareUpgradeResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgIBCSoftwareUpgradeResponse
 */
export interface MsgIBCSoftwareUpgradeResponse {
}
export interface MsgIBCSoftwareUpgradeResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgIBCSoftwareUpgradeResponse';
    value: Uint8Array;
}
/**
 * MsgIBCSoftwareUpgradeResponse defines the Msg/IBCSoftwareUpgrade response type.
 * @name MsgIBCSoftwareUpgradeResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgIBCSoftwareUpgradeResponse
 */
export interface MsgIBCSoftwareUpgradeResponseSDKType {
}
/**
 * MsgUpdateParams defines the sdk.Msg type to update the client parameters.
 * @name MsgUpdateParams
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * signer address
     */
    signer: string;
    /**
     * params defines the client parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams defines the sdk.Msg type to update the client parameters.
 * @name MsgUpdateParamsSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    signer: string;
    params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgCreateClient defines a message to create an IBC client
 * @name MsgCreateClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgCreateClient
 */
export declare const MsgCreateClient: {
    typeUrl: "/ibc.core.client.v1.MsgCreateClient";
    aminoType: "cosmos-sdk/MsgCreateClient";
    is(o: any): o is MsgCreateClient;
    isSDK(o: any): o is MsgCreateClientSDKType;
    encode(message: MsgCreateClient, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateClient;
    fromJSON(object: any): MsgCreateClient;
    toJSON(message: MsgCreateClient): JsonSafe<MsgCreateClient>;
    fromPartial(object: Partial<MsgCreateClient>): MsgCreateClient;
    fromProtoMsg(message: MsgCreateClientProtoMsg): MsgCreateClient;
    toProto(message: MsgCreateClient): Uint8Array;
    toProtoMsg(message: MsgCreateClient): MsgCreateClientProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateClientResponse defines the Msg/CreateClient response type.
 * @name MsgCreateClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgCreateClientResponse
 */
export declare const MsgCreateClientResponse: {
    typeUrl: "/ibc.core.client.v1.MsgCreateClientResponse";
    aminoType: "cosmos-sdk/MsgCreateClientResponse";
    is(o: any): o is MsgCreateClientResponse;
    isSDK(o: any): o is MsgCreateClientResponseSDKType;
    encode(_: MsgCreateClientResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateClientResponse;
    fromJSON(_: any): MsgCreateClientResponse;
    toJSON(_: MsgCreateClientResponse): JsonSafe<MsgCreateClientResponse>;
    fromPartial(_: Partial<MsgCreateClientResponse>): MsgCreateClientResponse;
    fromProtoMsg(message: MsgCreateClientResponseProtoMsg): MsgCreateClientResponse;
    toProto(message: MsgCreateClientResponse): Uint8Array;
    toProtoMsg(message: MsgCreateClientResponse): MsgCreateClientResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateClient defines an sdk.Msg to update a IBC client state using
 * the given client message.
 * @name MsgUpdateClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateClient
 */
export declare const MsgUpdateClient: {
    typeUrl: "/ibc.core.client.v1.MsgUpdateClient";
    aminoType: "cosmos-sdk/MsgUpdateClient";
    is(o: any): o is MsgUpdateClient;
    isSDK(o: any): o is MsgUpdateClientSDKType;
    encode(message: MsgUpdateClient, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateClient;
    fromJSON(object: any): MsgUpdateClient;
    toJSON(message: MsgUpdateClient): JsonSafe<MsgUpdateClient>;
    fromPartial(object: Partial<MsgUpdateClient>): MsgUpdateClient;
    fromProtoMsg(message: MsgUpdateClientProtoMsg): MsgUpdateClient;
    toProto(message: MsgUpdateClient): Uint8Array;
    toProtoMsg(message: MsgUpdateClient): MsgUpdateClientProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateClientResponse defines the Msg/UpdateClient response type.
 * @name MsgUpdateClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateClientResponse
 */
export declare const MsgUpdateClientResponse: {
    typeUrl: "/ibc.core.client.v1.MsgUpdateClientResponse";
    aminoType: "cosmos-sdk/MsgUpdateClientResponse";
    is(o: any): o is MsgUpdateClientResponse;
    isSDK(o: any): o is MsgUpdateClientResponseSDKType;
    encode(_: MsgUpdateClientResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateClientResponse;
    fromJSON(_: any): MsgUpdateClientResponse;
    toJSON(_: MsgUpdateClientResponse): JsonSafe<MsgUpdateClientResponse>;
    fromPartial(_: Partial<MsgUpdateClientResponse>): MsgUpdateClientResponse;
    fromProtoMsg(message: MsgUpdateClientResponseProtoMsg): MsgUpdateClientResponse;
    toProto(message: MsgUpdateClientResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateClientResponse): MsgUpdateClientResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpgradeClient defines an sdk.Msg to upgrade an IBC client to a new client
 * state
 * @name MsgUpgradeClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpgradeClient
 */
export declare const MsgUpgradeClient: {
    typeUrl: "/ibc.core.client.v1.MsgUpgradeClient";
    aminoType: "cosmos-sdk/MsgUpgradeClient";
    is(o: any): o is MsgUpgradeClient;
    isSDK(o: any): o is MsgUpgradeClientSDKType;
    encode(message: MsgUpgradeClient, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpgradeClient;
    fromJSON(object: any): MsgUpgradeClient;
    toJSON(message: MsgUpgradeClient): JsonSafe<MsgUpgradeClient>;
    fromPartial(object: Partial<MsgUpgradeClient>): MsgUpgradeClient;
    fromProtoMsg(message: MsgUpgradeClientProtoMsg): MsgUpgradeClient;
    toProto(message: MsgUpgradeClient): Uint8Array;
    toProtoMsg(message: MsgUpgradeClient): MsgUpgradeClientProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpgradeClientResponse defines the Msg/UpgradeClient response type.
 * @name MsgUpgradeClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpgradeClientResponse
 */
export declare const MsgUpgradeClientResponse: {
    typeUrl: "/ibc.core.client.v1.MsgUpgradeClientResponse";
    aminoType: "cosmos-sdk/MsgUpgradeClientResponse";
    is(o: any): o is MsgUpgradeClientResponse;
    isSDK(o: any): o is MsgUpgradeClientResponseSDKType;
    encode(_: MsgUpgradeClientResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpgradeClientResponse;
    fromJSON(_: any): MsgUpgradeClientResponse;
    toJSON(_: MsgUpgradeClientResponse): JsonSafe<MsgUpgradeClientResponse>;
    fromPartial(_: Partial<MsgUpgradeClientResponse>): MsgUpgradeClientResponse;
    fromProtoMsg(message: MsgUpgradeClientResponseProtoMsg): MsgUpgradeClientResponse;
    toProto(message: MsgUpgradeClientResponse): Uint8Array;
    toProtoMsg(message: MsgUpgradeClientResponse): MsgUpgradeClientResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSubmitMisbehaviour defines an sdk.Msg type that submits Evidence for
 * light client misbehaviour.
 * This message has been deprecated. Use MsgUpdateClient instead.
 * @name MsgSubmitMisbehaviour
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgSubmitMisbehaviour
 * @deprecated
 */
export declare const MsgSubmitMisbehaviour: {
    typeUrl: "/ibc.core.client.v1.MsgSubmitMisbehaviour";
    aminoType: "cosmos-sdk/MsgSubmitMisbehaviour";
    is(o: any): o is MsgSubmitMisbehaviour;
    isSDK(o: any): o is MsgSubmitMisbehaviourSDKType;
    encode(message: MsgSubmitMisbehaviour, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSubmitMisbehaviour;
    fromJSON(object: any): MsgSubmitMisbehaviour;
    toJSON(message: MsgSubmitMisbehaviour): JsonSafe<MsgSubmitMisbehaviour>;
    fromPartial(object: Partial<MsgSubmitMisbehaviour>): MsgSubmitMisbehaviour;
    fromProtoMsg(message: MsgSubmitMisbehaviourProtoMsg): MsgSubmitMisbehaviour;
    toProto(message: MsgSubmitMisbehaviour): Uint8Array;
    toProtoMsg(message: MsgSubmitMisbehaviour): MsgSubmitMisbehaviourProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSubmitMisbehaviourResponse defines the Msg/SubmitMisbehaviour response
 * type.
 * @name MsgSubmitMisbehaviourResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgSubmitMisbehaviourResponse
 */
export declare const MsgSubmitMisbehaviourResponse: {
    typeUrl: "/ibc.core.client.v1.MsgSubmitMisbehaviourResponse";
    aminoType: "cosmos-sdk/MsgSubmitMisbehaviourResponse";
    is(o: any): o is MsgSubmitMisbehaviourResponse;
    isSDK(o: any): o is MsgSubmitMisbehaviourResponseSDKType;
    encode(_: MsgSubmitMisbehaviourResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSubmitMisbehaviourResponse;
    fromJSON(_: any): MsgSubmitMisbehaviourResponse;
    toJSON(_: MsgSubmitMisbehaviourResponse): JsonSafe<MsgSubmitMisbehaviourResponse>;
    fromPartial(_: Partial<MsgSubmitMisbehaviourResponse>): MsgSubmitMisbehaviourResponse;
    fromProtoMsg(message: MsgSubmitMisbehaviourResponseProtoMsg): MsgSubmitMisbehaviourResponse;
    toProto(message: MsgSubmitMisbehaviourResponse): Uint8Array;
    toProtoMsg(message: MsgSubmitMisbehaviourResponse): MsgSubmitMisbehaviourResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRecoverClient defines the message used to recover a frozen or expired client.
 * @name MsgRecoverClient
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgRecoverClient
 */
export declare const MsgRecoverClient: {
    typeUrl: "/ibc.core.client.v1.MsgRecoverClient";
    aminoType: "cosmos-sdk/MsgRecoverClient";
    is(o: any): o is MsgRecoverClient;
    isSDK(o: any): o is MsgRecoverClientSDKType;
    encode(message: MsgRecoverClient, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRecoverClient;
    fromJSON(object: any): MsgRecoverClient;
    toJSON(message: MsgRecoverClient): JsonSafe<MsgRecoverClient>;
    fromPartial(object: Partial<MsgRecoverClient>): MsgRecoverClient;
    fromProtoMsg(message: MsgRecoverClientProtoMsg): MsgRecoverClient;
    toProto(message: MsgRecoverClient): Uint8Array;
    toProtoMsg(message: MsgRecoverClient): MsgRecoverClientProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRecoverClientResponse defines the Msg/RecoverClient response type.
 * @name MsgRecoverClientResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgRecoverClientResponse
 */
export declare const MsgRecoverClientResponse: {
    typeUrl: "/ibc.core.client.v1.MsgRecoverClientResponse";
    aminoType: "cosmos-sdk/MsgRecoverClientResponse";
    is(o: any): o is MsgRecoverClientResponse;
    isSDK(o: any): o is MsgRecoverClientResponseSDKType;
    encode(_: MsgRecoverClientResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRecoverClientResponse;
    fromJSON(_: any): MsgRecoverClientResponse;
    toJSON(_: MsgRecoverClientResponse): JsonSafe<MsgRecoverClientResponse>;
    fromPartial(_: Partial<MsgRecoverClientResponse>): MsgRecoverClientResponse;
    fromProtoMsg(message: MsgRecoverClientResponseProtoMsg): MsgRecoverClientResponse;
    toProto(message: MsgRecoverClientResponse): Uint8Array;
    toProtoMsg(message: MsgRecoverClientResponse): MsgRecoverClientResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgIBCSoftwareUpgrade defines the message used to schedule an upgrade of an IBC client using a v1 governance proposal
 * @name MsgIBCSoftwareUpgrade
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgIBCSoftwareUpgrade
 */
export declare const MsgIBCSoftwareUpgrade: {
    typeUrl: "/ibc.core.client.v1.MsgIBCSoftwareUpgrade";
    aminoType: "cosmos-sdk/MsgIBCSoftwareUpgrade";
    is(o: any): o is MsgIBCSoftwareUpgrade;
    isSDK(o: any): o is MsgIBCSoftwareUpgradeSDKType;
    encode(message: MsgIBCSoftwareUpgrade, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgIBCSoftwareUpgrade;
    fromJSON(object: any): MsgIBCSoftwareUpgrade;
    toJSON(message: MsgIBCSoftwareUpgrade): JsonSafe<MsgIBCSoftwareUpgrade>;
    fromPartial(object: Partial<MsgIBCSoftwareUpgrade>): MsgIBCSoftwareUpgrade;
    fromProtoMsg(message: MsgIBCSoftwareUpgradeProtoMsg): MsgIBCSoftwareUpgrade;
    toProto(message: MsgIBCSoftwareUpgrade): Uint8Array;
    toProtoMsg(message: MsgIBCSoftwareUpgrade): MsgIBCSoftwareUpgradeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgIBCSoftwareUpgradeResponse defines the Msg/IBCSoftwareUpgrade response type.
 * @name MsgIBCSoftwareUpgradeResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgIBCSoftwareUpgradeResponse
 */
export declare const MsgIBCSoftwareUpgradeResponse: {
    typeUrl: "/ibc.core.client.v1.MsgIBCSoftwareUpgradeResponse";
    aminoType: "cosmos-sdk/MsgIBCSoftwareUpgradeResponse";
    is(o: any): o is MsgIBCSoftwareUpgradeResponse;
    isSDK(o: any): o is MsgIBCSoftwareUpgradeResponseSDKType;
    encode(_: MsgIBCSoftwareUpgradeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgIBCSoftwareUpgradeResponse;
    fromJSON(_: any): MsgIBCSoftwareUpgradeResponse;
    toJSON(_: MsgIBCSoftwareUpgradeResponse): JsonSafe<MsgIBCSoftwareUpgradeResponse>;
    fromPartial(_: Partial<MsgIBCSoftwareUpgradeResponse>): MsgIBCSoftwareUpgradeResponse;
    fromProtoMsg(message: MsgIBCSoftwareUpgradeResponseProtoMsg): MsgIBCSoftwareUpgradeResponse;
    toProto(message: MsgIBCSoftwareUpgradeResponse): Uint8Array;
    toProtoMsg(message: MsgIBCSoftwareUpgradeResponse): MsgIBCSoftwareUpgradeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams defines the sdk.Msg type to update the client parameters.
 * @name MsgUpdateParams
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/ibc.core.client.v1.MsgUpdateParams";
    aminoType: "cosmos-sdk/MsgUpdateParams";
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
 * MsgUpdateParamsResponse defines the MsgUpdateParams response type.
 * @name MsgUpdateParamsResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/ibc.core.client.v1.MsgUpdateParamsResponse";
    aminoType: "cosmos-sdk/MsgUpdateParamsResponse";
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
//# sourceMappingURL=tx.d.ts.map