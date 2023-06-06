import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

/*
 * Vat to launch other vats.
 *
 * This vat is designed to enable a statically configured swingset vat group to
 * be run as a set of dynamic vats.  This is motivated by the need to benchmark
 * and test metering (in particular, the need to be able to run things both with
 * and without metering and compare the perf stats), but conceivably has other
 * uses as well.  The vat group being launched is statically specified by a
 * build option, `options.config`, which is a regular SwingSet config object
 * subject only to the limitation that the bundles that realize vats must be
 * specified via kernel bundle name references (or as literal bundles), because
 * it can't load bundles or source files itself on account of having no access
 * to the file system).
 *
 * TODO: Eventually we may want to have a vat that is a swingset launcher
 * _service_, which does essentially the same thing but gets sent swingset
 * config objects in messages (and presumably can create as many different
 * co-resident swingsets as you care to ask for).  That's a fairly simple
 * extension of this, but this is not that.
 */
export function buildRootObject(_vatPowers, vatParameters) {
  let bootstrapRoot;

  return Far('root', {
    async bootstrap(vats, devices) {
      const vatMaker = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const criticalVatKey = await E(vats.vatAdmin).getCriticalVatKey();
      const vatRoots = {};
      for (const vatName of Object.keys(vatParameters.config.vats)) {
        const vatDesc = vatParameters.config.vats[vatName];
        const bundleName = vatDesc.bundleName;
        const subvatParameters = vatDesc.parameters
          ? { ...vatDesc.parameters }
          : {};
        if (vatParameters.config.bootstrap === vatName) {
          subvatParameters.argv = vatParameters.argv;
        }
        let critical = vatDesc.critical;
        if (critical) {
          critical = criticalVatKey;
        }
        // prettier-ignore
        const vat = await E(vatMaker).createVatByName(
          bundleName,
          { vatParameters: harden(subvatParameters), critical },
        );
        vatRoots[vatName] = vat.root;
      }
      vatRoots.vatAdmin = vats.vatAdmin;
      bootstrapRoot = vatRoots[vatParameters.config.bootstrap];
      // prettier-ignore
      return E(bootstrapRoot).bootstrap(harden(vatRoots), devices);
    },
    runBenchmarkRound() {
      return E(bootstrapRoot).runBenchmarkRound();
    },
  });
}
