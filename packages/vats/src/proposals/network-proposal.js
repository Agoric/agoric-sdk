/**
 * @file CoreEval module to set up network, IBC vats.
 * @see {setupNetworkProtocols}
 */
import { E } from '@endo/far';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';

// Heap-based vow resolution is used for this module because the
// bootstrap vat can't yet be upgraded.
import { when } from '@agoric/vat-data/vow.js';

import { makeScalarMapStore } from '@agoric/store';

const NUM_IBC_PORTS_PER_CLIENT = 3;
const INTERCHAIN_ACCOUNT_CONTROLLER_PORT_PREFIX = 'icacontroller-';

/**
 * @param {SoloVats | NetVats} vats
 * @param {ERef<import('../types.js').ScopedBridgeManager>} [dibcBridgeManager]
 */
export const registerNetworkProtocols = async (vats, dibcBridgeManager) => {
  /** @type {Promise<void>[]} */
  const ps = [];

  const loopbackHandler = /** @type {Remote<ProtocolHandler>} */ (
    await E(vats.network).makeLoopbackProtocolHandler()
  );
  // Every vat has a loopback device.
  ps.push(E(vats.network).registerProtocolHandler(['/local'], loopbackHandler));

  if (dibcBridgeManager) {
    assert('ibc' in vats);
    // We have access to the bridge, and therefore IBC.
    const settledBridgeManager = await dibcBridgeManager;
    const callbacks = await E(vats.ibc).makeCallbacks(settledBridgeManager);
    ps.push(
      E(vats.ibc)
        .createHandlers(callbacks)
        .then(({ protocolHandler, bridgeHandler }) =>
          E(dibcBridgeManager)
            .initHandler(bridgeHandler)
            .then(() =>
              E(vats.network).registerProtocolHandler(
                ['/ibc-port', '/ibc-hop'],
                protocolHandler,
              ),
            ),
        ),
    );
  } else {
    const loHandler = /** @type {Remote<ProtocolHandler>} */ (
      await E(vats.network).makeLoopbackProtocolHandler('ibc-channel/channel-')
    );
    ps.push(E(vats.network).registerProtocolHandler(['/ibc-port'], loHandler));
  }
  await Promise.all(ps);
};

/**
 * Create the network and IBC vats; produce `networkVat` in the core / bootstrap
 * space.
 *
 * The `networkVat` is CLOSELY HELD in the core space, where later, we claim
 * ports using `E(networkVat).bind(_path_)`. As discussed in `ProtocolHandler`
 * docs, _path_ is:
 *
 * - /ibc-port/NAME for an IBC port with a known name or,
 * - /ibc-port/ for an IBC port with a fresh name.
 *
 * Contracts are expected to use the services of the network and IBC vats by way
 * of such ports.
 *
 * Testing facilities include:
 *
 * - loopback ports: `E(networkVat).bind('/local/')`
 * - an echo port: `E(vats.network).bind('/ibc-port/echo')`
 *
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
      vatUpgradeInfo: vatUpgradeInfoP,
    },
    produce: { networkVat, vatUpgradeInfo: produceVatUpgradeInfo },
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

  produceVatUpgradeInfo.resolve(makeScalarMapStore('vatUpgradeInfo'));
  const info = await vatUpgradeInfoP;
  info.init('ibc', ibcRef);
  info.init('network', networkRef);

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
      const port = when(E(vats.network).bind(bindAddr));
      ibcportP.push(port);
    }
    return Promise.all(ibcportP);
  };

  // Note: before we add the pegasus transfer port,
  // we need to finish registering handlers for
  // ibc-port etc.
  await registerNetworkProtocols(vats, dibcBridgeManager);

  // Add an echo listener on our ibc-port network (whether real or virtual).
  const echoPort = await when(E(vats.network).bind('/ibc-port/echo'));
  const { listener } = await E(vats.network).makeEchoConnectionKit();
  await when(E(echoPort).addListener(listener));
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
        vatUpgradeInfo: true,
      },
      produce: {
        networkVat: 'network',
        vatUpgradeInfo: true,
      },
      zone: true,
    },
  },
  options: {
    networkRef,
    ibcRef,
  },
});
