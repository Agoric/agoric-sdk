/**
 * Environment configuration for the kms-signer-poc Cloud Run function.
 *
 * No key material lives in the environment: `KMS_KEY_VERSION` is only a resource
 * path naming WHICH KMS key version signs. See designs/kms-backed-agoric-signing.md.
 */

/** Matches a fully-qualified GCP KMS CryptoKeyVersion resource name. */
export const KMS_KEY_VERSION_PATTERN =
  /^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+\/cryptoKeyVersions\/[^/]+$/;

export interface KmsSignerConfig {
  /**
   * Fully-qualified KMS CryptoKeyVersion resource name of the primary wallet
   * (index 0). A convenience alias for `keyVersionNames[0]`; kept so callers
   * that only ever run one wallet do not have to index the list.
   */
  readonly keyVersionName: string;
  /**
   * All configured KMS CryptoKeyVersion resource names, one per wallet/address.
   * Each version is a distinct KMS keypair (KMS keys are non-exportable and not
   * HD-derivable, so a wallet == a key version), but a SINGLE deployment can
   * manage several: a request selects which one signs by its index. Always has
   * at least one entry.
   */
  readonly keyVersionNames: readonly string[];
  /** Bech32 address prefix. */
  readonly prefix: string;
  /** Tendermint/CometBFT RPC endpoint (optional; required to broadcast). */
  readonly rpcAddr?: string;
  /** Agoric network spec (optional; informational for the POC). */
  readonly agoricNet?: string;
}

/**
 * Parse the configured key version(s). `KMS_KEY_VERSIONS` (comma- or
 * newline-separated) lists several wallets for one deployment; `KMS_KEY_VERSION`
 * remains the single-wallet form. Every entry must be a fully-qualified
 * CryptoKeyVersion resource name so a mistyped key ring or a bare key name fails
 * fast rather than at first sign.
 */
const parseKeyVersions = (
  env: Record<string, string | undefined>,
): string[] => {
  const multi = env.KMS_KEY_VERSIONS?.trim();
  const single = env.KMS_KEY_VERSION?.trim();
  const names = multi
    ? multi
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(Boolean)
    : single
      ? [single]
      : [];
  if (names.length === 0) {
    throw Error('KMS_KEY_VERSION is required');
  }
  for (const name of names) {
    if (!KMS_KEY_VERSION_PATTERN.test(name)) {
      throw Error(
        'KMS_KEY_VERSION must be a fully-qualified CryptoKeyVersion resource name ' +
          '(projects/<p>/locations/<l>/keyRings/<r>/cryptoKeys/<k>/cryptoKeyVersions/<n>)',
      );
    }
  }
  return names;
};

/**
 * Resolve a request's wallet selector to a valid index into the configured
 * key-version list. An absent selector defaults to the primary wallet (0); an
 * out-of-range or non-integer selector is rejected so a bad request fails
 * cleanly rather than silently signing with the wrong (or a missing) key.
 */
export const selectWalletIndex = (
  count: number,
  requested: unknown,
): number => {
  if (requested === undefined || requested === null || requested === '') {
    return 0;
  }
  const index =
    typeof requested === 'number' ? requested : Number(String(requested));
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw Error(
      `wallet ${String(requested)} out of range (have ${count} wallet(s): 0..${count - 1})`,
    );
  }
  return index;
};

/**
 * Build the POC config from an environment map. Validates the configured KMS
 * key version(s) (see `parseKeyVersions`).
 */
export const loadConfig = (
  env: Record<string, string | undefined>,
): KmsSignerConfig => {
  const keyVersionNames = parseKeyVersions(env);

  const prefix = env.PREFIX?.trim() || 'agoric';
  const rpcAddr = env.RPC?.trim() || undefined;
  const agoricNet = env.AGORIC_NET?.trim() || undefined;

  const h = (globalThis as { harden?: <U>(v: U) => U }).harden;
  const config: KmsSignerConfig = {
    keyVersionName: keyVersionNames[0],
    keyVersionNames,
    prefix,
    rpcAddr,
    agoricNet,
  };
  return h ? h(config) : config;
};
