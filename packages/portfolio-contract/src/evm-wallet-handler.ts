/**
 * @file EVM Wallet handler for accepting and verifying EIP-712 YMax messages,
 * and holding portfolios for EVM accounts.
 * @see {@link prepareEVMWalletHandlerKit}
 */
import { makePassableKit } from '@endo/marshal';
import { makeTracer, type ERemote, type Remote } from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem.ts';
import {
  encodeType,
  hashStruct,
  isHex,
  recoverTypedDataAddress,
  validateTypedData,
} from '@agoric/orchestration/src/vendor/viem/viem-typedData.js';
import type {
  YmaxPermitWitnessTransferFromData,
  YmaxStandaloneOperationData,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.ts';
import {
  makeEVMHandlerUtils,
  type FullMessageDetails,
  type PermitDetails,
  type YmaxOperationDetails,
} from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.ts';
import { provideLazy } from '@agoric/store';
import type { TimerService } from '@agoric/time';
import { VowShape, type Vow, type VowTools } from '@agoric/vow';
import { type Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import type { Address } from 'abitype';
import type { PortfolioKit } from './portfolio.exo.ts';

const trace = makeTracer('PEWH');

const MAX_DEADLINE_OFFSET = 60n * 60n * 24n; // 1 day in seconds

type EIP712Data = WithSignature<
  YmaxStandaloneOperationData | YmaxPermitWitnessTransferFromData
>;

type PortfolioEVMFacet = PortfolioKit['evmHandler'];
interface PortfolioContractPublicFacet {
  openPortfolioFromEVM(
    data: YmaxOperationDetails<'OpenPortfolio'>['data'],
    permitDetails: PermitDetails,
  ): Promise<{
    evmHandler: PortfolioEVMFacet;
    storagePath: string;
  }>;
}

type EVMWallet = {
  portfolios: MapStore<bigint, Remote<PortfolioEVMFacet>>;
};

type NonceKeyData = {
  walletOwner: Address;
  nonce: bigint;
  deadline: bigint;
};

export const makeNonceManager = (zone: Zone) => {
  // We must use our own encoder since liveslots collections only accept scalar keys
  const { decodePassable, encodePassable } = makePassableKit({
    format: 'compactOrdered',
  });

  const encodeKeyByDeadline = (key: NonceKeyData): string =>
    encodePassable(harden([key.deadline, key.walletOwner, key.nonce]));

  const decodeKeyByDeadline = (encoded: string): NonceKeyData => {
    const [deadline, walletOwner, nonce] = decodePassable(encoded) as [
      bigint,
      Address,
      bigint,
    ];
    return { deadline, walletOwner, nonce };
  };

  const encodeKeyByOwner = (key: NonceKeyData): string =>
    encodePassable(harden([key.walletOwner, key.nonce, key.deadline]));

  const getByOwnerKeyPrefix = (key: NonceKeyData): string =>
    encodePassable(harden([key.walletOwner, key.nonce]));

  const noncesByDeadline = zone.setStore<string>('noncesByDeadline', {
    keyShape: M.string(),
  });
  const noncesByOwner = zone.setStore<string>('noncesByOwner', {
    keyShape: M.string(),
  });

  const insertNonce = (key: NonceKeyData): void => {
    const candidatePrefix = getByOwnerKeyPrefix(key);
    for (const encodedCandidateKey of noncesByOwner.keys(
      M.gte(candidatePrefix),
    )) {
      if (!encodedCandidateKey.startsWith(candidatePrefix)) {
        break;
      }

      Fail`Nonce ${q(key.nonce)} for wallet ${q(
        key.walletOwner,
      )} already used and not yet expired`;
    }

    noncesByDeadline.add(encodeKeyByDeadline(key));
    noncesByOwner.add(encodeKeyByOwner(key));
  };

  const removeExpiredNonces = (currentTime: bigint): void => {
    for (const encodedKey of noncesByDeadline.keys()) {
      const key = decodeKeyByDeadline(encodedKey);
      if (key.deadline > currentTime) {
        break;
      }

      noncesByDeadline.delete(encodeKeyByDeadline(key));
      noncesByOwner.delete(encodeKeyByOwner(key));
    }
  };

  return harden({ insertNonce, removeExpiredNonces });
};

export const prepareEVMPortfolioOperationManager = (
  zone: Zone,
  {
    vowTools: { asVow, watch },
    portfolioContractPublicFacet,
  }: {
    vowTools: Pick<VowTools, 'asVow' | 'watch'>;
    portfolioContractPublicFacet: ERemote<PortfolioContractPublicFacet>;
  },
) => {
  const makeOutcomeHandlers = zone.exoClassKit(
    'OperationOutcomeHandlers',
    /// XXX should have interface guard
    undefined,
    (data: {
      wallet: EVMWallet;
      storageNode: Remote<StorageNode>;
      nonce: bigint;
    }) => data,
    {
      OpenOutcomeWatcher: {
        async onFulfilled({
          evmHandler,
        }: Awaited<
          ReturnType<PortfolioContractPublicFacet['openPortfolioFromEVM']>
        >) {
          await null;
          try {
            const reader = await E(evmHandler).getReaderFacet();
            const portfolioId = await E(reader).getPortfolioId();
            const {
              wallet: { portfolios },
            } = this.state;

            portfolios.init(BigInt(portfolioId), evmHandler);

            // XXX: Publish to vstorage the portfolio public path

            return this.facets.BasicOutcomeWatcher.onFulfilled();
          } catch (e) {
            return this.facets.BasicOutcomeWatcher.onRejected(e);
          }
        },
        onRejected(reason: unknown) {
          return this.facets.BasicOutcomeWatcher.onRejected(reason);
        },
      },
      BasicOutcomeWatcher: {
        onFulfilled() {
          // XXX: Publish to vstorage that the operation succeeded
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onRejected(reason: unknown) {
          // XXX: Publish to vstorage that the operation failed, and rethrow
        },
      },
    },
  );

  const handleOperation = (
    wallet: EVMWallet,
    storageNode: Remote<StorageNode>,
    operationDetails: YmaxOperationDetails &
      Pick<FullMessageDetails, 'permitDetails'>,
    nonce: bigint,
  ): Vow<void> =>
    asVow(async () => {
      // XXX: Publish to vstorage that the operation is started

      const { BasicOutcomeWatcher, OpenOutcomeWatcher } = makeOutcomeHandlers({
        wallet,
        storageNode,
        nonce,
      });

      try {
        switch (operationDetails.operation) {
          case 'OpenPortfolio': {
            const { permitDetails, data } = operationDetails;
            if (!permitDetails) {
              throw Fail`Missing permit details for OpenPortfolio operation`;
            }
            const result = E(portfolioContractPublicFacet).openPortfolioFromEVM(
              data,
              permitDetails,
            );

            return watch(result, OpenOutcomeWatcher);
          }
          case 'Rebalance': {
            const {
              data: { portfolio: portfolioId },
            } = operationDetails;

            const portfolio = wallet.portfolios.get(BigInt(portfolioId));

            const result =
              E(portfolio).rebalance(/* otherData, permitDetails */);

            return watch(result, BasicOutcomeWatcher);
          }
          case 'Deposit': {
            const {
              permitDetails,
              data: { portfolio: portfolioId },
            } = operationDetails;
            if (!permitDetails) {
              throw Fail`Missing permit details for Deposit operation`;
            }

            const portfolio = wallet.portfolios.get(BigInt(portfolioId));

            const result = E(portfolio).deposit(/* otherData, permitDetails */);

            return watch(result, BasicOutcomeWatcher);
          }
          default:
            // @ts-expect-error exhaustiveness check
            Fail`Unsupported operation: ${q(operationDetails.operation)}`;
        }
      } catch (e) {
        return BasicOutcomeWatcher.onRejected(e);
      }
    });

  return harden({ handleOperation });
};

export const EIP712DataShape = M.splitRecord({
  domain: M.any(),
  types: M.record(),
  primaryType: M.string(),
  message: M.record(),
  signature: M.any(),
});

/**
 * Prepare an EVM Wallet handler kit. It holds portfolios for EVM Wallet users,
 * and accepts and verifies EIP-712 messages they sign.
 *
 * A message handler instance is meant to be held by an off-chain service to
 * submit EIP-712 messages on behalf of EVM Wallet users after doing
 * preliminary validations of the message and the user's EVM wallet state.
 * Status updates of processing messages are published to vstorage, similarly
 * to offer status updates published by the smart wallet.
 *
 * Portfolios created by EVM Wallet users are held by the kit, which can only
 * interact with these portfolios (not any other existing portfolios). The
 * public subscriber path of these portfolios are also published to vstorage,
 * similar to how the smart wallet publishes these.
 */
export const prepareEVMWalletHandlerKit = (
  zone: Zone,
  {
    storageNode,
    vowTools,
    timerService,
    portfolioContractPublicFacet,
  }: {
    storageNode: ERemote<StorageNode>;
    vowTools: Pick<VowTools, 'asVow' | 'watch'>;
    timerService: ERemote<TimerService>;
    portfolioContractPublicFacet: ERemote<PortfolioContractPublicFacet>;
  },
) => {
  const { extractOperationDetailsFromSignedData } = makeEVMHandlerUtils({
    isHex,
    hashStruct,
    recoverTypedDataAddress,
    validateTypedData,
    encodeType,
  });

  // TODO: key/value shapes?
  const walletByAddress = zone.mapStore<Address, EVMWallet>('wallets');

  const getWalletForAddress = (address: Address): EVMWallet =>
    provideLazy(walletByAddress, address, () =>
      harden({
        portfolios: zone.detached().mapStore('portfolios'),
      }),
    );

  const { insertNonce, removeExpiredNonces } = makeNonceManager(zone);
  const { handleOperation } = prepareEVMPortfolioOperationManager(zone, {
    vowTools,
    portfolioContractPublicFacet,
  });

  const MessageHandlerI = M.interface('EVMWalletMessageHandler', {
    handleMessage: M.call(EIP712DataShape).returns(VowShape),
  });

  const makeEVMWalletMessageHandler = zone.exoClass(
    'messageHandler',
    MessageHandlerI,
    () => ({}),
    {
      /**
       * Handle an EIP-712 message signed by a user.
       *
       * Used by an off-chain message service to relay the message that was
       * signed by the user's wallet, after having verified that the user's
       * message is valid.
       *
       * @param messageData - The EIP-712 message that
       * @throws i.e. Vow rejects if the message fails validation. If the
       *   execution triggered by the message fails, the status is reported to
       *   the public topic.
       */
      handleMessage(messageData: EIP712Data): Vow<void> {
        return vowTools.asVow(async () => {
          trace('handleMessage', messageData);

          // Resolves immediately on-chain since all deps are bundled
          const details =
            await extractOperationDetailsFromSignedData(messageData);

          trace('extracted details', details);

          const { evmWalletAddress, nonce, deadline, ...operationDetails } =
            details;

          // Resolves promptly
          const { absValue: localChainTime } =
            await E(timerService).getCurrentTimestamp();
          removeExpiredNonces(localChainTime);

          deadline < localChainTime + MAX_DEADLINE_OFFSET ||
            Fail`Deadline too far in the future: ${q(deadline)} vs ${q(localChainTime)}`;
          insertNonce({ walletOwner: evmWalletAddress, nonce, deadline });

          const wallet = getWalletForAddress(evmWalletAddress);
          // Resolves promptly
          const walletNode: Remote<StorageNode> =
            await E(storageNode).makeChildNode(evmWalletAddress);

          return handleOperation(
            wallet,
            walletNode,
            harden(operationDetails),
            nonce,
          );
        });
      },
    },
    {
      stateShape: {},
    },
  );

  return harden({ makeEVMWalletMessageHandler });
};

export type EVMWalletMessageHandler = ReturnType<
  ReturnType<typeof prepareEVMWalletHandlerKit>['makeEVMWalletMessageHandler']
>;
