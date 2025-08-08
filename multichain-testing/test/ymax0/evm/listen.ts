import './lockdown.ts';
import {
  makeAgoricChainStorageWatcher,
  AgoricChainStoragePathKind as Kind,
} from '@agoric/rpc';
import type { AxelarChain } from '@aglocal/portfolio-contract/src/constants';
import { watchCCTPMint } from './check-cctp';
import { updateVStorage } from './update-vstorage';

const { entries } = Object;

type CCTPTransfer = {
  amount: number;
  caip: string;
  receiver: string;
  sender?: string; // Not sure if we can trace it on EVM side
};

type PendingCCTPTransfers = {
  pendingCCTPTransfers: {
    [chain: string]: CCTPTransfer;
  };
};

// Using only 'Ethereum' for now because CCTP transfers to it work reliably off-chain.
// Other testnet chains currently have issues, so we're excluding them for the time being.
export type EVMChain = keyof typeof AxelarChain | 'Ethereum';

export const setupWatcherForPortfolio = ({
  api,
  chainId,
  portfolioId,
}: {
  api: string;
  chainId: string;
  portfolioId: string;
}) => {
  const watcher = makeAgoricChainStorageWatcher(api, chainId);

  watcher.watchLatest<Array<[string, unknown]>>(
    [Kind.Data, `published.vStoragePusher.portfolios.${portfolioId}`],
    async data => {
      const { pendingCCTPTransfers } = data as unknown as PendingCCTPTransfers;
      console.log('pendingCCTPTransfers:', pendingCCTPTransfers);

      for (const [chainName, transfer] of entries(pendingCCTPTransfers)) {
        console.log(`\nChecking pending transfer on ${chainName}:`, transfer);
        const evmChainName = chainName as EVMChain;

        const hasReceived = await watchCCTPMint({
          chain: evmChainName,
          recipient: transfer.receiver,
          expectedAmount: BigInt(transfer.amount),
        });
        console.log({ hasReceived });

        if (hasReceived) {
          console.log(`🎉 CCTP transfer completed on ${chainName}!`);
          console.log(`   Receiver: ${transfer.receiver}`);
          console.log(`   Amount: ${transfer.amount}`);

          // Simulating the Resolver call to Ymax Contract
          await updateVStorage({
            vPath: portfolioId,
            vData: {
              pendingCCTPTransfers: {
                [chainName]: {
                  ...transfer,
                  status: 'success',
                },
              },
            },
          });
          process.exit(0);
        } else {
          process.exit(1);
        }
      }
    },
  );
};

// TODO: listen for all the portfolios
setupWatcherForPortfolio({
  api: 'https://devnet.api.agoric.net',
  chainId: 'agoricdev-25',
  portfolioId: 'portfolio1',
});
