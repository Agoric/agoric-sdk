import test from 'ava';
import { loadConfig } from '../src/config.ts';
import { createEVMContext } from '../src/support.ts';
import { JsonRpcProvider } from 'ethers';

const { entries, keys } = Object;

test('loadConfig validates required MNEMONIC', t => {
  const env = {};

  t.throws(() => loadConfig(env), { message: /"MNEMONIC" is required/ });
});

test('loadConfig accepts valid configuration', t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
    SPECTRUM_API_URL: 'https://api.spectrum.example.com',
    SPECTRUM_API_TIMEOUT: '5000',
    SPECTRUM_API_RETRIES: '2',
    AGORIC_NET: 'devnet',
    COSMOS_REST_TIMEOUT: '10000',
    COSMOS_REST_RETRIES: '5',
  };

  const config = loadConfig(env);

  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.spectrum.apiUrl, 'https://api.spectrum.example.com');
  t.is(config.spectrum.timeout, 5000);
  t.is(config.spectrum.retries, 2);
  t.is(config.cosmosRest.agoricNetwork, 'devnet');
  t.is(config.cosmosRest.timeout, 10000);
  t.is(config.cosmosRest.retries, 5);
});

test('loadConfig uses default values when optional fields are missing', t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
  };

  const config = loadConfig(env);

  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.spectrum.apiUrl, undefined);
  t.is(config.spectrum.timeout, 30000);
  t.is(config.spectrum.retries, 3);
  t.is(config.cosmosRest.agoricNetwork, 'local');
  t.is(config.cosmosRest.timeout, 15000);
  t.is(config.cosmosRest.retries, 3);
});

test('loadConfig validates positive integers', t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
    SPECTRUM_API_TIMEOUT: '0',
  };

  t.throws(() => loadConfig(env), {
    message: /"SPECTRUM_API_TIMEOUT" must be a positive integer/,
  });
});

test('loadConfig validates URL format', t => {
  const env = {
    MNEMONIC: 'test mnemonic phrase',
    SPECTRUM_API_URL: 'not-a-url',
  };

  t.throws(() => loadConfig(env), {
    message: /"SPECTRUM_API_URL" must be a valid URL/,
  });
});

test('loadConfig trims whitespace from values', t => {
  const env = {
    MNEMONIC: '  test mnemonic phrase  ',
    AGORIC_NET: '  devnet  ',
  };

  const config = loadConfig(env);

  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.cosmosRest.agoricNetwork, 'devnet');
});

test('loadConfig rejects empty required values', t => {
  const env = {
    MNEMONIC: '   ',
  };

  t.throws(() => loadConfig(env), { message: /"MNEMONIC" is required/ });
});

// --- Unit tests for createEVMContext ---
test('createEVMContext generates valid testnet context', async t => {
  const result = await createEVMContext({ net: 'testnet' });

  t.truthy(result.axelarQueryApi);
  t.truthy(result.evmProviders);
  t.truthy(result.usdcAddresses);
  t.truthy(result.axelarChainIds);
  t.is(
    result.axelarQueryApi,
    'https://testnet.api.axelarscan.io/gmp/searchGMP',
  );

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
  const chainCaipIds = keys(result.axelarChainIds);

  // Each provider should have corresponding USDC address and chain mapping
  for (const caipId of providerCaipIds) {
    t.true(
      usdcCaipIds.includes(caipId),
      `USDC address should exist for ${caipId}`,
    );
    t.true(
      chainCaipIds.includes(caipId),
      `Chain mapping should exist for ${caipId}`,
    );
  }
});

test('createEVMContext defaults to mainnet', async t => {
  const result = await createEVMContext({});
  t.is(result.axelarQueryApi, 'https://api.axelarscan.io/gmp/searchGMP');
});

test('createEVMContext axelarChainIds contain expected values', async t => {
  const mainnetResult = await createEVMContext({ net: 'mainnet' });
  const testnetResult = await createEVMContext({ net: 'testnet' });

  // Check mainnet axelarChainIds
  t.is(mainnetResult.axelarChainIds['eip155:1'], 'Ethereum');
  t.is(mainnetResult.axelarChainIds['eip155:42161'], 'arbitrum');
  t.is(mainnetResult.axelarChainIds['eip155:43114'], 'Avalanche');
  t.is(mainnetResult.axelarChainIds['eip155:10'], 'optimism');
  t.is(mainnetResult.axelarChainIds['eip155:137'], 'Polygon');

  // Check testnet axelarChainIds
  t.is(testnetResult.axelarChainIds['eip155:11155111'], 'ethereum-sepolia');
  t.is(testnetResult.axelarChainIds['eip155:43113'], 'Avalanche');
  t.is(testnetResult.axelarChainIds['eip155:421614'], 'arbitrum-sepolia');
  t.is(testnetResult.axelarChainIds['eip155:11155420'], 'optimism-sepolia');
  t.is(testnetResult.axelarChainIds['eip155:80002'], 'polygon-sepolia');
});
