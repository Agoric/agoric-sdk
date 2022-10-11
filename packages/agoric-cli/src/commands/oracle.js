/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import { Command } from 'commander';
import {
  boardSlottingMarshaller,
  makeRpcUtils,
  storageHelper,
} from '../lib/rpc.js';

// Adapted from https://gist.github.com/dckc/8b5b2f16395cb4d7f2ff340e0bc6b610#file-psm-tool

const { vstorage, fromBoard, agoricNames } = await makeRpcUtils({ fetch });

/**
 *
 * @param {import('anylogger').Logger} logger
 */
export const makeOracleCommand = async logger => {
  const psm = new Command('oracle').description('Oracle commands').usage(
    // FIXME
    `
  WALLET=my-wallet
  export AGORIC_NET=ollinet
  
  # provision wallet if necessary
  agd keys add $WALLET
  # provision with faucet, e.g.
  open https://ollinet.faucet.agoric.net/ # and paste the key and choose client: smart-wallet

  # confirm funds
  agoric wallet list
  agoric wallet show —from $WALLET

  # prepare an offer to send
  # (offerId is optional but best to specify as each must be higher than the last and the default value is a huge number)
  agops psm swap --wantMinted 6 --feePct 0.01 --offerId 12 > offer-12.json
  
  # watch for results in one terminal
  agoric wallet watch --from $WALLET

  # sign and send in another
  agoric wallet send --from $WALLET --offer offer-12.json
  # that spits out a CLI command to run
  `,
  );

  const marshaller = boardSlottingMarshaller();

  /** @param {import('../lib/psm.js').BridgeAction} bridgeAction */
  const outputAction = bridgeAction => {
    const capData = marshaller.serialize(bridgeAction);
    process.stdout.write(JSON.stringify(capData));
  };

  psm
    .command('accept')
    .description('accept invitation to operate an oracle')
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .action(async function () {
      const opts = this.opts();

      const { economicCommittee } = agoricNames.instance;
      assert(economicCommittee, 'missing economicCommittee');

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: Number(opts.offerId),
        invitationSpec: {
          source: 'purse',
          // @ts-expect-error xxx RpcRemote
          instance: economicCommittee,
          description: 'Voter0', // XXX it may not always be
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  psm
    .command('pushPrice')
    .description('add a current price sample')
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .requiredOption(
      '--oracleAdminAcceptOfferId [number]',
      'offer that had continuing invitation result',
      Number,
    )
    .requiredOption('--price [number]', 'price (format TODO)', String)
    .action(async function () {
      const opts = this.opts();

      /** @type {import('../lib/psm.js').OfferSpec} */
      const offer = {
        id: Number(opts.offerId),
        invitationSpec: {
          source: 'continuing',
          previousOffer: opts.previousOfferId,
          invitationMakerName: 'makePushPriceInvitation',
          // (positionList, questionHandle)
          invitationArgs: harden([opts.price]),
        },
        proposal: {},
      };

      outputAction({
        method: 'executeOffer',
        offer,
      });

      console.warn('Now execute the prepared offer');
    });

  return psm;
};
