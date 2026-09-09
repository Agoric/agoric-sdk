export const MAINNET_RPC_ADDR_KLUDGE =
  'https://rpc.agoric-main-eu1.ccvalidators.com:443';

export const chooseRpcAddrMainGood = (
  env: Record<string, string | undefined>,
) => (env.AGORIC_NET === 'main' ? MAINNET_RPC_ADDR_KLUDGE : undefined);

export const withWalletAdminRpcKludge = <
  T extends { rpcAddrs: readonly string[] },
>(
  networkConfig0: T,
  rpcAddrMainGood: string | undefined,
): T =>
  rpcAddrMainGood
    ? { ...networkConfig0, rpcAddrs: [rpcAddrMainGood] }
    : networkConfig0;
