import { Nat } from '@agoric/nat';
import { Far } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';

/**
 * @typedef {Object} ICS20TransferPacket
 * @property {string} amount The extent of the amount
 * @property {Denom} denom The denomination of the amount
 * @property {string} [sender] The sender address
 * @property {DepositAddress} receiver The receiver deposit address
 */

/**
 * Convert an inbound packet to a local amount.
 *
 * @param {Bytes} packet
 * @returns {Promise<PacketParts>}
 */
export const parseICS20TransferPacket = async packet => {
  /** @type {ICS20TransferPacket} */
  const ics20Packet = JSON.parse(packet);
  const { amount, denom, receiver } = ics20Packet;

  assert.typeof(denom, 'string', X`Denom ${denom} must be a string`);
  assert.typeof(receiver, 'string', X`Receiver ${receiver} must be a string`);

  // amount is a string in JSON.
  assert.typeof(amount, 'string', X`Amount ${amount} must be a string`);
  const bigValue = BigInt(amount);

  // If we overflow, or don't have a non-negative integer, throw an exception!
  const value = Nat(bigValue);

  return harden({
    depositAddress: receiver,
    remoteDenom: denom,
    value,
  });
};

/**
 * Convert the amount to a packet to send.
 *
 * @param {PacketParts} param0
 * @returns {Promise<Bytes>}
 */
export const makeICS20TransferPacket = async ({
  value,
  remoteDenom,
  depositAddress,
}) => {
  // We're using Nat as a dynamic check in a way that tsc doesn't grok.
  // Should Nat's parameter type be `unknown`?
  // @ts-ignore
  const stringValue = String(Nat(value));

  // Generate the ics20-1 packet.
  /** @type {ICS20TransferPacket} */
  const ics20 = {
    amount: stringValue,
    denom: remoteDenom,
    receiver: depositAddress,
  };

  return JSON.stringify(ics20);
};

/**
 * Check the results of the transfer.
 *
 * @param {Bytes} ack
 * @returns {Promise<void>}
 */
export const assertICS20TransferPacketAck = async ack => {
  const { success, error } = JSON.parse(ack);
  assert(success, X`ICS20 transfer error ${error}`);
};

/**
 * Create results of the transfer.
 *
 * @param {boolean} success
 * @param {any} error
 * @returns {Promise<Bytes>}
 */
export const makeICS20TransferPacketAck = async (success, error) => {
  if (success) {
    const ack = { success: true };
    return JSON.stringify(ack);
  }
  const nack = { success: false, error: `${error}` };
  return JSON.stringify(nack);
};

/** @type {TransferProtocol} */
export const ICS20TransferProtocol = Far('ics20-1 transfer protocol', {
  makeTransferPacket: makeICS20TransferPacket,
  assertTransferPacketAck: assertICS20TransferPacketAck,
  parseTransferPacket: parseICS20TransferPacket,
  makeTransferPacketAck: makeICS20TransferPacketAck,
});
