import { osmosis } from 'osmojs';
import {
  MsgStoreCode,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgStoreCodeResponse,
  MsgInstantiateContractResponse,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx.js';
import type { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import type { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin.js';
import type { SigningStargateClient } from '@cosmjs/stargate';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { toUtf8 } from '@cosmjs/encoding';
import { $ } from 'execa';
import { writeFileSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import {
  createFundedWalletAndClient,
  makeIBCTransferMsg,
} from '../../tools/ibc-transfer.js';
import starshipChainInfo from '../../starship-chain-info.js';
import { makeQueryClient } from '../../tools/query.js';
import type { SetupContextWithWallets } from '../support.js';

export type SetupOsmosisContext = Awaited<
  ReturnType<typeof makeOsmosisSwapTools>
>;
export type SetupOsmosisContextWithCommon = SetupOsmosisContext &
  SetupContextWithWallets;

export type Prefix = {
  chain: string;
  prefix: string;
};

export type Channel = {
  primary: string;
  counterParty: string;
};

export type SwapParty = { chain: string; denom: string; amount?: string };
export type Pair = { tokenA: SwapParty; tokenB: SwapParty };

type ContractInfoBase<TArgs> = {
  codeId: number | null;
  address: string | null;
  label: string;
  instantiateArgs: TArgs;
};

type CommonArgs = {
  owner: string;
};

type CrosschainSwapsArgs = {
  swap_contract: string | null;
  registry_contract: string | null;
  governor: string;
};

type Contracts = {
  swaprouter: ContractInfoBase<CommonArgs>;
  crosschain_registry: ContractInfoBase<CommonArgs>;
  crosschain_swaps: ContractInfoBase<CrosschainSwapsArgs>;
};

export const makeOsmosisSwapTools = async t => {
  const { useChain, retryUntilCondition } = t.context;

  const osmosisBranch = 'main';
  const scriptLocalPath = './test/xcs-swap-anything/download-wasm-artifacts.sh';
  const xcsArtifactsPath = './test/xcs-swap-anything/wasm-artifacts';

  const osmosisMnemonic =
    'run leaf ritual orchard traffic kit kidney gaze diamond large brass believe wreck trade plate alter fox party flavor reform hospital powder art have';

  const {
    client: osmosisClient,
    address: osmosisAddress,
    wallet: osmosisWallet,
  } = await createFundedWalletAndClient(
    t.log,
    'osmosis',
    useChain,
    osmosisMnemonic,
  );

  await retryUntilCondition(
    () => osmosisClient.getAllBalances(osmosisAddress),
    (coins: Coin[]) => !!coins?.length,
    `Faucet balances found for ${osmosisAddress}`,
  );

  const { getRpcEndpoint } = useChain('osmosis');
  const osmosisRpcEndpoint = await getRpcEndpoint();

  let xcsContracts: Contracts = {
    swaprouter: {
      codeId: null,
      address: null,
      label: 'swaprouter',
      instantiateArgs: { owner: osmosisAddress },
    },
    crosschain_registry: {
      codeId: null,
      address: null,
      label: 'crosschain_registry',
      instantiateArgs: { owner: osmosisAddress },
    },
    crosschain_swaps: {
      codeId: null,
      address: null,
      label: 'crosschain_swaps',
      instantiateArgs: {
        swap_contract: null,
        registry_contract: null,
        governor: osmosisAddress,
      },
    },
  };

  const bigintReplacer = (_, v) => (typeof v === 'bigint' ? Number(v) : v);

  const fundRemote = async (
    issuingChain: string,
    issuingDenom: string = 'ubld',
    destinationChain?: string,
    amount: bigint = 100000000n,
  ) => {
    const { client: issuingClient, address: issuingAddress } =
      await createFundedWalletAndClient(t.log, issuingChain, useChain);

    await retryUntilCondition(
      () => issuingClient.getAllBalances(issuingAddress),
      (coins: Coin[]) => !!coins?.length,
      `Faucet balances not found for issuing address: ${issuingAddress}`,
    );

    let destinationClient: SigningStargateClient;
    let destinationAddress: string;
    let destinationWallet: DirectSecp256k1HdWallet;

    if (destinationChain) {
      const { client, address, wallet } = await createFundedWalletAndClient(
        t.log,
        destinationChain,
        useChain,
      );

      await retryUntilCondition(
        () => client.getAllBalances(address),
        (coins: Coin[]) => !!coins?.length,
        `Faucet balances not found for destination address: ${address}`,
      );

      destinationClient = client;
      destinationAddress = address;
      destinationWallet = wallet;
    } else {
      destinationChain = 'osmosis';
      destinationClient = osmosisClient;
      destinationAddress = osmosisAddress;
      destinationWallet = osmosisWallet;
    }

    const destinationBalanceBefore =
      await destinationClient.getAllBalances(destinationAddress);
    t.log(
      'destination wallet balances before transfer: ',
      destinationBalanceBefore,
    );

    const transferArgs = makeIBCTransferMsg(
      { denom: issuingDenom, value: amount },
      { address: destinationAddress, chainName: destinationChain },
      { address: issuingAddress, chainName: issuingChain },
      Date.now(),
      useChain,
    );

    const txRes = await issuingClient.signAndBroadcast(...transferArgs);
    if (txRes && txRes.code !== 0) {
      console.error(txRes);
      throw Error(`failed to ibc transfer funds to ${destinationAddress}`);
    }
    t.is(txRes.code, 0, `Transaction succeeded`);
    console.log('sendIbcTokens TxResponse: ', txRes);

    const denom = await getDenomHash(
      destinationChain,
      issuingChain,
      issuingDenom,
    );

    const getDenomAmount = balances => {
      const balance = balances.find(coin => coin.denom === `ibc/${denom}`);
      const amount = balance ? Number(balance.amount) : 0;
      return amount;
    };

    await retryUntilCondition(
      () => destinationClient.getAllBalances(destinationAddress),
      (coins: Coin[]) => {
        const before = getDenomAmount(destinationBalanceBefore);
        const current = getDenomAmount(coins);
        return current > before;
      },
      `Transferred tokens not found on destination address: ${destinationAddress}`,
    );
    console.log(
      `Transferred tokens found on destination address: ${destinationAddress}`,
    );

    return {
      client: destinationClient,
      address: destinationAddress,
      wallet: destinationWallet,
    };
  };

  const invokeOsmosisContract = async (
    contractAddress: string,
    txMsg: object,
    funds: Coin[] = [],
  ) => {
    const clientRegistry = osmosisClient.registry;
    clientRegistry.register(MsgExecuteContract.typeUrl, MsgExecuteContract);

    const fee = {
      amount: [{ denom: 'uosmo', amount: '20000000' }],
      gas: '59000000',
    };

    const message = MsgExecuteContract.fromPartial({
      sender: osmosisAddress,
      contract: contractAddress,
      msg: toUtf8(JSON.stringify(txMsg)),
      funds,
    });

    const response = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      [{ typeUrl: MsgExecuteContract.typeUrl, value: message }],
      fee,
    );
    console.log('invokeOsmosisContract DeliverTxResponse: ', response);

    const { msgResponses, code } = response;

    if (code !== 0) {
      throw Error(
        `Failed to execute osmosis contract with message ${JSON.stringify(message)}`,
      );
    }

    return msgResponses;
  };

  const queryOsmosisContract = async (contractAddress: string, queryMsg) => {
    const wasmClient = await CosmWasmClient.connect(osmosisRpcEndpoint);
    const result = await wasmClient.queryContractSmart(
      contractAddress,
      queryMsg,
    );

    return result;
  };

  const downloadXcsContracts = async (
    xcsContracts: Contracts,
    branch: string = osmosisBranch,
    scriptPath: string = scriptLocalPath,
    artifactsPath: string = xcsArtifactsPath,
  ) => {
    const wasmFiles: string[] = [];
    for (const [label, _contractInfo] of Object.entries(xcsContracts)) {
      wasmFiles.push(`${label}.wasm`);
    }

    try {
      await $`${scriptPath} osmosis-labs osmosis ${branch} tests/ibc-hooks/bytecode ${artifactsPath} ${wasmFiles}`;
    } catch (error) {
      throw Error(`Failed to download XCS artifacts`, { cause: error });
    }
  };

  const instantiateSingleXcsContract = async (
    contractLabel: string,
    instantiateArgs: CommonArgs | CrosschainSwapsArgs,
  ) => {
    const clientRegistry = osmosisClient.registry;
    clientRegistry.register(MsgStoreCode.typeUrl, MsgStoreCode);

    clientRegistry.register(
      MsgInstantiateContract.typeUrl,
      MsgInstantiateContract,
    );

    const contractPath = `${xcsArtifactsPath}/${contractLabel}.wasm`;

    const wasmPath = path.resolve(contractPath);
    const wasmByteCode = await fs.readFile(wasmPath);

    const fee = {
      amount: [{ denom: 'uosmo', amount: '100000' }],
      gas: '10000000',
    };

    const storeMessage = MsgStoreCode.fromPartial({
      sender: osmosisAddress,
      wasmByteCode,
    });

    const storeResult = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      [
        {
          typeUrl: MsgStoreCode.typeUrl,
          value: storeMessage,
        },
      ],
      fee,
    );

    if (storeResult.msgResponses[0] && storeResult.code !== 0) {
      throw Error(`Failed to store ${contractLabel} contract`);
    }

    const { codeId } = MsgStoreCodeResponse.decode(
      storeResult.msgResponses[0].value,
    );

    const instantiateMessage = MsgInstantiateContract.fromPartial({
      sender: osmosisAddress,
      admin: osmosisAddress,
      codeId,
      label: contractLabel,
      msg: toUtf8(JSON.stringify(instantiateArgs)),
    });

    const instantiateResult = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      [
        {
          typeUrl: MsgInstantiateContract.typeUrl,
          value: instantiateMessage,
        },
      ],
      fee,
    );

    if (instantiateResult.msgResponses[0] && instantiateResult.code !== 0) {
      throw Error(`Failed to instantiate ${contractLabel} contract`);
    }

    const { address } = MsgInstantiateContractResponse.decode(
      instantiateResult.msgResponses[0].value,
    );

    return { codeId, address };
  };

  const persistXcsInfo = async () => {
    try {
      const sanitizedContracts = JSON.parse(
        JSON.stringify(xcsContracts, bigintReplacer),
      );
      writeFileSync(
        './test/xcs-swap-anything/xcs-contracts-info.json',
        JSON.stringify(sanitizedContracts),
      );

      await $`kubectl cp ./test/xcs-swap-anything/xcs-contracts-info.json osmosislocal-genesis-0:/`;
    } catch (error) {
      throw Error(`Failed to store XCS info`, { cause: error });
    }
  };

  const areContractsInstantiated = async () => {
    try {
      await queryContractsInfo();
      return true;
    } catch {
      return false;
    }
  };

  const updateLocalXcsContracts = async () => {
    const contractInfo = await queryContractsInfo();

    const sanitizedContracts = JSON.parse(
      JSON.stringify(xcsContracts, bigintReplacer),
    );
    if (JSON.stringify(contractInfo) !== JSON.stringify(sanitizedContracts)) {
      xcsContracts = contractInfo;
    }
  };

  const setupXcsChannelLink = async (
    primaryChain: string,
    counterPartyChain: string,
  ) => {
    const {
      chain: { chain_id },
    } = useChain(counterPartyChain);
    const registryAddress = xcsContracts.crosschain_registry.address;
    if (!registryAddress) {
      throw new Error('crosschain_registry contract address not found');
    }

    const {
      transferChannel: { channelId, counterPartyChannelId },
    } = starshipChainInfo[primaryChain].connections[chain_id];

    const txMsg = {
      modify_chain_channel_links: {
        operations: [
          {
            operation: 'set',
            source_chain: primaryChain,
            destination_chain: counterPartyChain,
            channel_id: channelId,
          },
          {
            operation: 'set',
            source_chain: counterPartyChain,
            destination_chain: primaryChain,
            channel_id: counterPartyChannelId,
          },
        ],
      },
    };

    await invokeOsmosisContract(registryAddress, txMsg);
  };

  const setupXcsPrefix = async (name: string, prefix: string) => {
    const registryAddress = xcsContracts.crosschain_registry.address;
    if (!registryAddress) {
      throw new Error('crosschain_registry contract address not found');
    }

    const txMsg = {
      modify_bech32_prefixes: {
        operations: [
          {
            operation: 'set',
            chain_name: name,
            prefix: prefix,
          },
        ],
      },
    };

    await invokeOsmosisContract(registryAddress, txMsg);
  };

  /**
   * TODO: Consider funding if insufficient balance
   */
  const setupPfmEnabled = async ({ chain, denom, amount }: SwapParty) => {
    const registryAddress = xcsContracts.crosschain_registry.address;
    t.truthy(registryAddress, 'crosschain_registry contract address not found');

    const proposeBalance = await osmosisClient.getBalance(
      osmosisAddress,
      denom,
    );
    console.log('OsmosisClient BALANCE', { proposeBalance });
    t.true(BigInt(proposeBalance.amount) >= BigInt(amount as string));

    const txMsg = {
      propose_pfm: {
        chain,
      },
    };

    await invokeOsmosisContract(registryAddress as string, txMsg, [
      { denom, amount: amount as string },
    ]);

    await retryUntilCondition(
      () => hasPacketForwarding(chain),
      (result: boolean) => result,
      `PFM not enabled for ${chain}`,
      {
        // pfm proposition takes longer than our default timeout
        maxRetries: 20,
        retryIntervalMs: 5000,
      },
    );
  };

  const enablePfmInBatch = async (chains: SwapParty[]) => {
    for await (const { chain, denom } of chains) {
      console.log('Proposing PFM for', chain);
      const chainHashOnOsmosis = await getDenomHash('osmosis', chain, denom);
      await setupPfmEnabled({
        chain,
        denom: `ibc/${chainHashOnOsmosis}`,
        amount: '3', // amount is arbitrary
      });
    }
  };

  const isXcsStateSet = async (channelList: Channel[]) => {
    try {
      for (const channel of channelList) {
        await getXcsState(channel);
        t.log(
          `Xcs State verified for ${channel.primary} ${channel.counterParty}`,
        );
      }
      return true;
    } catch {
      return false;
    }
  };

  const createPool = async (chainA: SwapParty, chainB: SwapParty) => {
    const clientRegistry = osmosisClient.registry;
    osmosis.gamm.poolmodels.balancer.v1beta1.load(clientRegistry);

    const MsgCreateBalancerPool =
      osmosis.gamm.poolmodels.balancer.v1beta1.MsgCreateBalancerPool;
    const MsgCreateBalancerPoolResponse =
      osmosis.gamm.poolmodels.balancer.v1beta1.MsgCreateBalancerPoolResponse;

    const fee = {
      amount: [{ denom: 'uosmo', amount: '10000' }],
      gas: '1000000',
    };

    const inDenom = await getFinalDenom('osmosis', chainA);
    const outDenom = await getFinalDenom('osmosis', chainB);

    const message = MsgCreateBalancerPool.fromPartial({
      sender: osmosisAddress,
      poolParams: { swapFee: '0.01', exitFee: '0.00' },
      poolAssets: [
        { token: { denom: inDenom, amount: chainA.amount || '' }, weight: '1' },
        {
          token: {
            denom: outDenom,
            amount: chainB.amount || '',
          },
          weight: '1',
        },
      ],
      futurePoolGovernor: '',
    });

    const result = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      [
        {
          typeUrl: MsgCreateBalancerPool.typeUrl,
          value: message,
        },
      ],
      fee,
    );

    const { poolId } = MsgCreateBalancerPoolResponse.decode(
      result.msgResponses[0].value,
    );
    return { poolId, inDenom, outDenom };
  };

  const setPoolRoute = async (
    tokenIn: string,
    tokenOut: string,
    poolId: string,
  ) => {
    const swaprouterAddress = xcsContracts.swaprouter.address;
    if (!swaprouterAddress) {
      throw new Error('swaprouter contract address not found');
    }

    const txMsg = {
      set_route: {
        input_denom: tokenIn,
        output_denom: tokenOut,
        pool_route: [
          {
            pool_id: poolId,
            token_out_denom: tokenOut,
          },
        ],
      },
    };

    await invokeOsmosisContract(swaprouterAddress, txMsg);
  };

  const queryContractsInfo = async () => {
    const { stdout } =
      await $`kubectl exec -i osmosislocal-genesis-0 -c validator -- cat /xcs-contracts-info.json`;
    return JSON.parse(stdout);
  };

  /*
   * Note: `getDenomHash` should only be called after the issuingDenom token has been successfully
   * transferred from the issuingChain to currentChain (e.g., using fundRemote() or a similar mechanism).
   * If no such transfer has occurred, the function will return 'undefined' because the denomination
   * is not yet recognized on the currentChain.
   */
  const getDenomHash = async (
    currentChain: string,
    issuingChain: string,
    issuingDenom: string,
  ) => {
    const {
      chain: { chain_id },
    } = useChain(issuingChain);

    const {
      transferChannel: { channelId },
    } = starshipChainInfo[currentChain].connections[chain_id];

    const apiUrl = await useChain(currentChain).getRestEndpoint();
    const queryClient = makeQueryClient(apiUrl);

    const { hash } = await queryClient.queryDenom(
      `transfer/${channelId}`,
      issuingDenom,
    );

    if (!hash) {
      throw Error(`Hash not found for ${issuingDenom} on ${currentChain}`);
    }

    return hash;
  };

  const getFinalDenom = async (
    currentChain: string,
    issuerChain: SwapParty,
  ) => {
    if (currentChain === issuerChain.chain) return issuerChain.denom;
    const hash = await getDenomHash(
      currentChain,
      issuerChain.chain,
      issuerChain.denom,
    );

    return `ibc/${hash}`;
  };

  const getPools = async () => {
    const { createRPCQueryClient } = osmosis.ClientFactory;
    const client = await createRPCQueryClient({
      rpcEndpoint: osmosisRpcEndpoint,
    });
    const response = await client.osmosis.gamm.v1beta1.numPools();
    return response;
  };

  const getPool = async (poolId: bigint) => {
    const { createRPCQueryClient } = osmosis.ClientFactory;
    const client = await createRPCQueryClient({
      rpcEndpoint: osmosisRpcEndpoint,
    });
    const response = await client.osmosis.gamm.v1beta1.pool(
      osmosis.gamm.v1beta1.QueryPoolRequest.fromPartial({ poolId }),
    );
    return response;
  };

  const getXcsState = async (channel: Channel) => {
    const registryAddress = xcsContracts.crosschain_registry.address;
    if (!registryAddress) {
      throw new Error('crosschain_registry contract address not found');
    }

    const { primary, counterParty } = channel;

    const channelQuery = {
      get_channel_from_chain_pair: {
        source_chain: primary,
        destination_chain: counterParty,
      },
    };

    const channelId = await queryOsmosisContract(registryAddress, channelQuery);

    const prefixQuery = {
      get_bech32_prefix_from_chain_name: {
        chain_name: counterParty,
      },
    };
    const prefix = await queryOsmosisContract(registryAddress, prefixQuery);

    return { channelId, prefix };
  };

  const getPoolRoute = async (chainA: SwapParty, chainB: SwapParty) => {
    const swaprouterAddress = xcsContracts.swaprouter.address as string;
    const [inDenom, outDenom] = await Promise.all([
      getFinalDenom('osmosis', chainA),
      getFinalDenom('osmosis', chainB),
    ]);
    const queryMsg = {
      get_route: {
        input_denom: inDenom,
        output_denom: outDenom,
      },
    };

    const { pool_route } = await queryOsmosisContract(
      swaprouterAddress,
      queryMsg,
    );

    return pool_route;
  };

  const hasPacketForwarding = async (chain: string) => {
    const crosschainRegistryAddress = xcsContracts.crosschain_registry
      .address as string;

    t.truthy(crosschainRegistryAddress, 'crosschainRegistryAddress not found');

    const queryMsg = {
      has_packet_forwarding: {
        chain,
      },
    };

    const isPfmEnabled = await queryOsmosisContract(
      crosschainRegistryAddress,
      queryMsg,
    );

    return isPfmEnabled;
  };

  const getContractsInfo = () => xcsContracts;

  const getOsmosisAccount = () => {
    return {
      client: osmosisClient,
      address: osmosisAddress,
      wallet: osmosisWallet,
    };
  };

  const setupXcsContracts = async (forceInstall = false) => {
    console.log('Setting XCS contracts ...');
    if (!(await areContractsInstantiated()) || forceInstall) {
      console.log(`XCS contracts being downloaded ...`);
      await downloadXcsContracts(xcsContracts);

      console.log(`XCS contracts being instantiated ...`);
      for (const contract in xcsContracts) {
        const { label, instantiateArgs } = xcsContracts[contract];
        const { codeId, address } = await instantiateSingleXcsContract(
          label,
          instantiateArgs,
        );
        xcsContracts[contract].codeId = codeId;
        xcsContracts[contract].address = address;

        if (label === 'swaprouter') {
          xcsContracts.crosschain_swaps.instantiateArgs.swap_contract = address;
        } else if (label === 'crosschain_registry') {
          xcsContracts.crosschain_swaps.instantiateArgs.registry_contract =
            address;
        }
      }

      console.log(`XCS contracts being persisted ...`);
      await persistXcsInfo();
    }

    await updateLocalXcsContracts();

    console.log('XCS contracts instantiation completed!');

    return xcsContracts;
  };

  const setupXcsState = async (
    prefixList: Prefix[],
    channelList: Channel[],
  ) => {
    console.log('Setting XCS state ...');

    if (!(await isXcsStateSet(channelList))) {
      for await (const { chain, prefix } of prefixList) {
        console.log(`Setting Prefix for ${chain} ...`);
        await setupXcsPrefix(chain, prefix);
      }

      for await (const { primary, counterParty } of channelList) {
        console.log(
          `Setting Channel Link for ${primary} and ${counterParty} ...`,
        );
        await setupXcsChannelLink(primary, counterParty);
      }
    } else {
      console.log('XCS contracts already set');
    }
  };

  const fundRemoteIfNecessary = async ({ chain, denom }: SwapParty) => {
    if (chain === 'osmosis') return;
    await fundRemote(chain, denom);
  };

  const isRouteSet = async (chainA: SwapParty, chainB: SwapParty) => {
    try {
      await getPoolRoute(chainA, chainB);
      return true;
    } catch (error) {
      console.error(
        `Pool Route is not set for ${chainA.chain}.${chainA.denom} <> ${chainB.chain}.${chainB.denom}`,
        error,
      );
      return false;
    }
  };

  const setupNewPool = async (
    chainA: SwapParty = { chain: 'agoric', denom: 'ubld', amount: '1000000' },
    chainB: SwapParty = { chain: 'osmosis', denom: 'uosmo', amount: '1000000' },
  ) => {
    if (!(await isRouteSet(chainA, chainB))) {
      console.log(
        `Pool being created with assets ${chainA.denom} and ${chainB.denom}`,
      );
      await Promise.all([
        fundRemoteIfNecessary(chainA),
        fundRemoteIfNecessary(chainB),
      ]);
      const { poolId, inDenom, outDenom } = await createPool(chainA, chainB);
      // Don't Promise.all here to avoid sequence number mismatch
      await setPoolRoute(inDenom, outDenom, poolId.toString());
      await setPoolRoute(outDenom, inDenom, poolId.toString());
    } else {
      console.log(
        `Pool with assets ${chainA.denom} and ${chainB.denom} already exists`,
      );
    }
  };

  const setupPoolsInBatch = async (pools: Pair[]) => {
    for await (const { tokenA, tokenB } of pools) {
      await setupNewPool(tokenA, tokenB);
    }
  };

  return {
    setupXcsContracts,
    setupXcsState,
    setupPfmEnabled,
    fundRemote,
    getDenomHash,
    getContractsInfo,
    getOsmosisAccount,
    getPools,
    getXcsState,
    getPoolRoute,
    getPool,
    setupNewPool,
    setPoolRoute,
    setupPoolsInBatch,
    hasPacketForwarding,
    enablePfmInBatch,
  };
};

export const makeWaitUntilIbcTransfer =
  (client, getDenomHash, retryUntilCondition) =>
  (
    address,
    balancesBefore,
    { currentChain, issuerChain, denom },
    retryOptions = undefined,
  ) =>
    retryUntilCondition(
      async () => {
        let targetDenomHash;
        const balanceResult = await client.queryBalances(address);
        try {
          targetDenomHash = await getDenomHash(
            currentChain,
            issuerChain,
            denom,
          );
        } catch {
          targetDenomHash = 'not-found-yet';
        }

        return {
          currentBalances: balanceResult.balances,
          targetDenom: `ibc/${targetDenomHash}`,
        };
      },
      ({ currentBalances, targetDenom }) => {
        // undefined if not received yet
        const targetBalanceBefore = balancesBefore.find(
          ({ denom }) => denom === targetDenom,
        );
        const targetBalanceNow = currentBalances.find(
          ({ denom }) => denom === targetDenom,
        );
        console.log({ targetBalanceBefore, targetBalanceNow });

        // If expected denom not found in both before and after balances then return false
        if (!targetBalanceBefore && !targetBalanceNow) return false;
        // If expected denom not found in before but present in current then return true
        if (!targetBalanceBefore && targetBalanceNow) return true;
        // If the denom is present in both balances then latter should be greater than the previous one
        if (targetBalanceBefore && targetBalanceNow)
          return (
            BigInt(targetBalanceNow.amount) > BigInt(targetBalanceBefore.amount)
          );
        else return false;
      },
      'Deposit reflected in receiver balance',
      retryOptions,
    );
