// @ts-check
import { decodeBase64, encodeBase64 } from '@endo/base64';
import { bech32 } from 'bech32';
import { Secp256k1, Secp256k1Signature } from '@cosmjs/crypto';
import {
  makeSignDoc as makeSignDocAmino,
  serializeSignDoc,
} from '@cosmjs/amino';
import { sha256 } from '../vendor/@noble/hashes/esm/sha256.js';
import { ripemd160 } from '../vendor/@noble/hashes/esm/ripemd160.js';
import { Either } from './helpers/adts.js';
import { compose } from './helpers/objectTools.js';

const { Left, Right } = Either;

const safeByteLengthCheck = pk =>
  pk.byteLength === 33
    ? Right(pk)
    : Left('pubkey.bytelength is not the correct value');

const createHash = hashFn => data => hashFn.create().update(data).digest();
const createSha256Hash = createHash(sha256);
const createRipeMdHash = createHash(ripemd160);

const toWords = bytes => bech32.toWords(bytes);

// https://github.com/cosmos/cosmjs/blob/main/packages/encoding/src/bech32.ts#L3C1-L6C2
const toBech32Address = prefix => (hash, limit) =>
  bech32.encode(prefix, toWords(hash), limit);

const mapFn = fn => type => type.map(fn);

export const pkToAddress = prefix =>
  compose(
    mapFn(toBech32Address(prefix)),
    // trace('after create ripe'),
    mapFn(createRipeMdHash),
    // trace('after create'),
    mapFn(createSha256Hash),
    safeByteLengthCheck,
    decodeBase64,
  );

export const pubkeyToAgoricAddress = pkToAddress('agoric');
export const pubkeyToCosmosAddress = pkToAddress('cosmos');

// https://github.com/cosmos/cosmjs/blob/main/packages/encoding/src/bech32.ts#L3C1-L6C2
export function toBech32(prefix, data, limit) {
  const address = bech32.encode(prefix, bech32.toWords(data), limit);
  return address;
}

/**
 * @param {string} pubkey in base64
 * @param {string} prefix
 */
export const pubkeyToAddress = (pubkey, prefix) => {
  const pubkeyData = decodeBase64(pubkey);
  assert.equal(pubkeyData.byteLength, 33);
  //   console.log('pubkey', Buffer.from(pubkeyData));
  const h1 = sha256.create().update(pubkeyData).digest();
  const h2 = ripemd160.create().update(h1).digest();
  return toBech32(prefix, h2);
};

const fail = msg => {
  throw Error(msg);
};

const te = new TextEncoder();

const ADR36 = {
  type: 'sign/MsgSignData',
  memo: '',
  accountNumber: 0,
  sequence: 0,
  chainId: '',
  fee: { gas: '0', amount: [] },
};

/**
 *
 * @param {KeplrSig} kSig
 * @param {Address} signer
 *
 * @typedef { string } Address
 * @typedef { string } Base64
 * @typedef {{
 *   pub_key: { type: 'tendermint/PubKeySecp256k1', value: Base64 },
 *   signature: Base64,
 * }} KeplrSig
 *
 */
export const checkSig = async (kSig, signer) => {
  const prefix = 'agoric'; // TODO: support others
  const addr = pkToAddress(prefix)(kSig.pub_key.value).fold(
    x => x,
    x => x,
  );
  addr === signer || fail('pubKey does not match address');

  const fixed = decodeBase64(kSig.signature);
  const cSig = Secp256k1Signature.fromFixedLength(fixed);

  const msg = 'I am eligible'; // TODO: address
  const d = te.encode(msg);
  const msgs = [{ type: ADR36.type, value: { signer, data: encodeBase64(d) } }];
  const signBytes = serializeSignDoc(
    makeSignDocAmino(
      msgs,
      ADR36.fee,
      ADR36.chainId,
      ADR36.memo,
      ADR36.accountNumber,
      ADR36.sequence,
    ),
  );
  const hash = sha256(signBytes);
  const pkbytes = decodeBase64(kSig.pub_key.value);
  const ok = await Secp256k1.verifySignature(cSig, hash, pkbytes);
  ok || fail('signature verification failure');
};
