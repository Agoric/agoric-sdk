/** @file start ymax1 on a3p via a synthetic test control wallet */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import { parseArgs } from 'node:util';
import { exampleDynamicChainInfo } from './portfolio-snapshot-setup.ts';
import type { RunTools } from '../src/wallet-admin-types.ts';
import { WALLET_KEY } from '../src/ymax-admin-helpers.ts';

const options = {
  address: { type: 'string' },
  bundle: { type: 'string' },
  'mnemonic-env': { type: 'string' },
} as const;

const defaultYmax1ControlAddr = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';

// Must be the bundle used in a3p proposal 106 (`ymax-alpha4`).
// The repo switched a3p to that release in commit
// ac0680c (`chore(a3p): use ymax-alpha4`).
const defaultBundleId =
  'b1-078729b9683de5f81afe8b14bd163f0165b8dd803f587413df8dff76b557d56e5d0d67f8f654bc920b5bb3a734d7d7644791692efbbc08c08984e37c6e0e6c88';

const { agoric, noble } = exampleDynamicChainInfo;

const ymaxDataArgs = harden({
  // `start-ymax1.ts` is only used by the local a3p-i eval path.
  // For the alpha4 bundle above, this is enough private arg data to start.
  assetInfo: [
    [
      'ubld',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        brandKey: 'BLD',
        chainName: 'agoric',
      },
    ],
    [
      'uusdc',
      {
        baseDenom: 'uusdc',
        baseName: 'noble',
        brandKey: 'USDC',
        chainName: 'agoric',
      },
    ],
  ],
  axelarIds: {
    Arbitrum: 'Arbitrum',
    Avalanche: 'Avalanche',
    Base: 'Base',
    Ethereum: 'Ethereum',
    Optimism: 'Optimism',
  },
  chainInfo: { agoric, noble },
  contracts: {
    Arbitrum: { aavePool: '0x', compound: '0x', factory: '0x', usdc: '0x' },
    Avalanche: { aavePool: '0x', compound: '0x', factory: '0x', usdc: '0x' },
    Base: { aavePool: '0x', compound: '0x', factory: '0x', usdc: '0x' },
    Ethereum: { aavePool: '0x', compound: '0x', factory: '0x', usdc: '0x' },
    Optimism: { aavePool: '0x', compound: '0x', factory: '0x', usdc: '0x' },
  },
  gmpAddresses: {
    AXELAR_GAS: 'unused-on-agoriclocal',
    AXELAR_GMP: 'unused-on-agoriclocal',
  },
});

const getIssuerByName = (
  vbankAssets: Record<string, { issuerName?: string; issuer?: unknown }>,
  issuerName: string,
) => {
  const asset = Object.values(vbankAssets).find(
    detail => detail.issuerName === issuerName,
  );
  if (!asset?.issuer) {
    assert.fail(`${issuerName} issuer missing`);
  }
  return asset.issuer;
};

const startYmax1 = async ({ scriptArgs, makeAccount, walletKit }: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const {
    address = defaultYmax1ControlAddr,
    bundle = defaultBundleId,
    'mnemonic-env': mnemonicEnv = 'YMAX1_CONTROL_MNEMONIC',
  } = values;

  const account = await makeAccount(mnemonicEnv);
  if (account.address !== address) {
    throw Error(
      `wrong ${mnemonicEnv} for ymax1: ${account.address} !== ${address}`,
    );
  }

  const ymaxControl =
    account.store.get<ContractControl<typeof YMaxStart>>(WALLET_KEY);

  const vbankAssets = walletKit.agoricNames.vbankAsset;
  const BLD = getIssuerByName(vbankAssets, 'BLD');
  const USDC = getIssuerByName(vbankAssets, 'USDC');
  const accessIssuer = vbankAssets.upoc26?.issuer;
  accessIssuer || assert.fail('upoc26 issuer missing');

  await ymaxControl.installAndStart({
    bundleId: bundle,
    issuers: { USDC, BLD, Fee: BLD, Access: accessIssuer as any },
    privateArgsOverrides: ymaxDataArgs,
  });
};

export default startYmax1;
