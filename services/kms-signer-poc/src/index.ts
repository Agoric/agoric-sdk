/**
 * Cloud Run (gen2) function entrypoint for the kms-signer-poc.
 *
 * This is the deployable proof that exercises the vendored KMS signer
 * (`./kms-direct-signer.ts`). It has no Dockerfile: Cloud Run functions build
 * the source with buildpacks. Deploy with a dedicated service-account granted
 * `roles/cloudkms.signerVerifier` on the key; `@google-cloud/kms` picks up ADC
 * from the metadata server, so no key files or mounted secrets are needed.
 *
 * Actions (request body `action`, defaulting from the other fields):
 * - `list`      — enumerate every configured wallet's index + address.
 * - (address)   — no `spendAction`/`action`: return one wallet's address, and
 *                 (when `RPC` is set) its BLD balance so you can see if it is funded.
 * - `provision` — self-submit `MsgProvision` (SMART_WALLET) for the wallet.
 * - (spend)     — `spendAction` present: broadcast `MsgWalletSpendAction`.
 *
 * A wallet is selected with `wallet` (an index into the configured key
 * versions, default 0). See designs/kms-backed-agoric-signing.md ("POC runbook").
 */
import * as functions from '@google-cloud/functions-framework';
import { fromBech32 } from '@cosmjs/encoding';
import { StargateClient } from '@cosmjs/stargate';

import type { StdFee } from '@cosmjs/stargate';

import { loadConfig, selectWalletIndex } from './config.ts';
import {
  AGORIC_PROVISION_TYPE_URL,
  AGORIC_WALLET_SPEND_ACTION_TYPE_URL,
  makeKmsDirectSigner,
  makeStargateClientKitFromKms,
} from './kms-direct-signer.ts';

/** The denom the wallet must hold to pay fees (and the provisioning charge). */
const FEE_DENOM = 'ubld';

/**
 * A reasonable default fee for a single WalletSpendAction, mirroring the
 * `client-utils` default (0.01 BLD at the recommended min gas price).
 */
const defaultFee: StdFee = {
  gas: '400000',
  amount: [{ denom: FEE_DENOM, amount: '10000' }],
};

/**
 * Provisioning a smart wallet runs SwingSet work, so it needs more gas than a
 * plain spend; keep the fee proportional at the same min gas price.
 */
const provisionFee: StdFee = {
  gas: '2500000',
  amount: [{ denom: FEE_DENOM, amount: '62500' }],
};

/**
 * HTTP handler `sign`. See the module comment for the action model. Wallet
 * funding is intentionally NOT automated: a fresh KMS wallet starts empty and
 * cannot fund itself, so BLD must arrive from a faucet or a funded account
 * first. This handler surfaces the balance and refuses to broadcast an unfunded
 * wallet rather than emitting an opaque chain error.
 */
functions.http('sign', async (req: functions.Request, res: functions.Response) => {
  try {
    const config = loadConfig(process.env);
    const { keyVersionNames, prefix, rpcAddr } = config;

    const body = (req.body ?? {}) as {
      spendAction?: unknown;
      action?: unknown;
      wallet?: unknown;
      nickname?: unknown;
    };
    const action = typeof body.action === 'string' ? body.action : undefined;
    const spendAction =
      typeof body.spendAction === 'string' ? body.spendAction : undefined;

    // `list`: enumerate every configured wallet so you can run N wallets from a
    // single deployment (one KMS key version per wallet — KMS keys are not
    // HD-derivable — but one function serves them all).
    if (action === 'list') {
      const wallets: {
        index: number;
        address: string;
        pubkey: string;
      }[] = [];
      for (let index = 0; index < keyVersionNames.length; index += 1) {
        // eslint-disable-next-line @jessie.js/safe-await-separator -- POC handler
        const signer = await makeKmsDirectSigner({
          keyVersionName: keyVersionNames[index],
          prefix,
        });
        const [{ address, pubkey }] = await signer.getAccounts();
        wallets.push({
          index,
          address,
          pubkey: Buffer.from(pubkey).toString('base64'),
        });
      }
      res.status(200).json({ wallets });
      return;
    }

    let index: number;
    try {
      index = selectWalletIndex(
        keyVersionNames.length,
        body.wallet ?? req.query?.wallet,
      );
    } catch (selErr) {
      res.status(400).json({
        error: selErr instanceof Error ? selErr.message : String(selErr),
      });
      return;
    }
    const keyVersionName = keyVersionNames[index];

    // Address (+ funding status) for one wallet: no spend, no provision.
    if (!spendAction && action !== 'provision') {
      const signer = await makeKmsDirectSigner({ keyVersionName, prefix });
      const [{ address, pubkey }] = await signer.getAccounts();
      const out: Record<string, unknown> = {
        walletIndex: index,
        walletCount: keyVersionNames.length,
        address,
        pubkey: Buffer.from(pubkey).toString('base64'),
      };
      if (rpcAddr) {
        const roClient = await StargateClient.connect(rpcAddr);
        try {
          const balance = await roClient.getBalance(address, FEE_DENOM);
          out.balance = balance;
          out.funded = balance.amount !== '0';
        } finally {
          roClient.disconnect();
        }
      }
      res.status(200).json(out);
      return;
    }

    if (!rpcAddr) {
      res.status(400).json({
        error: 'RPC must be configured to provision or broadcast a spendAction',
      });
      return;
    }

    const { address, client } = await makeStargateClientKitFromKms({
      keyVersionName,
      prefix,
      rpcAddr,
    });

    // A wallet cannot pay for a provision or a spend with no fee funds. Check
    // first and return actionable guidance instead of an opaque chain error.
    const balance = await client.getBalance(address, FEE_DENOM);
    if (balance.amount === '0') {
      res.status(409).json({
        error: `wallet ${address} holds no ${FEE_DENOM}; fund it (faucet or a funded account) before provisioning or spending`,
        address,
        balance,
      });
      return;
    }

    const owner = fromBech32(address).data;

    // Provision the smart wallet (self-submit): required before it can run
    // wallet actions. Idempotent on chain — provisioning an already-provisioned
    // wallet is a no-op error surfaced in the tx result.
    if (action === 'provision') {
      const { MsgProvision } = await import(
        '@agoric/cosmic-proto/agoric/swingset/msgs.js'
      );
      const nickname =
        typeof body.nickname === 'string' && body.nickname
          ? body.nickname
          : 'kms-wallet';
      const value = MsgProvision.fromPartial({
        nickname,
        address: owner,
        powerFlags: ['SMART_WALLET'],
        submitter: owner,
      });
      const result = await client.signAndBroadcast(
        address,
        [{ typeUrl: AGORIC_PROVISION_TYPE_URL, value }],
        provisionFee,
      );
      res.status(200).json({
        action: 'provision',
        address,
        transactionHash: result.transactionHash,
        code: result.code,
        height: result.height,
      });
      return;
    }

    // Spend: broadcast a MsgWalletSpendAction (the wallet must already be
    // provisioned and funded). This is the end-to-end proof.
    const { MsgWalletSpendAction } = await import(
      '@agoric/cosmic-proto/agoric/swingset/msgs.js'
    );
    const value = MsgWalletSpendAction.fromPartial({
      owner,
      spendAction,
    });
    const result = await client.signAndBroadcast(
      address,
      [{ typeUrl: AGORIC_WALLET_SPEND_ACTION_TYPE_URL, value }],
      defaultFee,
    );

    res.status(200).json({
      action: 'spend',
      address,
      transactionHash: result.transactionHash,
      code: result.code,
      height: result.height,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
