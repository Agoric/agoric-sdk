import { meterMe } from './metered-code';

export function meterThem(explode) {
  const log2 = [];
  meterMe(log2, explode);
}
