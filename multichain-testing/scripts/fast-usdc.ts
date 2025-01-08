#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init';
import { parseArgs } from 'node:util';
import type { ExecutionContext } from 'ava';
import { commonSetup } from '../test/support.js';
import { makeFeedPolicy, oracleMnemonics } from '../test/fast-usdc/config.js';
import { makeDenomTools } from '../tools/asset-info.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { AmountMath, type Brand } from '@agoric/ertp';
import { divideBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import type { USDCProposalShapes } from '@agoric/fast-usdc/src/pool-share-math.js';
import type { PoolMetrics } from '@agoric/fast-usdc/src/types.js';

const contractName = 'fastUsdc';
const contractBuilder =
  '../packages/builders/scripts/fast-usdc/init-fast-usdc.js';

const mockT = {
  log: console.log,
  is: (condition: unknown, expected: unknown, message: string) => {
    if (condition !== expected) {
      throw new Error(
        `Condition: ${message} failed. Expected ${expected} got ${condition}.`,
      );
    }
  },
} as unknown as ExecutionContext;

// from ../test/fast-usdc/fast-usdc.test.ts
type VStorageClient = Awaited<ReturnType<typeof commonSetup>>['vstorageClient'];
const agoricNamesQ = (vsc: VStorageClient) =>
  harden({
    brands: <K extends AssetKind>(_assetKind: K) =>
      vsc
        .queryData('published.agoricNames.brand')
        .then(pairs => Object.fromEntries(pairs) as Record<string, Brand<K>>),
  });

const fastLPQ = (vsc: VStorageClient) =>
  harden({
    metrics: () =>
      vsc.queryData(`published.fastUsdc.poolMetrics`) as Promise<PoolMetrics>,
    info: () =>
      vsc.queryData(`published.${contractName}`) as Promise<{
        poolAccount: string;
        settlementAccount: string;
      }>,
  });

const parseCommandLine = () => {
  const { values, positionals } = parseArgs({
    options: {
      oracle: {
        type: 'string',
      },
      mnemonic: {
        type: 'string',
      },
      help: {
        type: 'boolean',
      },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage:
  No arguments      - start the contract and fund the liquidity pool
  start             - only start the contract
  fund-pool         - fund the FUSDC Liquidity Pool
  provision-wallet  - provision a smart wallet (requires --mnemonic)
  fund-faucet       - fund the faucet account with bridged USDC
  --oracle          - Comma-separated list of oracle addresses

Examples:
  ./fast-usdc.ts
  ./fast-usdc.ts --oracle oracle1:addr1,oracle2:addr2
  ./fast-usdc.ts start
  ./fast-usdc.ts start --oracle oracle1:addr1,oracle2:addr2
  ./fast-usdc.ts fund-pool
  ./fast-usdc.ts fund-faucet
`);
    process.exit(0);
  }

  const command = positionals[0];
  const mnemonic = values.mnemonic;
  const suppliedOracles = values.oracle?.split(',');
  const oracles = suppliedOracles || [
    'oracle1:agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl',
    'oracle2:agoric1dh04lnl7epr7l4cpvqqprxvam7ewdswj7yv6ep',
    'oracle3:agoric1ujmk0492mauq2f2vrcn7ylq3w3x55k0ap9mt2p',
  ];

  return { command, mnemonic, oracles, provisionOracles: true };
};

const main = async () => {
  const { command, mnemonic, oracles, provisionOracles } = parseCommandLine();
  const {
    chainInfo,
    commonBuilderOpts,
    deleteTestKeys,
    faucetTools,
    provisionSmartWallet,
    setupTestKeys,
    startContract,
    vstorageClient,
  } = await commonSetup(mockT, '../config.fusdc.yaml');

  const assertProvisioned = async address => {
    try {
      await vstorageClient.queryData(`published.wallet.${address}.current`);
      return true;
    } catch {
      throw new Error(`${address} is not provisioned`);
    }
  };

  const provisionWallet = async mnemonic => {
    // provision-one must be called by the owner, so we need to add the key to the test keyring
    const keyname = 'temp';
    const address = (await setupTestKeys([keyname], [mnemonic]))[keyname];
    await provisionSmartWallet(address, {
      BLD: 100n,
      IST: 100n,
    });
    await deleteTestKeys([keyname]);
  };

  const start = async () => {
    if (!chainInfo.noble) {
      console.debug('Chain Infos', Object.keys(chainInfo));
      throw new Error(
        'Noble chain not running. Try `make start FILE=config.fusdc.yaml`',
      );
    }
    const { getTransferChannelId, toDenomHash } = makeDenomTools(chainInfo);
    const usdcDenom = toDenomHash('uusdc', 'noblelocal', 'agoric');
    const nobleAgoricChannelId = getTransferChannelId('agoriclocal', 'noble');
    if (!nobleAgoricChannelId)
      throw new Error('nobleAgoricChannelId not found');
    console.log('nobleAgoricChannelId', nobleAgoricChannelId);
    console.log('usdcDenom', usdcDenom);

    for (const oracle of oracles) {
      if (provisionOracles) {
        await provisionWallet(oracleMnemonics[oracle.split(':')[0]]);
      } else {
        console.log(`Confirming ${oracle} smart wallet provisioned...`);
        await assertProvisioned(oracle.split(':')[1]);
      }
    }

    await startContract(contractName, contractBuilder, {
      oracle: oracles,
      usdcDenom,
      feedPolicy: JSON.stringify(makeFeedPolicy(nobleAgoricChannelId)),
      ...commonBuilderOpts,
    });
  };

  const fundFaucet = async () => faucetTools.fundFaucet([['noble', 'uusdc']]);

  const fundLiquidityPool = async () => {
    await fundFaucet();
    const accounts = ['lp'];
    await deleteTestKeys(accounts).catch();
    const wallets = await setupTestKeys(accounts);
    const lpUser = await provisionSmartWallet(wallets['lp'], {
      USDC: 8_000n,
      BLD: 100n,
    });
    const lpDoOffer = makeDoOffer(lpUser);
    const { USDC } = await agoricNamesQ(vstorageClient).brands('nat');
    const { shareWorth } = await fastLPQ(vstorageClient).metrics();

    const LP_DEPOSIT_AMOUNT = 8_000n * 10n ** 6n;
    const give = { USDC: AmountMath.make(USDC as Brand, LP_DEPOSIT_AMOUNT) };
    const want = { PoolShare: divideBy(give.USDC, shareWorth) };
    const proposal: USDCProposalShapes['deposit'] = harden({ give, want });

    await lpDoOffer({
      id: `lp-deposit-${Date.now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeDepositInvitation']],
      },
      // @ts-expect-error 'NatAmount' vs 'AnyAmount'
      proposal,
    });
  };

  // Execute commands based on input
  switch (command) {
    case 'start':
      await start();
      break;
    case 'fund-pool':
      await fundLiquidityPool();
      break;
    case 'fund-faucet':
      await fundFaucet();
      break;
    case 'provision-wallet':
      if (!mnemonic) {
        throw new Error('--mnemonic is required for provision-wallet command');
      }
      await provisionWallet(mnemonic);
      break;
    default:
      // No command provided - run both start and fundLiquidityPool
      await start();
      await fundLiquidityPool();
  }
};

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});
