import rawTest from 'ava';
import '@endo/init/debug.js';

import bundleSourceAmbient from '@endo/bundle-source';
import { importBundle } from '@endo/import-bundle';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * @type {import('ava').TestFn<{
 *   addressHooks: import('../src/address-hooks.js');
 * }>}
 */
const test = rawTest;

const makeTestContext = async () => {
  // Do all this work so that we test bundling and evaluation of the module in a
  // fresh compartment.
  const bundleSource = bundleSourceAmbient;
  const loadBundle = async specifier => {
    const modulePath = require.resolve(specifier);
    const bundle = await bundleSource(modulePath);
    return bundle;
  };

  const evaluateBundle = async (bundle, endowments = {}) => {
    return importBundle(bundle, endowments);
  };

  const importSpecifier = async (specifier, endowments = {}) => {
    const bundle = await loadBundle(specifier);
    return evaluateBundle(bundle, endowments);
  };

  const addressHooks = await importSpecifier('../src/address-hooks.js');

  return { addressHooks };
};

test.before(async t => {
  t.context = await makeTestContext();
});

/**
 * @type {import('ava').Macro<
 *  [addressHook: string, baseAddress: string, hookDataStr: string, error?: any],
 *   { addressHooks: import('../src/address-hooks.js') }
 * >}
 */
const splitMacro = test.macro({
  title(providedTitle = '', addressHook, _baseAddress, _hookDataStr, _error) {
    return `${providedTitle} split ${addressHook}`;
  },
  exec(t, addressHook, baseAddress, hookDataStr, error) {
    const { splitHookedAddress } = t.context.addressHooks;
    if (error) {
      t.throws(() => splitHookedAddress(addressHook), error);
      return;
    }
    const { baseAddress: ba, hookData: hd } = splitHookedAddress(addressHook);
    t.is(ba, baseAddress);
    const hookData = new TextEncoder().encode(hookDataStr);
    t.deepEqual(hd, hookData);
  },
});

test('empty', splitMacro, '', '', '', { message: ' too short' });
test('no hook', splitMacro, 'agoric1qqp0e5ys', 'agoric1qqp0e5ys', '', '');
test(
  'Fast USDC',
  splitMacro,
  'agoric10rchp4vc53apxn32q42c3zryml8xq3xshyzuhjk6405wtxy7tl3d7e0f8az423padaek6me38qekget2vdhx66mtvy6kg7nrw5uhsaekd4uhwufswqex6dtsv44hxv3cd4jkuqpqvduyhf',
  'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek',
  '?EUD=osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
);
test(
  'version 0',
  splitMacro,
  'agoric10rchqqqpqgpsgpgxquyqjzstpsxsurcszyfpxpqrqgqsq9qx0p9wp',
  'agoric1qqqsyqcyq5rqwzqfpg9scrgwpugpzysn3tn9p0',
  '\x04\x03\x02\x01',
);
test(
  'version 1 reject',
  splitMacro,
  'agoric10rchzqqpqgpsgpgxquyqjzstpsxsurcszyfpxpqrqgqsq9q04n2fg',
  '',
  '',
  { message: 'Unsupported address hook version 1' },
);
test(
  'version 15 reject',
  splitMacro,
  'agoric10rch7qqpqgpsgpgxquyqjzstpsxsurcszyfpxpqrqgqsq9q25ez2d',
  '',
  '',
  { message: 'Unsupported address hook version 15' },
);

/**
 * @type {import('ava').Macro<
 *   [string, ArrayLike<number> | undefined, ArrayLike<number>, string],
 *   { addressHooks: import('../src/address-hooks.js') }
 * >}
 */
const roundtripMacro = test.macro({
  title(providedTitle = '', prefix, addrBytes, hookData) {
    const space = providedTitle.endsWith(' ') ? '' : ' ';
    return `${providedTitle}${space}prefix: ${prefix}, addrBytes: ${addrBytes}, hookData: ${hookData}`;
  },
  exec(t, prefix, addrBytes, hookData, expected) {
    const { encodeBech32, joinHookedAddress, splitHookedAddress } =
      t.context.addressHooks;
    const baseAddress = encodeBech32(prefix, addrBytes || []);
    const encoded = joinHookedAddress(baseAddress, hookData);
    t.deepEqual(encoded, expected);
    const decoded = splitHookedAddress(encoded);
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
  'agoric10rchqqqq8gt2j4',
);

test(
  'roundtripEmptyHookData',
  roundtripMacro,
  'agoric',
  [0x01, 0x02, 0x03],
  [],
  'agoric10rchqqgzqvqqxcc0kwx',
);

test(
  'roundtripEmptyBaseAddress',
  roundtripMacro,
  'agoric',
  [],
  [0x01, 0x02, 0x03],
  'agoric10rchqqgzqvqqqyhvnj3',
);

test(
  'roundtrip',
  roundtripMacro,
  'agoric',
  [0x01, 0x02, 0x03],
  [0x04, 0x05, 0x06],
  'agoric10rchqqgzqvzq2psqqv59f9cy',
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
    const { encodeBech32, joinHookedAddress, splitHookedAddress } =
      t.context.addressHooks;
    const baseAddress = encodeBech32(prefix, addrBytes, charLimit);
    const make = () => joinHookedAddress(baseAddress, hookData, charLimit);
    if (throws) {
      t.throws(make, throws);
      return;
    }
    const encoded = make();
    t.log('encoded', encoded, addrBytes);
    const decoded = splitHookedAddress(encoded, charLimit);
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

/**
 * @type {import('ava').Macro<
 *   [
 *     baseAddress: string,
 *     query: import('../src/address-hooks.js').HookQuery,
 *     expected: import('../src/address-hooks.js').Bech32Address,
 *   ]
 * >}
 */
const addressHookMacro = test.macro({
  title(providedTitle = '', baseAddress, query) {
    return `${providedTitle} ${baseAddress} ${JSON.stringify(query)}`;
  },
  exec(t, baseAddress, query, expected) {
    const { encodeAddressHook, splitHookedAddress, decodeAddressHook } =
      t.context.addressHooks;
    const encoded = encodeAddressHook(baseAddress, query);
    t.log('encoded', encoded);
    t.is(encoded, expected);

    const { baseAddress: ba1, hookData } = splitHookedAddress(encoded);
    t.is(ba1, baseAddress);

    const td = new TextDecoder();
    t.log('splitHookedAddress', ba1 + td.decode(hookData));

    const { baseAddress: decodedBaseAddress, query: decodedQuery } =
      decodeAddressHook(encoded);
    t.is(decodedBaseAddress, baseAddress);
    t.deepEqual(decodedQuery, query);
  },
});

test(
  'agoric hook',
  addressHookMacro,
  'agoric1qqp0e5ys',
  { d: null, a: 'b', c: ['d', 'd2'] },
  'agoric10rchqqplvy7kyfnr84jzvceavsezveqqqyu2w5lp',
);

test(
  'cosmos hook',
  addressHookMacro,
  'cosmos1qqxuevtt',
  {
    everything: null,
    dst: ['a', 'b', 'c'],
  },
  'cosmos10rchqqplv3ehg0tpyej8xapavgnxgum5843jvetkv4e8jargd9hxwqqp4vx73n',
);

test(
  'slideshow hook',
  addressHookMacro,
  'agoric1qqp0e5ys',
  {
    stake: 'TIA',
    strat: 'compound',
    holder: 'agoric1adjbkubiukd',
  },
  'agoric10rchqqpldphkcer9wg7kzem0wf5kxvtpv34xy6m4vf5h26myyeehgcttv574gj2pyeehgunpws7kxmmdwphh2mnyqqqsc2lz8v',
);

test(
  'Fast USDC hook',
  addressHookMacro,
  'agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek',
  {
    EUD: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
  },
  'agoric10rchp4vc53apxn32q42c3zryml8xq3xshyzuhjk6405wtxy7tl3d7e0f8az423padaek6me38qekget2vdhx66mtvy6kg7nrw5uhsaekd4uhwufswqex6dtsv44hxv3cd4jkuqpqvduyhf',
);
