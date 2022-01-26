import { E, Far } from '@agoric/far';
import { makeNotifierKit } from '@agoric/notifier';

// This vat contains the controller-side provisioning service. To enable local
// testing, it is loaded by both the controller and other ag-solo vat machines.

export function buildRootObject(_vatPowers) {
  let bundler;
  let comms;
  let vattp;

  async function register(b, c, v) {
    bundler = b;
    comms = c;
    vattp = v;
  }

  async function pleaseProvision(nickname, address, powerFlags) {
    let clientFacet;
    const fetch = Far('fetch', {
      async getChainBundle() {
        console.warn('getting chain bundle');
        return E(clientFacet).getChainBundle();
      },
      getConfiguration() {
        console.warn('getting configuration');
        return E(clientFacet).getConfiguration();
      },
    });

    // Add a remote and egress for the pubkey.
    const { transmitter, setReceiver } = await E(vattp).addRemote(address);
    await E(comms).addRemote(address, transmitter, setReceiver);

    const INDEX = 1;
    await E(comms).addEgress(address, INDEX, fetch);

    // Do this here so that any side-effects don't happen unless
    // the egress has been successfully added.
    clientFacet = E(bundler)
      .createClientFacet(nickname, address, powerFlags || [])
      .catch(e => {
        console.warn(`Failed to create client facet:`, e);
        // Emulate with existing createUserBundle.
        const chainBundle = E(bundler).createUserBundle(
          nickname,
          address,
          powerFlags || [],
        );
        // Update the notifier when the chainBundle resolves.
        const { notifier, updater } = makeNotifierKit();
        chainBundle.then(clientHome => {
          updater(harden({ clientHome, clientAddress: address }));
        });
        return Far('emulatedClientFacet', {
          getChainBundle: () => chainBundle,
          getConfiguration: () => notifier,
        });
      });

    return { ingressIndex: INDEX };
  }

  return Far('root', { register, pleaseProvision });
}
