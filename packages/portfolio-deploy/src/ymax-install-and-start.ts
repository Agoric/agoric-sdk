/** @file install and start a ymax contract via ymaxControl */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
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
  E,
}: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const { contract, bundle: bundleId, overrides } = values;
  if (!bundleId) throw Error('--bundle missing');

  const privateArgsOverrides = await (overrides
    ? cwd.readOnly().join(overrides).readJSON()
    : {});

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

  const { postalService } = walletKit.agoricNames.instance;
  postalService || assert.fail('missing postalService instance in agoricNames');
  const { result: savedCreatorFacet } = await ymaxControl
    .saveAs('creatorFacet')
    .getCreatorFacet();
  const creatorFacet = savedCreatorFacet || Fail`failed to save creatorFacet`;
  await E(creatorFacet).setPostalService(postalService);
};

export default installAndStartYmax;
