/** @file create2 test */
import { axelarConfigTestnet } from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { Hex } from 'viem';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { contractsMock } from '../mocks.ts';
import {
  computeCreate2Address,
  predictWalletAddress,
} from '../../src/utils/create2.ts';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

const avalancheIntegration = {
  factory: '0x9F9684d7FA7318698a0030ca16ECC4a01944836b',
  gateway: '0xC249632c2D40b9001FE907806902f63038B737Ab',
  gasService: '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6',
} as const;

test('predictWalletAddress computes expected address', async t => {
  const { bytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );
  const cases = [
    {
      label: 'Nov14at0545Z',
      // See actual tx: https://testnet.snowtrace.io/tx/0xd5672e95d47ec2b7d19a54fe296cb345322fd416191633500a141a224e3f3a2d/eventlog?chainid=43113
      contracts: avalancheIntegration,
      walletBytecode: bytecode,
      owner: 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277',
      walletAddress: '0x68ffd110d64bc38773f2cfd12b5ff46cd4700bca',
    },
    {
      label: 'Nov17at1346Z',
      // See actual tx: https://testnet.snowtrace.io/tx/0x8de043788a3beff7b0940c7e6eab83adcdf0646d8282b466dd8bc59940b4d32d/eventlog?chainid=43113
      contracts: avalancheIntegration,
      walletBytecode: bytecode,
      owner: 'agoric1u4yhqp9tp58hx3kkg2ktj4d9shpukg2q3cx8nv',
      walletAddress: '0xed49fc80bfe226f6652f556de53b88ca81f22637',
    },
    {
      label: 'computeAddr.js',
      // from computeAddr.js https://gist.github.com/rabi-siddique/385c92179e5380ef1ef3677a53ffef9d
      //     === CREATE2 Address Calculator ===
      contracts: {
        // Factory Address: 0x9F9684d7FA7318698a0030ca16ECC4a01944836b
        // Gateway Address: 0xC249632c2D40b9001FE907806902f63038B737Ab
        // Gas Service Address: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6
        factory: avalancheIntegration.factory,
        gasService: axelarConfigTestnet.Avalanche.contracts.gasService,
        gateway: axelarConfigTestnet.Avalanche.contracts.gateway,
      },
      walletBytecode: bytecode,
      // Owner: agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv
      //   Wallet Address: 0x1750aC3a5B2FA7217c9b413A4d0BC37EE6440b70
      //   Salt: 0xc588432f2a0ef17c1e3e1eef64e0181fba5fc6cf443dd71f422e65282867fb88
      //   Init Code Hash: 0xd18a438c2dc8ba0f3764d8036e3684fa64b8cae656150d29106189daa729d2fc
      owner: 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv',
      walletAddress: '0x3433aebfc13e92d0fd808e42d9585dc4792810c2',
    },
    {
      label: 'flows testing',
      contracts: contractsMock.Arbitrum,
      owner: 'agoric11028',
      walletAddress: '0x36b64aa4b7023599ec4ea8dc97bfa86f68769c87',
      walletBytecode: '0x1234',
    },
  ];

  for (const {
    label,
    owner,
    walletAddress,
    contracts,
    walletBytecode,
  } of cases) {
    const {
      factory: factoryAddress,
      gateway: gatewayAddress,
      gasService: gasServiceAddress,
    } = contracts;

    t.log(label, { factoryAddress, gatewayAddress, gasServiceAddress });
    const actual = predictWalletAddress({
      factoryAddress,
      walletBytecode: walletBytecode as any,
      gatewayAddress,
      gasServiceAddress,
      owner,
    });
    t.log('walletAddress', actual);
    t.deepEqual(actual, walletAddress, label);
  }
});

test('computeCreate2Address', t => {
  /** https://eips.ethereum.org/EIPS/eip-1014#examples */
  const examples = [
    {
      address: '0x0000000000000000000000000000000000000000',
      salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
      initCode: '0x00',
      result: '0x4D1A2e2bB4F88F0250f26Ffff098B0b30B26BF38',
    },
    {
      address: '0x00000000000000000000000000000000deadbeef',
      salt: '0x00000000000000000000000000000000000000000000000000000000cafebabe',
      initCode: '0xdeadbeef',
      result: '0x60f3f640a8508fC6a86d45DF051962668E1e8AC7',
    },
  ] as const;

  const toHex = (bytes: Uint8Array): Hex => `0x${bytesToHex(bytes)}`;
  const keccakHex = (bytes: Uint8Array): Hex => toHex(keccak256(bytes));

  for (const { address: deployer, salt, initCode, result } of examples) {
    const initCodeHash = keccakHex(hexToBytes(initCode.replace(/^0x/, '')));
    const actual = computeCreate2Address({ deployer, salt, initCodeHash });
    t.is(actual.toLowerCase(), result.toLowerCase());
  }
});
