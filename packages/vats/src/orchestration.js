// @ts-check
/** @file Orchestration service */
import { makeTracer } from '@agoric/internal';
import { V as E } from '@agoric/vat-data/vow.js';
import { M, matches } from '@endo/patterns';
import { AmountShape, BrandShape } from '@agoric/ertp';
import '@agoric/network/exported.js';

const { Fail, bare } = assert;
const trace = makeTracer('Orchestration');

/** @typedef {string} ChainAddress */

/**
 * @typedef {object} OrchestrationPowers
 * @property {ERef<
 *   import('@agoric/orchestration/src/types').AttenuatedNetwork
 * >} network
 */

/**
 * @typedef {MapStore<
 *   keyof OrchestrationPowers,
 *   OrchestrationPowers[keyof OrchestrationPowers]
 * >} PowerStore
 */

/**
 * @template {keyof OrchestrationPowers} K
 * @param {PowerStore} powers
 * @param {K} name
 */
const getPower = (powers, name) => {
  powers.has(name) || Fail`need powers.${bare(name)} for this method`;
  return /** @type {OrchestrationPowers[K]} */ (powers.get(name));
};

export const ChainAccountI = M.interface('ChainAccount', {
  getAddress: M.call().returns(M.string()),
  getLocalAddress: M.callWhen().returns(M.string()),
  executeTx: M.callWhen(M.arrayOf(M.record())).returns(M.any()),
  executeEncodedTx: M.callWhen(M.string()).returns(M.any()),
  deposit: M.callWhen(M.remotable('Payment'))
    .optional(M.pattern())
    .returns(AmountShape),
  getPurse: M.callWhen(BrandShape).returns(M.remotable('VirtualPurse')),
  close: M.callWhen().returns(M.promise()),
});

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareChainAccount = zone =>
  zone.exoClass(
    'ChainAccount',
    ChainAccountI,
    /**
     * @param {Connection} connection
     * @param {Port} port
     * @param {ChainAddress} remoteAddress
     */
    (connection, port, remoteAddress) => ({
      connection,
      port,
      remoteAddress,
    }),
    {
      getAddress() {
        return this.state.remoteAddress;
      },
      getLocalAddress() {
        return E(this.state.connection).getLocalAddress();
      },
      /** @param {Bytes} packetBytes */
      async executeEncodedTx(packetBytes) {
        return E(this.state.connection).send(packetBytes);
      },
      /** @param {import('@agoric/vats/src/localchain').Proto3Jsonable[]} _msgs */
      async executeTx(_msgs) {
        // XXX encode to protobuf, and call this.executeEncodedTx(...)
        Fail`executeTx not implemented yet`;
      },
      async deposit(_payment) {
        // XXX deposit an ERTP payment to the remote account
        Fail`deposit not implemented yet`;
      },
      async getPurse(_brand) {
        Fail`getPurse not implemented yet`;
      },
      async close() {
        // XXX retrieve all assets first?
        // XXX do we also revoke the port?
        return E(this.state.connection).close();
      },
    },
  );

/** @param {import('@agoric/zone').Zone} zone */
const prepareConnectionHandler = zone =>
  zone.exoClass(
    'ConnectionHandler',
    undefined, // XXX interface guard
    /**
     * @param {(
     *   connection: Connection,
     *   localAddr: string,
     *   remoteAddr: string,
     * ) => void} [onOpen]
     *   optional cb handler for connection creation
     * @param {(connection: Connection, reason: unknown) => void} [onClose]
     *   optional cb handler for connection closing
     * @param {(
     *   connection: Connection,
     *   bytes: Uint8Array,
     * ) => PromiseVow<string>} [onReceive]
     *   optional cb handler for connection recieving packet
     */
    (onOpen, onClose, onReceive) => ({ onOpen, onClose, onReceive }),
    {
      async onOpen(connection, localAddr, remoteAddr) {
        trace(`ICA Channel Opened for ${localAddr} at ${remoteAddr}`);
        const { onOpen } = this.state;
        if (onOpen && typeof onOpen === 'function') {
          void onOpen(connection, localAddr, remoteAddr);
        }
      },
      async onClose(connection, reason) {
        trace(`ICA Channel closed. Reason: ${reason}`);
        const { onClose } = this.state;
        if (onClose && typeof onClose === 'function') {
          void onClose(connection, reason);
        }
      },
      async onReceive(connection, bytes) {
        const { onReceive } = this.state;
        if (onReceive && typeof onReceive === 'function') {
          void onReceive(connection, bytes);
        }
        return '';
      },
    },
  );

export const OrchestrationI = M.interface('Orchestration', {
  provideAccount: M.callWhen(M.string(), M.string())
    .optional(M.remotable('Port'))
    .returns(M.remotable('ChainAccount')),
  getChain: M.callWhen(M.string()).returns(M.remotable('Chain')),
});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareChainAccount>} createChainAccount
 * @param {ReturnType<typeof prepareConnectionHandler>} makeConnectionHandler
 */
const prepareOrchestration = (
  zone,
  createChainAccount,
  makeConnectionHandler,
) =>
  zone.exoClassKit(
    'Orchestration',
    {
      admin: M.interface('OrchestrationAdmin', {
        foo: M.call().returns(M.string()),
      }),
      public: OrchestrationI,
    },
    /** @param {Partial<OrchestrationPowers>} [initialPowers] */
    initialPowers => {
      /** @type {PowerStore} */
      const powers = zone.detached().mapStore('PowerStore');
      if (initialPowers) {
        for (const [name, power] of Object.entries(initialPowers)) {
          powers.init(/** @type {keyof OrchestrationPowers} */ (name), power);
        }
      }
      return { powers, icaControllerNonce: 0 };
    },
    {
      admin: {
        foo() {
          return 'bar';
        },
      },
      public: {
        /**
         * @param {string} hostConnectionId the counterparty connection_id
         * @param {string} controllerConnectionId self connection_id
         * @param {Port} [currentPort] if a port is provided, it will be reused
         *   to create the account
         */
        async provideAccount(
          hostConnectionId,
          controllerConnectionId,
          currentPort,
        ) {
          await null;
          const connectionHandler = makeConnectionHandler();
          let port;
          if (!matches(currentPort, M.remotable('Port'))) {
            if (currentPort) trace('Invalid Port provided, binding a new one.');
            const network = getPower(this.state.powers, 'network');

            port = await E(network)
              .bind(`/ibc-port/icacontroller-${this.state.icaControllerNonce}`)
              .catch(e => Fail`Failed to bind port: ${bare(e)}`);

            this.state.icaControllerNonce += 1;
          } else {
            port = currentPort;
          }
          const connString = JSON.stringify({
            version: 'ics27-1',
            controllerConnectionId, // self_connection_id
            hostConnectionId, // counterparty_connection_id
            address: '', // will be filled in by the counterparty
            encoding: 'proto3',
            txType: 'sdk_multi_msg',
          });
          const remoteConnAddr = `/ibc-hop/${controllerConnectionId}/ibc-port/icahost/ordered/${connString}`;
          // @ts-expect-error ts doesn't like Fail?
          const connection = await E(port)
            .connect(remoteConnAddr, connectionHandler)
            .catch(e => Fail`Failed to create ICA connection: ${bare(e)}`);
          const remoteChainAddress = await E(connection)
            .getRemoteAddress()
            .catch(e => Fail`Failed to get remoteAddress: ${bare(e)}`);
          // @ts-expect-error ts doesn't like Fail?
          return createChainAccount(connection, port, remoteChainAddress);
        },
        /** @param {string} _chainName e.g. cosmos */
        getChain(_chainName) {
          Fail`getChain not implemented yet`;
        },
      },
    },
  );

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareOrchestrationTools = zone => {
  const createChainAccount = prepareChainAccount(zone);
  const makeConnectionHandler = prepareConnectionHandler(zone);
  const makeOrchestration = prepareOrchestration(
    zone,
    createChainAccount,
    makeConnectionHandler,
  );

  return harden({ makeOrchestration });
};
harden(prepareOrchestrationTools);

/** @typedef {ReturnType<typeof prepareOrchestrationTools>} OrchestrationTools */
/** @typedef {ReturnType<OrchestrationTools['makeOrchestration']>} OrchestrationKit */
/** @typedef {OrchestrationKit['admin']} OrchestrationAdmin */
/** @typedef {OrchestrationKit['public']} Orchestration */
