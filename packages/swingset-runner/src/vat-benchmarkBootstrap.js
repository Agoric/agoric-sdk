import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

/*
 * Vat to bootstrap a benchmark swingset.
 *
 * On boot, removes itself and the benchmark driver vat from the visible vat
 * collection and then forwards the bootstrap message (without these) to the
 * original bootstrap vat.
 *
 * It then tells the benchmark driver to do its setup and thereafter just
 * forwards `runBenchmarkRound` messages to the benchmark driver.
 */
export function buildRootObject(_vatPowers, vatParameters) {
  let benchmarkDriverVat;

  return Far('root', {
    async bootstrap(vatsExtended, devices) {
      const {
        benchmarkBootstrap: _benchmarkBootstrap,
        benchmarkDriver,
        ...vats
      } = vatsExtended;
      benchmarkDriverVat = benchmarkDriver;
      const originalBootstrapVat = vatsExtended[vatParameters.config.bootstrap];
      harden(vats);
      const bootstrapResult = await E(originalBootstrapVat).bootstrap(
        vats,
        devices,
      );
      await E(benchmarkDriverVat).setup(vats, devices);
      return bootstrapResult;
    },
    runBenchmarkRound() {
      return E(benchmarkDriverVat).runBenchmarkRound();
    },
  });
}
