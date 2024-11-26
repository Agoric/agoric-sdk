/* eslint-env node */
/**
 * @import {Command} from 'commander';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 * @import {ExecuteOfferAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

import { fetchEnvNetworkConfig, makeVstorageKit } from '@agoric/client-utils';
import { INVITATION_MAKERS_DESC } from '../exos/transaction-feed.js';
import { outputActionAndHint } from './bridge-action.js';

/**
 * @param {Command} program
 */
export const addOperatorCommands = program => {
  const operator = program
    .command('operator')
    .description('Oracle operator commands');

  operator
    .command('accept')
    .description('Accept invitation to be an operator')
    .addHelpText(
      'after',
      '\nPipe the STDOUT to a file such as accept.json, then use the Agoric CLI to broadcast it:\n  agoric wallet send --offer accept.json --from gov1 --keyring-backend="test"',
    )
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `operatorAccept-${Date.now()}`,
    )
    .action(async opts => {
      const networkConfig = await fetchEnvNetworkConfig({
        env: process.env,
        fetch,
      });
      const vsk = await makeVstorageKit({ fetch }, networkConfig);
      const instance = vsk.agoricNames.instance.fastUsdc;
      assert(instance, 'fastUsdc instance not in agoricNames');

      /** @type {OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'purse',
          instance,
          description: INVITATION_MAKERS_DESC,
        },
        proposal: {},
      };

      /** @type {ExecuteOfferAction} */
      const bridgeAction = {
        method: 'executeOffer',
        offer,
      };

      outputActionAndHint(bridgeAction, {
        stderr: process.stderr,
        stdout: process.stdout,
      });
    });

  operator
    .command('attest')
    .description('Attest to an observed Fast USDC transfer')
    .requiredOption('--previousOfferId <string>', 'Offer id', String)
    .action(async options => {
      const { previousOfferId } = options;
      console.error(
        'TODO: Implement attest logic for request:',
        previousOfferId,
      );
    });

  return operator;
};
