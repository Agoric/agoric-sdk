/** @file upgrade ymax using ymaxControl */
/* eslint-disable @jessie.js/safe-await-separator */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import { makeTendermint34Client } from '@agoric/client-utils';
import type { DeliverTxResponse } from '@cosmjs/stargate';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';
import {
  WALLET_KEY,
  checkContract,
  netOfConfig,
} from './ymax-admin-helpers.ts';

const options = {
  contract: { type: 'string', default: 'ymax0' },
  bundle: { type: 'string' },
  overrides: { type: 'string' },
  'result-file': { type: 'string' },
} as const;

type BlockInfo = { height: number; hash: string; time: string };

const upgradeYmax = async (tools: RunTools) => {
  const { scriptArgs, makeAccount, cwd, fetch, setTimeout } = tools;
  const { values } = parseArgs({ args: scriptArgs, options });
  const {
    contract,
    bundle: bundleId,
    overrides,
    'result-file': resultFile,
  } = values;
  if (!bundleId) throw Error('--bundle missing');
  if (!resultFile) throw Error('--result-file missing');

  const privateArgsOverrides = await (overrides
    ? cwd.readOnly().join(overrides).readJSON()
    : {});

  // XXX use different env var per account?
  const account = await makeAccount(`MNEMONIC`, {
    // allow 10min for upgrade to replay async flow logs
    broadcastTimeoutMs: 10 * 60_000,
    // poll about twice per 6 second block
    broadcastPollIntervalMs: (6 * 1_000) / 2,
  });
  const net = netOfConfig(account.networkConfig);
  checkContract(contract, account.address, net);

  const ymaxControl =
    account.store.get<ContractControl<typeof YMaxStart>>(WALLET_KEY);
  let tx: DeliverTxResponse | undefined;
  try {
    ({ tx } = await ymaxControl.upgrade({ bundleId, privateArgsOverrides }));
  } catch (err) {
    tx = account.lastTx;
    if (!tx) throw err;
    console.error('recovering from upgrade() throw via lastTx', err);
  }
  console.error(`upgrade tx: ${tx.transactionHash} at height ${tx.height}`);

  const rpcAddr =
    account.networkConfig.rpcAddrs[0] ||
    assert.fail('missing rpcAddr in network config');
  const tmClient = makeTendermint34Client(rpcAddr, { fetch });

  const healthCheck = async (qty = 3) => {
    const waitForBlock = async (height: number) => {
      for (;;) {
        const block = await tmClient.block(height).catch(() => undefined);
        if (block) return block;
        console.error(`waiting for block ${height}...`);
        await new Promise(resolve => setTimeout(resolve, 3_000));
      }
    };

    const healthBlocks: BlockInfo[] = [];
    for (let i = 0; i < qty; i += 1) {
      const block = await waitForBlock(tx.height + i);
      healthBlocks.push({
        height: block.block.header.height,
        hash: Buffer.from(block.blockId.hash).toString('hex'),
        time: block.block.header.time.toISOString(),
      });
    }
    return healthBlocks;
  };

  const [upgradeBlock, ...healthBlocks] = await healthCheck();

  const result = {
    contract,
    bundleId,
    upgradeTxHash: tx.transactionHash,
    upgradeBlockHeight: upgradeBlock.height,
    upgradeBlockTime: upgradeBlock.time,
    healthBlocks,
  };
  await cwd.join(resultFile).writeText(`${JSON.stringify(result, null, 2)}\n`);
};

export default upgradeYmax;
