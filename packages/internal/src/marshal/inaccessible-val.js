// @ts-check
import { Far } from '@endo/far';

const ifaceAllegedPrefix = 'Alleged: ';
const ifaceInaccessiblePrefix = 'SEVERED: ';
/**
 * @param {string | undefined} iface
 * @returns {any}
 */
export const makeInaccessibleVal = iface => {
  if (typeof iface === 'string' && iface.startsWith(ifaceAllegedPrefix)) {
    iface = iface.slice(ifaceAllegedPrefix.length);
  }
  return Far(`${ifaceInaccessiblePrefix}${iface}`, {});
};
