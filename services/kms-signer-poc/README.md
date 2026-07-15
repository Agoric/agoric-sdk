# kms-signer-poc

**In one sentence:** this is a small web service (a Google Cloud function) that
signs Agoric blockchain transactions using a private key that is created inside
Google Cloud KMS and **never leaves it** — the service itself never sees the key.

It is a POC (proof of concept): a minimal, self-contained example, not a
production service. It is deployed as a Cloud Run gen2 **function**
(second-generation Cloud Run function; no `Dockerfile` — Google builds the code
for you).

This package is a standalone unit. It vendors its KMS signer helper
(`src/kms-direct-signer.ts`) and depends only on published packages, so it builds
and deploys from its own directory without a monorepo build. It does not modify
`@agoric/client-utils` or any other agoric-sdk package. See the approved design:
`designs/kms-backed-agoric-signing.md`.

> **Want wallets created automatically at runtime (e.g. one per user)?**
> This POC uses a fixed list of wallets set at deploy time. Creating wallets
> on demand is a supported extension — see
> [`docs/on-demand-wallets.md`](docs/on-demand-wallets.md).

---

## Glossary (read this first)

The runbook below uses these terms. If you are new to Google Cloud or to
blockchain signing, skim this once.

| Term | What it means |
| ---- | ------------- |
| **GCP** | Google Cloud Platform — Google's cloud. |
| **KMS** | Key Management Service — the GCP product that creates and holds cryptographic keys. |
| **HSM** | Hardware Security Module — tamper-resistant hardware inside KMS where the private key lives and never leaves. |
| **`gcloud`** | The Google Cloud command-line tool you run on your laptop. |
| **project** | A GCP project — the container that owns your keys, function, and billing. It has a project ID. |
| **region / location** | The datacenter area your resources live in, e.g. `us-central1`. |
| **key ring / key / key version** | KMS's three-level hierarchy. A *key ring* groups *keys*; each *key* has one or more *key versions*. **In this POC one key version = one wallet = one address.** |
| **SA (service account)** | A non-human identity a program runs as. The function runs as an SA. |
| **IAM** | Identity and Access Management — GCP's permission system (who can do what). |
| **ADC** | Application Default Credentials — how a program automatically finds its GCP identity without a key file. |
| **wallet / address** | An Agoric account. Its address looks like `agoric1abcd…` (this text format is called **bech32**). |
| **BLD** | The Agoric chain's fee/staking token. A wallet must hold some to pay transaction fees. |
| **ubld** | The smallest unit of BLD. **1 BLD = 1,000,000 ubld.** |
| **RPC endpoint** | The network address (a URL) of an Agoric node you send transactions to. |
| **provisioning** | A one-time on-chain step that turns a plain funded account into an Agoric **smart wallet** so it can run wallet actions. |
| **faucet** | A service on test networks that gives you free test tokens. |
| **tx** | Transaction. |
| **secp256k1** | The elliptic-curve algorithm Agoric/Cosmos keys use. KMS can generate and sign with these. |

---

## The big picture (what you will do)

You will run the POC in three clear phases, in this order:

1. **Create the wallets** — create at least two KMS keys. Each key gives you one
   wallet with one `agoric1…` address. *(You do this with `gcloud`.)*
2. **Fund each wallet** — send some test BLD to each address from a faucet or an
   already-funded account. **This step is external and manual: the service cannot
   fund itself** (a brand-new wallet is empty and cannot pay any fee).
3. **Provision each wallet, then use it** — ask the function to provision the
   wallet (**this is automatic — the function signs and submits it for you**) and
   then to sign/broadcast a transaction.

A wallet cannot be provisioned or used until it has been funded, and it cannot
sign transactions until it has been provisioned. So the order is always:
**create → fund → provision → use.**

---

## How the service is called

The function is one HTTP endpoint. You send it a JSON body (an HTTP `POST`). The
`action` field (or the presence of `spendAction`) selects what it does:

| Send this JSON body | What happens |
| ------------------- | ------------ |
| `{ "action": "list" }` | Returns every configured wallet's index and `agoric1…` address. |
| `{ "wallet": 0 }` (or empty body) | Returns one wallet's address; if `RPC` is set, also its BLD `balance` and a `funded` flag. |
| `{ "action": "provision", "wallet": 0 }` | The function signs and broadcasts the provisioning transaction for that wallet. |
| `{ "spendAction": "<json string>", "wallet": 0 }` | The function signs and broadcasts a wallet spend-action transaction. |

`wallet` is an **index** into your configured list of wallets, starting at `0`.
If you leave it out it defaults to `0`. `list` shows you which index is which
address.

---

## Runbook: deploy and test on Google Cloud (the primary path)

This is the main way to run the POC: on a real Cloud Run function. Local running
is possible too (see the last section) but is only secondary.

**Who can do this:** anyone with enough access to a GCP project. You do **not**
need any prior KMS, signing, or blockchain knowledge — follow the steps exactly.

### Before you start (prerequisites)

You need:

- A GCP project you can use, and permission to create KMS keys, service accounts,
  and Cloud Run functions in it. (If you can create keys you have enough.)
- The `gcloud` command-line tool installed and logged in:
  ```sh
  gcloud auth login
  gcloud auth application-default login
  ```
- The address of an Agoric **RPC endpoint** to talk to (for a test network, ask
  your team or use a public testnet RPC URL). Call it `<RPC_URL>` below.
- A way to get test **BLD** into an address: a **faucet** URL for your test
  network, or an already-funded account you can send from.

Throughout, replace anything in `<angle brackets>` with your real values.

### Step 0 — set your project and region

Pick a region (this guide uses `us-central1`) and set defaults so you do not have
to repeat them:

```sh
gcloud config set project <YOUR_PROJECT_ID>
export REGION=us-central1
```

### Step 1 — turn on the Google Cloud services you will use

```sh
gcloud services enable \
  cloudkms.googleapis.com \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 2 — create the wallets (at least two)

First create a **key ring** (a group to hold your keys):

```sh
gcloud kms keyrings create agoric-devnet --location "$REGION"
```

Now create **two keys** — this gives you **two wallets**. Each command creates a
signing key that KMS will use for secp256k1 signatures:

```sh
gcloud kms keys create wallet0 \
  --keyring agoric-devnet --location "$REGION" \
  --purpose asymmetric-signing \
  --default-algorithm ec-sign-secp256k1-sha256 \
  --protection-level hsm

gcloud kms keys create wallet1 \
  --keyring agoric-devnet --location "$REGION" \
  --purpose asymmetric-signing \
  --default-algorithm ec-sign-secp256k1-sha256 \
  --protection-level hsm
```

> **`--protection-level hsm` is required.** Cloud KMS only supports the
> `secp256k1` signing curve on **HSM** keys. Without this flag the key defaults
> to `SOFTWARE` and creation fails with
> `Algorithm EC_SIGN_SECP256K1_SHA256 is not supported for protection level: SOFTWARE`.
> HSM keys are billed at a higher rate and require an HSM-enabled `$REGION`
> (e.g. `us-east1`, `us-central1`, `europe-west1`, `asia-east1`, or the
> `us`/`europe`/`asia` multi-regions) — `global` will not work.

> Creating keys needs the `roles/cloudkms.admin` permission. That is on purpose:
> it is a different, more powerful permission than the one the running function
> gets (see Step 4). You only need admin for this one-time creation step.

Each key automatically has a first **key version** numbered `1`. That version is
what the function needs to know about. Its full name (its "resource name") looks
like:

```
projects/<YOUR_PROJECT_ID>/locations/<REGION>/keyRings/agoric-devnet/cryptoKeys/wallet0/cryptoKeyVersions/1
```

You can confirm the version exists and is ready with:

```sh
gcloud kms keys versions list --key wallet0 --keyring agoric-devnet --location "$REGION"
gcloud kms keys versions list --key wallet1 --keyring agoric-devnet --location "$REGION"
```

Wait until each shows state `ENABLED` before continuing.

### Step 3 — create the identity the function runs as

The function runs as a **service account** (SA). Create one dedicated to this
POC:

```sh
gcloud iam service-accounts create kms-signer-poc \
  --display-name "KMS signer POC runtime"
```

Its email address will be:

```
kms-signer-poc@<YOUR_PROJECT_ID>.iam.gserviceaccount.com
```

Give that SA permission to **sign with each key** — and nothing more (this is
least privilege: it can sign, it cannot create or delete keys):

```sh
SA=kms-signer-poc@<YOUR_PROJECT_ID>.iam.gserviceaccount.com

gcloud kms keys add-iam-policy-binding wallet0 \
  --keyring agoric-devnet --location "$REGION" \
  --member "serviceAccount:$SA" \
  --role roles/cloudkms.signerVerifier

gcloud kms keys add-iam-policy-binding wallet1 \
  --keyring agoric-devnet --location "$REGION" \
  --member "serviceAccount:$SA" \
  --role roles/cloudkms.signerVerifier
```

### Step 4 — write the function's configuration file

The function is configured entirely through environment variables (see the
[Configuration](#configuration) table). Because the wallet list contains commas,
the cleanest way to pass it is a small YAML file rather than the command line.

Create a file named `env.yaml` (fill in your project ID, region, and RPC URL):

```yaml
KMS_KEY_VERSIONS: "projects/<YOUR_PROJECT_ID>/locations/us-central1/keyRings/agoric-devnet/cryptoKeys/wallet0/cryptoKeyVersions/1,projects/<YOUR_PROJECT_ID>/locations/us-central1/keyRings/agoric-devnet/cryptoKeys/wallet1/cryptoKeyVersions/1"
RPC: "<RPC_URL>"
```

`KMS_KEY_VERSIONS` lists **both** wallet key versions separated by a comma — this
is what makes one deployment serve two wallets. `RPC` is required so the function
can check balances, provision, and broadcast.

### Step 5 — deploy the function

From the **repository root**, deploy the code in this directory:

```sh
gcloud functions deploy kms-signer-poc \
  --gen2 \
  --runtime nodejs22 \
  --region "$REGION" \
  --trigger-http \
  --entry-point sign \
  --source services/kms-signer-poc \
  --service-account "kms-signer-poc@<YOUR_PROJECT_ID>.iam.gserviceaccount.com" \
  --env-vars-file services/kms-signer-poc/env.yaml \
  --allow-unauthenticated
```

Notes:

- `--entry-point sign` matches the handler exported in `src/index.ts`.
- `--allow-unauthenticated` makes the URL callable without a Google login token.
  That is fine for a throwaway POC. **For anything real, drop that flag** and
  call the function with an identity token instead (shown below).
- Google builds and installs the code for you (no `Dockerfile`). The function
  authenticates to KMS automatically via ADC — no key files, no secrets.

Get the function's URL and save it:

```sh
export URL=$(gcloud functions describe kms-signer-poc --gen2 --region "$REGION" \
  --format='value(serviceConfig.uri)')
echo "$URL"
```

### Step 6 — get your two wallet addresses

Ask the function to list its wallets:

```sh
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"list"}'
```

> If you deployed **without** `--allow-unauthenticated`, add an auth header to
> every `curl`:
> `-H "Authorization: bearer $(gcloud auth print-identity-token)"`
> (the caller also needs the `roles/run.invoker` role on the function).

You will get back two wallets, each with an `index` (0 and 1) and an `address`
(`agoric1…`). Copy both addresses.

### Step 7 — fund each wallet (external, manual)

**The service cannot do this for you.** A brand-new wallet is empty and cannot
pay any fee, so BLD has to come from outside:

- On a **test network**, use the network's **faucet**: give it each `agoric1…`
  address to receive test BLD. (Faucets are usually a web page or a simple HTTP
  request; use the one for your network.)
- Or send from an already-funded account, for example with the `agd` tool:
  ```sh
  agd tx bank send <funder-address> <wallet-address> 25000000ubld \
    --from <funder-key> --chain-id <chain-id> --node <RPC_URL> --yes
  ```
  (`25000000ubld` = 25 BLD, enough for provisioning plus some spends.)

Do this for **both** addresses. Then confirm each is funded by asking the
function (it reports the balance because `RPC` is set):

```sh
curl -s -X POST "$URL" -H "Content-Type: application/json" -d '{"wallet":0}'
curl -s -X POST "$URL" -H "Content-Type: application/json" -d '{"wallet":1}'
```

Look for `"funded": true` in each response before continuing. If you provision or
spend on an unfunded wallet, the function refuses with a clear "fund it first"
error instead of a confusing chain failure.

### Step 8 — provision each wallet (automatic)

Provisioning turns each funded account into an Agoric smart wallet. **The
function does this for you** — it signs the provisioning transaction with the KMS
key and broadcasts it:

```sh
curl -s -X POST "$URL" -H "Content-Type: application/json" \
  -d '{"action":"provision","wallet":0}'

curl -s -X POST "$URL" -H "Content-Type: application/json" \
  -d '{"action":"provision","wallet":1}'
```

A successful response includes a `transactionHash` and `"code": 0`. **This is
the key proof of the POC:** a real Agoric transaction was signed by a key that
never left Google Cloud KMS and landed on chain. (`code: 0` means success; a
non-zero code, e.g. from provisioning a wallet that is already provisioned, is
reported back to you.)

### Step 9 — (optional, advanced) sign a spend action

To exercise a full wallet spend, send a `spendAction` (a stringified Agoric
wallet action). The wallet must already be provisioned (Step 8):

```sh
curl -s -X POST "$URL" -H "Content-Type: application/json" \
  -d '{"spendAction":"<stringified-wallet-action>","wallet":0}'
```

Crafting a valid `spendAction` payload is Agoric-specific and beyond this POC's
scope; a successful **provision** in Step 8 already demonstrates KMS-backed
signing end to end.

### Step 10 — clean up (optional)

When you are done, remove what you created so it stops costing money:

```sh
gcloud functions delete kms-signer-poc --gen2 --region "$REGION"
```

KMS key material can only be **scheduled** for destruction, not deleted
instantly; destroy individual key versions from the Cloud Console or with
`gcloud kms keys versions destroy` if you no longer need the wallets.

---

## Configuration

The function reads these environment variables (set them in `env.yaml`, Step 4):

| Env var           | Required | Description                                                                            |
| ----------------- | -------- | -------------------------------------------------------------------------------------- |
| `KMS_KEY_VERSION` | yes\*    | Full KMS key-version resource name for **one** wallet.                                  |
| `KMS_KEY_VERSIONS`| yes\*    | Comma- or newline-separated list of resource names to run **several** wallets from one deploy. |
| `PREFIX`          | no       | Address prefix (bech32); defaults to `agoric`.                                          |
| `RPC`             | no       | Agoric RPC endpoint URL; **required** to provision, broadcast, or report balances.     |
| `AGORIC_NET`      | no       | Network name; informational only.                                                      |

\* Provide exactly one of `KMS_KEY_VERSION` (single wallet) or `KMS_KEY_VERSIONS`
(several). Both are resource **paths**, never key material, e.g.
`projects/<proj>/locations/<loc>/keyRings/<ring>/cryptoKeys/<key>/cryptoKeyVersions/<n>`.

## Why each wallet is its own KMS key

A GCP KMS key version **is** one secp256k1 keypair, so it maps to exactly one
`agoric1…` address. The private key never leaves KMS and is **not** HD/BIP-32
derivable (there is no single seed from which many child addresses descend), so
**each wallet is its own key version.** That is the deliberate custody tradeoff of
non-exportable keys: you give up cheap "derive many addresses from one seed" in
exchange for keeping every key inside the HSM.

Scaling is therefore operational, not one-key-many-addresses: create N key
versions (or N keys), list them all in `KMS_KEY_VERSIONS`, and a single deployed
function manages them (that is exactly what Step 2 does with two). Rotating a key
mints a new version and therefore a new address, so rotation is a migration, not a
transparent swap. To create wallets **at runtime** instead of at deploy time, see
[`docs/on-demand-wallets.md`](docs/on-demand-wallets.md).

## What the code does (reference)

- `src/kms-direct-signer.ts` — a CosmJS `OfflineDirectSigner` whose `signDirect`
  delegates to KMS `asymmetricSign` (`EC_SIGN_SECP256K1_SHA256`). It fetches the
  public key once, derives the `agoric1…` address, converts KMS's DER signature to
  a 64-byte compact `r||s` (KMS already returns low-S), and returns a CosmJS
  `StdSignature`. `makeStargateClientKitFromKms` wraps it in a
  `SigningStargateClient` with a registry that knows `MsgWalletSpendAction`.
- `src/index.ts` — the functions-framework HTTP entrypoint `sign`. Selects a
  wallet (`wallet` index), returns its address and (when `RPC` is set) its BLD
  balance; enumerates all wallets (`action: "list"`); provisions the smart wallet
  (`action: "provision"`); or signs and broadcasts a `MsgWalletSpendAction`
  (`spendAction`).
- `src/config.ts` — reads `KMS_KEY_VERSION` / `KMS_KEY_VERSIONS`, `PREFIX`,
  `RPC`, `AGORIC_NET`. No key material in the environment.

## Run and test locally (secondary)

Cloud deployment above is the primary path. If you want to run the code on your
own machine instead:

```sh
yarn install     # from the repo root (workspace) or standalone in this dir
yarn test        # unit tests (no GCP calls)
yarn lint        # eslint + tsgo typecheck
yarn build       # tsc -> dist/
```

To run the function locally against real KMS, first log in with ADC
(`gcloud auth application-default login`), export the same env vars you put in
`env.yaml`, then:

```sh
yarn start       # serves the `sign` function on http://localhost:8080
curl -s -X POST http://localhost:8080 -H "Content-Type: application/json" -d '{"action":"list"}'
```

Integration tests that need a real KMS key are skipped unless
`RUN_KMS_INTEGRATION` is set (see `test/kms.integration.test.ts`).

## Custody notes

- No seed phrase: wallet continuity == KMS key durability + IAM. Document backup
  and key rotation; rotation mints a new address.
- The KMS wallet must hold BLD to pay fees, like any account.
- Creating keys (`roles/cloudkms.admin`) is a separate, more powerful permission
  from signing (`roles/cloudkms.signerVerifier`). Keep them on separate identities
  as this runbook does.
