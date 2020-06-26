// this must be imported before install-ses
import { tameMetering } from '@agoric/tame-metering';

const replaceGlobalMeter = tameMetering();
export { replaceGlobalMeter };
