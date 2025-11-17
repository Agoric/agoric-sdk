/** @file create2 test */
import {
  axelarConfigTestnet,
  axelarConfig,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { predictWalletAddress } from '../../src/utils/create2.ts';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

test('predictWalletAddress computes expected address', async t => {
  // TODO: what am I doing wrong here?
  const cases = [
    {
      config: axelarConfig,
      owner: 'agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g',
      // agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv';
      evmAddr: '0x8fcc8340520552c3cc861acaaa752e2d38bff2bb',
    },
    {
      config: axelarConfigTestnet,
      owner: 'agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g',
      // agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv';
      evmAddr: '0x8fcc8340520552c3cc861acaaa752e2d38bff2bb',
    },
  ];

  const { bytecode: walletBytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );

  for (const { owner, evmAddr, config } of cases) {
    const {
      factory,
      gateway: gatewayAddress,
      gasService: gasServiceAddress,
    } = config.Arbitrum.contracts;

    const actual = predictWalletAddress({
      factoryAddress: factory,
      walletBytecode,
      gatewayAddress,
      gasServiceAddress,
      owner,
    });
    t.deepEqual(actual, evmAddr);
  }
});
