// @ts-check
import { E, Far } from '@endo/far';
import {
  makeLoopbackProtocolHandler,
  makeEchoConnectionHandler,
  makeNonceMaker,
} from '@agoric/swingset-vat/src/vats/network/index.js';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';

const NUM_IBC_PORTS_PER_CLIENT = 3;
const INTERCHAIN_ACCOUNT_CONTROLLER_PORT_PREFIX = 'icacontroller-';

/**
 * @param {SoloVats | NetVats} vats
 * @param {ERef<import('../types.js').ScopedBridgeManager>} [dibcBridgeManager]
 */
export const registerNetworkProtocols = async (vats, dibcBridgeManager) => {
  const ps = [];
  // Every vat has a loopback device.
  ps.push(
    E(vats.network).registerProtocolHandler(
      ['/local'],
      makeLoopbackProtocolHandler(),
    ),
  );
  if (dibcBridgeManager) {
    assert('ibc' in vats);
    // We have access to the bridge, and therefore IBC.
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
            .initHandler(ibcHandler)
            .then(() =>
              E(vats.network).registerProtocolHandler(
                ['/ibc-port', '/ibc-hop'],
                ibcHandler,
              ),
            ),
        ),
    );
  } else {
    const loHandler = makeLoopbackProtocolHandler(
      makeNonceMaker('ibc-channel/channel-'),
    );
    ps.push(E(vats.network).registerProtocolHandler(['/ibc-port'], loHandler));
  }
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
 * @param {BootstrapPowers & {
 *   consume: { loadCriticalVat: VatLoader<any> };
 *   produce: { networkVat: Producer<any> };
 * }} powers
 * @param {object} options
 * @param {{ networkRef: VatSourceRef; ibcRef: VatSourceRef }} options.options
 *   // TODO: why doesn't overloading VatLoader work???
 *
 * @typedef {((name: 'network') => NetworkVat) & ((name: 'ibc') => IBCVat)} VatLoader2
 *
 * @typedef {{
 *   network: ERef<NetworkVat>;
 *   ibc: ERef<IBCVat>;
 *   provisioning: ERef<ProvisioningVat | undefined>;
 * }} NetVats
 */
export const setupNetworkProtocols = async (
  {
    consume: {
      client,
      loadCriticalVat,
      bridgeManager: bridgeManagerP,
      provisioning,
    },
    produce: { networkVat },
  },
  options,
) => {
  const { networkRef, ibcRef } = options.options;
  /** @type {NetVats} */
  const vats = {
    network: E(loadCriticalVat)('network', networkRef),
    ibc: E(loadCriticalVat)('ibc', ibcRef),
    provisioning,
  };
  // don't proceed if loadCriticalVat fails
  await Promise.all(Object.values(vats));

  networkVat.reset();
  networkVat.resolve(vats.network);
  const bridgeManager = await bridgeManagerP;
  const dibcBridgeManager =
    bridgeManager && E(bridgeManager).register(BRIDGE_ID.DIBC);

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
        bindAddr += `${INTERCHAIN_ACCOUNT_CONTROLLER_PORT_PREFIX}${lastICAPort}`;
      }
      const port = E(vats.network).bind(bindAddr);
      ibcportP.push(port);
    }
    return Promise.all(ibcportP);
  };

  // Note: before we add the pegasus transfer port,
  // we need to finish registering handlers for
  // ibc-port etc.
  await registerNetworkProtocols(vats, dibcBridgeManager);
  return E(client).assignBundle([_a => ({ ibcport: makePorts() })]);
};

export const getManifestForNetwork = (_powers, { networkRef, ibcRef }) => ({
  manifest: {
    [setupNetworkProtocols.name]: {
      consume: {
        client: true,
        loadCriticalVat: true,
        bridgeManager: 'bridge',
        zoe: 'zoe',
        provisioning: 'provisioning',
      },
      produce: {
        networkVat: 'network',
      },
    },
  },
  options: {
    networkRef,
    ibcRef,
  },
});
