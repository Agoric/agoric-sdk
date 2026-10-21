/**
 * @file Helpers to handle portfolio EIP-712 messages, extracting operation and
 * deposit permit details, as well as verifying the signature.
 *
 * The viem runtime dependency is expected as a power to make this usable both
 * on chain and in off-chain services.
 *
 * The generic machinery lives in `@agoric/orchestration`; this module binds it
 * to the {@link YmaxPortfolioMessageSchema}.
 */

import type { Address } from 'abitype';
import {
  makeEIP712MessageHandlerUtils,
  type ContractAddresses,
  type EIP712ViemUtils,
  type FullMessageDetails as GenericFullMessageDetails,
  type OperationDetails,
} from '@agoric/orchestration/src/utils/eip712-message-handler.ts';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem.js';
import {
  YmaxPortfolioMessageSchema,
  type OperationTypeNames,
  type YmaxPermitWitnessTransferFromData,
  type YmaxStandaloneOperationData,
} from './eip712-messages.ts';

export type { PermitDetails } from '@agoric/orchestration/src/utils/eip712-message-handler.ts';
export type { PermitWitnessTransferFromPayload } from '@agoric/orchestration/src/utils/permit2.ts';

export type YmaxOperationDetails<
  T extends OperationTypeNames = OperationTypeNames,
> = OperationDetails<YmaxPortfolioMessageSchema, T>;

export type FullMessageDetails<
  T extends OperationTypeNames = OperationTypeNames,
> = GenericFullMessageDetails<YmaxPortfolioMessageSchema, T>;

/**
 * EVM Message handler utils for Ymax portfolio messages, that depend on
 * 'viem' utils for their implementation. Since on-chain we cannot directly
 * import from 'viem', use a maker pattern to create these utils.
 *
 * @deprecated Use `makeEIP712MessageHandlerUtils` from
 * `@agoric/orchestration/src/utils/eip712-message-handler.js` with the
 * {@link YmaxPortfolioMessageSchema} instead. Note that its
 * `extractOperationDetailsFromDataWithAddress` takes the
 * `ymaxRepresentative` contract addresses as `verifyingContract`.
 *
 * @param viemUtils
 */
export const makeEVMHandlerUtils = (viemUtils: EIP712ViemUtils) => {
  const {
    extractOperationDetailsFromDataWithAddress: extractWithAddress,
    extractOperationDetailsFromSignedData,
    ...utils
  } = makeEIP712MessageHandlerUtils(viemUtils, YmaxPortfolioMessageSchema);

  /**
   * Extract all details sufficient to handle any EIP-712 portfolio message,
   * optionally with permit data.
   *
   * This does not verify the signature of permit2 based messages; that is
   * expected to be done by the caller.
   *
   * @see {@link makeEIP712MessageHandlerUtils} for the validation performed.
   *
   * @param data The operation data with an `address` field of the signing owner.
   * @param contractAddresses Optionally, a set of valid contract addresses to validate against
   * @param contractAddresses.permit2 If provided, validates a permit2 based message's verifying contract
   * @param contractAddresses.ymaxRepresentative If provided, validates a standalone message's verifying contract or permit2 spender
   */
  const extractOperationDetailsFromDataWithAddress = <
    T extends OperationTypeNames = OperationTypeNames,
  >(
    data: (
      | WithSignature<YmaxPermitWitnessTransferFromData<T>>
      | YmaxStandaloneOperationData<T>
    ) & { address: Address },
    {
      permit2,
      ymaxRepresentative,
    }: {
      permit2?: ContractAddresses;
      ymaxRepresentative?: ContractAddresses;
    } = {},
  ): FullMessageDetails<T> =>
    extractWithAddress(data, {
      permit2,
      verifyingContract: ymaxRepresentative,
    });

  return {
    ...utils,
    extractOperationDetailsFromDataWithAddress,
    extractOperationDetailsFromSignedData,
  };
};
