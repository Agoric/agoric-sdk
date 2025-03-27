// @ts-check
import { M, mustMatch } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { atob, decodeBase64 } from '@endo/base64';
import { defaultAbiCoder } from '@ethersproject/abi';
import { CosmosChainAddressShape } from '../typeGuards.js';

const trace = makeTracer('EvmTap');

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainAddress, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 */

/**
 * @typedef {{
 *   localAccount: ERef<OrchestrationAccount<{ chainId: 'agoric' }>>;
 *   localChainAddress: CosmosChainAddress;
 *   sourceChannel: IBCChannelID;
 *   remoteDenom: Denom;
 *   localDenom: Denom;
 * }} EvmTapState
 */

const EVMI = M.interface('holder', {
  getAddress: M.call().returns(M.any()),
  getEVMSmartWalletAddress: M.call().returns(M.any()),
  send: M.call(M.any(), M.any()).returns(M.any()),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEVMTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
});

const EvmKitStateShape = {
  localChainAddress: CosmosChainAddressShape,
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  localDenom: M.string(),
  localAccount: M.remotable('OrchestrationAccount<{chainId:"agoric-3"}>'),
};
harden(EvmKitStateShape);

/**
 * @param {Zone} zone
 * @param {{ vowTools: VowTools; zcf: ZCF }} powers
 */
export const prepareEvmAccountKit = (zone, { zcf }) => {
  return zone.exoClassKit(
    'EvmTapKit',
    {
      tap: M.interface('EvmTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      transferWatcher: M.interface('TransferWatcher', {
        onFulfilled: M.call(M.undefined())
          .optional(M.bigint())
          .returns(VowShape),
      }),
      holder: EVMI,
      invitationMakers: InvitationMakerI,
    },
    /** @param {EvmTapState} initialState */
    initialState => {
      mustMatch(initialState, EvmKitStateShape);
      return harden({ evmAccountAddress: undefined, ...initialState });
    },
    {
      tap: {
        /**
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );

          trace('receiveUpcall packet data', tx);
          const memo = JSON.parse(tx.memo);

          if (memo.source_chain === 'Ethereum') {
            const payloadBytes = decodeBase64(memo.payload);
            const payload = Array.from(payloadBytes);
            const decoded = defaultAbiCoder.decode(['address'], payload);
            trace(decoded);

            this.state.evmAccountAddress = decoded[0];
          }

          trace('receiveUpcall completed');
        },
      },
      transferWatcher: {
        /**
         * @param {void} _result
         * @param {bigint} value the qty of uatom to delegate
         */
        onFulfilled(_result, value) {
          trace('onFulfilled _result:', JSON.stringify(_result));
          trace('onFulfilled value:', JSON.stringify(value));
          trace('onFulfilled state:', JSON.stringify(this.state));
        },
      },
      holder: {
        async getAddress() {
          // @ts-expect-error
          const localChainAddress = await this.state.localAccount.getAddress();
          return localChainAddress.value;
        },
        async getEVMSmartWalletAddress() {
          return this.state.evmAccountAddress;
        },

        /**
         * Sends tokens from the local account to a specified Cosmos chain
         * address.
         *
         * @param {import('@agoric/orchestration').CosmosChainAddress} toAccount
         * @param {import('@agoric/orchestration').AmountArg} amount
         * @returns {Promise<string>} A success message upon completion.
         */
        async send(toAccount, amount) {
          // @ts-expect-error
          await this.state.localAccount.send(toAccount, amount);
          return 'transfer success';
        },
      },
      invitationMakers: {
        // "method" and "args" can be used to invoke methods of localAccount obj
        makeEVMTransactionInvitation(method, args) {
          const continuingEVMTransactionHandler = async seat => {
            const { holder } = this.facets;
            seat.exit();
            switch (method) {
              case 'getAddress':
                return holder.getAddress();
              case 'getEVMSmartWalletAddress':
                return holder.getEVMSmartWalletAddress();
              case 'send':
                return holder.send(args[0], args[1]);
              default:
                return 'Invalid method';
            }
          };

          return zcf.makeInvitation(
            continuingEVMTransactionHandler,
            'evmTransaction',
          );
        },
      },
    },
  );
};

/** @typedef {ReturnType<typeof prepareEvmAccountKit>} MakeEvmAccountKit */
/** @typedef {ReturnType<MakeEvmAccountKit>} EvmAccountKit */
