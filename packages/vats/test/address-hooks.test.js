import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import {
  encodeHookedAddress,
  decodeHookedAddress,
  encodeBech32,
} from '../src/address-hooks.js';

/**
 * @type {import('ava').Macro<
 *   [
 *     string,
 *     ArrayLike<number> | undefined,
 *     ArrayLike<number> | undefined,
 *     string,
 *   ]
 * >}
 */
const roundtripMacro = test.macro({
  title(providedTitle = '', prefix, addrBytes, hookData) {
    const space = providedTitle.endsWith(' ') ? '' : ' ';
    return `${providedTitle}${space}prefix: ${prefix}, addrBytes: ${addrBytes}, hookData: ${hookData}`;
  },
  exec(t, prefix, addrBytes, hookData, expected) {
    const baseAddress = encodeBech32(prefix, addrBytes || []);
    const encoded = encodeHookedAddress(baseAddress, hookData);
    t.deepEqual(encoded, expected);
    const decoded = decodeHookedAddress(encoded);
    t.deepEqual(decoded, {
      baseAddress,
      hookData: new Uint8Array(hookData || []),
    });
  },
});

test(
  'roundtripEmpty',
  roundtripMacro,
  'agoric',
  [],
  [],
  'agoric-hook1qqqqhfxz5m',
);

test(
  'roundtripEmptyHookData',
  roundtripMacro,
  'agoric',
  [0x01, 0x02, 0x03],
  [],
  'agoric-hook1qypqxqqr560t2e',
);

test(
  'roundtripEmptyBaseAddress',
  roundtripMacro,
  'agoric',
  [],
  [0x01, 0x02, 0x03],
  'agoric-hook1qypqxqqq6f6ayx',
);

test(
  'roundtrip',
  roundtripMacro,
  'agoric',
  [0x01, 0x02, 0x03],
  [0x04, 0x05, 0x06],
  'agoric-hook1qypqxpq9qcqqxuzx9f6',
);

/**
 * @type {import('ava').Macro<
 *   [
 *     string,
 *     ArrayLike<number>,
 *     ArrayLike<number>,
 *     number | undefined,
 *     { message } | undefined,
 *   ]
 * >}
 */
const lengthCheckMacro = test.macro({
  title(providedTitle = '', prefix, baseAddress, hookData, charLimit, throws) {
    let sep = providedTitle.endsWith(' ') ? '' : ' ';
    const limitDesc = charLimit ? `${sep}charLimit=${charLimit}` : '';
    if (limitDesc) sep = ' ';
    const throwsDesc = throws ? `${sep}throws` : '';
    if (throwsDesc) sep = ' ';
    return `${providedTitle}${limitDesc}${throwsDesc}`;
  },
  exec(t, prefix, addrBytes, hookData, charLimit, throws) {
    const baseAddress = encodeBech32(prefix, addrBytes, charLimit);
    const make = () => encodeHookedAddress(baseAddress, hookData, charLimit);
    if (throws) {
      t.throws(make, throws);
      return;
    }
    const encoded = make();
    t.log('encoded', encoded, addrBytes);
    const decoded = decodeHookedAddress(encoded, charLimit);
    t.deepEqual(decoded, {
      baseAddress,
      hookData,
    });
  },
});

{
  const charLimit = 90;
  const prefix = 'agoric';
  const addrBytes = new Uint8Array(20);
  for (let j = 0; j < addrBytes.length; j += 1) {
    addrBytes[j] = j;
  }

  for (let i = 0; i <= 30; i += 1) {
    const hookData = new Uint8Array(i);
    for (let j = 0; j < i; j += 1) {
      hookData[j] = i - j;
    }
    test(
      `${addrBytes.length}-byte baseAddress, ${i}-byte hookData`,
      lengthCheckMacro,
      prefix,
      addrBytes,
      hookData,
      charLimit,
      i > 23 ? { message: /Exceeds length limit/ } : undefined,
    );
  }
}
