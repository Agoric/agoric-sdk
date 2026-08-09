/**
 * Vendored KMS signing core for the kms-signer-poc unit.
 *
 * A CosmJS `OfflineDirectSigner` whose `signDirect` delegates to Google Cloud
 * KMS `asymmetricSign` (secp256k1, `EC_SIGN_SECP256K1_SHA256`). The private key
 * is generated inside KMS and never materializes in this process: we only fetch
 * the public key (to derive the `agoric1…` address) and ask KMS to sign digests.
 *
 * This file is intentionally self-contained: it imports only published deps
 * (`@cosmjs/*`, `@google-cloud/kms`) and Node builtins, so it can be lifted into
 * `@agoric/client-utils` later (a deliberate follow-up, out of scope for the POC).
 * See designs/kms-backed-agoric-signing.md.
 */
import crypto from 'node:crypto';

import {
  encodeSecp256k1Signature,
  rawSecp256k1PubkeyToRawAddress,
} from '@cosmjs/amino';
import { Secp256k1, sha256 } from '@cosmjs/crypto';
import { fromBase64, toBech32 } from '@cosmjs/encoding';
import { makeSignBytes, Registry } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';

import type {
  AccountData,
  GeneratedType,
  OfflineDirectSigner,
} from '@cosmjs/proto-signing';

/**
 * Minimal structural view of the two KMS RPCs this signer uses. Declaring it
 * locally (rather than importing `KeyManagementServiceClient`) keeps the module
 * loadable under a mocked client in unit tests, and keeps the `@google-cloud/kms`
 * value import out of the hot path.
 */
export interface KmsSigningClient {
  getPublicKey(request: {
    name: string;
  }): Promise<[{ pem?: string | null; algorithm?: unknown }, ...unknown[]]>;
  asymmetricSign(request: {
    name: string;
    digest: { sha256: Uint8Array };
  }): Promise<
    [{ signature?: Uint8Array | Buffer | string | null }, ...unknown[]]
  >;
}

/** Type URL for the Agoric wallet spend-action message this POC broadcasts. */
export const AGORIC_WALLET_SPEND_ACTION_TYPE_URL =
  '/agoric.swingset.MsgWalletSpendAction';

/** Type URL for the Agoric smart-wallet provisioning message. */
export const AGORIC_PROVISION_TYPE_URL = '/agoric.swingset.MsgProvision';

/** Apply the ambient `harden` when a lockdown has installed it; else identity. */
const maybeHarden = <T>(value: T): T => {
  const h = (globalThis as { harden?: <U>(v: U) => U }).harden;
  return h ? h(value) : value;
};

/** Coerce a KMS signature payload (Buffer | Uint8Array | base64 string) to bytes. */
const toBytes = (
  data: Uint8Array | Buffer | string | null | undefined,
): Uint8Array => {
  if (data == null) {
    throw Error('KMS asymmetricSign returned no signature');
  }
  if (typeof data === 'string') {
    return fromBase64(data);
  }
  return Uint8Array.from(data);
};

/** Left-strip DER integer padding and left-pad to exactly 32 big-endian bytes. */
const toField32 = (integer: Uint8Array): Uint8Array => {
  let start = 0;
  while (start < integer.length - 1 && integer[start] === 0x00) {
    start += 1;
  }
  const trimmed = integer.subarray(start);
  if (trimmed.length > 32) {
    throw Error('invalid DER: integer exceeds 32 bytes');
  }
  const out = new Uint8Array(32);
  out.set(trimmed, 32 - trimmed.length);
  return out;
};

/**
 * Convert an ASN.1 DER ECDSA signature to a 64-byte `r || s` compact signature.
 *
 * Handles the DER edge cases explicitly: an `r` or `s` may carry a leading `0x00`
 * pad (high bit set) or be shorter than 32 bytes (leading zeros dropped). KMS
 * returns low-S signatures for secp256k1 and Cosmos requires low-S, so no S
 * normalization is applied here.
 */
export const derToConcat = (der: Uint8Array): Uint8Array => {
  let offset = 0;
  const readByte = (): number => {
    if (offset >= der.length) {
      throw Error('invalid DER: unexpected end of input');
    }
    const byte = der[offset];
    offset += 1;
    return byte;
  };

  if (readByte() !== 0x30) {
    throw Error('invalid DER: expected sequence tag');
  }
  const seqLen = readByte();
  if (seqLen >= 0x80) {
    // secp256k1 ECDSA signatures are short enough for a single length byte,
    // so a high bit here means unsupported long-form (or indefinite) length.
    throw Error('invalid DER: unsupported long-form length');
  }
  if (offset + seqLen !== der.length) {
    throw Error('invalid DER: sequence length mismatch');
  }

  const readInteger = (): Uint8Array => {
    if (readByte() !== 0x02) {
      throw Error('invalid DER: expected integer tag');
    }
    const len = readByte();
    if (len === 0 || offset + len > der.length) {
      throw Error('invalid DER: bad integer length');
    }
    const value = der.subarray(offset, offset + len);
    offset += len;
    return value;
  };

  const r = toField32(readInteger());
  const s = toField32(readInteger());
  const concat = new Uint8Array(64);
  concat.set(r, 0);
  concat.set(s, 32);
  return concat;
};

/**
 * Parse a KMS PEM/SPKI secp256k1 public key into a 33-byte compressed pubkey.
 * Uses only the Node `crypto` builtin (JWK export), no extra dependency.
 */
export const compressedPubkeyFromPem = (pem: string): Uint8Array => {
  const jwk = crypto.createPublicKey(pem).export({ format: 'jwk' });
  if (jwk.kty !== 'EC' || jwk.crv !== 'secp256k1') {
    throw Error(
      `unexpected KMS public key: kty=${String(jwk.kty)} crv=${String(jwk.crv)}`,
    );
  }
  if (!jwk.x || !jwk.y) {
    throw Error('KMS public key JWK missing coordinates');
  }
  const x = Uint8Array.from(Buffer.from(jwk.x, 'base64url'));
  const y = Uint8Array.from(Buffer.from(jwk.y, 'base64url'));
  if (x.length !== 32 || y.length !== 32) {
    throw Error('KMS public key has unexpected coordinate length');
  }
  const uncompressed = new Uint8Array(65);
  uncompressed[0] = 0x04;
  uncompressed.set(x, 1);
  uncompressed.set(y, 33);
  return Secp256k1.compressPubkey(uncompressed);
};

/** Derive a bech32 address from a compressed secp256k1 pubkey. */
export const addressFromCompressedPubkey = (
  compressedPubkey: Uint8Array,
  prefix: string,
): string => toBech32(prefix, rawSecp256k1PubkeyToRawAddress(compressedPubkey));

const getDefaultKmsClient = async (): Promise<KmsSigningClient> => {
  const { KeyManagementServiceClient } = await import('@google-cloud/kms');
  return new KeyManagementServiceClient() as unknown as KmsSigningClient;
};

export interface MakeKmsDirectSignerOptions {
  /** Fully-qualified KMS CryptoKeyVersion resource name. */
  readonly keyVersionName: string;
  /** Bech32 prefix; defaults to `agoric`. */
  readonly prefix?: string;
  /** Injectable KMS client (mocked in tests); defaults to a real client. */
  readonly kmsClient?: KmsSigningClient;
}

/**
 * Build a CosmJS `OfflineDirectSigner` backed by a single KMS key version.
 *
 * The public key is fetched once (one KMS round-trip) and the derived address +
 * compressed pubkey are cached; each `signDirect` costs exactly one
 * `asymmetricSign` call. Drop-in wherever `DirectSecp256k1HdWallet` is used:
 * `SigningStargateClient.connectWithSigner` only calls `getAccounts` +
 * `signDirect`.
 */
export const makeKmsDirectSigner = async ({
  keyVersionName,
  prefix = 'agoric',
  kmsClient,
}: MakeKmsDirectSignerOptions): Promise<OfflineDirectSigner> => {
  // eslint-disable-next-line @jessie.js/safe-await-separator -- default client fallback
  const client = kmsClient ?? (await getDefaultKmsClient());

  const [publicKey] = await client.getPublicKey({ name: keyVersionName });
  if (!publicKey?.pem) {
    throw Error('KMS getPublicKey returned no PEM');
  }
  const compressedPubkey = compressedPubkeyFromPem(publicKey.pem);
  const address = addressFromCompressedPubkey(compressedPubkey, prefix);

  const accounts: readonly AccountData[] = [
    { address, algo: 'secp256k1', pubkey: compressedPubkey },
  ];

  const signer: OfflineDirectSigner = {
    getAccounts: async () => accounts,
    signDirect: async (signerAddress, signDoc) => {
      if (signerAddress !== address) {
        throw Error(
          `signerAddress ${signerAddress} does not match KMS address ${address}`,
        );
      }
      const digest = sha256(makeSignBytes(signDoc));
      const [signResponse] = await client.asymmetricSign({
        name: keyVersionName,
        digest: { sha256: digest },
      });
      const der = toBytes(signResponse?.signature);
      const sig64 = derToConcat(der);
      return {
        signed: signDoc,
        signature: encodeSecp256k1Signature(compressedPubkey, sig64),
      };
    },
  };

  return maybeHarden(signer);
};

export interface MakeStargateClientKitOptions extends MakeKmsDirectSignerOptions {
  /** Tendermint/CometBFT RPC endpoint used to broadcast. */
  readonly rpcAddr: string;
  /** Injectable connector (for tests); defaults to the real CosmJS connector. */
  readonly connectWithSigner?: typeof SigningStargateClient.connectWithSigner;
}

/**
 * Build a `SigningStargateClient` over the KMS signer with a registry that
 * knows `MsgWalletSpendAction` and `MsgProvision`, returning the
 * `{ address, client }` shape that the mnemonic-based path returns — a straight
 * substitute.
 *
 * The Agoric message types are loaded lazily from the published
 * `@agoric/cosmic-proto` so this module stays importable (for the pure unit
 * tests above) without a built copy of the workspace package.
 */
export const makeStargateClientKitFromKms = async ({
  keyVersionName,
  prefix = 'agoric',
  rpcAddr,
  kmsClient,
  connectWithSigner = SigningStargateClient.connectWithSigner,
}: MakeStargateClientKitOptions): Promise<{
  address: string;
  client: SigningStargateClient;
}> => {
  const signer = await makeKmsDirectSigner({ keyVersionName, prefix, kmsClient });
  const [{ address }] = await signer.getAccounts();

  const { MsgWalletSpendAction, MsgProvision } = await import(
    '@agoric/cosmic-proto/agoric/swingset/msgs.js'
  );
  const registry = new Registry([
    [
      AGORIC_WALLET_SPEND_ACTION_TYPE_URL,
      MsgWalletSpendAction as GeneratedType,
    ],
    [AGORIC_PROVISION_TYPE_URL, MsgProvision as GeneratedType],
  ]);

  const client = await connectWithSigner(rpcAddr, signer, { registry });
  return maybeHarden({ address, client });
};
