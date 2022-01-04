// @ts-check
import { E, Far } from '@agoric/far';

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

const steps = [connectVattpWithMailbox, buildZoe];

/**
 * Build root object of the bootstrap vat.
 *
 * @param {{
 *   D: EProxy // approximately
 * }} vatPowers
 * @param {Record<string, unknown>} _vatParameters
 */
export function buildRootObject(vatPowers, _vatParameters) {
  return Far('bootstrap', {
    /**
     * Bootstrap vats and devices.
     *
     * @param {{
     *   vattp: VattpVat,
     *   vatAdmin: VatAdminVat,
     * }} vats
     * @param {{
     *   mailbox: MailboxDevice,
     *   vatAdmin: unknown,
     * }} devices
     */
    bootstrap: (vats, devices) =>
      Promise.all(steps.map(step => step({ vatPowers, vats, devices }))),
  });
}
