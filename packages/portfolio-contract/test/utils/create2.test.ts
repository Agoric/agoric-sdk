/** @file create2 test */
import {
  axelarConfigTestnet,
  axelarConfig,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { predictWalletAddress } from '../../src/utils/create2.ts';
import { contractsMock } from '../mocks.ts';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

test('predictWalletAddress computes expected address', async t => {
  const cases = [
    {
      // from computeAddr.js https://gist.github.com/rabi-siddique/385c92179e5380ef1ef3677a53ffef9d
      //     === CREATE2 Address Calculator ===
      contracts: {
        // Factory Address: 0x9F9684d7FA7318698a0030ca16ECC4a01944836b
        // Gateway Address: 0xC249632c2D40b9001FE907806902f63038B737Ab
        // Gas Service Address: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6
        factory: '0x9F9684d7FA7318698a0030ca16ECC4a01944836b' as const,
        gasService: axelarConfigTestnet.Avalanche.contracts.gasService,
        gateway: axelarConfigTestnet.Avalanche.contracts.gateway,
      },
      // Owner: agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv
      //   Wallet Address: 0x1750aC3a5B2FA7217c9b413A4d0BC37EE6440b70
      //   Salt: 0xc588432f2a0ef17c1e3e1eef64e0181fba5fc6cf443dd71f422e65282867fb88
      //   Init Code Hash: 0xd18a438c2dc8ba0f3764d8036e3684fa64b8cae656150d29106189daa729d2fc
      owner: 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv',
      walletAddress: '0x1750ac3a5b2fa7217c9b413a4d0bc37ee6440b70',
    },

    {
      // from https://github.com/Agoric/agoric-sdk/commit/de3b64ab64f0055c7106a4011276567b05ae200e
      // which has '0x8fcc8340520552c3cc861acaaa752e2d38bff2bb'
      // how did it get that???
      contracts: contractsMock.Arbitrum,
      owner: 'agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g',
      walletAddress: '0x1de1c2e9465120d54dc0ad03da31bdef4ff85a66',
    },
  ];

  const { bytecode: walletBytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );

  for (const { owner, walletAddress, contracts } of cases) {
    const {
      factory: factoryAddress,
      gateway: gatewayAddress,
      gasService: gasServiceAddress,
    } = contracts;

    t.log('in', { factoryAddress, gatewayAddress, gasServiceAddress });
    const actual = predictWalletAddress({
      factoryAddress,
      walletBytecode,
      gatewayAddress,
      gasServiceAddress,
      owner,
    });
    t.log('out', { walletAddress: actual });
    t.deepEqual(actual, walletAddress);
  }
});
