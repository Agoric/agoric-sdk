import test from 'ava';
import { generateKeyPairSync } from 'node:crypto';

import { ripemd160, sha256 } from '@cosmjs/crypto';
import { fromHex, toBech32, toHex } from '@cosmjs/encoding';

import {
  addressFromCompressedPubkey,
  compressedPubkeyFromPem,
} from '../src/kms-direct-signer.ts';

// Fixture: secp256k1 key from privkey 0x…2a. PEM is the SPKI form KMS returns
// from getPublicKey; the compressed pubkey and agoric1 address are pinned.
const FIXTURE_PEM = `-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAE/o0esbyzQysdtYM/9fIibZy15lzuQwVY
wY7To8hs4a8HsVjyRM0N4hNKx8HTcc/7+uTbQIAaJXLlMcVzzam1tA==
-----END PUBLIC KEY-----`;

const FIXTURE_COMPRESSED_HEX =
  '02fe8d1eb1bcb3432b1db5833ff5f2226d9cb5e65cee430558c18ed3a3c86ce1af';
const FIXTURE_AGORIC_ADDRESS =
  'agoric1j2gxfxa9yz34jyk6k9enkmcfskr7gvh05fpvxr';

test('compressedPubkeyFromPem parses a KMS SPKI PEM to a 33-byte pubkey', t => {
  const compressed = compressedPubkeyFromPem(FIXTURE_PEM);
  t.is(compressed.length, 33);
  t.is(toHex(compressed), FIXTURE_COMPRESSED_HEX);
});

test('addressFromCompressedPubkey derives the expected agoric1 address', t => {
  const compressed = fromHex(FIXTURE_COMPRESSED_HEX);
  const address = addressFromCompressedPubkey(compressed, 'agoric');
  t.is(address, FIXTURE_AGORIC_ADDRESS);
  t.true(address.startsWith('agoric1'));
});

test('address derivation matches an independent ripemd160(sha256()) computation', t => {
  const compressed = fromHex(FIXTURE_COMPRESSED_HEX);
  const independent = toBech32('agoric', ripemd160(sha256(compressed)));
  t.is(addressFromCompressedPubkey(compressed, 'agoric'), independent);
});

test('prefix is honored', t => {
  const compressed = fromHex(FIXTURE_COMPRESSED_HEX);
  const address = addressFromCompressedPubkey(compressed, 'cosmos');
  t.true(address.startsWith('cosmos1'));
});

test('compressedPubkeyFromPem rejects a non-secp256k1 curve', t => {
  // A P-256 (prime256v1) SPKI key should be rejected.
  const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  t.throws(() => compressedPubkeyFromPem(pem), {
    message: /unexpected KMS public key/,
  });
});
