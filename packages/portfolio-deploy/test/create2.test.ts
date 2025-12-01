/** @file create2 test */
import { computeCreate2Address } from '@aglocal/portfolio-contract/src/utils/create2.ts';
import { predictWalletAddress } from '@aglocal/portfolio-contract/src/utils/evm-orch-factory.ts';
import { contractsMock } from '@aglocal/portfolio-contract/test/mocks.ts';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { hexToBytes } from '@noble/hashes/utils';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { axelarConfigTestnet } from '../src/axelar-configs.js';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

const avalancheIntegration = {
  factory: '0x2B3545638859C49df84660eA2D110f82F2e80De8',
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
      contracts: avalancheIntegration,
      walletBytecode: bytecode,
      owner: 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277',
      walletAddress: '0xaef9533b97c55f2df3260c3460f0e90003eef324',
    },
    {
      label: 'Nov17at1346Z',
      contracts: avalancheIntegration,
      walletBytecode: bytecode,
      owner: 'agoric1u4yhqp9tp58hx3kkg2ktj4d9shpukg2q3cx8nv',
      walletAddress: '0x1859396e40f6e523efa5e906e22e7a4d9288ab09',
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
      walletAddress: '0x7b3516b18c18ad39ae7f5e756d250d6692b60346',
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
      walletBytecode: hexToBytes(walletBytecode.replace(/^0x/, '')),
      gatewayAddress,
      gasServiceAddress,
      owner,
    });
    t.log('walletAddress', actual);
    t.deepEqual(actual, walletAddress, label);
  }
});

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

test('computeCreate2Address', t => {
  for (const example of examples) {
    const { address: deployer, initCode, result } = example;
    const initCodeHash = keccak256(hexToBytes(initCode.replace(/^0x/, '')));
    const salt = hexToBytes(example.salt.replace(/^0x/, ''));
    const actual = computeCreate2Address({ deployer, salt, initCodeHash });
    t.is(actual.toLowerCase(), result.toLowerCase());
  }
});

test('bad input', t => {
  const [ok] = examples;
  const { address: deployer, initCode } = ok;
  const salt = hexToBytes(ok.salt.replace(/^0x/, ''));
  const initCodeHash = keccak256(hexToBytes(initCode.replace(/^0x/, '')));

  t.throws(
    () =>
      computeCreate2Address({
        deployer: deployer.slice(0, 10) as any,
        salt,
        initCodeHash,
      }),
    { message: 'Expected 4 is same as 20' },
  );

  t.throws(
    () =>
      computeCreate2Address({
        deployer,
        salt: salt.slice(0, 10),
        initCodeHash,
      }),
    { message: 'Expected 10 is same as 32' },
  );

  t.throws(
    () =>
      computeCreate2Address({
        deployer,
        salt,
        initCodeHash: initCodeHash.slice(0, 4),
      }),
    { message: 'Expected 4 is same as 32' },
  );

  t.throws(
    () =>
      computeCreate2Address({
        deployer: 'fred' as any,
        salt,
        initCodeHash: initCodeHash.slice(0, 4),
      }),
    { message: /got non-hex/ },
  );

  t.throws(
    () =>
      computeCreate2Address({
        deployer,
        salt: '123456789.123456789.123456789.12' as any,
        initCodeHash,
      }),
    { message: /expected Uint8Array/ },
  );

  t.throws(
    () =>
      computeCreate2Address({
        deployer,
        salt,
        initCodeHash: 'corn beef.123456789.123456789.12' as any,
      }),
    { message: /expected Uint8Array/ },
  );
});
