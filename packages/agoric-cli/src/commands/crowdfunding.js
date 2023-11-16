// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import { Offers } from '@agoric/crowdfunding/src/clientSupport.js';
import { Command } from 'commander';
import { makeRpcUtils } from '../lib/rpc.js';
import { outputActionAndHint } from '../lib/wallet.js';

/**
 * @param {import('anylogger').Logger} _logger
 * @param {*} io
 */
export const makeCrowdfundingCommand = (_logger, io = {}) => {
  const { stdout = process.stdout, stderr = process.stderr, now } = io;
  const cmd = new Command('crowdfunding').description('Crowdfunding commands');
  cmd
    .command('provision')
    .description('provision a crowdfund')
    .requiredOption('--compensation <number>', 'Compensation required', Number)
    .option('--compensation-brand-key <string>', 'Collateral brand key', 'IST')
    .option('--offer-id <string>', 'Offer id', String, `provisionFund-${now()}`)
    .addHelpText(
      'after',
      `
    Example:
    $ agoric run crowdfund provision --compensation 100 --compensation-brand-key "IST" > provision.json
    $ agoric wallet send --from gov1 --keyring-backend=test --offer offer.json
    $ agd query vstorage data published.crowdfunding.bindings.1 --output json | jq ".value | fromjson .values "
    `,
    )
    .action(
      /**
       * @param {{
       *   compensation: number,
       *   compensationBrandKey: string,
       *   offerId: string,
       * }} opts
       */
      async ({ ...opts }) => {
        const { agoricNames } = await makeRpcUtils({ fetch });

        const offer = Offers.crowdfunding.Provide(agoricNames, {
          ...opts,
        });
        outputActionAndHint(
          { method: 'executeOffer', offer },
          { stdout, stderr },
        );
      },
    );

  return cmd;
};

export default makeCrowdfundingCommand;
