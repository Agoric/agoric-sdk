// @ts-check
/* eslint-disable func-names */
/* global fetch */
import { Command } from 'commander';
import {
  lookupOfferIdForEvaluator,
  Offers,
} from '@agoric/inter-protocol/src/clientSupport.js';
import { makeRpcUtils } from '../lib/rpc.js';
import { getCurrent, outputExecuteOfferAction } from '../lib/wallet.js';
import { normalizeAddressWithOptions } from '../lib/chain.js';

/**
 * @param {import('anylogger').Logger} logger
 */
export const makeEvalCommand = logger => {
  const evaluate = new Command('eval')
    .description('Evaluation commands')
    .option('--home [dir]', 'agd application home directory')
    .option(
      '--keyring-backend <os|file|test>',
      'keyring\'s backend (os|file|test) (default "os")',
    );

  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, evaluate.opts());

  const rpcTools = async () => {
    const utils = await makeRpcUtils({ fetch });

    const lookupEvaluatorInstance = () => {
      const name = 'agoricEvaluator';
      const instance = utils.agoricNames.instance[name];
      if (!instance) {
        logger.debug('known instances:', utils.agoricNames.instance);
        throw Error(`Unknown instance ${name}`);
      }
      return instance;
    };

    return {
      ...utils,
      lookupEvaluatorInstance,
    };
  };

  evaluate
    .command('claim')
    .description('Claim an invitation to create an evaluator')
    .option('--offerId <string>', 'Offer id', String, `claimEval-${Date.now()}`)
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async function (opts) {
      logger.warn('running with options', opts);
      const { agoricNames } = await makeRpcUtils({ fetch });

      const { lookupEvaluatorInstance } = await rpcTools();

      let offerId = opts.offerId;
      if (!offerId.startsWith('claimEval-')) {
        offerId = `claimEval-${offerId}`;
      }
      if (!offerId.endsWith(`-${opts.from}`)) {
        offerId = `${offerId}-${opts.from}`;
      }
      const offer = Offers.evaluators.Claim(agoricNames, {
        offerId,
        instance: lookupEvaluatorInstance(),
      });

      outputExecuteOfferAction(offer);
    });

  evaluate
    .command('offer <stringToEval>')
    .description('Prepare an offer to evaluate a string')
    .option('--offerId <string>', 'Offer id', String, `eval-${Date.now()}`)
    // .option('--collateralBrand <string>', 'Collateral brand key', 'ATOM')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async function (stringToEval, opts) {
      logger.warn('running with options', opts);
      const { agoricNames, readLatestHead } = await makeRpcUtils({ fetch });

      const previousOfferId = await lookupOfferIdForEvaluator(
        opts.from,
        getCurrent(opts.from, { readLatestHead }),
      );

      const offer = Offers.evaluators.Eval(
        agoricNames,
        {
          offerId: opts.offerId,
          stringToEval,
        },
        previousOfferId,
      );

      outputExecuteOfferAction(offer);
    });

  return evaluate;
};
