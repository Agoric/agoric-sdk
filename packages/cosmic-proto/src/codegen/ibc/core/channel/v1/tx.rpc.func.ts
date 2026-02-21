//@ts-nocheck
import { buildTx } from '../../../../helper-func-types.js';
import {
  MsgChannelOpenInit,
  MsgChannelOpenTry,
  MsgChannelOpenAck,
  MsgChannelOpenConfirm,
  MsgChannelCloseInit,
  MsgChannelCloseConfirm,
  MsgRecvPacket,
  MsgTimeout,
  MsgTimeoutOnClose,
  MsgAcknowledgement,
  MsgChannelUpgradeInit,
  MsgChannelUpgradeTry,
  MsgChannelUpgradeAck,
  MsgChannelUpgradeConfirm,
  MsgChannelUpgradeOpen,
  MsgChannelUpgradeTimeout,
  MsgChannelUpgradeCancel,
  MsgUpdateParams,
  MsgPruneAcknowledgements,
} from './tx.js';
/**
 * ChannelOpenInit defines a rpc handler method for MsgChannelOpenInit.
 * @name channelOpenInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenInit
 */
export const channelOpenInit = buildTx<MsgChannelOpenInit>({
  msg: MsgChannelOpenInit,
});
/**
 * ChannelOpenTry defines a rpc handler method for MsgChannelOpenTry.
 * @name channelOpenTry
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenTry
 */
export const channelOpenTry = buildTx<MsgChannelOpenTry>({
  msg: MsgChannelOpenTry,
});
/**
 * ChannelOpenAck defines a rpc handler method for MsgChannelOpenAck.
 * @name channelOpenAck
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenAck
 */
export const channelOpenAck = buildTx<MsgChannelOpenAck>({
  msg: MsgChannelOpenAck,
});
/**
 * ChannelOpenConfirm defines a rpc handler method for MsgChannelOpenConfirm.
 * @name channelOpenConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelOpenConfirm
 */
export const channelOpenConfirm = buildTx<MsgChannelOpenConfirm>({
  msg: MsgChannelOpenConfirm,
});
/**
 * ChannelCloseInit defines a rpc handler method for MsgChannelCloseInit.
 * @name channelCloseInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelCloseInit
 */
export const channelCloseInit = buildTx<MsgChannelCloseInit>({
  msg: MsgChannelCloseInit,
});
/**
 * ChannelCloseConfirm defines a rpc handler method for
 * MsgChannelCloseConfirm.
 * @name channelCloseConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelCloseConfirm
 */
export const channelCloseConfirm = buildTx<MsgChannelCloseConfirm>({
  msg: MsgChannelCloseConfirm,
});
/**
 * RecvPacket defines a rpc handler method for MsgRecvPacket.
 * @name recvPacket
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.RecvPacket
 */
export const recvPacket = buildTx<MsgRecvPacket>({
  msg: MsgRecvPacket,
});
/**
 * Timeout defines a rpc handler method for MsgTimeout.
 * @name timeout
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Timeout
 */
export const timeout = buildTx<MsgTimeout>({
  msg: MsgTimeout,
});
/**
 * TimeoutOnClose defines a rpc handler method for MsgTimeoutOnClose.
 * @name timeoutOnClose
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.TimeoutOnClose
 */
export const timeoutOnClose = buildTx<MsgTimeoutOnClose>({
  msg: MsgTimeoutOnClose,
});
/**
 * Acknowledgement defines a rpc handler method for MsgAcknowledgement.
 * @name acknowledgement
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Acknowledgement
 */
export const acknowledgement = buildTx<MsgAcknowledgement>({
  msg: MsgAcknowledgement,
});
/**
 * ChannelUpgradeInit defines a rpc handler method for MsgChannelUpgradeInit.
 * @name channelUpgradeInit
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeInit
 */
export const channelUpgradeInit = buildTx<MsgChannelUpgradeInit>({
  msg: MsgChannelUpgradeInit,
});
/**
 * ChannelUpgradeTry defines a rpc handler method for MsgChannelUpgradeTry.
 * @name channelUpgradeTry
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeTry
 */
export const channelUpgradeTry = buildTx<MsgChannelUpgradeTry>({
  msg: MsgChannelUpgradeTry,
});
/**
 * ChannelUpgradeAck defines a rpc handler method for MsgChannelUpgradeAck.
 * @name channelUpgradeAck
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeAck
 */
export const channelUpgradeAck = buildTx<MsgChannelUpgradeAck>({
  msg: MsgChannelUpgradeAck,
});
/**
 * ChannelUpgradeConfirm defines a rpc handler method for MsgChannelUpgradeConfirm.
 * @name channelUpgradeConfirm
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeConfirm
 */
export const channelUpgradeConfirm = buildTx<MsgChannelUpgradeConfirm>({
  msg: MsgChannelUpgradeConfirm,
});
/**
 * ChannelUpgradeOpen defines a rpc handler method for MsgChannelUpgradeOpen.
 * @name channelUpgradeOpen
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeOpen
 */
export const channelUpgradeOpen = buildTx<MsgChannelUpgradeOpen>({
  msg: MsgChannelUpgradeOpen,
});
/**
 * ChannelUpgradeTimeout defines a rpc handler method for MsgChannelUpgradeTimeout.
 * @name channelUpgradeTimeout
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeTimeout
 */
export const channelUpgradeTimeout = buildTx<MsgChannelUpgradeTimeout>({
  msg: MsgChannelUpgradeTimeout,
});
/**
 * ChannelUpgradeCancel defines a rpc handler method for MsgChannelUpgradeCancel.
 * @name channelUpgradeCancel
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelUpgradeCancel
 */
export const channelUpgradeCancel = buildTx<MsgChannelUpgradeCancel>({
  msg: MsgChannelUpgradeCancel,
});
/**
 * UpdateChannelParams defines a rpc handler method for MsgUpdateParams.
 * @name updateChannelParams
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UpdateChannelParams
 */
export const updateChannelParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
/**
 * PruneAcknowledgements defines a rpc handler method for MsgPruneAcknowledgements.
 * @name pruneAcknowledgements
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PruneAcknowledgements
 */
export const pruneAcknowledgements = buildTx<MsgPruneAcknowledgements>({
  msg: MsgPruneAcknowledgements,
});
