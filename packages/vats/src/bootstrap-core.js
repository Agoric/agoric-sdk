// @ts-check
import { E, Far } from '@agoric/far';
import { makeNotifierKit } from '@agoric/notifier';

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

  const { notifier, updater } = makeNotifierKit();

  updater.updateState(
    harden({
      echoer: Far('echoObj', { echo: message => message }),
      // TODO: echo: Far('echoFn', message => message),
    }),
  );

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

  // TODO: stuff the notifier in init thingy
};

/**
 * @param {{
 *   vats: {
 *     vatAdmin: VatAdminVat,
 *   },
 *   devices: {
 *     vatAdmin: unknown,
 *   },
 * }} powers
 */
const buildZoe = async ({ vats, devices }) => {
  // TODO: what else do we need vatAdminSvc for? can we let it go out of scope?
  const vatAdminSvc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);

  const { root } = await E(vatAdminSvc).createVatByName('zoe');
  const { zoeService: _zoe, feeMintAccess: _2 } = await E(root).buildZoe(
    vatAdminSvc,
    feeIssuerConfig,
  );
};

const steps = [connectVattpWithMailbox, installSimEgress, buildZoe];

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
        steps.map(step => step({ vatPowers, vatParameters, vats, devices })),
      ),
  });
}
