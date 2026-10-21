// @ts-check
import { execFileSync } from 'node:child_process'; // TODO: use execa
import * as path from 'node:path';
import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import {
  flags,
  voteLatestProposalAndWait,
  makeAgd,
} from '@agoric/synthetic-chain';
import {
  walletUpdates,
  makeActionId,
} from '@agoric/deploy-script-support/src/wallet-utils.js';
import { YMAX_CONTROL_WALLET_KEY } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { sendWalletAction } from './wallet-util.js';

const agd = makeAgd({ execFileSync }).withOpts({
  keyringBackend: 'test',
});

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

/** @param {string} ymaxControlAddr */
export const redeemInvitation = async ymaxControlAddr => {
  const wup = walletUpdates(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    { setTimeout, log: () => {} },
  );
  const id = makeActionId(`deliver ${YMAX_CONTROL_WALLET_KEY}`);

  const instances = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  const { postalService } = instances;

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'purse',
        // @ts-expect-error Instance type mismatch
        instance: postalService,
        description: `deliver ${YMAX_CONTROL_WALLET_KEY}`,
      },
      proposal: {},
      saveResult: { name: YMAX_CONTROL_WALLET_KEY, overwrite: true },
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, redeemAction);

  const result = await wup.offerResult(id);

  console.log(result);
  return result;
};

/** @param {string} contractName */
export const submitYmaxControl = async contractName => {
  const evalPaths = [
    `eval-${contractName}-control-permit.json`,
    `eval-${contractName}-control.js`,
  ].map(filename =>
    path.resolve(import.meta.dirname, './submission', filename),
  );

  const title = 'YMax Control Core Eval';
  const evalResult = await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      ...evalPaths,
      ...flags({
        title,
        description: 'Core eval proposal',
        deposit: '10000000ubld',
      }),
    ],
    { from: 'validator', chainId: 'agoriclocal', yes: true },
  );
  console.log(evalResult);
  assert.equal(evalResult.code, 0, 'core eval submitted');

  const detail = await voteLatestProposalAndWait(title);
  console.log(
    `proposal ${detail.proposal_id} end ${detail.voting_end_time}`,
    detail.status,
  );
  assert.equal(detail.status, 'PROPOSAL_STATUS_PASSED');
};
