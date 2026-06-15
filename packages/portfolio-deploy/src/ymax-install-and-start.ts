/** @file install and start a ymax contract via ymaxControl */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import { Fail } from '@endo/errors';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';
import { WALLET_KEY, getYmaxControlKit } from './ymax-admin-helpers.ts';

const options = {
  contract: { type: 'string', default: 'ymax0' },
  bundle: { type: 'string' },
  overrides: { type: 'string' },
} as const;

const installAndStartYmax = async ({
  scriptArgs,
  walletKit,
  makeAccount,
  cwd,
}: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const { contract, bundle: bundleId, overrides } = values;
  if (!bundleId) throw Error('--bundle missing');

  const fileOverrides = await (overrides
    ? cwd.readOnly().join(overrides).readJSON()
    : {});
  const { postalService } = walletKit.agoricNames.instance;
  postalService || assert.fail('missing postalService instance in agoricNames');
  const privateArgsOverrides = harden({
    ...fileOverrides,
    postalServiceInstance: postalService,
  });

  const { BLD, USDC } = walletKit.agoricNames.issuer;
  const vbankAssets = walletKit.agoricNames.vbankAsset;
  const accessIssuer =
    vbankAssets.upoc26?.issuer || Fail`upoc26 issuer missing`;

  const { account } = await getYmaxControlKit(makeAccount, contract);
  const ymaxControl =
    account.store.get<ContractControl<typeof YMaxStart>>(WALLET_KEY);
  await ymaxControl.installAndStart({
    bundleId,
    issuers: { USDC, BLD, Fee: BLD, Access: accessIssuer as any },
    privateArgsOverrides,
  });
};

export default installAndStartYmax;
