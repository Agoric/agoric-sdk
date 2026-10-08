/**
 * @file Verification of portfolio observations signed by the observation
 * service (the attestor), as EIP-712 `PortfolioObservations` messages.
 * @see {@link makePortfolioObservationsVerifier}
 */
import type { ERemote } from '@agoric/internal';
import { sameEvmAddress } from '@agoric/orchestration/src/utils/address.js';
import {
  makeEIP712MessageHandlerUtils,
  type ContractAddresses,
} from '@agoric/orchestration/src/utils/eip712-message-handler.ts';
import {
  encodeType,
  getTypesForEIP712Domain,
  hashStruct,
  isHex,
  recoverTypedDataAddress,
} from '@agoric/orchestration/src/vendor/viem/viem-typedData.js';
import {
  portfolioObservationsFromEIP712,
  YmaxObservationMessageSchema,
  type PortfolioObservationsContent,
  type SignedPortfolioObservations,
} from '@agoric/portfolio-api/src/observation-messages.js';
import type { TimerService } from '@agoric/time';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import type { Address } from 'abitype';
import type { RecoverTypedDataAddressParameters } from 'viem';

/**
 * How long after being issued signed observations may be relied upon, at
 * most.
 *
 * The attestor picks the actual lifetime of observations with their
 * `deadline` (currently 5 minutes after being issued); this only bounds it,
 * leaving the attestor room to adjust that lifetime without a contract
 * upgrade.
 */
export const MAX_OBSERVATION_AGE_SECONDS = 15n * 60n;

export type VerifiedPortfolioObservations = PortfolioObservationsContent & {
  /** When the observations were issued, in seconds since the epoch. */
  issuedAt: bigint;
  /** When the observations expire, in seconds since the epoch. */
  deadline: bigint;
};

/**
 * Make a function verifying `PortfolioObservations` messages signed by the
 * attestor, returning their content.
 *
 * The attestor's address is only held by the returned function. Unlike the
 * EVM wallet message handler, there is no way to bypass the signature check
 * (e.g. with an externally verified signer).
 *
 * @param powers
 * @param powers.attestorAddress the address of the attestor's EOA
 * @param powers.verifyingContracts the valid verifying contract of the
 *   message domain, by EIP-155 chain ID
 * @param powers.timerService to check the freshness of observations
 */
export const makePortfolioObservationsVerifier = ({
  attestorAddress,
  verifyingContracts,
  timerService,
}: {
  attestorAddress: Address;
  verifyingContracts: ContractAddresses;
  timerService: ERemote<TimerService>;
}) => {
  const validContractAddresses = harden({ ...verifyingContracts });

  const { extractOperationDetailsFromDataWithAddress } =
    makeEIP712MessageHandlerUtils(
      {
        isHex,
        hashStruct,
        recoverTypedDataAddress,
        encodeType,
        getTypesForEIP712Domain,
      },
      YmaxObservationMessageSchema,
      // Unlike permissions, there's no closed shape downstream to reject
      // signed fields this version doesn't understand.
      { onUnknownSignedField: 'throw' },
    );

  /**
   * Verify a `PortfolioObservations` message signed by the attestor.
   *
   * Only depends on promptly resolved promises.
   *
   * @param signedObservations
   * @throws {Error} if the message is not a valid `PortfolioObservations` signed by the
   *   attestor for one of the valid verifying contracts, or if its deadline
   *   has passed or it was issued in the future or too long ago.
   */
  const verifyPortfolioObservations = async (
    signedObservations: SignedPortfolioObservations,
  ): Promise<VerifiedPortfolioObservations> => {
    // Resolves immediately on-chain since all deps are bundled
    const signer = await recoverTypedDataAddress(
      signedObservations as RecoverTypedDataAddressParameters,
    );
    sameEvmAddress(signer, attestorAddress) ||
      Fail`observations not signed by the attestor: ${q(signer)}`;

    // Validates the domain and that every field was actually signed and is
    // understood, but does not itself perform any signature validation.
    // The nonce of observations is the time they were issued.
    const {
      operation,
      data,
      nonce: issuedAt,
      deadline,
    } = extractOperationDetailsFromDataWithAddress(
      { ...signedObservations, address: signer },
      { verifyingContract: validContractAddresses },
    );
    operation === 'PortfolioObservations' ||
      Fail`unexpected observations operation ${q(operation)}`;
    const content = portfolioObservationsFromEIP712(data);

    // Resolves promptly
    const { absValue: now } = await E(timerService).getCurrentTimestamp();
    now <= deadline ||
      Fail`observations deadline has passed: ${q(deadline)} vs ${q(now)}`;
    issuedAt <= now ||
      Fail`observations issued in the future: ${q(issuedAt)} vs ${q(now)}`;
    now <= issuedAt + MAX_OBSERVATION_AGE_SECONDS ||
      Fail`observations issued too long ago: ${q(issuedAt)} vs ${q(now)}`;

    return harden({ ...content, issuedAt, deadline });
  };
  return harden(verifyPortfolioObservations);
};
harden(makePortfolioObservationsVerifier);

export type PortfolioObservationsVerifier = ReturnType<
  typeof makePortfolioObservationsVerifier
>;
