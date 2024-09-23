import { NonNullish } from '@agoric/internal';
import { makeError, q } from '@endo/errors';
import { M, mustMatch } from '@endo/patterns';

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {Vow} from '@agoric/vow';
 * @import {ZoeTools} from '../utils/zoe-tools.js';
 * @import {Orchestrator, LocalAccountMethods, OrchestrationAccountI, OrchestrationFlow} from '../types.js';
 */

const { entries } = Object;

// in guest file (the orchestration functions)
// the second argument is all the endowments provided

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {{ localAccount?: OrchestrationAccountI & LocalAccountMethods }} ctx.contractState
 * @param {GuestInterface<ZoeTools>} ctx.zoeTools
 * @param {GuestOf<(msg: string) => Vow<void>>} ctx.log
 * @param {ZCFSeat} seat
 * @param {{ chainName: string; destAddr: string }} offerArgs
 */
export const sendIt = async (
  orch,
  { contractState, zoeTools: { localTransfer, withdrawToSeat }, log },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ chainName: M.scalar(), destAddr: M.string() }));
  const { chainName, destAddr } = offerArgs;
  // NOTE the proposal shape ensures that the `give` is a single asset
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  void log(`sending {${amt.value}} from ${chainName} to ${destAddr}`);
  const agoric = await orch.getChain('agoric');
  const assets = await agoric.getVBankAssetInfo();
  void log(`got info for denoms: ${assets.map(a => a.denom).join(', ')}`);
  const { denom } = NonNullish(
    assets.find(a => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`,
  );
  const chain = await orch.getChain(chainName);

  if (!contractState.localAccount) {
    contractState.localAccount = await agoric.makeAccount();
  }

  const info = await chain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');

  await localTransfer(
    seat,
    // @ts-expect-error Index signature for type 'string' is missing in type 'OrchestrationAccountI & LocalAccountMethods'
    contractState.localAccount,
    give,
  );

  try {
    await contractState.localAccount.transfer(
      { denom, value: amt.value },
      {
        value: destAddr,
        encoding: 'bech32',
        chainId,
      },
    );
  } catch (e) {
    await withdrawToSeat(contractState.localAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  seat.exit();
  void log(`transfer complete, seat exited`);
};
harden(sendIt);
