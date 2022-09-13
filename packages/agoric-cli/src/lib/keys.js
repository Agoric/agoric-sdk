// @ts-check
import { normalizeBech32 } from '@cosmjs/encoding';
import { execSync } from 'child_process';

export const normalizeAddress = literalOrName => {
  try {
    return normalizeBech32(literalOrName);
  } catch (_) {
    // not an address so try as a key
    const buff = execSync(`agd keys show --address ${literalOrName}`);
    return normalizeBech32(buff.toString().trim());
  }
};
harden(normalizeAddress);
