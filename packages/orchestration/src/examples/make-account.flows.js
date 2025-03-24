// @ts-check
import { NonNullish } from "@agoric/internal";
import { makeError, q } from "@endo/errors";
import { Fail } from "@endo/errors";
import { denomHash } from "@agoric/orchestration/src/utils/denomHash.js";
import { prepareExo, provideDurableMapStore } from "@agoric/vat-data";

/**
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {Orchestrator, OrchestrationFlow, Chain, ChainHub, OrchestrationAccount, CosmosChainInfo, ZcfTools} from '@agoric/orchestration/src/types.js';
 */

const { entries } = Object;

const addresses = {
  AXELAR_GMP:
    "axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5",
  AXELAR_GAS: "axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd",
  OSMOSIS_RECEIVER: "osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj",
};

/**
 * Creates a Local Chain Account (LCA)
 *
 * @param {Object} params - The parameters object.
 * @param {Chain<{ chainId: "agoric" }>} params.agoricChain - Agoric chain object.
 * @param {Chain<any>} params.remoteChain - Remote chain object.
 * @param {GuestInterface<ChainHub>} params.chainHub - The ChainHub interface for retrieving connection info.
 * @param {string} params.chainName - The name of the remote chain.
 * @param {any} params.updateAddress - Function that updates the chain address
 * @param {import('./evm-tap-kit').MakeEvmTap} params.makeEvmTap - Function to create an EVM tap.
 * @returns {Promise<OrchestrationAccount<{ chainId: "agoric" }>>} A promise that resolves to the created OrchestrationAccount.
 */
const createLCA = async ({
  agoricChain: agoric,
  remoteChain,
  chainHub,
  chainName,
  makeEvmTap,
  updateAddress,
}) => {
  const { chainId, stakingTokens } = await remoteChain.getChainInfo();
  const remoteDenom = stakingTokens[0].denom;
  remoteDenom ||
    Fail`${chainId || chainName} does not have stakingTokens in config`;

  const localAccount = await agoric.makeAccount();
  const localChainAddress = await localAccount.getAddress();
  console.log("Local Chain Address:", localChainAddress);

  const agoricChainId = (await agoric.getChainInfo()).chainId;
  const { transferChannel } = await chainHub.getConnectionInfo(
    agoricChainId,
    chainId
  );

  assert(transferChannel.counterPartyChannelId, "unable to find sourceChannel");

  const localDenom = `ibc/${denomHash({
    denom: remoteDenom,
    channelId: transferChannel.channelId,
  })}`;

  const tap = makeEvmTap({
    localAccount,
    localChainAddress,
    sourceChannel: transferChannel.counterPartyChannelId,
    remoteDenom,
    localDenom,
    updateAddress,
  });

  // XXX consider storing appRegistration, so we can .revoke() or .updateTargetApp()
  // @ts-expect-error tap.receiveUpcall: 'Vow<void> | undefined' not assignable to 'Promise<any>'
  await localAccount.monitorTransfers(tap);

  return localAccount;
};
/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 *  @param {{
 *   zoeTools: GuestInterface<ZoeTools>
 *   makeEvmTap: import('./evm-tap-kit').MakeEvmTap;
 *   chainHub: GuestInterface<ChainHub>;
 *   baggage: import('@agoric/vat-data').Baggage;
 *   zcf: ZcfTools;
 *   zone: import("@agoric/zone").Zone;
 *   prepareEvmAccountZone: () => ;
 * }} ctx
 * @param {ZCFSeat} seat
 * @param {{
 *   destinationAddress: string;
 *   type: number;
 *   destinationEVMChain: string;
 *   gasAmount: number;
 *   contractInvocationPayload: number[];
 *   chainName: string;
 * }} offerArgs
 */
export const makeAccountAndSendGMP = async (
  orch,
  {
    zcf,
    baggage,
    makeEvmTap,
    chainHub,
    zoeTools: { localTransfer, withdrawToSeat },
    zone,
    prepareEvmAccountZone,
  },
  seat,
  offerArgs
) => {
  const {
    destinationAddress,
    type,
    destinationEVMChain,
    gasAmount,
    contractInvocationPayload,
    chainName,
  } = offerArgs;
  console.log("Inside sendIt", baggage);
  console.log(
    "Offer Args",
    JSON.stringify({
      destinationAddress,
      type,
      destinationEVMChain,
      gasAmount,
      contractInvocationPayload,
    })
  );

  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  console.log("_kw, amt", _kw, amt);

  const [agoric, remoteChain] = await Promise.all([
    orch.getChain("agoric"),
    orch.getChain(chainName),
  ]);

  console.log("Agoric Chain ID:", (await agoric.getChainInfo()).chainId);

  const assets = await agoric.getVBankAssetInfo();
  console.log(`Denoms: ${assets.map((a) => a.denom).join(", ")}`);

  const { denom } = NonNullish(
    assets.find((a) => a.brand === amt.brand),
    `${amt.brand} not registered in vbank`
  );

  console.log("Remote Chain ID:", (await remoteChain.getChainInfo()).chainId);

  const info = await remoteChain.getChainInfo();
  const { chainId } = info;
  assert(typeof chainId === "string", "bad chainId");

  // let address;



  const localAccount = await createLCA({
    // @ts-ignore
    agoricChain: agoric,
    remoteChain,
    chainHub,
    chainName,
    makeEvmTap,
    prepareEvmAccountZone,
  });

  await localTransfer(seat, localAccount, give);
  console.log("After local transfer");

  const payload = type === 1 || type === 2 ? contractInvocationPayload : null;

  const memo = {
    destination_chain: "Ethereum",
    destination_address: "0x5B34876FFB1656710fb963ecD199C6f173c29267",
    payload: [],
    type: 1,
    fee: {
      amount: "1",
      recipient: addresses.AXELAR_GAS,
    },
  };

  try {
    console.log(`Initiating IBC Transfer...`);
    console.log(`DENOM of token:${denom}`);

    await localAccount.transfer(
      {
        value: addresses.AXELAR_GMP,
        encoding: "bech32",
        chainId,
      },
      {
        denom,
        value: amt.value,
      },
      { memo: JSON.stringify(memo) }
    );

    console.log(`Completed transfer`);
  } catch (e) {
    await withdrawToSeat(localAccount, seat, give);
    const errorMsg = `IBC Transfer failed ${q(e)}`;
    seat.exit(errorMsg);
    throw makeError(errorMsg);
  }

  const makeParamInvitation = (...args1) => {
    console.log("fraz", args1);
    /**
     * @param {ZCFSeat} seat
     * @param {any} args
     */
    const voteOnParamChanges = (seat, args) => {
      // mustMatch(args, ParamChangesOfferArgsShape);
      seat.exit();
      console.log("fraz2", args, address);
      // const {
      //   params,
      //   instance,
      //   deadline,
      //   path = { paramPath: { key: 'governedApi' } },
      // } = args;
      // const governor = instanceToGovernor.get(instance);
      // return E(governor).voteOnParamChanges(counter, deadline, {
      //   ...path,
      //   // @ts-expect-error XXX
      //   changes: params,
      // });
      localAccount.transfer(
        {
          value: addresses.AXELAR_GMP,
          encoding: "bech32",
          chainId,
        },
        {
          denom,
          value: amt.value,
        },
        {
          memo: JSON.stringify({
            destination_chain: "Ethereum",
            destination_address: address,
            payload: [],
            type: 1,
            fee: {
              amount: "1",
              recipient: addresses.AXELAR_GAS,
            },
          }),
        }
      );
    };

    return zcf.makeInvitation(voteOnParamChanges, "vote on param changes");
  };

  seat.exit();
  const invitationMakers = prepareExo(
    baggage,
    "Charter Invitation Makers",
    undefined,
    {
      getAddress: () => address,
      VoteOnParamChange: makeParamInvitation,
    }
  );

  return harden({ invitationMakers });
};
harden(makeAccountAndSendGMP);
