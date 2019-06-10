import harden from '@agoric/harden';

// this will fail until `ag-solo set-gci-ingress` has been run to update
// gci.js
import { GCI, IS_CONTROLLER } from './gci';

console.log(`loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E, D) => {
      // TODO: Any wiring necessary to make the demo work.
      async function startDemo(vats) {
        await E(vats.demo).startup(vats.mint);
        return vats.demo;
      }

      return harden({
        async bootstrap(argv, vats, devices) {
          console.log('bootstrap() called');
          D(devices.mailbox).registerInboundHandler(vats.vattp);
          await E(vats.vattp).registerMailboxDevice(devices.mailbox);
          await E(vats.comms).init(vats.vattp);

          let demoVat;
          if (IS_CONTROLLER) {
            // FIXME: Need to request the 'demo' vat from the chain, not locally.
            // TODO(mfig): this will be generic.
            demoVat = harden({
              getChainBundle(nickname) {
                return harden({hello() {return `FIXME: Hello, ${nickname}`}});
              },
            });
          } else {
            // The chain and local loads the demo.
            demoVat = await startDemo(vats);
          }

          const fetch = harden({
            getChainBundle(nickname) { return E(demoVat).getChainBundle(nickname); },
          });

          if (vats.http) {
            await E(vats.http).setCommandDevice(devices.command);
            D(devices.command).registerInboundHandler(vats.http);

            if (GCI) {
              // We're on the chain, export the provisioner vat.
              E(vats.comms).addIngress(GCI, 1)
                .then(p => E(vats.http).registerFetch(fetch));

              // All HTTP-connected vats get a 'chain' object in the REPL scope.
              E(vats.comms).addIngress(GCI, 2)
                .then(p => E(vats.http).setChainPresence(p));
            }
          }
          
          if (vats.http && vats.provisioning) {
            // We give the REPL direct access to the fetcher object.
            await E(vats.http).registerFetch(fetch);

            // 'provisioning' vat lives in all solo instances, including the controller.
            await E(vats.provisioning).register(demoVat, vats.comms);
            await E(vats.provisioning).registerHTTP(vats.http);

            const provisioner = harden({
              pleaseProvision(nickname, pubkey) {
                return E(vats.provisioning).pleaseProvision(nickname, pubkey);
              },
            });
            // Allow access from HTTP to the provisioner.
            await E(vats.http).setProvisioner(provisioner);
          }
        },
      });
    },
    helpers.vatID,
  );
}
