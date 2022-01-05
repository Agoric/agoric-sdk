// @ts-check
import { E, Far } from '@agoric/far';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { feeIssuerConfig } from './bootstrap-zoe-config';

/**
 * @param {{
 *   vatPowers: { D: EProxy }, // D type is approximate
 *   vats: { vattp: VattpVat },
 *   devices: { mailbox: MailboxDevice },
 * }} powers
 */
const connectVattpWithMailbox = ({
  vatPowers: { D },
  vats: { vattp },
  devices: { mailbox },
}) => {
  D(mailbox).registerInboundHandler(vattp);
  return E(vattp).registerMailboxDevice(mailbox);
};

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

/**
 * @param {{
 *   vats: { vatAdmin: VatAdminVat },
 *   devices: { vatAdmin: unknown },
 *   workspace: Record<string, ERef<any>>,
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('./vat-zoe').buildRootObject>>} ZoeVat
 */
const buildZoe = async ({ vats, devices, workspace }) => {
  // TODO: what else do we need vatAdminSvc for? can we let it go out of scope?
  const vatAdminSvc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);

  /** @type {{ root: ZoeVat }} */
  const { root } = await E(vatAdminSvc).createVatByName('zoe');
  const { zoeService: zoe, feeMintAccess: _2 } = await E(root).buildZoe(
    vatAdminSvc,
    feeIssuerConfig,
  );

  workspace.zoe = zoe;
  E(workspace.allClients).assign({ zoe });
};

/**
 * Make an object `s` where every `s.name` is a promise and setting `s.name = v` resolves it.
 *
 * @returns {PromiseSpace}
 *
 * @typedef { Record<string, Promise<unknown>> } PromiseSpace
 */
const makePromiseSpace = () => {
  /** @type {Map<string, PromiseRecord<unknown>} */
  const state = new Map();

  const findOrCreateKit = name => {
    let kit = state.get(name);
    if (kit) {
      return kit;
    } else {
      console.info('workspace: allocating', name);
      kit = makePromiseKit();
      state.set(name, kit);
      return kit;
    }
  };

  const space = new Proxy(
    {},
    {
      get: (_target, name) => {
        assert.typeof(name, 'string');
        const kit = findOrCreateKit(name);
        return kit.promise;
      },
      set: (_target, name, value) => {
        // Note: repeated resolves() are noops.
        findOrCreateKit(name).resolve(value);
        console.info('workspace: resolved', name);
        return true;
      },
    },
  );

  return space;
};

const bootstrapSteps = [connectVattpWithMailbox, installSimEgress, buildZoe];

/**
 * Build root object of the bootstrap vat.
 *
 * @param {{
 *   D: EProxy // approximately
 * }} vatPowers
 * @param {{
 *   argv: Record<string, unknown>,
 * }} vatParameters
 */
export function buildRootObject(vatPowers, vatParameters) {
  const workspace = makePromiseSpace();

  return Far('bootstrap', {
    /**
     * Bootstrap vats and devices.
     *
     * @param {SwingsetVats} vats
     * @param {SwingsetDevices} devices
     */
    bootstrap: (vats, devices) =>
      Promise.all(
        bootstrapSteps.map(step =>
          step({ vatPowers, vatParameters, vats, devices, workspace }),
        ),
      ),
  });
}
