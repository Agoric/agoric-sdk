// @ts-check
/** @file Orchestration service */
import { NonNullish } from '@agoric/assert';
import { makeTracer } from '@agoric/internal';

// XXX ambient types runtime imports until https://github.com/Agoric/agoric-sdk/issues/6512
import '@agoric/network/exported.js';

import { V as E } from '@agoric/vat-data/vow.js';
import { M } from '@endo/patterns';
import { PaymentShape, PurseShape } from '@agoric/ertp';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { parseAddress } from '../utils/address.js';
import { makeTxPacket, parsePacketAck } from '../utils/tx.js';

/**
 * @import { Connection, Port } from '@agoric/network';
 * @import { Remote } from '@agoric/vow';
 * @import { Zone } from '@agoric/base-zone';
 * @import { AnyJson } from '@agoric/cosmic-proto';
 * @import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
 * @import { LocalIbcAddress, RemoteIbcAddress } from '@agoric/vats/tools/ibc-utils.js';
 * @import { ChainAddress } from '../types.js';
 */

const { Fail } = assert;
const trace = makeTracer('ChainAccount');

export const Proto3Shape = {
  typeUrl: M.string(),
  value: M.string(),
};

export const ChainAddressShape = {
  address: M.string(),
  chainId: M.string(),
  addressEncoding: M.string(),
};

/** @typedef {'UNPARSABLE_CHAIN_ADDRESS'}  UnparsableChainAddress */
const UNPARSABLE_CHAIN_ADDRESS = 'UNPARSABLE_CHAIN_ADDRESS';

export const ChainAccountI = M.interface('ChainAccount', {
  getAddress: M.call().returns(ChainAddressShape),
  getLocalAddress: M.call().returns(M.string()),
  getRemoteAddress: M.call().returns(M.string()),
  getPort: M.call().returns(M.remotable('Port')),
  executeTx: M.call(M.arrayOf(M.record())).returns(M.promise()),
  executeEncodedTx: M.call(M.arrayOf(Proto3Shape))
    .optional(M.record())
    .returns(M.promise()),
  close: M.callWhen().returns(M.undefined()),
  deposit: M.callWhen(PaymentShape).returns(M.undefined()),
  getPurse: M.callWhen().returns(PurseShape),
  prepareTransfer: M.callWhen().returns(InvitationShape),
});

export const ConnectionHandlerI = M.interface('ConnectionHandler', {
  onOpen: M.callWhen(M.any(), M.string(), M.string(), M.any()).returns(M.any()),
  onClose: M.callWhen(M.any(), M.any(), M.any()).returns(M.any()),
  onReceive: M.callWhen(M.any(), M.string()).returns(M.any()),
});

/** @param {Zone} zone */
export const prepareChainAccountKit = zone =>
  zone.exoClassKit(
    'ChainAccount',
    { account: ChainAccountI, connectionHandler: ConnectionHandlerI },
    /**
     * @param {Port} port
     * @param {string} requestedRemoteAddress
     */
    (port, requestedRemoteAddress) =>
      /**
       * @type {{
       *   port: Port;
       *   connection: Remote<Connection> | undefined;
       *   localAddress: LocalIbcAddress | undefined;
       *   requestedRemoteAddress: string;
       *   remoteAddress: RemoteIbcAddress | undefined;
       *   chainAddress: ChainAddress | undefined;
       * }}
       */ (
        harden({
          port,
          connection: undefined,
          requestedRemoteAddress,
          remoteAddress: undefined,
          chainAddress: undefined,
          localAddress: undefined,
        })
      ),
    {
      account: {
        /**
         * @returns {ChainAddress}
         */
        getAddress() {
          return NonNullish(
            this.state.chainAddress,
            'ICA channel creation acknowledgement not yet received.',
          );
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
         * Submit a transaction on behalf of the remote account for execution on the remote chain.
         * @param {AnyJson[]} msgs
         * @param {Omit<TxBody, 'messages'>} [opts]
         * @returns {Promise<string>} - base64 encoded bytes string. Can be decoded using the corresponding `Msg*Response` object.
         * @throws {Error} if packet fails to send or an error is returned
         */
        executeEncodedTx(msgs, opts) {
          const { connection } = this.state;
          if (!connection) throw Fail`connection not available`;
          return E.when(
            E(connection).send(makeTxPacket(msgs, opts)),
            // if parsePacketAck cannot find a `result` key, it throws
            ack => parsePacketAck(ack),
          );
        },
        /**
         * Close the remote account
         */
        async close() {
          /// XXX what should the behavior be here? and `onClose`?
          // - retrieve assets?
          // - revoke the port?
          const { connection } = this.state;
          if (!connection) throw Fail`connection not available`;
          await E(connection).close();
        },
        async deposit(payment) {
          console.log('deposit got', payment);
          throw new Error('not yet implemented');
        },
        /**
         * get Purse for a brand to .withdraw() a Payment from the account
         * @param {Brand} brand
         */
        async getPurse(brand) {
          console.log('getPurse got', brand);
          throw new Error('not yet implemented');
        },

        /* transfer account to new holder */
        async prepareTransfer() {
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
          // XXX parseAddress currently throws, should it return '' instead?
          this.state.chainAddress = harden({
            address: parseAddress(remoteAddr) || UNPARSABLE_CHAIN_ADDRESS,
            // TODO get this from `Chain` object #9063
            // XXX how do we get a chainId for an unknown chain? seems it may need to be a user supplied arg
            chainId: 'FIXME',
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
