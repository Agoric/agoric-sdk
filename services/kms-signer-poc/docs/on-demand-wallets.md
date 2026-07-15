# Creating wallets on demand (programmatic extension)

This POC ships with a **fixed roster** of wallets: you list one or more KMS key
versions in the `KMS_KEY_VERSIONS` environment variable at deploy time, and the
function serves exactly those. That is a convenience for a demo, **not** a limit
of the approach.

A common real-world need is different: a service that **creates a new wallet on
demand**, for example one per user as users sign up. This document explains how
that extension works and what you would build for it. It is written as a design
sketch for a follow-up; **none of it is implemented in this POC**, which stays
scoped to demonstrating KMS-backed signing for a fixed set of wallets.

## Terms

- **KMS** — Google Cloud Key Management Service, the service that holds the keys.
- **HSM** — Hardware Security Module, the tamper-resistant hardware inside KMS
  where the private keys live and never leave.
- **key / key version** — in KMS a *key* is a named container; each *key version*
  is one actual keypair. In this POC **one key version == one wallet == one
  `agoric1…` address**.
- **IAM** — Identity and Access Management, Google Cloud's permission system.
- **SA (service account)** — a non-human identity that a program runs as, with
  its own set of IAM permissions.

## Why on-demand creation is possible

Only `src/config.ts` reads the `KMS_KEY_VERSIONS` list. It exists so a deployed
function has a known set of wallets to enumerate and index. The signing core does
**not** depend on that list:

- `makeKmsDirectSigner` and `makeStargateClientKitFromKms` in
  `src/kms-direct-signer.ts` each take a single `keyVersionName`.

So moving from a fixed roster to on-demand wallets just means **supplying the key
version at request time** (looked up from a datastore) instead of reading it from
an environment-configured array.

## How to create a wallet at runtime

Google Cloud KMS has an admin API for exactly this. At runtime you would:

1. Call `KeyManagementServiceClient.createCryptoKey` with purpose
   `ASYMMETRIC_SIGN`, algorithm `EC_SIGN_SECP256K1_SHA256`, and
   **`protectionLevel: 'HSM'`** in the version template (or
   `createCryptoKeyVersion` on an existing HSM key). The `HSM` protection level
   is required — `secp256k1` is not supported on `SOFTWARE` keys. KMS mints a
   fresh, non-exportable secp256k1 keypair inside the HSM.
2. **Poll until the version's state is `ENABLED`.** New key versions are created
   asynchronously and start in `PENDING_GENERATION`.
3. Call `getPublicKey`, then derive the `agoric1…` address from the public key
   using the helpers this POC already provides:
   `compressedPubkeyFromPem` + `addressFromCompressedPubkey`
   (both in `src/kms-direct-signer.ts`).
4. Persist the mapping `{ userId -> cryptoKeyVersion resource name }` in your own
   datastore.
5. Return the new `agoric1…` address to the caller.

Sketch of a new HTTP action:

```
POST { "action": "createWallet", "userId": "..." }
  -> kms.createCryptoKey(...)        // or createCryptoKeyVersion(...)
  -> poll until state === ENABLED    // versions generate asynchronously
  -> getPublicKey -> derive address
  -> persist { userId -> cryptoKeyVersion resource name }
  -> return { address }
```

## Three things a real service needs (beyond this POC)

1. **An IAM permission split.** Creating keys needs the `roles/cloudkms.admin`
   role (`cryptoKeys.create` / `cryptoKeyVersions.create`). That is deliberately
   separate from the runtime signing service account, which should only hold
   `roles/cloudkms.signerVerifier`. A dedicated "wallet factory" path or service
   account keeps the always-on signing hot path from ever holding admin rights.

2. **A user-to-key mapping store.** KMS holds the keys but is not your user
   directory. You need Firestore / Datastore / Secret Manager / a database to map
   a user (or request) to its KMS key version resource name. This store replaces
   the environment list and becomes the source of truth that the `list` action
   reads from.

3. **Async generation and quota awareness.** New versions start in
   `PENDING_GENERATION` and flip to `ENABLED`, so always poll before the first
   `getPublicKey` or sign. Mind KMS quotas (versions per key, keys per key ring
   and per project). Key material can only be *scheduled* for destruction, not
   deleted instantly. For large or churny user counts, **one key per user** (or a
   key ring per tenant) usually scales better than piling many versions onto one
   key.

## Still required per wallet

Creating the key is only the first step. Every freshly created wallet still needs
the same **fund -> provision -> spend** sequence described in the main
[README runbook](../README.md): a new wallet starts empty, must be funded with
BLD from outside, and must be provisioned before it can run wallet actions.

## Status

This is a clean extension of the design, not a fix to it. If you want the
on-demand "wallet factory" built, it is worth its own design and issue: it would
spec the `createWallet` action, the user-to-key mapping store, and the IAM split
above.
