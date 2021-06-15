import { meterMe } from './metered-code.js';

export function meterThem(explode) {
  const log2 = [];
  meterMe(log2, explode);
}
