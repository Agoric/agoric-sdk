/**
 * @file EVM Wallet handler for accepting and verifying EIP-712 YMax messages,
 * and holding portfolios for EVM accounts.
 * @see {@link prepareEVMWalletHandlerKit}
 */
import { makeTracer, type ERemote } from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { type Vow, VowShape, type VowTools } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem.ts';
import type {
  YmaxStandaloneOperationData,
  YmaxPermitWitnessTransferFromData,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.ts';
import {
  hashStruct,
  isHex,
  recoverTypedDataAddress,
  validateTypedData,
  encodeType,
} from '@agoric/orchestration/src/vendor/viem/viem-typedData.js';
import { makeEVMHandlerUtils } from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.ts';

const trace = makeTracer('PEWH');

type EIP712Data = WithSignature<
  YmaxStandaloneOperationData | YmaxPermitWitnessTransferFromData
>;

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
    vowTools,
  }: {
    storageNode: ERemote<StorageNode>;
    vowTools: Pick<VowTools, 'asVow'>;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const wallets = zone.mapStore('wallets');

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

          throw Error('TODO: Not implemented');
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
