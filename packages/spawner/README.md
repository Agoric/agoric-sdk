# Spawner

The "spawner" was the original method for instantiating contract code within
the chain's swingset. This on-chain usage has been entirely superseded by
Zoe, and the chain swingset no longer includes a spawner.

However, it was also pressed into service in the ag-solo swingset for
executing deploy scripts that need to leave code running after the script
finishes, such as an HTTP API handler. This use case is still active, but
none of the callers need the zoe-like features (comparable contract identity,
source retrieval, issuers, invitations, or seats). These callers now do
something like:

```js
  const bundlePath = new URL('src/wallet.js', import.meta.url).pathname;
  const bundle = await bundleSource(bundlePath);
  const walletInstall = E(spawner).install(bundle);
  const walletVat = await E(walletInstall).spawn(args);
```

So the spawner is now a stripped-down dynamic-vat creation frontend with the
minimal code necessary to satisfy those callers.

The spawner expects to be running in a vat. It used to evaluate the submitted
code in its own vat, under "within-vat" metering to protect itself from
runaway guest code. It has been rewritten to evaluate the guest in a new
dynamic vat instead.

To support a spawner, your swingset must provide it with the `vatAdmin` facet
(to create new vats), and a copy of the `vat-spawned.js` bundle (to install
in the new vat). Your `vat-spawner.js` should look like:

```js
import { Far } from '@endo/marshal';
import { makeSpawner } from '@agoric/spawner';
function buildRootObject() {
  return Far('root', {
    buildSpawner(vatAdminSvc) {
      return makeSpawner(vatAdminSvc);
    }
  });
}
harden(buildRootObject);
export { buildRootObject };
```

And your bootstrap function needs something like this:

```js
return Far('root', {
  async bootstrap(vats, devices) {
    const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
      devices.vatAdmin,
    );
    const spawner = await E(vats.spawner).buildSpawner(vatAdminSvc);
    // ...
```
