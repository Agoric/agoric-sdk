import { NonNullish } from '@agoric/internal';
import { Fail, makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestInterface, GuestOf} from '@agoric/async-flow';
 * @import {Invitation, ZCF, ZCFSeat} from '@agoric/zoe';
 * @import {Brand} from '@agoric/ertp';
 * @import {Vow} from '@agoric/vow';
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, LocalAccountMethods, ChainHub, ChainInfo} from '../types.js';
 * @import {AccountIdArg} from '../orchestration-api.ts';
 */

const addresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

const channels = {
  AGORIC_XNET_TO_OSMOSIS: 'channel-6',
  AGORIC_DEVNET_TO_OSMOSIS: 'channel-61',
  OSMOSIS_TO_AXELAR: 'channel-4118',
};

const { entries } = Object;

// in guest file (the orchestration functions)
// the second argument is all the endowments provided

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 */
export const makeNobleAccount = async orch => {
  const nobleChain = await orch.getChain('noble');
  return nobleChain.makeAccount();
};
harden(makeNobleAccount);

const denomForBrand = async (orch, brand) => {
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  const { denom } = NonNullish(
    assets.find(a => a.brand === brand),
    `${brand} not registered in ChainHub`,
  );
  return denom;
};

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<ChainHub>} ctx.chainHub
 * @param {Promise<GuestInterface<LocalOrchestrationAccountKit['holder']>>} ctx.sharedLocalAccountP
 * @param {Promise<
 *   GuestInterface<
 *     import('../exos/cosmos-orchestration-account.js').CosmosOrchestrationAccountKit['holder']
 *   >
 * >} ctx.nobleAccountP
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {Brand} ctx.USDC
 * @param {ZCFSeat} seat
 * @param {{
 *   chainName: string;
 *   destAddr: string;
 *   type: number;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 * }} offerArgs
 */
export const sendIt = async (
  orch,
  {
    chainHub,
    sharedLocalAccountP,
    log,
    nobleAccountP,
    USDC,
    zoeTools: { localTransfer, withdrawToSeat },
  },
  seat,
  offerArgs,
) => {
  mustMatch(
    offerArgs,
    harden({
      chainName: M.scalar(),
      destAddr: M.string(),
      type: M.number(),
      destinationEVMChain: M.string(),
      gasAmount: M.number(),
    }),
  );
  const { chainName, destAddr, type, destinationEVMChain, gasAmount } =
    offerArgs;
  // NOTE the proposal shape ensures that the `give` is a single asset
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  void log(`sending {${amt.value}} from ${chainName} to ${destAddr}`);
  const denom = await denomForBrand(orch, amt.brand);

  /** @type {ChainInfo} */
  const info = await chainHub.getChainInfo(chainName);

  /**
   * @type {any} XXX methods returning vows
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccount = await sharedLocalAccountP;

  /**
   * Helper function to recover if IBC Transfer fails
   *
   * @param {Error} e
   */
  const recoverFailedTransfer = async e => {
    await withdrawToSeat(sharedLocalAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    void log(`ERROR: ${errorMsg}`);
    seat.fail(errorMsg);
    throw makeError(errorMsg);
  };

  if (info.namespace === 'cosmos') {
    const { chainId } = info;
    assert(typeof chainId === 'string', 'bad chainId');

    const [_a, _o, connection] = await chainHub.getChainsAndConnection(
      'agoric',
      chainName,
    );

    connection.counterparty || Fail`No IBC connection to ${chainName}`;

    void log(`got info for chain: ${chainName} ${chainId}`);

    await localTransfer(seat, sharedLocalAccount, give);
    void log(`completed transfer to localAccount`);

    try {
      await sharedLocalAccount.transfer(
        {
          value: destAddr,
          encoding: 'bech32',
          chainId,
        },
        { denom, value: amt.value },
      );
      void log(`completed transfer to ${destAddr}`);
    } catch (e) {
      return recoverFailedTransfer(e);
    }
  } else if (amt.brand === USDC && 'cctpDestinationDomain' in info) {
    const nobleAccount = await nobleAccountP;
    const nobleAddr = nobleAccount.getAddress();
    const denomAmt = { denom, value: amt.value };
    try {
      await sharedLocalAccount.transfer(nobleAddr, denomAmt);
    } catch (e) {
      return recoverFailedTransfer(e);
    }
    void log('assets are now on noble');
    const destAccountId = /** @type {const} */ (
      `${info.namespace}:${info.reference}:${destAddr}`
    );
    try {
      await nobleAccount.depositForBurn(destAccountId, denomAmt);
    } catch (e) {
      try {
        // transfer back to agoric contract account if depositForBurn is not accepted by noble chain
        const lcaAddress = await sharedLocalAccount.getAddress();
        await nobleAccount.transfer(lcaAddress, denomAmt);
      } catch (err) {
        const errorMsg = `IBC Transfer from Noble back to LocalAccount failed: ${q(err)}`;
        void log(`🚨 contract upgrade required to recover funds: ${errorMsg}`);
        seat.fail(errorMsg);
        throw makeError(errorMsg);
      }
      return recoverFailedTransfer(e);
    }
  } else {
    Fail`There is currently support only for IBC and USDC transfers`;
  }

  seat.exit();
  void log(`transfer complete, seat exited`);
};
harden(sendIt);
