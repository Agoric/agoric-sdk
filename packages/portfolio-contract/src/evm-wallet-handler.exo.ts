/**
 * @file EVM Wallet handler for accepting and verifying EIP-712 YMax messages,
 * and holding portfolios for EVM accounts.
 * @see {@link prepareEVMWalletHandlerKit}
 */
import { makeTracer, type ERemote, type Remote } from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem.js';
import {
  encodeType,
  getTypesForEIP712Domain,
  hashStruct,
  isHex,
  recoverTypedDataAddress,
  validateTypedData,
} from '@agoric/orchestration/src/vendor/viem/viem-typedData.js';
import { getAddress } from '@agoric/orchestration/src/vendor/viem/viem-address.js';
import type { StatusFor } from '@agoric/portfolio-api';
import type {
  YmaxFullDomain,
  YmaxPermitWitnessTransferFromData,
  YmaxStandaloneOperationData,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import {
  makeEVMHandlerUtils,
  type FullMessageDetails,
  type PermitDetails,
  type YmaxOperationDetails,
} from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import { provideLazy, type MapStore } from '@agoric/store';
import type { TimerService } from '@agoric/time';
import { VowShape, type Vow, type VowTools } from '@agoric/vow';
import { type Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { makePassableKit } from '@endo/marshal';
import { passStyleOf, type Passable, type PureData } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type { Address } from 'abitype';
import type { RecoverTypedDataAddressParameters } from 'viem';
import type { PublishStatus } from './portfolio.contract.ts';
import type { PortfolioKit } from './portfolio.exo.ts';

const trace = makeTracer('PEWH');

const MAX_DEADLINE_OFFSET = 60n * 60n * 24n; // 1 day in seconds

type EIP712Data = WithSignature<
  YmaxStandaloneOperationData | YmaxPermitWitnessTransferFromData
> & { verifiedSigner?: Address };

type PortfolioEVMFacet = PortfolioKit['evmHandler'];
interface PortfolioContractPublicFacet {
  openPortfolioFromEVM(
    data: YmaxOperationDetails<'OpenPortfolio'>['data'],
    permitDetails: PermitDetails,
  ): Promise<{
    evmHandler: PortfolioEVMFacet;
    storagePath: string;
  }>;
  validateEVMMessageDomain(
    domain: YmaxFullDomain,
    portfolio?: Remote<PortfolioEVMFacet>,
  ): Promise<void>;
}

/** @private */
export type EVMWallet = {
  portfolios: MapStore<bigint, Remote<PortfolioEVMFacet>>;
};

type NonceKeyData = {
  walletOwner: Address;
  nonce: bigint;
  deadline: bigint;
};

/** @private */
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
      if (currentTime <= key.deadline) {
        break;
      }

      noncesByDeadline.delete(encodeKeyByDeadline(key));
      noncesByOwner.delete(encodeKeyByOwner(key));
    }
  };

  return harden({ insertNonce, removeExpiredNonces });
};
type NonceManager = ReturnType<typeof makeNonceManager>;

/** @private */
export const getPublishedResult = (
  rawResult: unknown,
): PureData | undefined => {
  try {
    const passStyle = passStyleOf(rawResult as Passable);

    switch (passStyle) {
      case 'bigint':
      case 'boolean':
      case 'null':
      case 'number':
      case 'string':
      case 'undefined':
      case 'symbol':
      case 'byteArray':
        // "Atoms"
        return rawResult as PureData;
      case 'copyArray':
      case 'copyRecord':
      case 'tagged':
        // XXX: "structures" should be checked for not containing Caps or Errors
        return rawResult as PureData;
      case 'error':
      case 'remotable':
      case 'promise':
        return undefined;
      default:
        return passStyle ? (rawResult as PureData) : undefined;
    }
  } catch {
    // Non-passable
    return undefined;
  }
};

/** @private */
export const prepareEVMPortfolioOperationManager = (
  zone: Zone,
  {
    vowTools: { asVow, watch, when },
    portfolioContractPublicFacet,
    publishStatus,
  }: {
    vowTools: Pick<VowTools, 'asVow' | 'watch' | 'when'>;
    portfolioContractPublicFacet: ERemote<PortfolioContractPublicFacet>;
    publishStatus: PublishStatus;
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
      deadline: bigint;
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
              storageNode,
            } = this.state;

            portfolios.init(BigInt(portfolioId), evmHandler);

            const portfolioPaths = await Promise.all(
              [...portfolios.values()].map(async pHandler => {
                const pReader = E(pHandler).getReaderFacet();
                // Vow is fulfilled promptly
                const path = await when(E(pReader).getStoragePath());
                return path as StatusFor['evmWalletPortfolios'][number];
              }),
            );

            publishStatus<'evmWalletPortfolios'>(
              E(storageNode).makeChildNode('portfolio'),
              portfolioPaths,
            );

            return this.facets.BasicOutcomeWatcher.onFulfilled(
              `portfolio${portfolioId}`,
            );
          } catch (e) {
            return this.facets.BasicOutcomeWatcher.onRejected(e);
          }
        },
        onRejected(reason: unknown) {
          return this.facets.BasicOutcomeWatcher.onRejected(reason);
        },
      },
      BasicOutcomeWatcher: {
        onFulfilled(result: unknown) {
          const { storageNode, nonce, deadline } = this.state;

          publishStatus<'evmWallet'>(storageNode, {
            updated: 'messageUpdate',
            nonce,
            deadline,
            status: 'ok',
            result: getPublishedResult(result),
          });
        },
        onRejected(reason: unknown) {
          const { storageNode, nonce, deadline } = this.state;

          publishStatus<'evmWallet'>(storageNode, {
            updated: 'messageUpdate',
            nonce,
            deadline,
            status: 'error',
            error: String(reason),
          });
        },
      },
    },
  );

  const handleOperation = ({
    wallet,
    storageNode,
    address,
    operationDetails,
    nonce,
    deadline,
  }: {
    wallet: EVMWallet;
    storageNode: Remote<StorageNode>;
    address: Address;
    operationDetails: YmaxOperationDetails &
      Pick<FullMessageDetails, 'permitDetails'>;
    nonce: bigint;
    deadline: bigint;
  }): Vow<void> =>
    asVow(async () => {
      publishStatus<'evmWallet'>(storageNode, {
        updated: 'messageUpdate',
        nonce,
        deadline,
        status: 'pending',
      });

      const { BasicOutcomeWatcher, OpenOutcomeWatcher } = makeOutcomeHandlers({
        wallet,
        storageNode,
        nonce,
        deadline,
      });

      await null;
      try {
        const portfolioId =
          operationDetails.operation !== 'OpenPortfolio'
            ? operationDetails.data.portfolio
            : undefined;
        const portfolio =
          portfolioId !== undefined
            ? wallet.portfolios.get(BigInt(portfolioId))
            : undefined;

        await E(portfolioContractPublicFacet).validateEVMMessageDomain(
          operationDetails.domain,
          portfolio,
        );

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
            const { permitDetails } = operationDetails;

            const result = E(portfolio!).rebalance(undefined, permitDetails);

            return watch(result, BasicOutcomeWatcher);
          }
          case 'SetTargetAllocation': {
            const {
              data: { allocations },
              permitDetails,
            } = operationDetails;

            const result = E(portfolio!).rebalance(allocations, permitDetails);

            return watch(result, BasicOutcomeWatcher);
          }
          case 'Deposit': {
            const { permitDetails } = operationDetails;
            if (!permitDetails) {
              throw Fail`Missing permit details for Deposit operation`;
            }

            const result = E(portfolio!).deposit(permitDetails);

            return watch(result, BasicOutcomeWatcher);
          }
          case 'Withdraw': {
            const {
              data: { withdraw: withdrawDetails },
              domain,
            } = operationDetails;

            const result = E(portfolio!).withdraw({
              withdrawDetails,
              domain,
              address,
            });

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
type EVMPortfolioOperationManager = ReturnType<
  typeof prepareEVMPortfolioOperationManager
>;

export const EIP712DataShape = M.splitRecord(
  {
    domain: M.any(),
    types: M.record(),
    primaryType: M.string(),
    message: M.record(),
    signature: M.any(),
  },
  {
    verifiedSigner: M.string(),
  },
);

/**
 * Prepare an EVM Wallet message handler exoClass. This is the inner factory
 * that can be called with explicit dependencies, enabling unit tests to
 * supply mocks for `handleOperation`, nonce management, and wallet lookup.
 *
 * @see {@link prepareEVMWalletHandlerKit} for the full wiring used in production.
 */
export const prepareEVMWalletMessageHandler = (
  zone: Zone,
  {
    vowTools,
    storageNode,
    timerService,
    permit2Addresses,
    handleOperation,
    insertNonce,
    removeExpiredNonces,
    getWalletForAddress,
  }: {
    vowTools: Pick<VowTools, 'asVow' | 'watch' | 'when'>;
    storageNode: ERemote<StorageNode>;
    timerService: ERemote<TimerService>;
    permit2Addresses: { [chainId in `${number | bigint}`]?: Address };
    handleOperation: EVMPortfolioOperationManager['handleOperation'];
    insertNonce: NonceManager['insertNonce'];
    removeExpiredNonces: NonceManager['removeExpiredNonces'];
    getWalletForAddress: (address: Address) => EVMWallet;
  },
) => {
  const { extractOperationDetailsFromDataWithAddress } = makeEVMHandlerUtils({
    isHex,
    hashStruct,
    recoverTypedDataAddress,
    validateTypedData,
    encodeType,
    getTypesForEIP712Domain,
  });

  const MessageHandlerI = M.interface('EVMWalletMessageHandler', {
    handleMessage: M.call(EIP712DataShape).returns(VowShape),
  });

  return zone.exoClass(
    'messageHandler',
    MessageHandlerI,
    () => ({}),
    {
      // eslint-disable-next-line jsdoc/require-throws-type
      /**
       * Handle an EIP-712 message signed by a user.
       *
       * Used by an off-chain message service to relay the message that was
       * signed by the user's wallet, after having verified that the user's
       * message is valid, and optionally that the signature matches the
       * claimed user's wallet.
       *
       * @param messageData - The EIP-712 message
       * @throws i.e. Vow rejects if:
       *   - the message shape is invalid,
       *   - the message nonce or deadline are invalid,
       *
       *   If execution triggered by the message fails, including invalid
       *   representative contract address, the status is reported to
       *   the public topic.
       */
      handleMessage(messageData: EIP712Data): Vow<void> {
        return vowTools.asVow(async () => {
          trace('handleMessage', messageData);

          const { verifiedSigner, ...signedData } = messageData;

          // Extracts the owner address from the signature using ECDSA recovery
          // if a verified signer was not provided by the caller.
          // Normalize signer address to checksum format.
          // ECDSA extraction does this automatically, ensures that an externally
          // verified signer address matches the format.
          // Resolves immediately on-chain since all deps are bundled
          const walletOwner = await (verifiedSigner
            ? getAddress(verifiedSigner)
            : recoverTypedDataAddress(
                signedData as RecoverTypedDataAddressParameters,
              ));

          const signedDataWithAddress = {
            ...signedData,
            address: walletOwner,
          };

          // This does not perform any signature validation
          const details = extractOperationDetailsFromDataWithAddress(
            signedDataWithAddress,
            {
              permit2: permit2Addresses,
            },
          );

          trace('extracted details', details);

          const { nonce, deadline, ...operationDetails } = details;

          // Resolves promptly
          const { absValue: localChainTime } =
            await E(timerService).getCurrentTimestamp();
          removeExpiredNonces(localChainTime);

          if (localChainTime > deadline) {
            throw Fail`Deadline has already passed: ${q(deadline)} vs ${q(
              localChainTime,
            )}`;
          }

          deadline < localChainTime + MAX_DEADLINE_OFFSET ||
            Fail`Deadline too far in the future: ${q(deadline)} vs ${q(localChainTime)}`;
          insertNonce({ walletOwner, nonce, deadline });

          const wallet = getWalletForAddress(walletOwner);
          // Resolves promptly
          const walletNode: Remote<StorageNode> =
            await E(storageNode).makeChildNode(walletOwner);

          harden(operationDetails);

          // The ymax domain (verifyingContract / permit2 spender) will be validated by handleOperation
          // to report any issues on the wallet's public topic.
          return handleOperation({
            wallet,
            storageNode: walletNode,
            address: walletOwner,
            operationDetails,
            nonce,
            deadline,
          });
        });
      },
    },
    {
      stateShape: {},
    },
  );
};

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
    publishStatus,
    permit2Addresses,
  }: {
    storageNode: ERemote<StorageNode>;
    vowTools: Pick<VowTools, 'asVow' | 'watch' | 'when'>;
    timerService: ERemote<TimerService>;
    portfolioContractPublicFacet: ERemote<PortfolioContractPublicFacet>;
    publishStatus: PublishStatus;
    permit2Addresses: { [chainId in `${number | bigint}`]?: Address };
  },
) => {
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
    publishStatus,
  });

  const makeEVMWalletMessageHandler = prepareEVMWalletMessageHandler(zone, {
    vowTools,
    storageNode,
    timerService,
    permit2Addresses,
    handleOperation,
    insertNonce,
    removeExpiredNonces,
    getWalletForAddress,
  });

  return harden({ makeEVMWalletMessageHandler });
};

export type EVMWalletMessageHandler = ReturnType<
  ReturnType<typeof prepareEVMWalletHandlerKit>['makeEVMWalletMessageHandler']
>;
