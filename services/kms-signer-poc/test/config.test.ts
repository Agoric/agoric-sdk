import test from 'ava';

import { loadConfig, selectWalletIndex } from '../src/config.ts';

const VALID_KEY_VERSION =
  'projects/my-proj/locations/us-central1/keyRings/agoric/cryptoKeys/wallet0/cryptoKeyVersions/1';
const VALID_KEY_VERSION_2 =
  'projects/my-proj/locations/us-central1/keyRings/agoric/cryptoKeys/wallet1/cryptoKeyVersions/1';

test('loadConfig requires KMS_KEY_VERSION', t => {
  t.throws(() => loadConfig({}), { message: 'KMS_KEY_VERSION is required' });
  t.throws(() => loadConfig({ KMS_KEY_VERSION: '   ' }), {
    message: 'KMS_KEY_VERSION is required',
  });
});

test('loadConfig rejects a non-fully-qualified key version', t => {
  t.throws(() => loadConfig({ KMS_KEY_VERSION: 'wallet0' }), {
    message: /fully-qualified CryptoKeyVersion resource name/,
  });
  t.throws(
    () =>
      loadConfig({
        KMS_KEY_VERSION:
          'projects/p/locations/l/keyRings/r/cryptoKeys/k', // missing cryptoKeyVersions/<n>
      }),
    { message: /fully-qualified CryptoKeyVersion resource name/ },
  );
});

test('loadConfig accepts a valid key version and defaults prefix to agoric', t => {
  const config = loadConfig({ KMS_KEY_VERSION: VALID_KEY_VERSION });
  t.is(config.keyVersionName, VALID_KEY_VERSION);
  t.deepEqual(config.keyVersionNames, [VALID_KEY_VERSION]);
  t.is(config.prefix, 'agoric');
  t.is(config.rpcAddr, undefined);
  t.is(config.agoricNet, undefined);
});

test('loadConfig accepts several wallets via KMS_KEY_VERSIONS', t => {
  const config = loadConfig({
    KMS_KEY_VERSIONS: `${VALID_KEY_VERSION}, ${VALID_KEY_VERSION_2}`,
  });
  t.deepEqual(config.keyVersionNames, [VALID_KEY_VERSION, VALID_KEY_VERSION_2]);
  // keyVersionName aliases the primary (index 0) wallet.
  t.is(config.keyVersionName, VALID_KEY_VERSION);
});

test('loadConfig splits KMS_KEY_VERSIONS on commas and newlines and trims', t => {
  const config = loadConfig({
    KMS_KEY_VERSIONS: `\n  ${VALID_KEY_VERSION}  \n${VALID_KEY_VERSION_2}\n`,
  });
  t.deepEqual(config.keyVersionNames, [VALID_KEY_VERSION, VALID_KEY_VERSION_2]);
});

test('loadConfig rejects a bad entry in KMS_KEY_VERSIONS', t => {
  t.throws(
    () =>
      loadConfig({ KMS_KEY_VERSIONS: `${VALID_KEY_VERSION}, wallet-bad` }),
    { message: /fully-qualified CryptoKeyVersion resource name/ },
  );
});

test('selectWalletIndex defaults to the primary wallet', t => {
  t.is(selectWalletIndex(3, undefined), 0);
  t.is(selectWalletIndex(3, null), 0);
  t.is(selectWalletIndex(3, ''), 0);
});

test('selectWalletIndex resolves a numeric or string selector', t => {
  t.is(selectWalletIndex(3, 2), 2);
  t.is(selectWalletIndex(3, '1'), 1);
});

test('selectWalletIndex rejects an out-of-range or non-integer selector', t => {
  t.throws(() => selectWalletIndex(2, 2), { message: /out of range/ });
  t.throws(() => selectWalletIndex(2, -1), { message: /out of range/ });
  t.throws(() => selectWalletIndex(2, 'x'), { message: /out of range/ });
  t.throws(() => selectWalletIndex(2, 1.5), { message: /out of range/ });
});

test('loadConfig honors PREFIX, RPC and AGORIC_NET overrides', t => {
  const config = loadConfig({
    KMS_KEY_VERSION: VALID_KEY_VERSION,
    PREFIX: 'cosmos',
    RPC: 'https://rpc.example.invalid:443',
    AGORIC_NET: 'devnet',
  });
  t.is(config.prefix, 'cosmos');
  t.is(config.rpcAddr, 'https://rpc.example.invalid:443');
  t.is(config.agoricNet, 'devnet');
});

test('loadConfig trims whitespace', t => {
  const config = loadConfig({
    KMS_KEY_VERSION: `  ${VALID_KEY_VERSION}  `,
    PREFIX: '  agoric  ',
  });
  t.is(config.keyVersionName, VALID_KEY_VERSION);
  t.is(config.prefix, 'agoric');
});
