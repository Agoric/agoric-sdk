/* eslint-env node */
/* global globalThis */

import {
  fetchEnvNetworkConfig,
  makeVStorage,
  pickEndpoint,
} from '@agoric/client-utils';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { queryFastUSDCLocalChainAccount } from '../util/agoric.js';
import { depositForBurn, makeProvider } from '../util/cctp.js';
import {
  makeSigner,
  queryForwardingAccount,
  registerFwdAccount,
} from '../util/noble.js';

/** @import { File } from '../util/file' */
/** @import { VStorage } from '@agoric/client-utils' */
/** @import { SigningStargateClient } from '@cosmjs/stargate' */
/** @import { JsonRpcProvider as ethProvider } from 'ethers' */

const transfer = async (
  /** @type {File} */ configFile,
  /** @type {string} */ amount,
  /** @type {string} */ EUD,
  out = console,
  fetch = globalThis.fetch,
  /** @type {VStorage | undefined} */ vstorage,
  /** @type {{signer: SigningStargateClient, address: string} | undefined} */ nobleSigner,
  /** @type {ethProvider | undefined} */ ethProvider,
  env = process.env,
) => {
  const execute = async (
    /** @type {import('./config').ConfigOpts} */ config,
  ) => {
    const netConfig = await fetchEnvNetworkConfig({ env, fetch });
    vstorage ||= makeVStorage(
      { fetch },
      { chainName: 'agoric', rpcAddrs: [pickEndpoint(netConfig)] },
    );
    const agoricAddr = await queryFastUSDCLocalChainAccount(vstorage, out);
    const encodedAddr = encodeAddressHook(agoricAddr, { EUD });
    out.log(`forwarding destination ${encodedAddr}`);

    const { exists, address } = await queryForwardingAccount(
      config.nobleApi,
      config.nobleToAgoricChannel,
      encodedAddr,
      out,
      fetch,
    );

    if (!exists) {
      nobleSigner ||= await makeSigner(config.nobleSeed, config.nobleRpc, out);
      const { address: signerAddress, signer } = nobleSigner;
      try {
        const res = await registerFwdAccount(
          signer,
          signerAddress,
          config.nobleToAgoricChannel,
          encodedAddr,
          out,
        );
        out.log(res);
      } catch (e) {
        out.error(
          `Error registering noble forwarding account for ${encodedAddr} on channel ${config.nobleToAgoricChannel}`,
        );
        throw e;
      }
    }

    ethProvider ||= makeProvider(config.ethRpc);
    await depositForBurn(
      ethProvider,
      config.ethSeed,
      config.tokenMessengerAddress,
      config.tokenAddress,
      address,
      amount,
      out,
    );
  };

  let config;
  await null;
  try {
    config = JSON.parse(await configFile.read());
  } catch {
    out.error(
      `No config found at ${configFile.path}. Use "config init" to create one, or "--home" to specify config location.`,
    );
    throw new Error();
  }
  await execute(config);
};

export default { transfer };
