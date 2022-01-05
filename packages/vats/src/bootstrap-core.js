// @ts-check
import { E, Far } from '@agoric/far';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { feeIssuerConfig } from './bootstrap-zoe-config';

/**
 * @typedef { import('@agoric/eventual-send').EProxy } EProxy
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/mailbox-src.js').buildRootDeviceNode>> } MailboxDevice
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/vat-tp.js').buildRootObject>> } VattpVat
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/kernel/vatAdmin/vatAdminWrapper.js').buildRootObject>> } VatAdminVat
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/vat-timerWrapper.js').buildRootObject>> } TimerVat
 */

/**
 * @typedef {ERef<ReturnType<import('./vat-zoe').buildRootObject>>} ZoeVat
 */

/**
 * @param {{
 *   vatPowers: {
 *     D: EProxy // approximately
 *   },
 *   vats: {
 *     vattp: VattpVat,
 *   },
 *   devices: {
 *     mailbox: MailboxDevice,
 *   },
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

const PROVISIONER_INDEX = 1;

/**
 * @param {{
 *   vatParameters: {
 *     argv: Record<string, unknown>,
 *   },
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   workspace: Record<string, ERef<unknown>>,
 * }} powers
 *
 * @typedef {{ getChainBundle: () => unknown }} ChainBundler
 *
 * See deliverToController in packages/SwingSet/src/vats/comms/controller.js
 * @typedef {ERef<{
 *   addRemote: (name: string, tx: unknown, rx: unknown) => void,
 *   addEgress: (addr: string, ix: number, provider: unknown) => ERef<ChainBundler>,
 * }>} CommsVatRoot
 */
const installSimEgress = async ({ vatParameters, vats, workspace }) => {
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

  workspace.allClients = {
    assign: newProperties => {
      bundle = { ...bundle, ...newProperties };
      updater.updateState(bundle);
    },
  };
};

/**
 * @param {{
 *   vats: {
 *     vatAdmin: VatAdminVat,
 *   },
 *   devices: {
 *     vatAdmin: unknown,
 *   },
 *   workspace: Record<string, ERef<any>>,
 * }} powers
 */
const buildZoe = async ({ vats, devices, workspace }) => {
  // TODO: what else do we need vatAdminSvc for? can we let it go out of scope?
  const vatAdminSvc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);

  const { root } = await E(vatAdminSvc).createVatByName('zoe');
  const { zoeService: zoe, feeMintAccess: _2 } = await E(root).buildZoe(
    vatAdminSvc,
    feeIssuerConfig,
  );

  workspace.zoe = zoe;
  E(workspace.allClients).assign({ zoe });
};

const steps = [connectVattpWithMailbox, installSimEgress, buildZoe];

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
     * @param {{
     *   vattp: VattpVat,
     *   comms: CommsVatRoot,
     *   vatAdmin: VatAdminVat,
     * }} vats
     * @param {{
     *   mailbox: MailboxDevice,
     *   vatAdmin: unknown,
     * }} devices
     */
    bootstrap: (vats, devices) =>
      Promise.all(
        steps.map(step =>
          step({ vatPowers, vatParameters, vats, devices, workspace }),
        ),
      ),
  });
}
