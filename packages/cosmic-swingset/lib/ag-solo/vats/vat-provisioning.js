import { E } from '@agoric/eventual-send';
import makeStore from '@agoric/store';

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

  /**
   * @type {Store<any, Array<Promise<any>>>}
   */
  const addressToChainBundles = makeStore('address');
  async function pleaseProvision(nickname, address, powerFlags) {
    const INDEX = 1;
    let chainBundles;
    if (addressToChainBundles.has(address)) {
      chainBundles = addressToChainBundles.get(address);
    } else {
      // Add a remote and egress for the address.
      const { transmitter, setReceiver } = await E(vattp).addRemote(address);
      await E(comms).addRemote(address, transmitter, setReceiver);
      chainBundles = [];
      addressToChainBundles.init(address, chainBundles);

      const fetch = harden({
        getDemoBundle() {
          if (!chainBundles.length) {
            throw Error(`No provisioned bundles to pick up for ${address}`);
          }
          // Consume a bundle.
          return chainBundles.shift();
        },
      });

      await E(comms).addEgress(address, INDEX, fetch);
    }

    // Do this here so that any side-effects don't happen unless
    // the egress has been successfully added.
    chainBundles.push(
      E(bundler).createUserBundle(nickname, address, powerFlags || []),
    );
    return { ingressIndex: INDEX };
  }

  return harden({ register, pleaseProvision });
}
