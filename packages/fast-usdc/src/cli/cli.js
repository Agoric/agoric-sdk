/* eslint-env node  */
/* global globalThis */
import '@endo/init/legacy.js';
import { Command, InvalidArgumentError } from 'commander';
import { readFileSync as loadTextModule } from 'fs';
import { createRequire } from 'node:module';
import { homedir } from 'os';
import { AmountMath } from '@agoric/ertp';
import {
  assertParsableNumber,
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { makeTendermintRpcClient } from '@agoric/casting';
import { SigningStargateClient } from '@cosmjs/stargate';
import configLib from './config.js';
import transferLib from './transfer.js';
import { makeLCD } from './cosmos-api.js';
import { makeVStorage } from './vstorage-client.js';
import { makeWatcher } from './chain-watcher.js';
import { makeWalletMessageBy } from './wallet-message.js';

/**
 * @import {USDCProposalShapes} from '../pool-share-math.js'
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js'
 * @import {FastUsdcSF} from '../fast-usdc.contract.js'
 * @import {ToCapData} from '@endo/marshal'
 */

const nodeRequire = createRequire(import.meta.url);

const packageJson = JSON.parse(
  loadTextModule(nodeRequire.resolve('../../package.json'), 'utf8'),
);

const { fromEntries } = Object;

const defaultHome = homedir(); // XXX IO at module-init time (reading process.env)

/**
 * @param {object} opts
 * @param {string} opts.giveNumeral
 * @param {Brand<'nat'>} opts.USDC
 * @param {string} opts.id
 */
export const makeDepositOfferSpec = ({ giveNumeral, USDC, id }) => {
  const { make } = AmountMath;
  const unit = make(USDC, 10n ** 6n); // TODO: get decimals from vbank or boardAux
  const giveRatio = parseRatio(giveNumeral, USDC);
  const give = { USDC: multiplyBy(unit, giveRatio) };

  // TODO: fetch shareWorth and want that much
  /** @type {USDCProposalShapes['deposit']} */
  const proposal = harden({ give });

  /** @type {keyof Awaited<ReturnType<FastUsdcSF>>['publicFacet']} */
  const depositMethod = 'makeDepositInvitation';

  /** @type {OfferSpec} */
  const offer = {
    id,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['FastUSDC'], // TODO: sync w/core-eval
      callPipe: [[depositMethod]],
    },
    proposal,
  };
  return offer;
};

export const initProgram = (
  configHelpers = configLib,
  transferHelpers = transferLib,
  { fetch = globalThis.fetch, now = () => Date.now(), env = process.env } = {},
) => {
  const program = new Command();

  program
    .name('fast-usdc')
    .description('CLI to interact with Fast USDC liquidity pool')
    .version(packageJson.version)
    .option(
      '--home <path>',
      `Home directory to use for config`,
      `${defaultHome}/.fast-usdc/`,
    );

  const config = program.command('config').description('Manage config');

  const configFile = 'config.json';
  const getConfigPath = () => {
    const { home: configDir } = program.opts();
    return configDir + configFile;
  };

  config
    .command('show')
    .description('Show current config')
    .action(async () => {
      const configPath = getConfigPath();

      await configHelpers.show(configPath);
    });

  config
    .command('init')
    .description('Set initial config values')
    .requiredOption(
      '--noble-seed <seed>',
      'Seed phrase for Noble account. CAUTION: Stored unencrypted in file system',
    )
    .requiredOption(
      '--eth-seed <seed>',
      'Seed phrase for Ethereum account. CAUTION: Stored unencrypted in file system',
    )
    .option('--agoric-api [url]', 'Agoric API endpoint', '127.0.0.1:1317')
    .option('--noble-api [url]', 'Noble API endpoint', '127.0.0.1:1318')
    .option(
      '--noble-to-agoric-channel [channel]',
      'Channel ID on Noble for Agoric',
      'channel-21',
    )
    .option('--noble-rpc [url]', 'Noble RPC endpoint', '127.0.0.1:26657')
    .option('--eth-rpc [url]', 'Ethereum RPC Endpoint', '127.0.0.1:8545')
    .option(
      '--token-messenger-address [address]',
      'Address of TokenMessenger contract',
      '0xbd3fa81b58ba92a82136038b25adec7066af3155',
    )
    .option(
      '--token-contract-address [address]',
      'Address of USDC token contract',
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    )
    .action(async options => {
      const { home: configDir } = program.opts();
      const configPath = getConfigPath();

      await configHelpers.init(configDir, configPath, options);
    });

  config
    .command('update')
    .description('Update config values')
    .option(
      '--noble-seed [string]',
      'Seed phrase for Noble account. CAUTION: Stored unencrypted in file system',
    )
    .option(
      '--eth-seed [string]',
      'Seed phrase for Ethereum account. CAUTION: Stored unencrypted in file system',
    )
    .option('--agoric-api [url]', 'Agoric API endpoint')
    .option('--noble-rpc [url]', 'Noble RPC endpoint')
    .option('--eth-rpc [url]', 'Ethereum RPC Endpoint')
    .option('--noble-api [url]', 'Noble API endpoint')
    .option(
      '--noble-to-agoric-channel [channel]',
      'Channel ID on Noble for Agoric',
    )
    .option(
      '--token-messenger-address [address]',
      'Address of TokenMessenger contract',
    )
    .option(
      '--token-contract-address [address]',
      'Address of USDC token contract',
    )
    .action(async options => {
      const configPath = getConfigPath();

      await configHelpers.update(configPath, options);
    });

  /** @param {string} value */
  const parseDecimal = value => {
    try {
      assertParsableNumber(value);
    } catch (cause) {
      throw new InvalidArgumentError('Not a decimal number.', { cause });
    }
    return value;
  };

  const getEnvArg = name => {
    const value = env[name];
    if (!value) {
      throw new InvalidArgumentError(`${name} not set`);
    }
    return value;
  };

  /**
   * @param {string} str
   * @returns {'auto' | number}
   */
  const parseFee = str => {
    if (str === 'auto') return 'auto';
    try {
      const num = parseFloat(str);
      return num;
    } catch (err) {
      throw new InvalidArgumentError(err.message);
    }
  };

  program
    .command('deposit')
    .description('Offer assets to the liquidity pool')
    .argument('<give>', 'USDC to give', parseDecimal)
    // TODO: .option('want', ...) for shares
    .option('--id', 'offer id', `deposit-${now()}`)
    .option('--agoric-api [url]', 'Agoric API endpoint', '127.0.0.1:1317')
    .option('--agoric-rpc', 'agoric rpc endpoint URL', 'http://localhost:26657')
    .option(
      '--mnemonic-env-var',
      'env var for mnemonic',
      'UNSAFE_DEPOSIT_MNEMONIC',
    )
    .option('--fee', 'cosmos fee', parseFee)
    .action(
      /**
       * @param {string} giveNumeral
       * @param {{
       *   id: string;
       *   agoricApi: string;
       *   agoricRpc: string;
       *   fee: ReturnType<typeof parseFee>;
       *   mnemonicEnvVar: string
       * }} opts
       */
      async (giveNumeral, opts) => {
        const api = makeLCD(opts.agoricApi, { fetch });
        const vstorage = makeVStorage(api);
        const watcher = makeWatcher(vstorage);
        const brandEntries = await watcher.queryOnce(
          'published.agoricNames.brand',
        );
        const { IST: USDC } = fromEntries(brandEntries); // KLUDGE @@@@

        const offer = makeDepositOfferSpec({ giveNumeral, USDC, id: opts.id });

        const bigintReplacer = (k, v) => (typeof v === 'bigint' ? `${v}` : v);
        console.info('offerSpec', JSON.stringify(offer, bigintReplacer, 2));

        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
          getEnvArg(opts.mnemonicEnvVar),
          { prefix: 'agoric' },
        );
        const [{ address }] = await wallet.getAccounts();

        const walletMessage = makeWalletMessageBy(
          address,
          { method: 'executeOffer', offer },
          watcher.marshaller.toCapData,
        );

        console.info('message', JSON.stringify(walletMessage, undefined, 2));

        const rpcClient = makeTendermintRpcClient(opts.agoricRpc, fetch);
        const clientWithSigner = await SigningStargateClient.createWithSigner(
          rpcClient, // XXX what's up with RPC client types??
          wallet,
        );

        const sent = await clientWithSigner.signAndBroadcast(
          address,
          [walletMessage],
          opts.fee,
        );
        console.log('offer sent', sent);
        console.error('TODO poll for tx in block, offer result');
      },
    );

  program
    .command('withdraw')
    .description('Withdraw assets from the liquidity pool')
    .action(() => {
      console.error('TODO actually send withdrawal');
      // TODO: Implement withdraw logic
    });

  program
    .command('transfer')
    .description('Transfer USDC from Ethereum/L2 to Cosmos via Fast USDC')
    .argument('amount', 'Amount to transfer denominated in uusdc')
    .argument('dest', 'Destination address in Cosmos')
    .action(
      async (
        /** @type {string} */ amount,
        /** @type {string} */ destination,
      ) => {
        const configPath = getConfigPath();
        await transferHelpers.transfer(configPath, amount, destination);
      },
    );

  return program;
};
