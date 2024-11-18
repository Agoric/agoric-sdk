import { prepareExoClass } from '@agoric/vat-data';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { BridgeHandlerI } from './bridge.js';
import { PowerFlags } from './walletFlags.js';

/**
 * @param {import('@agoric/store').MapStore} baggage
 */
export const prepareProvisionBridgeHandler = baggage => {
  const makeProvisionBridgeHandler = prepareExoClass(
    baggage,
    'provisioningHandler',
    BridgeHandlerI,
    (provisioning, provisionWalletBridgeManager) => ({
      provisioning,
      provisionWalletBridgeManager,
    }),
    {
      async fromBridge(obj) {
        const { provisionWalletBridgeManager, provisioning } = this.state;
        switch (obj.type) {
          case 'PLEASE_PROVISION': {
            const { nickname, address, powerFlags: rawPowerFlags } = obj;
            const powerFlags = rawPowerFlags || [];
            let provisionP;
            if (powerFlags.includes(PowerFlags.SMART_WALLET)) {
              // Only provision a smart wallet.
              provisionP = E(provisionWalletBridgeManager).fromBridge(obj);
            } else {
              // Provision a mailbox and REPL.
              provisionP = E(provisioning).pleaseProvision(
                nickname,
                address,
                powerFlags,
              );
            }
            return provisionP
              .catch(e =>
                console.error(`Error provisioning ${nickname} ${address}:`, e),
              )
              .then(_ => {});
          }
          default: {
            throw Fail`Unrecognized request ${obj.type}`;
          }
        }
      },
    },
  );

  return makeProvisionBridgeHandler;
};
