// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {string} Denom
 * @typedef {string} DepositAddress
 */

/**
 * @typedef {object} PacketParts
 * @property {AmountValue} value
 * @property {Denom} remoteDenom
 * @property {DepositAddress} depositAddress
 * @property {string} memo
 * @property {string} sender
 */

/**
 * @typedef {object} TransferProtocol
 * @property {(parts: PacketParts) => Promise<Bytes>} makeTransferPacket
 * @property {(packet: Bytes) => Promise<PacketParts>} parseTransferPacket
 * @property {(success: boolean, error?: any) => Promise<Bytes>} makeTransferPacketAck
 * @property {(ack: Bytes) => Promise<void>} assertTransferPacketAck
 */

/**
 * @typedef {object} DenomTransformer
 * @property {(remoteDenom: Denom, localAddr: string, remoteAddr: string)
 *   => Promise<{ sendDenom: Denom, receiveDenom: Denom }>
 * } getDenomsForLocalPeg
 * @property {(remoteDenom: Denom, localAddr: string, remoteAddr: string)
 *   => Promise<{ sendDenom: Denom, receiveDenom: Denom }>
 * } getDenomsForRemotePeg
 */

/**
 * @typedef {object} Peg
 * @property {() => string} getAllegedName get the debug name
 * @property {() => Brand} getLocalBrand get the brand associated with the peg
 * @property {() => Denom} getReceiveDenom get the remote denomination identifier we receive
 * @property {() => Denom} getSendDenom get the remote denomination identifier we send
 */

/**
 * @typedef {object} BoardDepositFacet a registry for depositAddresses
 * @property {(id: string) => any} getValue return the corresponding DepositFacet
 */

/**
 * @typedef {(zcfSeat: ZCFSeat, depositAddress: DepositAddress, memo: string, sender: string) => Promise<void>} Sender
 * Successive transfers are not guaranteed to be processed in the order in which they were sent.
 * @typedef {(parts: PacketParts) => Promise<Bytes | void>} Receiver
 * @typedef {object} Courier
 * @property {Sender} send
 * @property {Receiver} receive
 */

/**
 * @callback RejectTransfersWaitingForPegRemote
 * Abort any in-progress receiveDenom transfers if there has not yet been a
 * pegRemote or pegLocal corresponding to it.
 *
 * This races against any attempts to obtain metadata and establish a given
 * peg.
 *
 * It's alright to expose to the holder of the connection.
 *
 * @param {Denom} receiveDenom
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
 * @typedef {object} PegasusConnectionActions
 * @property {PegLocal} pegLocal
 * @property {PegRemote} pegRemote
 * @property {RejectTransfersWaitingForPegRemote} rejectTransfersWaitingForPegRemote
 * @property {(reason?: any) => void} abort
 */

/**
 * @typedef {object} PegasusConnection
 * @property {PegasusConnectionActions} [actions]
 * @property {string} localAddr
 * @property {string} remoteAddr
 * @property {Subscription<Denom>} [remoteDenomSubscription]
 */

/**
 * @typedef {object} PegasusConnectionKit
 * @property {ConnectionHandler} handler
 * @property {Subscription<PegasusConnection>} subscription
 */

/**
 * @typedef {Object} ForwardTransfer
 * @property {string} receiver - The bech32 address of the receiver.
 * @property {string} port - The port to be used for the transfer.
 * @property {string} channel - The channel identifier.
 * @property {string} [timeout] - The timeout for the action, e.g., "10m" for 10 minutes. Optional.
 * @property {number} [retries] - The number of retries in case of failure. Optional.
 * @property {string|Forward} [next] - The next forward action, either as a JSON string or a nested object. Optional.
 */

/**
 * @typedef {Object} ForwardCall
 * @property {string} address the agoric address of the namesByAddress
 * @property {string} contractKey the key of the instance saved in namesByAddress
 * @property {string} functionName the function name of the method to call in the public facet
 * @property {string} args json encoded string of the args to pass into the method to call from the public facet
 */

/**
 * 
 * The forward object. Supports IBC Transfer forward (Transfer key) & Contract Call forward (Call key).
 * 
 * @typedef {Object} Forward
 * @property {ForwardTransfer} [transfer] - The forward IBC transfer action.
 * @property {ForwardCall} [call] - The forward Call action.
 */
