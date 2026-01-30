/**
 * @file Shared YMax control-kit initialization.
 *
 * Scope: create a signing smart wallet kit and reflected wallet store to access
 * ymax control entries without ambient authority.
 */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  reflectWalletStore,
  type SmartWalletKit,
} from '@agoric/client-utils';
import { YMAX_CONTROL_WALLET_KEY } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { SigningStargateClient, type StdFee } from '@cosmjs/stargate';

type YMaxStartFn = typeof YMaxStart;
type WalletStoreSigner = Pick<
  Parameters<typeof reflectWalletStore>[0],
  'sendBridgeAction' | 'query'
>;

export const makeWalletKitFromEnv = async (
  {
    env,
    fetch,
    setTimeout,
  }: {
    env: typeof process.env;
    fetch: typeof globalThis.fetch;
    setTimeout: typeof globalThis.setTimeout;
  },
  {
    networkConfig,
    walletKitOptions = {},
    walletKitTransform,
  }: {
    networkConfig?: Parameters<typeof makeSmartWalletKit>[1];
    walletKitOptions?: Partial<Parameters<typeof makeSmartWalletKit>[0]>;
    walletKitTransform?: (kit: SmartWalletKit) => SmartWalletKit;
  } = {},
) => {
  await null;
  const effectiveNetworkConfig =
    networkConfig ?? (await fetchEnvNetworkConfig({ env, fetch }));
  const { delay: walletDelay, ...walletKitOpts } = walletKitOptions;
  const delay =
    walletDelay ||
    ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)));
  const walletKitBase = await makeSmartWalletKit(
    { fetch, delay, ...walletKitOpts },
    effectiveNetworkConfig,
  );
  const walletKit = walletKitTransform
    ? walletKitTransform(walletKitBase)
    : walletKitBase;

  return { networkConfig: effectiveNetworkConfig, walletKit };
};

export const makeSignerFromMnemonic = async (
  walletKit: SmartWalletKit,
  {
    mnemonic,
    connectWithSigner = SigningStargateClient.connectWithSigner,
  }: {
    mnemonic?: string;
    connectWithSigner?: typeof SigningStargateClient.connectWithSigner;
  },
) => {
  if (!mnemonic) throw Error('MNEMONIC not set');
  return makeSigningSmartWalletKit(
    {
      connectWithSigner,
      walletUtils: walletKit,
    },
    mnemonic,
  );
};

export const makeWalletStoreFromSigner = (
  signer: WalletStoreSigner,
  {
    setTimeout,
    now = Date.now,
    makeNonce,
    fee,
    log,
  }: {
    setTimeout: typeof globalThis.setTimeout;
    now?: () => number;
    makeNonce?: () => string;
    fee?: StdFee;
    log?: (...args: unknown[]) => void;
  },
) =>
  reflectWalletStore(signer, {
    setTimeout,
    log,
    makeNonce: makeNonce || (() => new Date(now()).toISOString()),
    fee,
  });

export const makeYmaxControlEntries = (
  walletStore: ReturnType<typeof reflectWalletStore>,
) => {
  const ymaxControl = walletStore.get<ContractControl<YMaxStartFn>>(
    YMAX_CONTROL_WALLET_KEY,
  );
  const ymaxControlForSaving = walletStore.getForSavingResults<
    ContractControl<YMaxStartFn>
  >(YMAX_CONTROL_WALLET_KEY);
  return { ymaxControl, ymaxControlForSaving };
};

export const makeYmaxControlKitForChain = async (
  {
    env,
    fetch,
    setTimeout,
    now = Date.now,
  }: {
    env: typeof process.env;
    fetch: typeof globalThis.fetch;
    setTimeout: typeof globalThis.setTimeout;
    now?: () => number;
  },
  {
    mnemonic = env.MNEMONIC,
    networkConfig,
    walletKitOptions,
    walletKitTransform,
    connectWithSigner,
    makeNonce,
    fee,
    log,
  }: {
    mnemonic?: string;
    networkConfig?: Parameters<typeof makeSmartWalletKit>[1];
    walletKitOptions?: Partial<Parameters<typeof makeSmartWalletKit>[0]>;
    walletKitTransform?: (kit: SmartWalletKit) => SmartWalletKit;
    connectWithSigner?: typeof SigningStargateClient.connectWithSigner;
    makeNonce?: () => string;
    fee?: StdFee;
    log?: (...args: unknown[]) => void;
  } = {},
) => {
  const { networkConfig: effectiveNetworkConfig, walletKit } =
    await makeWalletKitFromEnv(
      { env, fetch, setTimeout },
      { networkConfig, walletKitOptions, walletKitTransform },
    );

  const signer = await makeSignerFromMnemonic(walletKit, {
    mnemonic,
    connectWithSigner,
  });

  const walletStore = makeWalletStoreFromSigner(signer, {
    setTimeout,
    now,
    makeNonce,
    fee,
    log,
  });

  const { ymaxControl, ymaxControlForSaving } =
    makeYmaxControlEntries(walletStore);

  return {
    networkConfig: effectiveNetworkConfig,
    walletKit,
    signer,
    walletStore,
    ymaxControl,
    ymaxControlForSaving,
  } satisfies YmaxControlKit;
};

export const makeYmaxControlKitForSynthetic = (
  {
    setTimeout,
    now = Date.now,
  }: {
    setTimeout: typeof globalThis.setTimeout;
    now?: () => number;
  },
  {
    signer,
    makeNonce,
    fee,
    log,
  }: {
    signer: WalletStoreSigner;
    makeNonce?: () => string;
    fee?: StdFee;
    log?: (...args: unknown[]) => void;
  },
) => {
  const walletStore = makeWalletStoreFromSigner(signer, {
    setTimeout,
    now,
    makeNonce,
    fee,
    log,
  });
  const { ymaxControl, ymaxControlForSaving } =
    makeYmaxControlEntries(walletStore);
  return {
    signer,
    walletStore,
    ymaxControl,
    ymaxControlForSaving,
  } satisfies YmaxControlKit;
};

export interface YmaxControlKit {
  signer: WalletStoreSigner;
  walletStore: ReturnType<typeof reflectWalletStore>;
  ymaxControl: ReturnType<typeof makeYmaxControlEntries>['ymaxControl'];
  ymaxControlForSaving: ReturnType<
    typeof makeYmaxControlEntries
  >['ymaxControlForSaving'];
  walletKit?: SmartWalletKit;
  networkConfig?: Parameters<typeof makeSmartWalletKit>[1];
}
