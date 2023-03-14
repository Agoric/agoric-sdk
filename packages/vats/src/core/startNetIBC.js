// @ts-check
import { E, Far } from '@endo/far';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';
import {
  makeEchoConnectionHandler,
  makeLoopbackProtocolHandler,
} from '@agoric/swingset-vat/src/vats/network/network.js';

const NUM_IBC_PORTS_PER_CLIENT = 3;
const INTERCHAIN_ACCOUNT_CONTROLLER_PORT_PREFIX = 'icacontroller-';

/**
 * @param {NetVats} vats
 * @param {ERef<import('../types.js').ScopedBridgeManager>} dibcBridgeManager
 *
 * @typedef {{ network: ERef<NetworkVat>, ibc: ERef<IBCVat> }} NetVats
 */
const registerChainNetworkProtocols = async (vats, dibcBridgeManager) => {
  const ps = [];
  // Every vat has a loopback device.
  ps.push(
    E(vats.network).registerProtocolHandler(
      ['/local'],
      makeLoopbackProtocolHandler(),
    ),
  );
  const callbacks = Far('callbacks', {
    downcall(method, obj) {
      return E(dibcBridgeManager).toBridge({
        ...obj,
        type: 'IBC_METHOD',
        method,
      });
    },
  });
  ps.push(
    E(vats.ibc)
      .createInstance(callbacks)
      .then(ibcHandler =>
        E(dibcBridgeManager)
          .setHandler(ibcHandler)
          .then(() =>
            E(vats.network).registerProtocolHandler(
              ['/ibc-port', '/ibc-hop'],
              ibcHandler,
            ),
          ),
      ),
  );
  await Promise.all(ps);

  // Add an echo listener on our ibc-port network (whether real or virtual).
  const echoPort = await E(vats.network).bind('/ibc-port/echo');

  return E(echoPort).addListener(
    Far('listener', {
      async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
        return harden(makeEchoConnectionHandler());
      },
      async onListen(port, _listenHandler) {
        console.debug(`listening on echo port: ${port}`);
      },
    }),
  );
};

/**
 * @param { BootstrapPowers & { namedVat: NamedVatSpace }} powers
 */
export const setupNetworkProtocols = async ({
  consume: { client, bridgeManager: bridgeManagerP },
  namedVat,
}) => {
  const vats = namedVat.consume;
  // don't proceed if loadCriticalVat fails
  await Promise.all([vats.network, vats.ibc]);

  const bridgeManager = await bridgeManagerP;
  if (!bridgeManager) return;
  const dibcBridgeManager = E(bridgeManager).register(BRIDGE_ID.DIBC);

  // The Interchain Account (ICA) Controller must be bound to a port that starts
  // with 'icacontroller', so we provide one such port to each client.
  let lastICAPort = 0;
  const makePorts = async () => {
    // Bind to some fresh ports (either unspecified name or `icacontroller-*`)
    // on the IBC implementation and provide them for the user to have.
    const ibcportP = [];
    for (let i = 0; i < NUM_IBC_PORTS_PER_CLIENT; i += 1) {
      let bindAddr = '/ibc-port/';
      if (i === NUM_IBC_PORTS_PER_CLIENT - 1) {
        lastICAPort += 1;
        bindAddr += `${INTERCHAIN_ACCOUNT_CONTROLLER_PORT_PREFIX}-${lastICAPort}`;
      }
      const port = E(vats.network).bind(bindAddr);
      ibcportP.push(port);
    }
    return Promise.all(ibcportP);
  };

  // Note: before we add the pegasus transfer port,
  // we need to finish registering handlers for
  // ibc-port etc.
  await registerChainNetworkProtocols(vats, dibcBridgeManager);
  await E(client).assignBundle([_a => ({ ibcport: makePorts() })]);
};

/** @type {import('./lib-boot.js').BootstrapManifest} */
export const NET_MANIFEST = {
  [setupNetworkProtocols.name]: {
    consume: {
      client: true,
      bridgeManager: 'chainStorage',
      zoe: 'zoe',
    },
    namedVat: { consume: { network: 'network', ibc: 'ibc' } },
  },
};

export const getNetIBCManifest = ({ restoreRef }, { installKeys }) => {
  return {
    manifest: NET_MANIFEST,
    installations: {
      provisionPool: restoreRef(installKeys.provisionPool),
      walletFactory: restoreRef(installKeys.walletFactory),
    },
  };
};
