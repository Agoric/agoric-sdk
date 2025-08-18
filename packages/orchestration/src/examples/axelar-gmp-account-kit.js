/**
 * @import {VTransferIBCEvent} from '@agoric/vats';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {AxelarGmpIncomingMemo, EvmTapState, ContractCall, SupportedEVMChains} from '../axelar-types.js';
 * @import {ZCF, ZCFSeat} from '@agoric/zoe';
 * @import {AxelarGmpOutgoingMemo, GMPMessageType} from '../axelar-types.js'
 */

/** @typedef {ContractCall} ContractCall */

import { M, mustMatch } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { makeTracer, NonNullish } from '@agoric/internal';
import { atob, decodeBase64 } from '@endo/base64';
import { Fail } from '@endo/errors';
import { decodeAbiParameters } from '../vendor/viem/viem-abi.js';
import { CosmosChainAddressShape } from '../typeGuards.js';
import { gmpAddresses, buildGMPPayload } from '../utils/gmp.js';

const trace = makeTracer('EvmAccountKit');
const { entries } = Object;

const EVMI = M.interface('holder', {
  getNonce: M.call().returns(M.bigint()),
  getLocalAddress: M.call().returns(M.any()),
  getRemoteAddress: M.call().returns(M.any()),
  // TODO: This is currently a placeholder.
  // Replace with a proper message tracking mechanism that can correlate
  // incoming messages with outgoing `sendGmp` calls, possibly using vows/promises.
  getLatestMessage: M.call().returns(M.any()),
  send: M.call(M.any(), M.any()).returns(M.any()),
  sendGmp: M.call(M.any(), M.any()).returns(M.any()),
  fundLCA: M.call(M.any(), M.any()).returns(VowShape),
});
harden(EVMI);

const InvitationMakerI = M.interface('invitationMaker', {
  makeEVMTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
});
harden(InvitationMakerI);

/** @type {TypedPattern<EvmTapState>} */
const EvmKitStateShape = {
  localChainAddress: CosmosChainAddressShape,
  sourceChannel: M.string(),
  localDenom: M.string(),
  localAccount: M.remotable('LocalAccount'),
  assets: M.any(),
  remoteChainInfo: M.any(),
  nonce: M.bigint(),
};
harden(EvmKitStateShape);

/**
 * @param {Zone} zone
 * @param {{
 *   zcf: ZCF;
 *   vowTools: VowTools;
 *   log: (msg: string) => Vow<void>;
 *   zoeTools: ZoeTools;
 * }} powers
 */
export const prepareEvmAccountKit = (
  zone,
  { zcf, vowTools, log, zoeTools },
) => {
  return zone.exoClassKit(
    'EvmTapKit',
    {
      tap: M.interface('EvmTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      holder: EVMI,
      invitationMakers: InvitationMakerI,
    },
    /**
     * @param {EvmTapState} initialState
     * @returns {{
     *   evmAccountAddress: string | undefined;
     *   latestMessage:
     *     | { success: boolean; result: `0x${string}` }[]
     *     | undefined;
     * } & EvmTapState}
     */
    initialState => {
      mustMatch(initialState, EvmKitStateShape);
      return harden({
        evmAccountAddress: /** @type {string | undefined} */ (undefined),
        /**
         * @type {{ success: boolean; result: `0x${string}` }[]
         *   | undefined}
         */
        latestMessage: undefined,
        ...initialState,
      });
    },
    {
      tap: {
        /**
         * This function handles incoming packets from the cross-chain
         * communication.
         *
         * NOTE: The implementation here is no longer relevant, as the Factory
         * contract has been updated. Previously, this function was used to
         * receive a response back from the Factory contract deployed on the EVM
         * chain. However, the Factory contract now no longer sends a response
         * to Agoric. Instead, we now fetch that response off-chain and notify
         * the Agoric contract through off-chain mechanisms.
         *
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );

          trace('receiveUpcall packet data', tx);
          /** @type {AxelarGmpIncomingMemo} */
          const memo = JSON.parse(tx.memo);

          if (memo.source_chain === 'Ethereum') {
            const payloadBytes = decodeBase64(memo.payload);
            const [{ isContractCallResult, data }] = decodeAbiParameters(
              [
                {
                  type: 'tuple',
                  components: [
                    { name: 'isContractCallResult', type: 'bool' },
                    {
                      name: 'data',
                      type: 'tuple[]',
                      components: [
                        { name: 'success', type: 'bool' },
                        { name: 'result', type: 'bytes' },
                      ],
                    },
                  ],
                },
              ],
              payloadBytes,
            );

            trace(
              'receiveUpcall Decoded:',
              JSON.stringify({ isContractCallResult, data }),
            );

            if (this.state.evmAccountAddress) {
              trace('Setting latestMessage:', data);
              this.state.latestMessage = harden([...data]);
            } else {
              const [message] = data;
              const { success, result } = message;

              trace('Contract Call Status:', success);

              if (success) {
                const [address] = decodeAbiParameters(
                  [{ type: 'address' }],
                  result,
                );
                this.state.evmAccountAddress = address;
                trace('evmAccountAddress:', this.state.evmAccountAddress);
              }
            }
          }

          trace('receiveUpcall completed');
        },
      },
      holder: {
        getNonce() {
          const currentNonce = this.state.nonce;
          this.state.nonce = currentNonce + 1n;
          return currentNonce;
        },
        getLocalAddress() {
          return this.state.localAccount.getAddress().value;
        },
        async getRemoteAddress() {
          return this.state.evmAccountAddress;
        },
        async getLatestMessage() {
          return JSON.stringify(this.state.latestMessage);
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
          await this.state.localAccount.send(toAccount, amount);
          return 'transfer success';
        },

        /**
         * @param {ZCFSeat} seat
         * @param {{
         *   destinationAddress: string;
         *   type: GMPMessageType;
         *   destinationEVMChain: SupportedEVMChains;
         *   gasAmount: number;
         *   contractInvocationData: ContractCall[];
         * }} offerArgs
         */
        async sendGmp(seat, offerArgs) {
          void log('Inside sendGmp');
          const {
            destinationAddress,
            type,
            destinationEVMChain,
            gasAmount,
            contractInvocationData,
          } = offerArgs;

          trace('Offer Args:', JSON.stringify(offerArgs));

          destinationAddress != null ||
            Fail`Destination address must be defined`;
          destinationEVMChain != null ||
            Fail`Destination evm address must be defined`;

          const isContractInvocation = [1, 2].includes(type);
          if (isContractInvocation) {
            gasAmount != null ||
              Fail`gasAmount must be defined for type ${type}`;
            contractInvocationData != null ||
              Fail`contractInvocationData is not defined`;

            contractInvocationData.length !== 0 ||
              Fail`contractInvocationData array is empty`;
          }

          const { give } = seat.getProposal();

          const [[_kw, amt]] = entries(give);
          amt.value > 0n || Fail`IBC transfer amount must be greater than zero`;
          trace('_kw, amt', _kw, amt);
          trace(`targets: [${destinationAddress}]`);
          trace(
            `contractInvocationData: ${JSON.stringify(contractInvocationData)}`,
          );

          const payload =
            type === 3 ? null : buildGMPPayload(contractInvocationData);

          void log(`Payload: ${JSON.stringify(payload)}`);

          const { denom } = NonNullish(
            this.state.assets.find(a => a.brand === amt.brand),
            `${amt.brand} not registered in vbank`,
          );

          trace('amt and brand', amt.brand);

          const { chainId } = this.state.remoteChainInfo;

          /** @type {AxelarGmpOutgoingMemo} */
          const memo = {
            destination_chain: destinationEVMChain,
            destination_address: destinationAddress,
            payload,
            type,
          };

          if (type === 1 || type === 2) {
            memo.fee = {
              amount: String(gasAmount),
              recipient: gmpAddresses.AXELAR_GAS,
            };
            void log(`Fee object ${JSON.stringify(memo.fee)}`);
            trace(`Fee object ${JSON.stringify(memo.fee)}`);
          }

          void log(`Initiating IBC Transfer...`);
          void log(`DENOM of token:${denom}`);

          trace('Initiating IBC Transfer...');
          await this.state.localAccount.transfer(
            {
              value: gmpAddresses.AXELAR_GMP,
              encoding: 'bech32',
              chainId,
            },
            {
              denom,
              value: amt.value,
            },
            { memo: JSON.stringify(memo) },
          );

          seat.exit();
          void log('sendGmp successful');
          return 'sendGmp successful';
        },
        /**
         * @param {ZCFSeat} seat
         * @param {any} give
         */
        fundLCA(seat, give) {
          seat.hasExited() && Fail`The seat cannot be exited.`;
          return zoeTools.localTransfer(seat, this.state.localAccount, give);
        },
      },
      invitationMakers: {
        // "method" and "args" can be used to invoke methods of localAccount obj
        makeEVMTransactionInvitation(method, args) {
          const continuingEVMTransactionHandler = async seat => {
            await null;
            const { holder } = this.facets;
            switch (method) {
              case 'sendGmp': {
                const { give } = seat.getProposal();
                await vowTools.when(holder.fundLCA(seat, give));
                return holder.sendGmp(seat, args[0]);
              }
              case 'getLocalAddress': {
                const vow = holder.getLocalAddress();
                return vowTools.when(vow, res => {
                  seat.exit();
                  return res;
                });
              }
              case 'getRemoteAddress': {
                const vow = holder.getRemoteAddress();
                return vowTools.when(vow, res => {
                  seat.exit();
                  return res;
                });
              }
              case 'getLatestMessage': {
                const vow = holder.getLatestMessage();
                return vowTools.when(vow, res => {
                  seat.exit();
                  return res;
                });
              }
              case 'send': {
                const vow = holder.send(args[0], args[1]);
                return vowTools.when(vow, res => {
                  seat.exit();
                  return res;
                });
              }
              case 'fundLCA': {
                const { give } = seat.getProposal();
                const vow = holder.fundLCA(seat, give);
                return vowTools.when(vow, res => {
                  seat.exit();
                  return res;
                });
              }
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
