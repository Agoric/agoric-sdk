import { AckBehavior } from '@aglocal/boot/tools/supports.js';
import { BridgeId } from '@agoric/internal';
import type { ChainInfo } from '@agoric/orchestration';
import type { WalletFactoryTestContext } from './walletFactory.ts';

export const beneficiary = 'agoric126sd64qkuag2fva3vy3syavggvw44ca2zfrzyy';
export const controllerAddr = 'agoric1ymax0-admin';
export const CURRENT_TIME = 1357920000n;

/**
 * To facilitate deployment to environments other than devnet,
 * ../src/chain-info.build.js fetches chainInfo dynamically
 * using --net and --peer.
 *
 * This is an example of the sort of chain info that results.
 * Here we're testing that things work without using the static
 * fetched-chain-info.js.
 */
export const exampleDynamicChainInfo = {
  agoric: {
    bech32Prefix: 'agoric',
    chainId: 'agoriclocal',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'agoriclocal',
    stakingTokens: [{ denom: 'ubld' }],
    connections: {
      noblelocal: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  noble: {
    bech32Prefix: 'noble',
    chainId: 'noblelocal',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'noblelocal',
    stakingTokens: [{ denom: 'uusdc' }],
    connections: {
      agoriclocal: {
        id: 'connection-0',
        client_id: '07-tendermint-0',
        counterparty: {
          client_id: '07-tendermint-0',
          connection_id: 'connection-0',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-0',
          portId: 'transfer',
          counterPartyChannelId: 'channel-0',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  Avalanche: {
    namespace: 'eip155',
    reference: '43114',
    cctpDestinationDomain: 1,
  },
  Ethereum: {
    namespace: 'eip155',
    reference: '1',
    cctpDestinationDomain: 0,
  },
  Optimism: {
    namespace: 'eip155',
    reference: '10',
    cctpDestinationDomain: 2,
  },
  Arbitrum: {
    namespace: 'eip155',
    reference: '42161',
    cctpDestinationDomain: 3,
  },
} satisfies Record<string, ChainInfo>;

export const preparePortfolioReadyContext = async (
  ctx: WalletFactoryTestContext,
) => {
  const {
    agoricNamesRemotes,
    bridgeUtils,
    buildProposal,
    combineProposals,
    evalProposal,
    jumpTimeTo,
    refreshAgoricNamesRemotes,
    walletFactoryDriver,
  } = ctx;

  await jumpTimeTo(CURRENT_TIME);

  await evalProposal(
    buildProposal('@aglocal/portfolio-deploy/src/chain-info.build.js', [
      '--chainInfo',
      JSON.stringify(exampleDynamicChainInfo),
    ]),
  );

  await walletFactoryDriver.provideSmartWallet(beneficiary);
  await evalProposal(
    Promise.all([
      buildProposal(
        '@aglocal/portfolio-deploy/src/access-token-setup.build.js',
        ['--beneficiary', beneficiary],
      ),
      buildProposal(
        '@aglocal/portfolio-deploy/src/attenuated-deposit.build.js',
      ),
    ]).then(combineProposals),
  );

  refreshAgoricNamesRemotes();

  await evalProposal(
    buildProposal('@aglocal/portfolio-deploy/src/usdc-resolve.build.js'),
  );

  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  await evalProposal(
    buildProposal('@aglocal/portfolio-deploy/src/portfolio.build.js', [
      '--net',
      'mainnet',
      '--no-flow-config',
    ]),
  );

  const controllerWallet =
    await walletFactoryDriver.provideSmartWallet(controllerAddr);
  await evalProposal(
    Promise.all([
      buildProposal('@aglocal/portfolio-deploy/src/postal-service.build.js'),
      buildProposal(
        '@agoric/deploy-script-support/src/control/contract-control.build.js',
      ),
      buildProposal(
        '@agoric/deploy-script-support/src/control/get-upgrade-kit.build.js',
      ),
      buildProposal(
        '@aglocal/portfolio-deploy/src/portfolio-control.build.js',
        ['--ymaxControlAddress', controllerAddr],
      ),
    ]).then(combineProposals),
  );

  refreshAgoricNamesRemotes();
  if (!agoricNamesRemotes.instance.postalService) {
    throw Error('postalService instance missing after portfolio control setup');
  }

  await controllerWallet.executeOffer({
    id: 'controller-1',
    invitationSpec: {
      source: 'purse',
      instance: agoricNamesRemotes.instance.postalService,
      description: 'deliver ymaxControl',
    },
    proposal: {},
    saveResult: { name: 'ymaxControl' },
  });
};
