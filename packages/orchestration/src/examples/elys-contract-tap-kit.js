import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { VowShape } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { atob } from '@endo/base64';
import { ChainAddressShape } from '../typeGuards.js';
import { makeScalarMapStore } from '@agoric/store';
import { validateRemoteIbcAddress } from '@agoric/vats/tools/ibc-utils.js';
import { denomHash } from '../utils/denomHash.js';

const trace = makeTracer('AutoStakeItTap');

/**
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {TargetApp} from '@agoric/vats/src/bridge-target.js';
 * @import {ChainAddress, CosmosValidatorAddress, Denom, OrchestrationAccount, StakingAccountActions} from '@agoric/orchestration';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {TypedPattern} from '@agoric/internal';
 */

/**
 * @typedef {{
 *   sourceChannel: string;
 *   remoteDenom: string;
 *   localDenom: string;
 *   hostChainName: string;
 *   hostAccountICA: OrchestrationAccount<any>;
 *   hostChainAddressICA;
 * }} SupportedHostChainShape
 */
const SupportedHostChainShape = {
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  localDenom: M.string(),
  hostChainName: M.string(),
  hostAccountICA: M.remotable('HostAccountICA'),
  hostChainAddressICA: ChainAddressShape,
};
harden(SupportedHostChainShape);

/**
 * @typedef {{
 *   localAccount: ERef<OrchestrationAccount<{ chainId: 'agoric' }>>;
 *   strideICAAccount: ERef<OrchestrationAccount<{ chainId: 'stride-1' }>>;
 *   elysICAAccount: ERef<OrchestrationAccount<{ chainId: string }>>;
 *   localChainAddress: ChainAddress;
 *   strideICAChainAddress: ChainAddress;
 *   elysICAChainAddress: ChainAddress;
 *   supportedHostChains: MapStore<string, SupportedHostChainShape>
 * }} StakingTapState
 */
/** @type {TypedPattern<StakingTapState>} */
const StakingTapStateShape = {
  //stakingAccount: M.remotable('CosmosOrchestrationAccount'), not required
  localAccount: M.remotable('LocalOrchestrationAccount'),
  strideICAAccount: M.remotable('StrideICAAccount'),
  elysICAAccount: M.remotable('ElysICAAccount'),
  localChainAddress: ChainAddressShape,
  strideICAChainAddress: ChainAddressShape,
  elysICAChainAddress: ChainAddressShape,
  supportedHostChains: M.map(), // need the map of sourceChannel to SupportedHostChainShape
};
harden(StakingTapStateShape);

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const prepareStrideStakingTapKit = (zone, { watch }) => {
  return zone.exoClassKit(
    'StrideStakingTapKit',
    {
      // tap checks for incoming ibc transfer from cosmoshub(map to others) and then process the stride liquid staking
      tap: M.interface('StrideAutoStakeTap', {
        receiveUpcall: M.call(M.record()).returns(
          M.or(VowShape, M.undefined()),
        ),
      }),
      // Once stride liquid staking get processes and the st tokens are received on elys ICS account, it transfers the received st token amount to the user's wallets
      multiHopTransferWatcher: M.interface('FinalMultiHopTransferWatcher', {
        onFulfilled: M.call(M.undefined())
          .optional(M.bigint())
          .returns(VowShape),
      }),
    },
    /** @param {StakingTapState} initialState */
    initialState => {
      mustMatch(initialState, StakingTapStateShape);
      return harden(initialState);
    },
    {
      tap: {
        /**
         * @param {VTransferIBCEvent} event
         */
        receiveUpcall(event) {
          trace('receiveUpcall', event);

          const hostChainInfo = this.state.supportedHostChains.get(
            event.packet.source_channel,
          );
          // ignore packets from unknown channels(Not supported chains)
          if (hostChainInfo === undefined) {
            return;
          }

          const tx = /** @type {FungibleTokenPacketData} */ (
            JSON.parse(atob(event.packet.data))
          );
          trace('receiveUpcall packet data', tx);

          const {
            localChainAddress,
            strideICAChainAddress,
            elysICAChainAddress,
            localAccount,
          } = this.state;
          // ignore outgoing transfers
          if (tx.receiver !== localChainAddress.value) {
            return;
          }
          // only interested in transfers of remoteDenom(Atom)
          if (tx.denom !== hostChainInfo.remoteDenom) {
            return;
          }

          // transfer the received Atom back to hub for stride liquid staking and receiving stAtom on elys's ICA
          // prepare memo
          const channelToStrideFromHostChains =
            ibcConnectionInfos[hostChainInfo.hostChainName].stride.channelId;
          const channelFromStrideToElys =
            ibcConnectionInfos['stride'].elys.channelId;

          const autoStakeMemo = prepareMemo(
            channelToStrideFromHostChains,
            channelFromStrideToElys,
            strideICAChainAddress.value,
            elysICAChainAddress.value,
          );
          /************CHECK FOR STtoken denoms*************/
          // TODO: create the ibcDenom for the stToken received on elys to the stride ICA
          const stTokenDenom = `st${hostChainInfo.remoteDenom}`
          const stTokenDenomOnElys = `ibc/${denomHash({ denom: stTokenDenom, channelId: ibcConnectionInfos.stride.elys.channelId })}`;

          if (validateRemoteIbcAddress(tx.memo) === false) {
            // TODO: return funds?
            return;
          }

          return watch(
            E(localAccount).transfer(hostChainInfo.hostChainAddressICA.value, {
              denom: hostChainInfo.localDenom,
              value: BigInt(tx.amount)},
              { memo: JSON.stringify(autoStakeMemo) },
            ),
            this.facets.multiHopTransferWatcher,
            BigInt(tx.amount), // not sure about this
            stTokenDenomOnElys,
            tx.memo,  // sender's elys address where he will receive the stToken
          );
        },
      },
      multiHopTransferWatcher: {
        /**
         * @param {void} _result
         * @param {bigint} amount the qty of uatom to delegate
         */
        onFulfilled(_result, amount, denom, sender) {
          const {elysICAAccount} = this.state;
          // TODO: Get the sender address for elys chain(derive it from sender or get from memo)
          return watch(
            E(elysICAAccount).transfer(sender, {
              denom,
              value: amount,
            }),
          );
        },
      },
    },
  );
};

/**
 * Provides a {@link TargetApp} that reacts to an incoming IBC transfer by:
 *
 * 1. sending the funds back to the chain from which they were received with memo
 *    for liquid staking using stride autopilot and then sending the st tokens
 *    to the ICA account on the elys chain
 * 2. transferring the funds to the staking account specified at initialization
 * 3. delegating the funds to the validator specified at initialization
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @returns {(
 *   ...args: Parameters<ReturnType<typeof prepareStrideStakingTapKit>>
 * ) => ReturnType<ReturnType<typeof prepareStrideStakingTapKit>>['tap']}
 */
export const prepareStrideStakingTap = (zone, vowTools) => {
  const makeKit = prepareStrideStakingTapKit(zone, vowTools);
  return (...args) => makeKit(...args).tap;
};

/** @typedef {ReturnType<typeof prepareStrideStakingTap>} MakeStrideStakingTap */
/** @typedef {ReturnType<MakeStrideStakingTap>} StakingTap */

/**
 * Contains -
 *
 * 1. Message to transfer Atom to stride with autopilot
 * 2. Message to transfer stAtom to elys ICA fwdMessage should be - stake on strode
 *    using autoPilot With fwd To Elys
 */

const prepareMemo = (
  channelToStrideFromHostChains,
  channelFromStrideToElys,
  strideIcaAddress,
  elysICAReceiver,
) =>
  harden({
    forward: {
      receiver: 'pfm', // invalid bech32
      port: 'transfer',
      channelToStrideFromHostChains,
      timeout: '10m',
      retries: 2,
      next: {
        autopilot: {
          receiver: strideIcaAddress,
          stakeibc: {
            action: 'LiquidStake',
            strideAddress: strideIcaAddress,
            IbcReceiver: elysICAReceiver,
            transferChannel: channelFromStrideToElys,
          },
        },
      },
    },
  });

const ibcConnectionInfos = {
  // from stride to other chains
  stride: {
    elys: {
      channelId: 'channel-4118',
    },
    // ... etc.
  },
  elys: {
    stride: {
      channelId: 'channel-4119',
    },
  },
  cosmoshub: {
    stride: {
      channelId: 'channel-9',
    },
  },
};
harden(ibcConnectionInfos);

/**
 * TODO: add the ICA account address on stride as the strideAddress in case
 * ibcTransfer to elys fails on stride, then stride transfers to this address
 *
 * - Assuming that there would be only one staking tokens on the chain
 */

/**
 * 1. how many stAtoms received on stride
 * 2. If transfer from stride to elys fails for stAtom then how to get this info that stAtom are in the strideICA account
 * 3. 
 */