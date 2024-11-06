import axios from 'axios';
import { readFile } from 'node:fs/promises';
import { depositForBurn } from '../util/cctp.js';
import { queryForwardingAccount, registerFwdAccount } from '../util/noble.js';
import { queryFastUSDCLocalChainAccount } from '../util/agoric.js';

const transfer = async (
  /** @type {import("fs").PathLike} */ configPath,
  /** @type {string} */ amount,
  /** @type {string} */ destination,
  out = console,
  get = axios.get,
) => {
  const execute = async (
    /** @type {import('./config').ConfigOpts} */ config,
  ) => {
    const agoricAddr = await queryFastUSDCLocalChainAccount(
      config.agoricApi,
      out,
    );
    const appendedAddr = `${agoricAddr}+${destination}`;
    out.log(`forwarding destination ${appendedAddr}`);

    const { exists, address } = await queryForwardingAccount(
      config.nobleApi,
      config.nobleToAgoricChannel,
      agoricAddr,
      out,
      get,
    );

    if (!exists) {
      try {
        const res = await registerFwdAccount(
          config.nobleSeed,
          config.nobleToAgoricChannel,
          config.nobleRpc,
          appendedAddr,
          out,
        );
        out.log(res);
      } catch (e) {
        out.error(e);
        out.error(
          `Error noble registering forwarding account for ${appendedAddr} on channel ${config.nobleToAgoricChannel}`,
        );
        return;
      }
    }

    await depositForBurn(
      config.ethRpc,
      config.ethSeed,
      config.tokenMessengerAddress,
      config.tokenAddress,
      address,
      amount,
      out,
    ).catch(out.error);
  };

  let config;
  await null;
  try {
    config = JSON.parse(await readFile(configPath, 'utf-8'));
  } catch {
    out.error(
      `No config found at ${configPath}. Use "config init" to create one, or "--home" to specify config location.`,
    );
    return;
  }
  await execute(config);
};

export default { transfer };
