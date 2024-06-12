/** @file ChainAccount exo */
import { NonNullish } from '@agoric/assert';
import { PurseShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { V as E } from '@agoric/vow/vat.js';
import { M } from '@endo/patterns';
import {
  ChainAddressShape,
  ConnectionHandlerI,
  Proto3Shape,
} from '../typeGuards.js';
import { findAddressField } from '../utils/address.js';
import { makeTxPacket, parseTxPacket } from '../utils/packet.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {Connection, Port} from '@agoric/network';
 * @import {Remote} from '@agoric/vow';
 * @import {AnyJson} from '@agoric/cosmic-proto';
 * @import {TxBody} from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
 * @import {LocalIbcAddress, RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 * @import {ChainAddress} from '../types.js';
 */

const { Fail } = assert;
const trace = makeTracer('ChainAccountKit');

/** @typedef {'UNPARSABLE_CHAIN_ADDRESS'} UnparsableChainAddress */
const UNPARSABLE_CHAIN_ADDRESS = 'UNPARSABLE_CHAIN_ADDRESS';

export const ChainAccountI = M.interface('ChainAccount', {
  getAddress: M.call().returns(ChainAddressShape),
  getBalance: M.callWhen(M.string()).returns(M.any()),
  getBalances: M.callWhen().returns(M.any()),
  getLocalAddress: M.call().returns(M.string()),
  getRemoteAddress: M.call().returns(M.string()),
  getPort: M.call().returns(M.remotable('Port')),
  executeTx: M.call(M.arrayOf(M.record())).returns(M.promise()),
  executeEncodedTx: M.call(M.arrayOf(Proto3Shape))
    .optional(M.record())
    .returns(M.promise()),
  close: M.callWhen().returns(M.undefined()),
  getPurse: M.callWhen().returns(PurseShape),
});

/**
 * @typedef {{
 *   chainId: string;
 *   port: Port;
 *   connection: Remote<Connection> | undefined;
 *   localAddress: LocalIbcAddress | undefined;
 *   requestedRemoteAddress: string;
 *   remoteAddress: RemoteIbcAddress | undefined;
 *   chainAddress: ChainAddress | undefined;
 * }} State
 */

/** @param {Zone} zone */
export const prepareChainAccountKit = zone =>
  zone.exoClassKit(
    'ChainAccountKit',
    { account: ChainAccountI, connectionHandler: ConnectionHandlerI },
    /**
     * @param {string} chainId
     * @param {Port} port
     * @param {string} requestedRemoteAddress
     */
    (chainId, port, requestedRemoteAddress) =>
      /** @type {State} */ ({
        chainId,
        port,
        connection: undefined,
        requestedRemoteAddress,
        remoteAddress: undefined,
        chainAddress: undefined,
        localAddress: undefined,
      }),
    {
      account: {
        /** @returns {ChainAddress} */
        getAddress() {
          return NonNullish(
            this.state.chainAddress,
            'ICA channel creation acknowledgement not yet received.',
          );
        },
        getBalance(_denom) {
          // UNTIL https://github.com/Agoric/agoric-sdk/issues/9326
          throw new Error('not yet implemented');
        },
        getBalances() {
          // UNTIL https://github.com/Agoric/agoric-sdk/issues/9326
          throw new Error('not yet implemented');
        },
        getLocalAddress() {
          return NonNullish(
            this.state.localAddress,
            'local address not available',
          );
        },
        getRemoteAddress() {
          return NonNullish(
            this.state.remoteAddress,
            'remote address not available',
          );
        },
        getPort() {
          return this.state.port;
        },
        executeTx() {
          throw new Error('not yet implemented');
        },
        /**
         * Submit a transaction on behalf of the remote account for execution on
         * the remote chain.
         *
         * @param {AnyJson[]} msgs
         * @param {Omit<TxBody, 'messages'>} [opts]
         * @returns {Promise<string>} - base64 encoded bytes string. Can be
         *   decoded using the corresponding `Msg*Response` object.
         * @throws {Error} if packet fails to send or an error is returned
         */
        executeEncodedTx(msgs, opts) {
          const { connection } = this.state;
          if (!connection) throw Fail`connection not available`;
          return E.when(
            E(connection).send(makeTxPacket(msgs, opts)),
            // if parseTxPacket cannot find a `result` key, it throws
            ack => parseTxPacket(ack),
          );
        },
        /** Close the remote account */
        async close() {
          /// XXX what should the behavior be here? and `onClose`?
          // - retrieve assets?
          // - revoke the port?
          const { connection } = this.state;
          if (!connection) throw Fail`connection not available`;
          await E(connection).close();
        },
        /**
         * get Purse for a brand to .withdraw() a Payment from the account
         *
         * @param {Brand} brand
         */
        async getPurse(brand) {
          console.log('getPurse got', brand);
          throw new Error('not yet implemented');
        },
      },
      connectionHandler: {
        /**
         * @param {Remote<Connection>} connection
         * @param {LocalIbcAddress} localAddr
         * @param {RemoteIbcAddress} remoteAddr
         */
        async onOpen(connection, localAddr, remoteAddr) {
          trace(`ICA Channel Opened for ${localAddr} at ${remoteAddr}`);
          this.state.connection = connection;
          this.state.remoteAddress = remoteAddr;
          this.state.localAddress = localAddr;
          this.state.chainAddress = harden({
            address: findAddressField(remoteAddr) || UNPARSABLE_CHAIN_ADDRESS,
            chainId: this.state.chainId,
            addressEncoding: 'bech32',
          });
        },
        async onClose(_connection, reason) {
          trace(`ICA Channel closed. Reason: ${reason}`);
          // XXX handle connection closing
          // XXX is there a scenario where a connection will unexpectedly close? _I think yes_
        },
        async onReceive(connection, bytes) {
          trace(`ICA Channel onReceive`, connection, bytes);
          return '';
        },
      },
    },
  );

/** @typedef {ReturnType<ReturnType<typeof prepareChainAccountKit>>} ChainAccountKit */
