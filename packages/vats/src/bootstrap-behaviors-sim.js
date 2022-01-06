// @ts-check
import { E, Far } from '@agoric/far';
import { makeNotifierKit } from '@agoric/notifier';
import { bootstrapManifest } from './bootstrap-behaviors.js';

export const simBootstrapManifest = harden({
  behaviors: { installSimEgress: true, ...bootstrapManifest.behaviors },
  endowments: {
    installSimEgress: {
      vatParameters: { argv: { hardcodedClientAddresses: true } },
      vats: {
        vattp: true,
        comms: true,
      },
      workspace: true,
    },
    ...bootstrapManifest.endowments,
  },
});

/**
 * @param {{
 *   vatParameters: { argv: Record<string, unknown> },
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   workspace: Record<string, ERef<unknown>>,
 * }} powers
 *
 * @typedef {{ getChainBundle: () => unknown }} ChainBundler
 */
const installSimEgress = async ({ vatParameters, vats, workspace }) => {
  const PROVISIONER_INDEX = 1;

  const { argv } = vatParameters;
  const addRemote = async addr => {
    const { transmitter, setReceiver } = await E(vats.vattp).addRemote(addr);
    await E(vats.comms).addRemote(addr, transmitter, setReceiver);
  };

  // TODO: chainProvider per address
  let bundle = harden({
    echoer: Far('echoObj', { echo: message => message }),
    // TODO: echo: Far('echoFn', message => message),
  });
  const { notifier, updater } = makeNotifierKit(bundle);

  const chainProvider = Far('chainProvider', {
    getChainBundle: () => notifier.getUpdateSince().then(({ value }) => value),
    getChainBundleNotifier: () => notifier,
  });

  await Promise.all(
    /** @type { string[] } */ (argv.hardcodedClientAddresses).map(
      async addr => {
        await addRemote(addr);
        await E(vats.comms).addEgress(addr, PROVISIONER_INDEX, chainProvider);
      },
    ),
  );

  workspace.allClients = harden({
    assign: newProperties => {
      bundle = { ...bundle, ...newProperties };
      updater.updateState(bundle);
    },
  });
};

harden({ installSimEgress });
export { installSimEgress };
export * from './bootstrap-behaviors.js';
