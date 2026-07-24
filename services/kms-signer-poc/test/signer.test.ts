import test from 'ava';

import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import { fromBase64, fromHex, toHex } from '@cosmjs/encoding';
import { makeSignBytes, makeSignDoc } from '@cosmjs/proto-signing';

import {
  makeKmsDirectSigner,
  type KmsSigningClient,
} from '../src/kms-direct-signer.ts';

const FIXTURE_PEM = `-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAE/o0esbyzQysdtYM/9fIibZy15lzuQwVY
wY7To8hs4a8HsVjyRM0N4hNKx8HTcc/7+uTbQIAaJXLlMcVzzam1tA==
-----END PUBLIC KEY-----`;

const FIXTURE_PRIV = fromHex(
  '000000000000000000000000000000000000000000000000000000000000002a',
);
const FIXTURE_COMPRESSED_HEX =
  '02fe8d1eb1bcb3432b1db5833ff5f2226d9cb5e65cee430558c18ed3a3c86ce1af';
const FIXTURE_AGORIC_ADDRESS =
  'agoric1j2gxfxa9yz34jyk6k9enkmcfskr7gvh05fpvxr';

/**
 * A fake KMS client that behaves like the real one: it returns the fixture PEM
 * and signs digests with the fixture private key, returning DER — exactly the
 * shape KMS `asymmetricSign` yields. The private key never leaves this mock.
 */
const makeFakeKmsClient = (): KmsSigningClient => ({
  getPublicKey: async () => [{ pem: FIXTURE_PEM }],
  asymmetricSign: async request => {
    const sig = await Secp256k1.createSignature(
      request.digest.sha256,
      FIXTURE_PRIV,
    );
    return [{ signature: sig.toDer() }];
  },
});

test('getAccounts returns the derived address, algo and compressed pubkey', async t => {
  const signer = await makeKmsDirectSigner({
    keyVersionName:
      'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
    kmsClient: makeFakeKmsClient(),
  });
  const accounts = await signer.getAccounts();
  t.is(accounts.length, 1);
  const [account] = accounts;
  t.is(account.address, FIXTURE_AGORIC_ADDRESS);
  t.is(account.algo, 'secp256k1');
  t.is(toHex(account.pubkey), FIXTURE_COMPRESSED_HEX);
});

test('signDirect produces a signature that verifies against the KMS pubkey', async t => {
  const signer = await makeKmsDirectSigner({
    keyVersionName:
      'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
    kmsClient: makeFakeKmsClient(),
  });

  const signDoc = makeSignDoc(
    Uint8Array.from([1, 2, 3, 4, 5]),
    Uint8Array.from([6, 7, 8, 9]),
    'agoric-3',
    0,
  );
  const { signed, signature } = await signer.signDirect(
    FIXTURE_AGORIC_ADDRESS,
    signDoc,
  );

  t.deepEqual(signed, signDoc, 'signDoc is returned unmodified');
  t.is(signature.pub_key.type, 'tendermint/PubKeySecp256k1');

  const compressed = fromHex(FIXTURE_COMPRESSED_HEX);
  t.deepEqual(fromBase64(signature.pub_key.value), compressed);

  const sig64 = fromBase64(signature.signature);
  t.is(sig64.length, 64);
  const digest = sha256(makeSignBytes(signDoc));
  const parsed = Secp256k1Signature.fromFixedLength(sig64);
  t.true(await Secp256k1.verifySignature(parsed, digest, compressed));
});

test('signDirect rejects a mismatched signer address', async t => {
  const signer = await makeKmsDirectSigner({
    keyVersionName:
      'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
    kmsClient: makeFakeKmsClient(),
  });
  const signDoc = makeSignDoc(
    Uint8Array.from([1]),
    Uint8Array.from([2]),
    'agoric-3',
    0,
  );
  await t.throwsAsync(
    () => signer.signDirect('agoric1wrongaddressxxxxxxxxxxxxxxxxxxxxxxxx', signDoc),
    { message: /does not match KMS address/ },
  );
});

test('makeKmsDirectSigner rejects a KMS response without a PEM', async t => {
  const client: KmsSigningClient = {
    getPublicKey: async () => [{ pem: null }],
    asymmetricSign: async () => [{ signature: new Uint8Array() }],
  };
  await t.throwsAsync(
    () =>
      makeKmsDirectSigner({
        keyVersionName:
          'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
        kmsClient: client,
      }),
    { message: /no PEM/ },
  );
});
