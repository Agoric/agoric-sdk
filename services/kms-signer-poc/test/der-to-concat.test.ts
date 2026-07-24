import test from 'ava';

import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import { fromHex, toHex } from '@cosmjs/encoding';

import { derToConcat } from '../src/kms-direct-signer.ts';

/** Encode a single DER INTEGER (tag 0x02) from raw big-endian value bytes. */
const derInteger = (value: Uint8Array): Uint8Array => {
  const body =
    value.length > 0 && value[0] >= 0x80
      ? Uint8Array.from([0x00, ...value]) // pad so it stays positive
      : value;
  return Uint8Array.from([0x02, body.length, ...body]);
};

/** Assemble a DER ECDSA signature SEQUENCE from raw r and s value bytes. */
const derSig = (r: Uint8Array, s: Uint8Array): Uint8Array => {
  const rInt = derInteger(r);
  const sInt = derInteger(s);
  const body = Uint8Array.from([...rInt, ...sInt]);
  return Uint8Array.from([0x30, body.length, ...body]);
};

test('derToConcat matches CosmJS for many real signatures (fuzz)', async t => {
  const priv = new Uint8Array(32).fill(3);
  priv[31] = 9;
  for (let i = 0; i < 50; i += 1) {
    const digest = sha256(Uint8Array.from([i, i + 1, i + 2, i + 3]));
    const sig = await Secp256k1.createSignature(digest, priv);
    const der = sig.toDer();
    const mine = derToConcat(der);
    const cosmjs = Secp256k1Signature.fromDer(der).toFixedLength();
    t.deepEqual(mine, cosmjs, `signature #${i} r||s mismatch`);
    t.is(mine.length, 64);

    // The compact signature must verify against the compressed pubkey.
    const compressed = Secp256k1.compressPubkey(
      (await Secp256k1.makeKeypair(priv)).pubkey,
    );
    const recovered = Secp256k1Signature.fromFixedLength(mine);
    t.true(await Secp256k1.verifySignature(recovered, digest, compressed));
  }
});

test('derToConcat strips a leading-zero pad on r (high bit set)', t => {
  // r has its high bit set, so DER carries a 0x00 pad => 33-byte integer.
  const r = new Uint8Array(32).fill(0x11);
  r[0] = 0xff;
  const s = new Uint8Array(32).fill(0x22);
  const out = derToConcat(derSig(r, s));
  t.is(out.length, 64);
  t.is(toHex(out.subarray(0, 32)), toHex(r));
  t.is(toHex(out.subarray(32)), toHex(s));
});

test('derToConcat left-pads a short integer (leading zeros dropped)', t => {
  // s is only 20 bytes (leading zeros were dropped by the encoder).
  const r = new Uint8Array(32).fill(0x05);
  const sShort = fromHex('0102030405060708090a0b0c0d0e0f1011121314');
  const out = derToConcat(derSig(r, sShort));
  t.is(out.length, 64);
  const expectedS = new Uint8Array(32);
  expectedS.set(sShort, 32 - sShort.length);
  t.is(toHex(out.subarray(0, 32)), toHex(r));
  t.is(toHex(out.subarray(32)), toHex(expectedS));
});

test('derToConcat rejects malformed DER', t => {
  t.throws(() => derToConcat(fromHex('3103020101')), {
    message: /invalid DER/,
  });
  // Wrong sequence length.
  t.throws(() => derToConcat(fromHex('300102')), { message: /invalid DER/ });
});
