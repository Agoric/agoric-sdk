// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {string} Denom
 * @typedef {string} DepositAddress
 */

/**
 * @typedef {Object} PacketParts
 * @property {Value} value
 * @property {Denom} remoteDenom
 * @property {DepositAddress} depositAddress
 */

/**
 * @typedef {Object} TransferProtocol
 * @property {(parts: PacketParts) => Promise<Bytes>} makeTransferPacket
 * @property {(packet: Bytes) => Promise<PacketParts>} parseTransferPacket
 * @property {(success: boolean, error?: any) => Promise<Bytes>} makeTransferPacketAck
 * @property {(ack: Bytes) => Promise<void>} assertTransferPacketAck
 */

/**
 * @typedef {Object} Peg
 * @property {() => string} getAllegedName get the debug name
 * @property {() => Brand} getLocalBrand get the brand associated with the peg
 * @property {() => Denom} getRemoteDenom get the denomination identifier
 */

/**
 * @typedef {Object} BoardDepositFacet a registry for depositAddresses
 * @property {(id: string) => any} getValue return the corresponding DepositFacet
 */

/**
 * @typedef {(zcfSeat: ZCFSeat, depositAddress: DepositAddress) => Promise<void>} Sender
 * Successive transfers are not guaranteed to be processed in the order in which they were sent.
 * @typedef {(parts: PacketParts) => Promise<Bytes>} Receiver
 * @typedef {Object} Courier
 * @property {Sender} send
 * @property {Receiver} receive
 */

/**
 * @callback RejectStuckTransfers
 * Abort any in-progress remoteDenom transfers if there has not yet been a
 * pegRemote or pegLocal for it.
 *
 * This races against any attempts to obtain metadata and establish a given
 * peg.
 *
 * It's alright to expose to the holder of the connection.
 *
 * @param {Denom} remoteDenom
 * @returns {Promise<void>}
 */

/**
 * @callback PegRemote
 * Peg a remote asset over a network connection.
 *
 * @param {string} allegedName
 * @param {Denom} remoteDenom
 * @param {AssetKind} [assetKind] The kind of the pegged values
 * @param {DisplayInfo} [displayInfo]
 * @returns {Promise<Peg>}
 */

/**
 * @callback PegLocal
 * Peg a local asset over a network connection.
 *
 * @param {string} allegedName
 * @param {Issuer} localIssuer Local ERTP issuer whose assets should be
 * pegged to the connection
 * @returns {Promise<Peg>}
 */

/**
 * @typedef {Object} PegasusConnectionActions
 * @property {PegLocal} pegLocal
 * @property {PegRemote} pegRemote
 * @property {RejectStuckTransfers} rejectStuckTransfers
 * @property {(reason?: any) => void} abort
 */

/**
 * @typedef {Object} PegasusConnection
 * @property {PegasusConnectionActions} [actions]
 * @property {Address} localAddr
 * @property {Address} remoteAddr
 * @property {Subscription<Denom>} [remoteDenomSubscription]
 */

/**
 * @typedef {Object} PegasusConnectionKit
 * @property {ConnectionHandler} handler
 * @property {Subscription<PegasusConnection>} subscription
 */
