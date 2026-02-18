/**
 * @file Test actors demonstrating the portfolio contract's two-phase offer flow.
 *
 * This file provides example usage of the client interaction patterns
 * for the contract. The {@link makeTrader} function shows how client developers
 * should implement portfolio management in their applications.
 *
 * **Phase 1 Example**: {@link makeTrader.openPortfolio} - Initial portfolio creation
 * **Phase 2 Example**: {@link makeTrader.rebalance} - Ongoing position management
 *
 * @see type-guards.ts for the authoritative interface specification
 */
import { type VstorageKit } from '@agoric/client-utils';
import { AmountMath, type NatAmount } from '@agoric/ertp';
import type { ChainInfo } from '@agoric/orchestration';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import {
  getPermitWitnessTransferFromData,
  type TokenPermissions,
} from '@agoric/orchestration/src/utils/permit2.js';
import type { VowTools } from '@agoric/vow';
import type { InvitationSpec } from '@agoric/smart-wallet/src/invitations.js';
import type { Instance } from '@agoric/zoe';
import type { ExecutionContext } from 'ava';
import { type start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import {
  makePositionPath,
  portfolioIdOfPath,
  type OfferArgsFor,
  type ProposalType,
  type PortfolioPublishedPathTypes,
  type StatusFor,
  type PoolKey,
  type EVMContractAddressesMap,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import type { WalletTool } from '@aglocal/portfolio-contract/tools/wallet-offer-tools.js';
import type {
  PortfolioPublicInvitationMaker,
  PortfolioContinuingInvitationMaker,
  AxelarChain,
} from '@agoric/portfolio-api';
import {
  getYmaxStandaloneOperationData,
  getYmaxWitness,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import type { TargetAllocation } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import type { TimerService } from '@agoric/time';
import type { ERemote } from '@agoric/internal';
import { E } from '@endo/far';
import type { TypedDataDefinition } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';
import type { EVMWalletMessageHandler } from '../src/evm-wallet-handler.exo.ts';

const { fromEntries } = Object;

assert.equal(ROOT_STORAGE_PATH, 'orchtest');
const stripRoot = (path: string) => path.replace(/^orchtest\./, '');

export const makePortfolioQuery = (
  readPublished: VstorageKit<PortfolioPublishedPathTypes>['readPublished'],
  portfolioKey: `${string}.portfolios.portfolio${number}`,
) => {
  const self = harden({
    getPortfolioStatus: () =>
      readPublished(portfolioKey) as Promise<StatusFor['portfolio']>,
    getPositionPaths: async () => {
      const { positionKeys } = await self.getPortfolioStatus();
      return positionKeys.map(key => `${portfolioKey}.positions.${key}`);
    },
    getPositionStatus: (key: PoolKey) =>
      readPublished(`${portfolioKey}.positions.${key}`) as Promise<
        StatusFor['position']
      >,
  });
  return self;
};

/**
 * Creates a trader object for testing portfolio contract interactions.
 *
 * This function demonstrates the client interaction patterns that web developers
 * need to implement when building UIs for the portfolio contract. The methods
 * here show how to:
 * - Connect to wallets and make offers (similar to `@agoric/react-components` `makeOffer`)
 * - Read chain state via vstorage (similar to `chainStorageWatcher`)
 * - Handle continuing offers for rebalancing operations
 *
 * Web developers can use this as a reference implementation when building
 * clients with `@agoric/react-components`, `@agoric/rpc`, and related UI libraries.
 *
 * @param wallet - WalletTool for executing offers (analogous to wallet connection in web UIs)
 * @param instance - Portfolio contract instance (obtained via chainStorageWatcher in web UIs)
 * @param readPublished - Function to read vstorage data (analogous to chainStorageWatcher)
 * returns Trader object with methods for portfolio operations
 *
 * @example
 * // In a web client, similar patterns would use:
 * // const { makeOffer, chainStorageWatcher } = useAgoric();
 * // const trader = makeTrader(walletTool, contractInstance, chainStorageWatcher.readLatest);
 */
export const makeTrader = (
  wallet: WalletTool,
  instance: Instance<typeof start>,
  readPublished: VstorageKit<PortfolioPublishedPathTypes>['readPublished'] = () =>
    assert.fail('no vstorage access'),
) => {
  let nonce = 0;
  let openId: string | undefined;
  let portfolioPath: string | undefined;

  const { brand: accessBrand } = wallet.getAssets().Access;
  const Access = AmountMath.make(accessBrand, 1n);

  const self = harden({
    /**
     * **Phase 1**: Opens a new portfolio with initial funding.
     *
     * Demonstrates the public invitation flow where clients:
     * 1. Get invitation from contract's public facet
     * 2. Provide USDC, Access tokens, and optional protocol allocations
     * 3. Receive continuing invitation makers for future operations
     *
     * This is the entry point to the portfolio management system.
     */
    async openPortfolio(
      _t: ExecutionContext,
      give: ProposalType['openPortfolio']['give'],
      offerArgs: OfferArgsFor['openPortfolio'] = {},
    ) {
      if (portfolioPath !== undefined) throw Error('already opened');
      if (openId) throw Error('already opening');

      const publicInvitationMaker: PortfolioPublicInvitationMaker =
        'makeOpenPortfolioInvitation';

      const invitationSpec = {
        source: 'contract' as const,
        instance,
        publicInvitationMaker,
      };
      const proposal = { give: { Access, ...give } };
      openId = `openP-${(nonce += 1)}`;
      const doneP = wallet.executePublicOffer({
        id: openId,
        invitationSpec,
        proposal,
        offerArgs,
      });
      return doneP.then(({ result, payouts }) => {
        const { portfolio: topic } = result.publicSubscribers;
        if (topic.description === 'Portfolio') {
          portfolioPath = topic.storagePath!;
        }
        return { result, payouts };
      });
    },
    /**
     * **Phase 2**: Rebalances portfolio positions between yield protocols.
     *
     * Demonstrates the continuing invitation flow where clients:
     * 1. Use invitation makers from previous portfolio opening
     * 2. Specify asset movements between USDN, Aave, and Compound
     * 3. Execute cross-chain operations via Noble and Axelar GMP
     *
     * This enables ongoing portfolio management after initial creation.
     */
    async rebalance(
      _t: ExecutionContext,
      proposal: ProposalType['rebalance'],
      offerArgs: OfferArgsFor['rebalance'],
    ) {
      if (!openId) throw Error('not open');
      const invitationMakerName: PortfolioContinuingInvitationMaker =
        'Rebalance';
      const id = `rebalance-${(nonce += 1)}`;
      const invitationSpec: InvitationSpec = {
        source: 'continuing' as const,
        invitationMakerName,
        previousOffer: openId,
      };

      return wallet.executeContinuingOffer({
        id,
        invitationSpec,
        proposal,
        offerArgs,
      });
    },
    async simpleRebalance(
      _t: ExecutionContext,
      proposal: ProposalType['rebalance'],
      offerArgs: OfferArgsFor['rebalance'],
    ) {
      if (!openId) throw Error('not open');
      const invitationMakerName: PortfolioContinuingInvitationMaker =
        'SimpleRebalance';
      const id = `simpleRebalance-${(nonce += 1)}`;
      const invitationSpec: InvitationSpec = {
        source: 'continuing' as const,
        invitationMakerName,
        previousOffer: openId,
      };

      return wallet.executeContinuingOffer({
        id,
        invitationSpec,
        proposal,
        offerArgs,
      });
    },
    async withdraw(_t: ExecutionContext, Cash: NatAmount) {
      if (!openId) throw Error('not open');
      const invitationMakerName: PortfolioContinuingInvitationMaker =
        'Withdraw';
      const id = `Withdraw-${(nonce += 1)}`;
      const invitationSpec: InvitationSpec = {
        source: 'continuing' as const,
        invitationMakerName,
        previousOffer: openId,
      };

      const proposal: ProposalType['withdraw'] = { give: {}, want: { Cash } };
      return wallet.executeContinuingOffer({ id, invitationSpec, proposal });
    },
    async deposit(_t: ExecutionContext, Deposit: NatAmount) {
      if (!openId) throw Error('not open');
      const invitationMakerName: PortfolioContinuingInvitationMaker = 'Deposit';
      const id = `Deposit-${(nonce += 1)}`;
      const invitationSpec: InvitationSpec = {
        source: 'continuing' as const,
        invitationMakerName,
        previousOffer: openId,
      };

      const proposal: ProposalType['deposit'] = {
        give: { Deposit },
        want: {},
      };
      return wallet.executeContinuingOffer({ id, invitationSpec, proposal });
    },
    getPortfolioId: () => portfolioIdOfPath(stripRoot(self.getPortfolioPath())),
    getPortfolioPath: () => portfolioPath || assert.fail('no portfolio'),
    getPortfolioStatus: () =>
      readPublished(stripRoot(self.getPortfolioPath())) as Promise<
        StatusFor['portfolio']
      >,
    getPositionPaths: async () => {
      const { positionKeys } = await self.getPortfolioStatus();

      // XXX why do we have to add 'portfolios'?
      return positionKeys.map(key =>
        ['portfolios', ...makePositionPath(self.getPortfolioId(), key)].join(
          '.',
        ),
      );
    },
    netTransfersByPosition: async () => {
      const paths = await self.getPositionPaths();
      const positionStatuses = await Promise.all(
        paths.map(
          path => readPublished(path) as Promise<StatusFor['position']>,
        ),
      );
      return fromEntries(
        positionStatuses.map(info => [
          info.protocol,
          AmountMath.subtract(info.totalIn, info.totalOut),
        ]),
      );
    },
  });
  return self;
};

type EvmTraderConfig = {
  evmWalletHandler: ERemote<EVMWalletMessageHandler>;
  account: PrivateKeyAccount;
  contractsByChain: EVMContractAddressesMap;
  chainInfoByName: Record<AxelarChain, ChainInfo<'eip155'>>;
  timerService: ERemote<TimerService>;
  readPublished: VstorageKit<PortfolioPublishedPathTypes>['readPublished'];
  when: VowTools['when'];
};

export const makeEvmTrader = ({
  evmWalletHandler,
  account,
  contractsByChain,
  chainInfoByName,
  timerService,
  readPublished,
  when,
}: EvmTraderConfig) => {
  let nonce = 0n;
  let portfolioPath: string | undefined;
  let portfolioId: number | undefined;

  const getDeadline = async () => {
    const { absValue } = await E(timerService).getCurrentTimestamp();
    return absValue + 3600n;
  };

  const submitMessage = async (message: TypedDataDefinition) => {
    const signature = await account.signTypedData(message);
    const vow = await E(evmWalletHandler).handleMessage({
      ...message,
      signature,
    } as any);
    await when(vow);
  };

  // FIXME: bare `evmWallets.*` paths are inconsistent with the `ymax0|ymax1`
  // published root contract; switch to rooted paths.
  const getWalletPortfolios = async () =>
    readPublished(`evmWallets.${account.address}.portfolio`) as Promise<
      StatusFor['evmWalletPortfolios']
    >;

  // FIXME: bare `evmWallets.*` paths are inconsistent with the `ymax0|ymax1`
  // published root contract; switch to rooted paths.
  const getWalletStatus = async () =>
    readPublished(`evmWallets.${account.address}`) as Promise<
      StatusFor['evmWallet']
    >;

  const getMessageResult = async (
    expectedNonce: bigint,
    expectedDeadline: bigint,
  ) => {
    const status = await getWalletStatus();
    status.updated === 'messageUpdate' ||
      assert.fail(`unexpected wallet update: ${status.updated}`);
    status.nonce === expectedNonce ||
      assert.fail(`nonce mismatch: ${status.nonce} vs ${expectedNonce}`);
    status.deadline === expectedDeadline ||
      assert.fail(
        `deadline mismatch: ${status.deadline} vs ${expectedDeadline}`,
      );
    if (status.status === 'error') {
      assert.fail(`message failed: ${status.error}`);
    } else if (status.status !== 'ok') {
      assert.fail(`unexpected status: ${status.status}`);
    }
    return status.result;
  };

  const updatePortfolioPath = async (expectedId: number) => {
    const paths = await getWalletPortfolios();
    const expectedSuffix = `portfolio${expectedId}`;
    const match = paths.find(path => path.endsWith(expectedSuffix));
    match || assert.fail('portfolio path not found in wallet portfolios');
    portfolioPath = match;
    portfolioId = expectedId;
    return portfolioPath;
  };

  const getChainConfig = (chain: AxelarChain) => {
    const chainInfo = chainInfoByName[chain];
    chainInfo || assert.fail(`missing chainInfo for ${chain}`);
    const contracts = contractsByChain[chain];
    contracts || assert.fail(`missing contracts for ${chain}`);
    return {
      chainId: BigInt(chainInfo.reference),
      usdcToken: contracts.usdc,
      depositFactory: contracts.depositFactory,
      permit2Address: contracts.permit2,
    };
  };

  const self = harden({
    getAddress: () => account.address,
    forChain: (chain: AxelarChain) => {
      const { chainId, usdcToken, depositFactory, permit2Address } =
        getChainConfig(chain);
      return harden({
        async openPortfolio(
          allocations: TargetAllocation[],
          depositAmount: bigint,
        ) {
          const witness = getYmaxWitness('OpenPortfolio', { allocations });
          const deadline = await getDeadline();
          const permitMessage = getPermitWitnessTransferFromData(
            {
              permitted: {
                token: usdcToken,
                amount: depositAmount,
              },
              spender: depositFactory,
              nonce: (nonce += 1n),
              deadline,
            },
            permit2Address,
            chainId,
            witness,
          );

          const expectedNonce = nonce;
          await submitMessage(permitMessage);
          const result = (await getMessageResult(
            expectedNonce,
            deadline,
          )) as string;
          const parsedId = Number(result.replace(/^portfolio/, ''));
          Number.isInteger(parsedId) ||
            assert.fail('invalid portfolio id result');
          const storagePath = await updatePortfolioPath(parsedId);
          return harden({ storagePath, portfolioId: parsedId });
        },
        async deposit(depositAmount: bigint, spender = depositFactory) {
          const currentPortfolioId = self.getPortfolioId();
          const witness = getYmaxWitness('Deposit', {
            portfolio: BigInt(currentPortfolioId),
          });
          const deadline = await getDeadline();
          const permitMessage = getPermitWitnessTransferFromData(
            {
              permitted: {
                token: usdcToken,
                amount: depositAmount,
              },
              spender,
              nonce: (nonce += 1n),
              deadline,
            },
            permit2Address,
            chainId,
            witness,
          );
          const expectedNonce = nonce;
          await submitMessage(permitMessage);
          return getMessageResult(expectedNonce, deadline) as Promise<string>;
        },
        async withdraw(withdrawDetails: TokenPermissions) {
          const currentPortfolioId = self.getPortfolioId();
          const deadline = await getDeadline();
          const message = getYmaxStandaloneOperationData(
            {
              withdraw: withdrawDetails,
              portfolio: BigInt(currentPortfolioId),
              nonce: (nonce += 1n),
              deadline,
            },
            'Withdraw',
            chainId,
            depositFactory,
          );
          const expectedNonce = nonce;
          await submitMessage(message);
          return getMessageResult(expectedNonce, deadline) as Promise<string>;
        },
        async rebalance() {
          const currentPortfolioId = self.getPortfolioId();
          const deadline = await getDeadline();
          const message = getYmaxStandaloneOperationData(
            {
              portfolio: BigInt(currentPortfolioId),
              nonce: (nonce += 1n),
              deadline,
            },
            'Rebalance',
            chainId,
            depositFactory,
          );
          const expectedNonce = nonce;
          await submitMessage(message);
          return getMessageResult(expectedNonce, deadline) as Promise<string>;
        },
        async setTargetAllocation(allocations: TargetAllocation[]) {
          const currentPortfolioId = self.getPortfolioId();
          const deadline = await getDeadline();
          const message = getYmaxStandaloneOperationData(
            {
              allocations,
              portfolio: BigInt(currentPortfolioId),
              nonce: (nonce += 1n),
              deadline,
            },
            'SetTargetAllocation',
            chainId,
            depositFactory,
          );
          const expectedNonce = nonce;
          await submitMessage(message);
          return getMessageResult(expectedNonce, deadline) as Promise<string>;
        },
      });
    },
    getPortfolioPath: () => portfolioPath || assert.fail('no portfolio'),
    getPortfolioId: () =>
      portfolioId ?? portfolioIdOfPath(stripRoot(self.getPortfolioPath())),
    getPortfolioStatus: () =>
      readPublished(stripRoot(self.getPortfolioPath())) as Promise<
        StatusFor['portfolio']
      >,
  });

  return self;
};
