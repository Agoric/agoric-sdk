import { toBase64 } from '@cosmjs/encoding';
/* eslint-env node */

/**
 * Reverse the effect of responseDetail for all items in a map.
 *
 * @param {Map<string, *>} webMap
 */
export const encodeDetail = webMap => {
  const encode1 = (x, req) => {
    const {
      result: { response },
    } = x;
    if ('value' in response) {
      return x;
    }
    if ('valueCapData' in response) {
      const blockHeight = response.valueBlockHeight;
      const cellValue = JSON.stringify(response.valueCapData);
      const value = JSON.stringify({ blockHeight, values: [cellValue] });
      response.value = toBase64(Buffer.from(JSON.stringify({ value })));
      delete response.valueCapData;
      delete response.valueBlockHeight;
      return x;
    }
    console.warn(`Unknown response`, req);
    return x;
  };
  const out = new Map();
  for (const [req, x] of webMap) {
    out.set(req, Array.isArray(x) ? x.map(encode1) : encode1(x, req));
  }
  return out;
};
