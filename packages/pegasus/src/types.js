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
