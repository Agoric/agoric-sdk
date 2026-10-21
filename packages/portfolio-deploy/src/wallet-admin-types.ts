/**
 * @file types for admin tool endowments
 *
 * @see '../scripts/wallet-admin.ts'
 */
import type {
  SigningSmartWalletKit,
  SmartWalletKit,
  reflectWalletStore,
  makeSigningSmartWalletKit,
} from '@agoric/client-utils';
import type { DeliverTxResponse } from '@cosmjs/stargate';
import type { FileRW } from '@agoric/pola-io/src/file.js';
import type { E } from '@endo/far';

export type SigningSmartWalletKitWithStore = SigningSmartWalletKit & {
  store: ReturnType<typeof reflectWalletStore>;
  lastTx?: DeliverTxResponse;
  txHistory?: readonly DeliverTxResponse[];
};

type ClientUtilsConnect = Parameters<
  typeof makeSigningSmartWalletKit
>[0]['connectWithSigner'];

type ConnectOpts = Parameters<ClientUtilsConnect>[2];

export interface RunTools {
  scriptArgs: string[];
  walletKit: SmartWalletKit;
  makeAccount(
    name: string,
    opts?: ConnectOpts,
  ): Promise<SigningSmartWalletKitWithStore>;
  fetch: typeof globalThis.fetch;
  setTimeout: typeof globalThis.setTimeout;
  E: typeof E;
  harden: typeof harden;
  cwd: FileRW;
}
