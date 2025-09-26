import '@endo/init/pre-remoting.js';
import './shims.cjs';
import './lockdown.js';
import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { SigningStargateClient } from '@cosmjs/stargate';
import { loadConfig } from './config.ts';
import { resolvePendingTx } from './resolver.ts';
import { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import dotenv from 'dotenv';
dotenv.config();

const txId = 'tx2';
const txComplete = true;
const resolveManually = async ({
  env = process.env,
  fetch = globalThis.fetch,
  setTimeout = globalThis.setTimeout,
  connectWithSigner = SigningStargateClient.connectWithSigner,
} = {}) => {
  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(() => {});
  const simplePowers = { fetch, setTimeout, delay };

  const config = await loadConfig(env);

  const networkConfig = await fetchEnvNetworkConfig({
    env: { AGORIC_NET: config.cosmosRest.agoricNetworkSpec },
    fetch,
  });

  const walletUtils = await makeSmartWalletKit(simplePowers, networkConfig);
  const signingSmartWalletKit = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    config.mnemonic,
  );
  console.warn('Signer address:', signingSmartWalletKit.address);

  await resolvePendingTx({
    signingSmartWalletKit,
    txId,
    status: txComplete ? TxStatus.SUCCESS : TxStatus.FAILED,
  });
};

resolveManually();
