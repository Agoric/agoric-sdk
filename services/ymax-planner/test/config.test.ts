import test from 'ava';
import { WebSocketProvider } from 'ethers';
import {
  loadConfig,
  defaultAgoricNetworkSpecForCluster,
  type ClusterName,
  type SecretManager,
} from '../src/config.ts';
import { createEVMContext } from '../src/support.ts';

const { entries, keys } = Object;

/** Acceptable values for all required environment variables. */
const minimalEnv = {
  MNEMONIC: 'test mnemonic phrase',
  ALCHEMY_API_KEY: 'test1234',
  CONTRACT_INSTANCE: 'ymax1',
};

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

const callLoadConfig = (
  envOverrides: Record<string, string | undefined> = {},
  secretManager: SecretManager = makeFakeSecretManager(),
) => loadConfig({ ...minimalEnv, ...envOverrides }, secretManager);

test('loadConfig validates required MNEMONIC', async t => {
  const env = {};
  const secretManager = makeFakeSecretManager();

  await t.throwsAsync(() => loadConfig(env, secretManager), {
    message: 'GCP accessSecretVersion response missing payload data',
  });
});

test('loadConfig accepts valid configuration', async t => {
  const env = {
    CLUSTER: 'testnet',
    MNEMONIC: 'test mnemonic phrase',
    CONTRACT_INSTANCE: 'ymax1',
    ALCHEMY_API_KEY: 'test1234',
    SPECTRUM_API_URL: 'https://api.spectrum.example.com',
    SPECTRUM_API_TIMEOUT: '5000',
    SPECTRUM_API_RETRIES: '2',
    AGORIC_NET: 'devnet,myChainId',
    COSMOS_REST_TIMEOUT: '10000',
    COSMOS_REST_RETRIES: '5',
  };
  const secretManager = makeFakeSecretManager();

  const config = await loadConfig(env, secretManager);

  t.is(config.clusterName, 'testnet');
  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.alchemyApiKey, 'test1234');
  t.is(config.spectrum.apiUrl, 'https://api.spectrum.example.com');
  t.is(config.spectrum.timeout, 5000);
  t.is(config.spectrum.retries, 2);
  t.is(config.cosmosRest.agoricNetworkSpec, 'devnet,myChainId');
  t.is(config.cosmosRest.agoricNetSubdomain, 'devnet');
  t.is(config.cosmosRest.timeout, 10000);
  t.is(config.cosmosRest.retries, 5);
});

test('loadConfig uses default values when optional fields are missing', async t => {
  const config = await callLoadConfig();

  t.is(config.clusterName, 'local');
  t.is(config.contractInstance, 'ymax1');
  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.alchemyApiKey, 'test1234');
  t.is(config.spectrum.apiUrl, undefined);
  t.is(config.spectrum.timeout, 10000);
  t.is(config.spectrum.retries, 3);
  t.is(config.cosmosRest.agoricNetworkSpec, 'local');
  t.is(config.cosmosRest.agoricNetSubdomain, 'local');
  t.is(config.cosmosRest.timeout, 10000);
  t.is(config.cosmosRest.retries, 3);
});

test('loadConfig defaults AGORIC_NET from CLUSTER', async t => {
  for (const [clusterName, defaultAgoricNetworkSpec] of Object.entries(
    defaultAgoricNetworkSpecForCluster,
  )) {
    for (const agoricNetworkSpec of [undefined, 'xnet', 'xnet,forceChainId']) {
      const config = await callLoadConfig({
        CLUSTER: clusterName,
        AGORIC_NET: agoricNetworkSpec,
      });
      t.is(config.clusterName, clusterName as any, `CLUSTER=${clusterName}`);
      t.is(
        config.cosmosRest.agoricNetworkSpec,
        agoricNetworkSpec || defaultAgoricNetworkSpec,
        `CLUSTER=${clusterName} implies AGORIC_NET`,
      );
    }
  }
});

test('loadConfig defaults CLUSTER from AGORIC_NET', async t => {
  const defaultClusterNameForAgoricNetwork = new Map<string, ClusterName>([
    ['local', 'local'],
    ['devnet', 'testnet'],
    ['xnet', 'testnet'],
    ['main', 'mainnet'],
  ]);
  for (const [
    agoricNetSubdomain,
    defaultClusterName,
  ] of defaultClusterNameForAgoricNetwork.entries()) {
    for (const agoricNetworkSpec of [
      agoricNetSubdomain,
      `${agoricNetSubdomain},forceChainId`,
    ]) {
      for (const clusterName of [undefined, 'mainnet']) {
        const config = await callLoadConfig({
          AGORIC_NET: agoricNetworkSpec,
          CLUSTER: clusterName,
        });
        t.is(
          config.cosmosRest.agoricNetworkSpec,
          agoricNetworkSpec,
          `AGORIC_NET=${agoricNetworkSpec}`,
        );
        t.is(
          config.cosmosRest.agoricNetSubdomain,
          agoricNetSubdomain,
          `AGORIC_NET=${agoricNetworkSpec}`,
        );
        t.is(
          config.clusterName,
          clusterName || (defaultClusterName as any),
          `AGORIC_NET=${agoricNetworkSpec} implies CLUSTER`,
        );
      }
    }
  }
});

test('loadConfig validates positive integers', async t => {
  await t.throwsAsync(() => callLoadConfig({ SPECTRUM_API_TIMEOUT: '0' }), {
    message: /"SPECTRUM_API_TIMEOUT" must be a positive integer/,
  });
});

test('loadConfig validates URL format', async t => {
  await t.throwsAsync(() => callLoadConfig({ SPECTRUM_API_URL: 'not-a-url' }), {
    message: /"SPECTRUM_API_URL" must be a valid URL/,
  });
});

test('loadConfig trims whitespace from values', async t => {
  const config = await callLoadConfig({ AGORIC_NET: '  devnet  ' });

  t.is(config.mnemonic, 'test mnemonic phrase');
  t.is(config.alchemyApiKey, 'test1234');
  t.is(config.cosmosRest.agoricNetworkSpec, 'devnet');
});

test('loadConfig rejects empty required values', async t => {
  await t.throwsAsync(() => callLoadConfig({ ALCHEMY_API_KEY: '   ' }), {
    message: '"ALCHEMY_API_KEY" is required',
  });
});

test('loadConfig accepts ymax0 contract instance', async t => {
  const config = await callLoadConfig({ CONTRACT_INSTANCE: 'ymax0' });
  t.is(config.contractInstance, 'ymax0');
});

test('loadConfig accepts ymax1 contract instance', async t => {
  const config = await callLoadConfig({ CONTRACT_INSTANCE: 'ymax1' });
  t.is(config.contractInstance, 'ymax1');
});

test('loadConfig rejects invalid contract instance', async t => {
  await t.throwsAsync(() => callLoadConfig({ CONTRACT_INSTANCE: 'ymax2' }), {
    message: /CONTRACT_INSTANCE must be 'ymax0' or 'ymax1'/,
  });
});

// --- Unit tests for createEVMContext ---
// Skip this test because WebSocketProvider tries to connect immediately with invalid API key
test.skip('createEVMContext generates valid testnet context', async t => {
  const result = await createEVMContext({
    clusterName: 'testnet',
    alchemyApiKey: 'test1234',
  });

  t.truthy(result.evmProviders);
  t.truthy(result.usdcAddresses);

  // Check that evmProviders contains WebSocketProvider instances
  const providerEntries = entries(result.evmProviders);
  t.true(providerEntries.length > 0, 'should have at least one provider');

  for (const [caipId, provider] of providerEntries) {
    t.regex(
      caipId,
      /^eip155:\d+$/,
      'CAIP ID should match eip155:chainId format',
    );
    t.true(
      provider instanceof WebSocketProvider,
      'provider should be WebSocketProvider instance',
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
