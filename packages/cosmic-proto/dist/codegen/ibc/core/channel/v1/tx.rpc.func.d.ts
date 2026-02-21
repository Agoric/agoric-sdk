import { MsgChannelOpenInit, MsgChannelOpenTry, MsgChannelOpenAck, MsgChannelOpenConfirm, MsgChannelCloseInit, MsgChannelCloseConfirm, MsgRecvPacket, MsgTimeout, MsgTimeoutOnClose, MsgAcknowledgement, MsgChannelUpgradeInit, MsgChannelUpgradeTry, MsgChannelUpgradeAck, MsgChannelUpgradeConfirm, MsgChannelUpgradeOpen, MsgChannelUpgradeTimeout, MsgChannelUpgradeCancel, MsgUpdateParams, MsgPruneAcknowledgements } from './tx.js';
/**
 * ChannelOpenInit defines a rpc handler method for MsgChannelOpenInit.
 * @name channelOpenInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenInit
 */
export declare const channelOpenInit: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelOpenInit | MsgChannelOpenInit[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelOpenTry defines a rpc handler method for MsgChannelOpenTry.
 * @name channelOpenTry
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenTry
 */
export declare const channelOpenTry: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelOpenTry | MsgChannelOpenTry[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelOpenAck defines a rpc handler method for MsgChannelOpenAck.
 * @name channelOpenAck
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenAck
 */
export declare const channelOpenAck: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelOpenAck | MsgChannelOpenAck[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelOpenConfirm defines a rpc handler method for MsgChannelOpenConfirm.
 * @name channelOpenConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenConfirm
 */
export declare const channelOpenConfirm: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelOpenConfirm | MsgChannelOpenConfirm[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelCloseInit defines a rpc handler method for MsgChannelCloseInit.
 * @name channelCloseInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelCloseInit
 */
export declare const channelCloseInit: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelCloseInit | MsgChannelCloseInit[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelCloseConfirm defines a rpc handler method for
 * MsgChannelCloseConfirm.
 * @name channelCloseConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelCloseConfirm
 */
export declare const channelCloseConfirm: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelCloseConfirm | MsgChannelCloseConfirm[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * RecvPacket defines a rpc handler method for MsgRecvPacket.
 * @name recvPacket
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.RecvPacket
 */
export declare const recvPacket: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRecvPacket | MsgRecvPacket[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Timeout defines a rpc handler method for MsgTimeout.
 * @name timeout
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Timeout
 */
export declare const timeout: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgTimeout | MsgTimeout[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * TimeoutOnClose defines a rpc handler method for MsgTimeoutOnClose.
 * @name timeoutOnClose
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.TimeoutOnClose
 */
export declare const timeoutOnClose: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgTimeoutOnClose | MsgTimeoutOnClose[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Acknowledgement defines a rpc handler method for MsgAcknowledgement.
 * @name acknowledgement
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Acknowledgement
 */
export declare const acknowledgement: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgAcknowledgement | MsgAcknowledgement[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelUpgradeInit defines a rpc handler method for MsgChannelUpgradeInit.
 * @name channelUpgradeInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeInit
 */
export declare const channelUpgradeInit: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelUpgradeInit | MsgChannelUpgradeInit[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelUpgradeTry defines a rpc handler method for MsgChannelUpgradeTry.
 * @name channelUpgradeTry
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeTry
 */
export declare const channelUpgradeTry: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelUpgradeTry | MsgChannelUpgradeTry[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelUpgradeAck defines a rpc handler method for MsgChannelUpgradeAck.
 * @name channelUpgradeAck
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeAck
 */
export declare const channelUpgradeAck: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelUpgradeAck | MsgChannelUpgradeAck[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelUpgradeConfirm defines a rpc handler method for MsgChannelUpgradeConfirm.
 * @name channelUpgradeConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeConfirm
 */
export declare const channelUpgradeConfirm: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelUpgradeConfirm | MsgChannelUpgradeConfirm[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelUpgradeOpen defines a rpc handler method for MsgChannelUpgradeOpen.
 * @name channelUpgradeOpen
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeOpen
 */
export declare const channelUpgradeOpen: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelUpgradeOpen | MsgChannelUpgradeOpen[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelUpgradeTimeout defines a rpc handler method for MsgChannelUpgradeTimeout.
 * @name channelUpgradeTimeout
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeTimeout
 */
export declare const channelUpgradeTimeout: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelUpgradeTimeout | MsgChannelUpgradeTimeout[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ChannelUpgradeCancel defines a rpc handler method for MsgChannelUpgradeCancel.
 * @name channelUpgradeCancel
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeCancel
 */
export declare const channelUpgradeCancel: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgChannelUpgradeCancel | MsgChannelUpgradeCancel[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateChannelParams defines a rpc handler method for MsgUpdateParams.
 * @name updateChannelParams
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UpdateChannelParams
 */
export declare const updateChannelParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * PruneAcknowledgements defines a rpc handler method for MsgPruneAcknowledgements.
 * @name pruneAcknowledgements
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PruneAcknowledgements
 */
export declare const pruneAcknowledgements: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgPruneAcknowledgements | MsgPruneAcknowledgements[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map