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

const AVALANCHE_FACTORY_ADDRESS =
  '0x9F9684d7FA7318698a0030ca16ECC4a01944836b' as const;
const GATEWAY_ADDRESS = '0xC249632c2D40b9001FE907806902f63038B737Ab' as const;
const GASSERVICE_ADDRESS =
  '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6' as const;

test('predictWalletAddress computes expected address', async t => {
  const { bytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );
  const cases = [
    {
      label: 'tx1',
      // See actual tx: https://testnet.snowtrace.io/tx/0x8de043788a3beff7b0940c7e6eab83adcdf0646d8282b466dd8bc59940b4d32d/eventlog?chainid=43113
      contracts: {
        factory: AVALANCHE_FACTORY_ADDRESS,
        gasService: GASSERVICE_ADDRESS,
        gateway: GATEWAY_ADDRESS,
      },
      walletBytecode: bytecode,
      owner: 'agoric1u4yhqp9tp58hx3kkg2ktj4d9shpukg2q3cx8nv',
      walletAddress: '0xed49fc80bfe226f6652f556de53b88ca81f22637',
    },

    {
      label: 'tx2',

      // See actual tx: https://testnet.snowtrace.io/tx/0xd5672e95d47ec2b7d19a54fe296cb345322fd416191633500a141a224e3f3a2d/eventlog?chainid=43113
      contracts: {
        factory: AVALANCHE_FACTORY_ADDRESS,
        gasService: GASSERVICE_ADDRESS,
        gateway: GATEWAY_ADDRESS,
      },
      walletBytecode: bytecode,
      owner: 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277',
      walletAddress: '0x68ffd110d64bc38773f2cfd12b5ff46cd4700bca',
    },
    {
      label: 'computeAddr.js',
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
      walletBytecode: bytecode,
      // Owner: agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv
      //   Wallet Address: 0x1750aC3a5B2FA7217c9b413A4d0BC37EE6440b70
      //   Salt: 0xc588432f2a0ef17c1e3e1eef64e0181fba5fc6cf443dd71f422e65282867fb88
      //   Init Code Hash: 0xd18a438c2dc8ba0f3764d8036e3684fa64b8cae656150d29106189daa729d2fc
      owner: 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv',
      walletAddress: '0x3433aebfc13e92d0fd808e42d9585dc4792810c2',
    },

    {
      label: 'de3b64a',
      // See actual tx: https://testnet.snowtrace.io/tx/0xd5672e95d47ec2b7d19a54fe296cb345322fd416191633500a141a224e3f3a2d/eventlog?chainid=43113
      contracts: {
        factory: AVALANCHE_FACTORY_ADDRESS,
        gasService: GASSERVICE_ADDRESS,
        gateway: GATEWAY_ADDRESS,
      },
      walletBytecode: bytecode,
      owner: 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277',
      walletAddress: '0x68ffd110d64bc38773f2cfd12b5ff46cd4700bca',
    },
    {
      label: 'flows testing',
      //   {
      //     gatewayAddress: '0xe1cE95479C84e9809269227C7F8524aE051Ae77a',
      //     gasServiceAddress: '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6',
      //     owner: 'agoric11028'
      //   }
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
