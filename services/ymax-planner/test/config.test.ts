import test from 'ava';
import { loadConfig } from '../src/config.ts';

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
