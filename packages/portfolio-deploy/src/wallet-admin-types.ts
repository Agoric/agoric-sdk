/**
 * @file
 *
 * @see ymaxAdmin
 */
import type {
  SigningSmartWalletKit,
  SmartWalletKit,
  reflectWalletStore,
} from '@agoric/client-utils';
import type { FileRW } from '@agoric/pola-io/src/file.js';
import type { E } from '@endo/far';
import type { main as ymaxAdmin } from '../../../multichain-testing/scripts/ymax-admin.ts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const keepDocsTypesImported: undefined | typeof ymaxAdmin = undefined;

export type SigningSmartWalletKitWithStore = SigningSmartWalletKit & {
  store: ReturnType<typeof reflectWalletStore>;
};

export interface RunTools {
  scriptArgs: string[];
  walletKit: SmartWalletKit;
  makeAccount(name: string): Promise<SigningSmartWalletKitWithStore>;
  E: typeof E;
  harden: typeof harden;
  cwd: FileRW;
}
