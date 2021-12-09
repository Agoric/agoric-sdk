// @ts-check
import { E, Far } from '@agoric/far';

/**
 * @typedef { import('@agoric/eventual-send').EProxy } EProxy
 * @typedef { ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/mailbox-src.js').buildRootDeviceNode> } MailboxDevice
 * @typedef { ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/vat-tp.js').buildRootObject> } VattpVat
 */

/**
 * Build root object of the bootstrap vat.
 *
 * @param {{
 *   D: EProxy // approximately
 * }} vatPowers
 * @param {Record<string, unknown>} _vatParameters
 */
export function buildRootObject(vatPowers, _vatParameters) {
  const { D } = vatPowers;

  /**
   * @param {VattpVat} vattp
   * @param {MailboxDevice} mailbox
   */
  const connectVattpWithMailbox = async (vattp, mailbox) => {
    D(mailbox).registerInboundHandler(vattp);
    await E(vattp).registerMailboxDevice(mailbox);
  };

  return Far('bootstrap', {
    /**
     * Bootstrap vats and devices.
     *
     * @param {{vattp: VattpVat }} vats
     * @param {{mailbox: MailboxDevice}} devices
     */
    bootstrap: async (vats, devices) => {
      await connectVattpWithMailbox(vats.vattp, devices.mailbox);
    },
  });
}
