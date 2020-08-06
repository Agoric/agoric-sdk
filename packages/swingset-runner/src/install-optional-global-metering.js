// This module is essentially identical to
// '@agoric/install-metering-and-ses/install-global-metering' except that it
// scans the command line parameters for a flag that controls whether global
// metering is actually enabled or not.  This is intended to be used only as
// part of `swingset-runner` and should not be imported otherwise.

// this must be imported before install-ses
import { tameMetering } from '@agoric/tame-metering';
import process from 'process';

// The following command line args scanning code obeys the same args parsing
// rules as `main` but only bothers to look for the `--globalmetering` and
// `--meter` flags.  It's a shame to scan the command line twice, but (a) we
// really have to do this prior to installing SES and (b) it would be crazy to
// entangle the complete swingset-runner command line scanning baggage with the
// global metering controls.

let globalMeteringActive = false;
const argv = process.argv;

for (let i = 2; i < argv.length; i += 1) {
  if (argv[i] === '--globalmetering' || argv[i] === '--meter') {
    globalMeteringActive = true;
    break;
  } else if (!argv[i].startsWith('-')) {
    break;
  }
}

const replaceGlobalMeter = globalMeteringActive ? tameMetering() : null;
export { replaceGlobalMeter };
