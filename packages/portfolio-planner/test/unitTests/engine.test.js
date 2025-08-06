import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

// Load TypeScript compiler for .ts imports
import 'ts-blank-space/register';

// Import the actual function we want to test directly from engine.ts
const { encodedKeyToPath } = await import('../../src/engine.ts');

// Test constants and utility values  
const EncodedKeySeparator = '\x00';

test('encodedKeyToPath converts encoded keys to dot-separated paths', t => {
  const encodedKey = `prefix${EncodedKeySeparator}published${EncodedKeySeparator}ymax0${EncodedKeySeparator}portfolios`;
  const expectedPath = 'published.ymax0.portfolios';
  
  const result = encodedKeyToPath(encodedKey);
  
  t.is(result, expectedPath);
});

test('encodedKeyToPath handles simple encoded keys', t => {
  const encodedKey = `prefix${EncodedKeySeparator}simple${EncodedKeySeparator}path`;
  const expectedPath = 'simple.path';
  
  const result = encodedKeyToPath(encodedKey);
  
  t.is(result, expectedPath);
});

test('encodedKeyToPath throws on invalid keys without separator', t => {
  const invalidKey = 'no-separator-key';
  
  t.throws(() => encodedKeyToPath(invalidKey), {
    message: /invalid encoded key/,
  });
});

test('encodedKeyToPath handles single path component', t => {
  const encodedKey = `prefix${EncodedKeySeparator}single`;
  const expectedPath = 'single';
  
  const result = encodedKeyToPath(encodedKey);
  
  t.is(result, expectedPath);
});
