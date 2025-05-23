import { osmosis } from 'osmojs';
import {
  MsgStoreCode,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgStoreCodeResponse,
  MsgInstantiateContractResponse,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx.js';
import { toUtf8 } from '@cosmjs/encoding';
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { execa } from 'execa';
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

export const osmosisSwapTools = async t => {
  const { useChain, retryUntilCondition } = t.context;

  const osmosisMnemonic =
    'run leaf ritual orchard traffic kit kidney gaze diamond large brass believe wreck trade plate alter fox party flavor reform hospital powder art have';

  const { client: osmosisClient, address: osmosisAddress } =
    await createFundedWalletAndClient(
      t.log,
      'osmosis',
      useChain,
      osmosisMnemonic,
    );

  await retryUntilCondition(
    () => osmosisClient.getAllBalances(osmosisAddress),
    coins => !!coins?.length,
    `Faucet balances found for ${osmosisAddress}`,
  );

  const { getRpcEndpoint } = useChain('osmosis');
  const osmosisRpcEndpoint = await getRpcEndpoint();

  interface CrosschainSwapsArgs {
    swap_contract: string | null;
    registry_contract: string | null;
    governor: string;
  }

  let xcsContracts: {
    [key: string]: {
      codeId: bigint | null;
      address: string | null;
      label: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instantiateArgs: any;
    };
  } = {
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
      } as CrosschainSwapsArgs,
    },
  };

  const osmosisBranch = 'main';
  const scriptLocalPath = './test/xcs-swap-anything/download-wasm-artifacts.sh';
  const xcsArtifactsPath = './test/xcs-swap-anything/wasm-artifacts';

  const fundRemote = async (
    originChain = 'agoric',
    denomToTransfer = 'ubld',
    amount = 100000000n,
  ) => {
    const { client, address } = await createFundedWalletAndClient(
      t.log,
      originChain,
      useChain,
    );

    const balancesResultAg = await retryUntilCondition(
      () => client.getAllBalances(address),
      coins => !!coins?.length,
      `Faucet balances found for ${address}`,
    );
    t.log('Origin chain wallet balances :', balancesResultAg);

    const transferArgs = makeIBCTransferMsg(
      { denom: denomToTransfer, value: amount },
      { address: osmosisAddress, chainName: 'osmosis' },
      { address, chainName: originChain },
      Date.now(),
      useChain,
    );
    // TODO #9200 `sendIbcTokens` does not support `memo`
    // @ts-expect-error spread argument for concise code
    const txRes = await client.sendIbcTokens(...transferArgs);
    if (txRes && txRes.code !== 0) {
      console.error(txRes);
      throw Error(`failed to ibc transfer funds to ${denomToTransfer}`);
    }
    const { events: _events, ...txRest } = txRes;
    console.log(txRest);
    t.is(txRes.code, 0, `Transaction succeeded`);
    t.log(`Funds transferred to ${osmosisAddress}`);

    await retryUntilCondition(
      () => osmosisClient.getAllBalances(osmosisAddress),
      coins => !!coins?.length,
      `${denomToTransfer} transferred to ${osmosisAddress}`,
    );
  };

  const invokeOsmosisContract = async (contractAddress, txMsg) => {
    const clientRegistry = osmosisClient.registry;
    clientRegistry.register(MsgExecuteContract.typeUrl, MsgExecuteContract);

    const fee = {
      amount: [{ denom: 'uosmo', amount: '1000' }],
      gas: '200000',
    };

    const message = MsgExecuteContract.fromPartial({
      sender: osmosisAddress,
      contract: contractAddress,
      msg: toUtf8(JSON.stringify(txMsg)),
      funds: [],
    });

    /** @type {Array<import('@cosmjs/proto-signing').EncodeObject>} */
    const encodeObjects = [
      {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: message,
      },
    ];

    const result = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      encodeObjects,
      fee,
    );

    console.log(result);
  };

  const queryOsmosisContract = async (contractAddress, queryMsg) => {
    const wasmClient = await CosmWasmClient.connect(osmosisRpcEndpoint);
    const result = await wasmClient.queryContractSmart(
      contractAddress,
      queryMsg,
    );
    return result;
  };

  const downloadXcsContracts = async (
    xcsContracts,
    branch = osmosisBranch,
    scriptPath = scriptLocalPath,
    artifactsPath = xcsArtifactsPath,
  ) => {
    t.log('Preparing to set up XCS artifacts ...');

    const wasmFiles: string[] = [];
    for (const contract in xcsContracts) {
      if (Object.prototype.hasOwnProperty.call(xcsContracts, contract)) {
        const { label } = xcsContracts[contract];
        wasmFiles.push(`${label}.wasm`);
      }
    }

    try {
      await execa('bash', [
        scriptPath,
        'osmosis-labs',
        'osmosis',
        branch,
        'tests/ibc-hooks/bytecode',
        artifactsPath,
        ...wasmFiles,
      ]);

      t.log('XCS artifact download completed successfully.');
    } catch (error) {
      console.error('Failed to download XCS artifacts:', error);
      throw error;
    }
  };

  const instantiateXcsContracts = async (contractLabel, instantiateArgs) => {
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

    /** @type {Array<import('@cosmjs/proto-signing').EncodeObject>} */
    const storeEncodeObjects = [
      {
        typeUrl: MsgStoreCode.typeUrl,
        value: storeMessage,
      },
    ];

    const storeResult = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      storeEncodeObjects,
      fee,
    );

    const codeId = MsgStoreCodeResponse.decode(
      storeResult.msgResponses[0].value,
    ).codeId;

    const instantiateMessage = MsgInstantiateContract.fromPartial({
      sender: osmosisAddress,
      admin: osmosisAddress,
      codeId,
      label: contractLabel,
      msg: toUtf8(JSON.stringify(instantiateArgs)),
    });

    /** @type {Array<import('@cosmjs/proto-signing').EncodeObject>} */
    const instantiateEncodeObjects = [
      {
        typeUrl: MsgInstantiateContract.typeUrl,
        value: instantiateMessage,
      },
    ];

    const instantiateResult = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      instantiateEncodeObjects,
      fee,
    );

    console.log(
      'instantiateXcsContracts: instantiateResult',
      instantiateResult,
    );

    const address = MsgInstantiateContractResponse.decode(
      instantiateResult.msgResponses[0].value,
    ).address;

    return { codeId, address };
  };

  const persistXcsInfo = async () => {
    console.log('Preparing to store XCS info ...');
    try {
      const sanitizedContracts = JSON.parse(
        JSON.stringify(xcsContracts, (_, v) =>
          typeof v === 'bigint' ? Number(v) : v,
        ),
      );
      writeFileSync(
        './test/xcs-swap-anything/xcs-contracts-info.json',
        JSON.stringify(sanitizedContracts),
      );

      await execa('kubectl', [
        'cp',
        './test/xcs-swap-anything/xcs-contracts-info.json',
        'osmosislocal-genesis-0:/',
      ]);
      console.log('XCS info stored successfully.');
    } catch (error) {
      console.error('Failed to store XCS info:', error);
      throw error;
    }
  };

  const areContractsInstantiated = async () => {
    let contractInfo;
    try {
      contractInfo = await queryContractsInfo();
    } catch (error) {
      console.error('Failed to fetch XCS Info from Osmosis pod', error);
      return false;
    }

    const sanitizedContracts = JSON.parse(
      JSON.stringify(xcsContracts, (_, v) =>
        typeof v === 'bigint' ? Number(v) : v,
      ),
    );
    if (JSON.stringify(contractInfo) != JSON.stringify(sanitizedContracts)) {
      xcsContracts = contractInfo;
    }
    return true;
  };

  const setupXcsChannelLink = async (primaryChain, counterPartyChain) => {
    console.log('Setting XCS Channel Links ...');

    const registryAddress = xcsContracts.crosschain_registry.address;

    const chainId = useChain(counterPartyChain).chain.chain_id;

    const {
      transferChannel: { channelId, counterPartyChannelId },
    } = starshipChainInfo[primaryChain].connections[chainId];

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

  const setupXcsPrefix = async (name, prefix) => {
    console.log('Setting XCS Prefixes ...');
    const registryAddress = xcsContracts.crosschain_registry.address;

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

  const isXcsStateSet = async () => {
    try {
      await getXcsState();
      return true;
    } catch (error) {
      console.error(error);
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
    /** @type {Array<import('@cosmjs/proto-signing').EncodeObject>} */
    const encodeObjects = [
      {
        typeUrl:
          '/osmosis.gamm.poolmodels.balancer.v1beta1.MsgCreateBalancerPool',
        value: message,
      },
    ];

    const result = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      encodeObjects,
      fee,
    );

    const poolId = MsgCreateBalancerPoolResponse.decode(
      result.msgResponses[0].value,
    ).poolId;
    return { poolId, inDenom, outDenom };
  };

  const setPoolRoute = async (tokenIn, tokenOut, poolId) => {
    const swaprouterAddress = xcsContracts.swaprouter.address;

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
    const osmosisCLI =
      'kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c';

    const info = `${osmosisCLI} "jq . /xcs-contracts-info.json"`;

    const { stdout } = await execa(info, {
      shell: true,
    });

    return JSON.parse(stdout);
  };

  const getContractsInfo = async () => {
    return xcsContracts;
  };

  const getDenomHash = async (currentChain, originChain, originDenom) => {
    const chainId = useChain(originChain).chain.chain_id;

    const {
      transferChannel: { channelId },
    } = starshipChainInfo[currentChain].connections[chainId];

    const apiUrl = await useChain(currentChain).getRestEndpoint();
    const queryClient = makeQueryClient(apiUrl);

    const { hash } = await queryClient.queryDenom(
      `transfer/${channelId}`,
      originDenom,
    );

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

  const getXcsState = async () => {
    const registryAddress = xcsContracts.crosschain_registry.address;

    const channelQuery = {
      get_channel_from_chain_pair: {
        source_chain: 'osmosis',
        destination_chain: 'agoric',
      },
    };
    const channel = await queryOsmosisContract(registryAddress, channelQuery);

    const prefixQuery = {
      get_bech32_prefix_from_chain_name: {
        chain_name: 'osmosis',
      },
    };
    const prefix = await queryOsmosisContract(registryAddress, prefixQuery);

    return { channel, prefix };
  };

  const getPoolRoute = async (chainA: SwapParty, chainB: SwapParty) => {
    const swaprouterAddress = xcsContracts.swaprouter.address;
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
    console.log('LOG: ', pool_route);

    return pool_route;
  };

  const setupXcsContracts = async (forceInstall = false) => {
    if (!(await areContractsInstantiated()) || forceInstall) {
      await downloadXcsContracts(xcsContracts);

      for (const contract in xcsContracts) {
        const { label, instantiateArgs } = xcsContracts[contract];
        const { codeId, address } = await instantiateXcsContracts(
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

      await persistXcsInfo();
    }

    return xcsContracts;
  };

  const setupXcsState = async (prefixList, channelList) => {
    if (!(await isXcsStateSet())) {
      console.log('Seeting XCS state');

      for (const { chain, prefix } of prefixList) {
        await setupXcsPrefix(chain, prefix);
      }

      for (const { primary, counterParty } of channelList) {
        await setupXcsChannelLink(primary, counterParty);
      }
    } else {
      console.log('XCS contracts alrady set');
    }
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

  const fundRemoteIfNecessary = async ({ chain, denom }: SwapParty) => {
    if (chain === 'osmosis') return;
    await fundRemote(chain, denom);
  };

  return {
    getContractsInfo,
    getPools,
    getXcsState,
    getPoolRoute,
    getPool,
    getDenomHash,
    setupXcsContracts,
    setupXcsState,
    setupNewPool,
    setPoolRoute,
  };
};

export type SetupOsmosisContext = Awaited<ReturnType<typeof osmosisSwapTools>>;
export type SetupOsmosisContextWithCommon = SetupOsmosisContext &
  SetupContextWithWallets;
export type SwapParty = { chain: string; denom: string; amount?: string };
