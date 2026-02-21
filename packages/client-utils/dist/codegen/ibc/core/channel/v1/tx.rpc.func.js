//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgChannelOpenInit, MsgChannelOpenTry, MsgChannelOpenAck, MsgChannelOpenConfirm, MsgChannelCloseInit, MsgChannelCloseConfirm, MsgRecvPacket, MsgTimeout, MsgTimeoutOnClose, MsgAcknowledgement, MsgChannelUpgradeInit, MsgChannelUpgradeTry, MsgChannelUpgradeAck, MsgChannelUpgradeConfirm, MsgChannelUpgradeOpen, MsgChannelUpgradeTimeout, MsgChannelUpgradeCancel, MsgUpdateParams, MsgPruneAcknowledgements, } from '@agoric/cosmic-proto/codegen/ibc/core/channel/v1/tx.js';
/**
 * ChannelOpenInit defines a rpc handler method for MsgChannelOpenInit.
 * @name channelOpenInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenInit
 */
export const channelOpenInit = buildTx({
    msg: MsgChannelOpenInit,
});
/**
 * ChannelOpenTry defines a rpc handler method for MsgChannelOpenTry.
 * @name channelOpenTry
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenTry
 */
export const channelOpenTry = buildTx({
    msg: MsgChannelOpenTry,
});
/**
 * ChannelOpenAck defines a rpc handler method for MsgChannelOpenAck.
 * @name channelOpenAck
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenAck
 */
export const channelOpenAck = buildTx({
    msg: MsgChannelOpenAck,
});
/**
 * ChannelOpenConfirm defines a rpc handler method for MsgChannelOpenConfirm.
 * @name channelOpenConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenConfirm
 */
export const channelOpenConfirm = buildTx({
    msg: MsgChannelOpenConfirm,
});
/**
 * ChannelCloseInit defines a rpc handler method for MsgChannelCloseInit.
 * @name channelCloseInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelCloseInit
 */
export const channelCloseInit = buildTx({
    msg: MsgChannelCloseInit,
});
/**
 * ChannelCloseConfirm defines a rpc handler method for
 * MsgChannelCloseConfirm.
 * @name channelCloseConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelCloseConfirm
 */
export const channelCloseConfirm = buildTx({
    msg: MsgChannelCloseConfirm,
});
/**
 * RecvPacket defines a rpc handler method for MsgRecvPacket.
 * @name recvPacket
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.RecvPacket
 */
export const recvPacket = buildTx({
    msg: MsgRecvPacket,
});
/**
 * Timeout defines a rpc handler method for MsgTimeout.
 * @name timeout
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Timeout
 */
export const timeout = buildTx({
    msg: MsgTimeout,
});
/**
 * TimeoutOnClose defines a rpc handler method for MsgTimeoutOnClose.
 * @name timeoutOnClose
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.TimeoutOnClose
 */
export const timeoutOnClose = buildTx({
    msg: MsgTimeoutOnClose,
});
/**
 * Acknowledgement defines a rpc handler method for MsgAcknowledgement.
 * @name acknowledgement
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Acknowledgement
 */
export const acknowledgement = buildTx({
    msg: MsgAcknowledgement,
});
/**
 * ChannelUpgradeInit defines a rpc handler method for MsgChannelUpgradeInit.
 * @name channelUpgradeInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeInit
 */
export const channelUpgradeInit = buildTx({
    msg: MsgChannelUpgradeInit,
});
/**
 * ChannelUpgradeTry defines a rpc handler method for MsgChannelUpgradeTry.
 * @name channelUpgradeTry
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeTry
 */
export const channelUpgradeTry = buildTx({
    msg: MsgChannelUpgradeTry,
});
/**
 * ChannelUpgradeAck defines a rpc handler method for MsgChannelUpgradeAck.
 * @name channelUpgradeAck
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeAck
 */
export const channelUpgradeAck = buildTx({
    msg: MsgChannelUpgradeAck,
});
/**
 * ChannelUpgradeConfirm defines a rpc handler method for MsgChannelUpgradeConfirm.
 * @name channelUpgradeConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeConfirm
 */
export const channelUpgradeConfirm = buildTx({
    msg: MsgChannelUpgradeConfirm,
});
/**
 * ChannelUpgradeOpen defines a rpc handler method for MsgChannelUpgradeOpen.
 * @name channelUpgradeOpen
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeOpen
 */
export const channelUpgradeOpen = buildTx({
    msg: MsgChannelUpgradeOpen,
});
/**
 * ChannelUpgradeTimeout defines a rpc handler method for MsgChannelUpgradeTimeout.
 * @name channelUpgradeTimeout
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeTimeout
 */
export const channelUpgradeTimeout = buildTx({
    msg: MsgChannelUpgradeTimeout,
});
/**
 * ChannelUpgradeCancel defines a rpc handler method for MsgChannelUpgradeCancel.
 * @name channelUpgradeCancel
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeCancel
 */
export const channelUpgradeCancel = buildTx({
    msg: MsgChannelUpgradeCancel,
});
/**
 * UpdateChannelParams defines a rpc handler method for MsgUpdateParams.
 * @name updateChannelParams
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UpdateChannelParams
 */
export const updateChannelParams = buildTx({
    msg: MsgUpdateParams,
});
/**
 * PruneAcknowledgements defines a rpc handler method for MsgPruneAcknowledgements.
 * @name pruneAcknowledgements
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PruneAcknowledgements
 */
export const pruneAcknowledgements = buildTx({
    msg: MsgPruneAcknowledgements,
});
//# sourceMappingURL=tx.rpc.func.js.map