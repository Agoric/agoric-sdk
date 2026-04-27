import type { SigningStargateClient } from '@cosmjs/stargate';
import {
  makeSigningSmartWalletKitFromClient,
  type SmartWalletKit,
} from '@agoric/client-utils';
import makeStargateClientKit from './stargate-client.ts';

const makeSigningSmartWalletKit = async (
  {
    connectWithSigner,
    walletUtils,
  }: {
    connectWithSigner: typeof SigningStargateClient.connectWithSigner;
    walletUtils: SmartWalletKit;
  },
  MNEMONIC: string,
) => {
  const { address, client } = await makeStargateClientKit(MNEMONIC, {
    connectWithSigner,
    now: Date.now,
    rpcAddresses: walletUtils.networkConfig.rpcAddrs,
  });

  return makeSigningSmartWalletKitFromClient({
    address,
    client,
    smartWalletKit: walletUtils,
  });
};

harden(makeSigningSmartWalletKit);

export default makeSigningSmartWalletKit;
