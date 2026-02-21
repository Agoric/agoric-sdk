import { MsgConnectionOpenInit, MsgConnectionOpenTry, MsgConnectionOpenAck, MsgConnectionOpenConfirm, MsgUpdateParams } from './tx.js';
/**
 * ConnectionOpenInit defines a rpc handler method for MsgConnectionOpenInit.
 * @name connectionOpenInit
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenInit
 */
export declare const connectionOpenInit: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgConnectionOpenInit | MsgConnectionOpenInit[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ConnectionOpenTry defines a rpc handler method for MsgConnectionOpenTry.
 * @name connectionOpenTry
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenTry
 */
export declare const connectionOpenTry: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgConnectionOpenTry | MsgConnectionOpenTry[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ConnectionOpenAck defines a rpc handler method for MsgConnectionOpenAck.
 * @name connectionOpenAck
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenAck
 */
export declare const connectionOpenAck: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgConnectionOpenAck | MsgConnectionOpenAck[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ConnectionOpenConfirm defines a rpc handler method for
 * MsgConnectionOpenConfirm.
 * @name connectionOpenConfirm
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenConfirm
 */
export declare const connectionOpenConfirm: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgConnectionOpenConfirm | MsgConnectionOpenConfirm[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateConnectionParams defines a rpc handler method for
 * MsgUpdateParams.
 * @name updateConnectionParams
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.UpdateConnectionParams
 */
export declare const updateConnectionParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map