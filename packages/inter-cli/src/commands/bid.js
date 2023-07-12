// @ts-check
// @jessie-check
import { normalizeBech32 } from '@cosmjs/encoding';
import { makeBoardClient } from '../lib/boardClient.js';
import { makeVstorageQueryService } from '../lib/vstorage.js';

/** @typedef {{ lookup: (...path: string[]) => string }} SyncNameHub */

/**
 *
 * @param {import('commander').Command} interCmd
 * @param {object} io
 * @param {import('../lib/tui').TUI} io.tui
 * @param {ReturnType<import('../lib/agd-lib').makeAgd>} io.agd
 * @param {() => Promise<import('@cosmjs/tendermint-rpc').RpcClient>} io.makeRpcClient
 */
export const addBidCommand0 = (interCmd, { tui, agd, makeRpcClient }) => {
  const bidCmd = interCmd
    .command('bid0')
    .description('auction bidding commands');

  /** @param {string} literalOrName */
  const normalizeAddress = literalOrName => {
    // NOTE: interCmd.opts() are not available until commander parseAsync()
    const agd1 = agd.withOpts(interCmd.opts());
    const keys = agd1.nameHub();
    try {
      return normalizeBech32(literalOrName);
    } catch (_) {
      return keys.lookup(literalOrName);
    }
  };

  bidCmd
    .command('list')
    .description(`XXX TODO description`)
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(
      /**
       * @param {{
       *   from: string,
       * }} opts
       */
      async opts => {
        const queryService = await makeRpcClient().then(rpcClient =>
          makeVstorageQueryService(rpcClient),
        );
        const board = makeBoardClient(queryService);

        const path = `published.wallet.${opts.from}.current`;
        // TODO: test fetch failed: cause: Error: connect ECONNREFUSED 127.0.0.1:26657
        // const raw = await queryService.Data({ path });
        // tui.show(raw);

        const info = await board.readLatestHead(path);
        tui.show(info, true);
        tui.warn('TODO: extract, format bids');
      },
    );
};
