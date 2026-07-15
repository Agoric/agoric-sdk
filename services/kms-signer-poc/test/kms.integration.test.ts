/**
 * Integration tests that require a real GCP KMS key and Application Default
 * Credentials. They are SKIPPED unless RUN_KMS_INTEGRATION is set, so the
 * default `yarn test` never touches live GCP. To run:
 *
 *   RUN_KMS_INTEGRATION=1 \
 *   KMS_KEY_VERSION=projects/<p>/locations/<l>/keyRings/<r>/cryptoKeys/<k>/cryptoKeyVersions/<n> \
 *   yarn test test/kms.integration.test.ts
 *
 * See designs/kms-backed-agoric-signing.md ("POC runbook").
 */
import test from 'ava';

import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import { fromBase64 } from '@cosmjs/encoding';
import { makeSignBytes, makeSignDoc } from '@cosmjs/proto-signing';

import { makeKmsDirectSigner } from '../src/kms-direct-signer.ts';

const run = process.env.RUN_KMS_INTEGRATION ? test : test.skip;
const keyVersionName = process.env.KMS_KEY_VERSION ?? '';

run('derives an agoric1 address from a live KMS key', async t => {
  const signer = await makeKmsDirectSigner({ keyVersionName });
  const [{ address, pubkey }] = await signer.getAccounts();
  t.regex(address, /^agoric1[0-9a-z]{38}$/);
  t.is(pubkey.length, 33);
});

run('signs a SignDoc with live KMS and the signature verifies', async t => {
  const signer = await makeKmsDirectSigner({ keyVersionName });
  const [{ address, pubkey }] = await signer.getAccounts();
  const signDoc = makeSignDoc(
    Uint8Array.from([1, 2, 3]),
    Uint8Array.from([4, 5, 6]),
    'agoric-3',
    0,
  );
  const { signature } = await signer.signDirect(address, signDoc);
  const sig64 = fromBase64(signature.signature);
  t.is(sig64.length, 64);
  const digest = sha256(makeSignBytes(signDoc));
  const parsed = Secp256k1Signature.fromFixedLength(sig64);
  t.true(await Secp256k1.verifySignature(parsed, digest, pubkey));
});
