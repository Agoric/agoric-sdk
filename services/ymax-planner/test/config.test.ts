import test from 'ava';
import { JsonRpcProvider } from 'ethers';
import { loadConfig, type SecretManager } from '../src/config.ts';
import { createEVMContext } from '../src/support.ts';

const { entries, keys } = Object;

const makeFakeSecretManager = (mnemonic?: string) =>
  ({
    accessSecretVersion: async () => [
      {
        payload: {
          data: mnemonic,
        },
      },
    ],
  }) as SecretManager;

test('loadConfig validates required MNEMONIC', async t => {
  const env = {};
  const secretManager = makeFakeSecretManager();

  await t.throwsAsync(() => loadConfig(env, secretManager), {
    message: /Missing secret payload/,
  });
});

test('loadConfig accepts valid configuration', async t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
    ALCHEMY_API_KEY: 'test1234',
    SPECTRUM_API_URL: 'https://api.spectrum.example.com',
    SPECTRUM_API_TIMEOUT: '5000',
    SPECTRUM_API_RETRIES: '2',
    AGORIC_NET: 'devnet',
    COSMOS_REST_TIMEOUT: '10000',
    COSMOS_REST_RETRIES: '5',
  };
  const secretManager = makeFakeSecretManager();

  const config = await loadConfig(env, secretManager);

  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.alchemyApiKey, 'test1234');
  t.is(config.spectrum.apiUrl, 'https://api.spectrum.example.com');
  t.is(config.spectrum.timeout, 5000);
  t.is(config.spectrum.retries, 2);
  t.is(config.cosmosRest.agoricNetwork, 'devnet');
  t.is(config.cosmosRest.timeout, 10000);
  t.is(config.cosmosRest.retries, 5);
});

test('loadConfig uses default values when optional fields are missing', async t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
    ALCHEMY_API_KEY: 'test1234',
  };
  const secretManager = makeFakeSecretManager();

  const config = await loadConfig(env, secretManager);

  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.alchemyApiKey, 'test1234');
  t.is(config.spectrum.apiUrl, undefined);
  t.is(config.spectrum.timeout, 30000);
  t.is(config.spectrum.retries, 3);
  t.is(config.cosmosRest.agoricNetwork, 'local');
  t.is(config.cosmosRest.timeout, 15000);
  t.is(config.cosmosRest.retries, 3);
});

test('loadConfig validates positive integers', async t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
    ALCHEMY_API_KEY: 'test1234',
    SPECTRUM_API_TIMEOUT: '0',
  };
  const secretManager = makeFakeSecretManager();

  await t.throwsAsync(() => loadConfig(env, secretManager), {
    message: /"SPECTRUM_API_TIMEOUT" must be a positive integer/,
  });
});

test('loadConfig validates URL format', async t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
    ALCHEMY_API_KEY: 'test1234',
    SPECTRUM_API_URL: 'not-a-url',
  };
  const secretManager = makeFakeSecretManager();

  await t.throwsAsync(() => loadConfig(env, secretManager), {
    message: /"SPECTRUM_API_URL" must be a valid URL/,
  });
});

test('loadConfig trims whitespace from values', async t => {
  const env = {
    MNEMONIC: '  test mnemonic phrase  ',
    ALCHEMY_API_KEY: '  test1234  ',
    AGORIC_NET: '  devnet  ',
  };
  const secretManager = makeFakeSecretManager();

  const config = await loadConfig(env, secretManager);

  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.alchemyApiKey, 'test1234');
  t.is(config.cosmosRest.agoricNetwork, 'devnet');
});

test('loadConfig rejects empty required values', async t => {
  const env = {
    MNEMONIC: '   ',
    ALCHEMY_API_KEY: 'test1234',
  };
  const secretManager = makeFakeSecretManager();

  await t.throwsAsync(() => loadConfig(env, secretManager), {
    message: /Mnemonic is required/,
  });
});

// --- Unit tests for createEVMContext ---
test('createEVMContext generates valid testnet context', async t => {
  const result = await createEVMContext({
    net: 'testnet',
    alchemyApiKey: 'test1234',
  });

  t.truthy(result.evmProviders);
  t.truthy(result.usdcAddresses);

  // Check that evmProviders contains JsonRpcProvider instances
  const providerEntries = entries(result.evmProviders);
  t.true(providerEntries.length > 0, 'should have at least one provider');

  for (const [caipId, provider] of providerEntries) {
    t.regex(
      caipId,
      /^eip155:\d+$/,
      'CAIP ID should match eip155:chainId format',
    );
    t.true(
      provider instanceof JsonRpcProvider,
      'provider should be JsonRpcProvider instance',
    );
  }

  // Check that collections have consistent CAIP IDs
  const providerCaipIds = keys(result.evmProviders);
  const usdcCaipIds = keys(result.usdcAddresses);

  // Each provider should have corresponding USDC address and chain mapping
  for (const caipId of providerCaipIds) {
    t.true(
      usdcCaipIds.includes(caipId),
      `USDC address should exist for ${caipId}`,
    );
  }
});
