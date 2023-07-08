import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  let benchmarkRounds = 0;

  return Far('root', {
    setup(vats, devices) {
      log(`benchmark setup(${JSON.stringify(vats)}, ${JSON.stringify(devices)})`);
    },
    runBenchmarkRound() {
      benchmarkRounds += 1;
      log(`runBenchmarkRound #${benchmarkRounds}`);
    }
  });
}
