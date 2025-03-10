#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for local integration testing for FastUSDC. See USAGE.
 */
import '@endo/init';
import { parseArgs } from 'node:util';
import type { ExecutionContext } from 'ava';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { AmountMath, type Brand } from '@agoric/ertp';
import type { USDCProposalShapes } from '@agoric/fast-usdc/src/pool-share-math.js';
import { divideBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeDenomTools } from '../tools/asset-info.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { commonSetup } from '../test/support.js';
import {
  makeFeedPolicyPartial,
  oracleMnemonics,
} from '../test/fast-usdc/config.js';
import { agoricNamesQ, fastLPQ } from '../test/fast-usdc/fu-actors.js';

const USAGE = `
Usage:
  No arguments         - start the contract and fund the liquidity pool
  start                - only start the contract
  fund-pool            - fund the FUSDC Liquidity Pool
  provision-wallet     - provision a smart wallet (requires --mnemonic)
  fund-faucet          - fund the faucet account with bridged USDC
  register-forwarding  - register forwarding account on noble (requires --eud)
  --oracle             - Comma-separated list of oracle addresses


Examples:
  ./fast-usdc-tool.ts
  ./fast-usdc-tool.ts --oracle oracle1:addr1,oracle2:addr2
  ./fast-usdc-tool.ts start
  ./fast-usdc-tool.ts start --oracle oracle1:addr1,oracle2:addr2
  ./fast-usdc-tool.ts fund-pool
  ./fast-usdc-tool.ts fund-faucet
  ./fast-usdc-tool.ts register-forwarding  --eud osmo123
`;

const contractName = 'fastUsdc';
const contractBuilder =
  '../packages/builders/scripts/fast-usdc/start-fast-usdc.build.js';

/** ava test context partial, to appease dependencies expecting this */
const runT = {
  log: console.log,
  is: (actual: unknown, expected: unknown, message: string) => {
    if (actual !== expected) {
      throw new Error(
        `Condition: ${message} failed. Expected ${expected} got ${actual}.`,
      );
    }
  },
} as ExecutionContext;

const parseCommandLine = () => {
  const { values, positionals } = parseArgs({
    options: {
      eud: {
        type: 'string',
      },
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
    console.log(USAGE);
    return undefined;
  }

  const command = positionals[0];
  const mnemonic = values.mnemonic;
  const suppliedOracles = values.oracle?.split(',');
  const oracles = suppliedOracles || [
    'oracle1:agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl',
    'oracle2:agoric1dh04lnl7epr7l4cpvqqprxvam7ewdswj7yv6ep',
    'oracle3:agoric1ujmk0492mauq2f2vrcn7ylq3w3x55k0ap9mt2p',
  ];
  const eud = values.eud;

  return { command, eud, mnemonic, oracles, provisionOracles: true };
};

const main = async () => {
  const job = parseCommandLine();
  if (!job) return undefined;
  const { command, eud, mnemonic, oracles, provisionOracles } = job;
  const {
    chainInfo,
    commonBuilderOpts,
    deleteTestKeys,
    faucetTools,
    nobleTools,
    provisionSmartWallet,
    setupTestKeys,
    startContract,
    vstorageClient,
  } = await commonSetup(runT, { config: '../config.fusdc.yaml' });

  const assertProvisioned = async (address: string) => {
    try {
      await vstorageClient.queryData(`published.wallet.${address}.current`);
    } catch {
      throw new Error(`${address} is not provisioned`);
    }
  };

  const provisionWallet = async (mnemonic: string) => {
    // provision-one must be called by the owner, so we need to add the key to the test keyring
    const keyname = 'temp';
    const address = (await setupTestKeys([keyname], [mnemonic]))[keyname];
    try {
      await provisionSmartWallet(address, {
        BLD: 100n,
        IST: 100n,
      });
    } finally {
      await deleteTestKeys([keyname]);
    }
  };

  const start = async () => {
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
        // oracles must be provisioned before the contract starts
        await assertProvisioned(oracle.split(':')[1]);
      }
    }

    await startContract(contractName, contractBuilder, {
      oracle: oracles,
      usdcDenom,
      feedPolicy: JSON.stringify(makeFeedPolicyPartial(nobleAgoricChannelId)),
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
      proposal,
    });
  };

  const registerForwardingAccount = async (EUD: string) => {
    console.log('eud', EUD);
    const { settlementAccount } = await vstorageClient.queryData(
      `published.${contractName}`,
    );
    console.log('settlementAccount:', settlementAccount);

    const recipientAddress = encodeAddressHook(settlementAccount, {
      EUD,
    });
    console.log('recipientAddress:', recipientAddress);

    const { getTransferChannelId } = makeDenomTools(chainInfo);
    const nobleAgoricChannelId = getTransferChannelId('agoriclocal', 'noble');
    if (!nobleAgoricChannelId)
      throw new Error('nobleAgoricChannelId not found');

    const txRes = nobleTools.registerForwardingAcct(
      nobleAgoricChannelId,
      recipientAddress,
    );
    runT.is(txRes?.code, 0, 'registered forwarding account');

    const { address } = nobleTools.queryForwardingAddress(
      nobleAgoricChannelId,
      recipientAddress,
    );
    console.log('forwardingAddress:', address);
    return address;
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
    case 'register-forwarding':
      if (!eud) {
        throw new Error('--eud is required for register-forwarding command');
      }
      await registerForwardingAccount(eud);
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
