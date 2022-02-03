/// <reference types="ses"/>

/**
 * @typedef {string} DenomUri
 * @typedef {string} Denom
 * @typedef {string} DepositAddress
 * @typedef {string} TransferProtocol
 *
 * @typedef {Object} Peg
 * @property {() => string} getAllegedName get the debug name
 * @property {() => Brand} getLocalBrand get the brand associated with the peg
 * @property {() => DenomUri} getDenomUri get the denomination identifier
 */

/**
 * @typedef {Object} BoardDepositFacet a registry for depositAddresses
 * @property {(id: string) => any} getValue return the corresponding DepositFacet
 */

/**
 * @typedef {Object} FungibleTransferPacket
 * @property {string} amount The extent of the amount
 * @property {Denom} denom The denomination of the amount
 * @property {string} [sender] The sender address
 * @property {DepositAddress} receiver The receiver deposit address
 */

/**
 * @typedef {(zcfSeat: ZCFSeat, depositAddress: DepositAddress) => Promise<void>} Sender
 * Successive transfers are not guaranteed to be processed in the order in which they were sent.
 * @typedef {(packet: FungibleTransferPacket) => Promise<void>} Receiver
 * @typedef {Object} Courier
 * @property {Sender} send
 * @property {Receiver} receive
 */
