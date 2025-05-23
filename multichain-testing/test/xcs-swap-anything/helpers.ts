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
import { makeBlockTool } from '../../tools/e2e-tools.js';
import { makeHttpClient } from '../../tools/makeHttpClient.js';

export type SetupOsmosisContext = Awaited<ReturnType<typeof osmosisSwapTools>>;
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

export type OsmosisPool = {
  issuingChain: string;
  issuingDenom: string;
};

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

export const osmosisSwapTools = async t => {
  const { useChain, retryUntilCondition } = t.context;

  const { waitForBlock } = makeBlockTool({
    rpc: makeHttpClient('http://localhost:26657', fetch),
    delay: ms => new Promise(resolve => setTimeout(resolve, ms)),
  });

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

    // TODO #9200 `sendIbcTokens` does not support `memo`
    // @ts-expect-error spread argument for concise code
    const txRes = await issuingClient.sendIbcTokens(...transferArgs);
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

  const invokeOsmosisContract = async (contractAddress: string, txMsg) => {
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

    const encodeObjects: Array<import('@cosmjs/proto-signing').EncodeObject> = [
      {
        typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
        value: message,
      },
    ];

    const response = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      encodeObjects,
      fee,
    );
    console.log("invokeOsmosisContract DeliverTxResponse: ", response);


    const { msgResponses, code } = response

    if (code !== 0) {
      throw Error(`Failed to execute osmosis contract with message ${message}`);
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
    xcsContracts,
    branch: string = osmosisBranch,
    scriptPath: string = scriptLocalPath,
    artifactsPath: string = xcsArtifactsPath,
  ) => {
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
    } catch (error) {
      throw Error(`Failed to download XCS artifacts: ${error}`);
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

    const storeEncodeObjects: Array<
      import('@cosmjs/proto-signing').EncodeObject
    > = [
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

    if (storeResult.msgResponses[0] && storeResult.code !== 0) {
      throw Error(`Failed to store ${contractLabel} contract`);
    }

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

    const instantiateEncodeObjects: Array<
      import('@cosmjs/proto-signing').EncodeObject
    > = [
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

    if (instantiateResult.msgResponses[0] && instantiateResult.code !== 0) {
      throw Error(`Failed to instantiate ${contractLabel} contract`);
    }

    const address = MsgInstantiateContractResponse.decode(
      instantiateResult.msgResponses[0].value,
    ).address;

    return { codeId, address };
  };

  const persistXcsInfo = async () => {
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
    } catch (error) {
      throw Error(`Failed to store XCS info: ${error}`);
    }
  };

  const areContractsInstantiated = async () => {
    let contractInfo;
    try {
      contractInfo = await queryContractsInfo();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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

  const setupXcsChannelLink = async (
    primaryChain: string,
    counterPartyChain: string,
  ) => {
    const chainId = useChain(counterPartyChain).chain.chain_id;
    const registryAddress = xcsContracts.crosschain_registry.address;
    if (!registryAddress) {
      throw new Error('crosschain_registry contract address not found');
    }

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

  const isXcsStateSet = async (channelList: Channel[]) => {
    try {
      for (const channel of channelList) {
        await getXcsState(channel);
        t.log(
          `Xcs State verified for ${channel.primary} ${channel.counterParty}`,
        );
      }
      return true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
  };

  const createPoolAgainstOsmo = async (
    issuingChain: string,
    issuingDenom: string,
    tokensAmount: string = '1000000',
  ) => {
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

    const hash = await getDenomHash('osmosis', issuingChain, issuingDenom);

    const message = MsgCreateBalancerPool.fromPartial({
      sender: osmosisAddress,
      poolParams: { swapFee: '0.01', exitFee: '0.00' },
      poolAssets: [
        { token: { denom: 'uosmo', amount: tokensAmount }, weight: '1' },
        {
          token: {
            denom: `ibc/${hash}`,
            amount: tokensAmount,
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

    const response = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      encodeObjects,
      fee,
    );

    console.log("createPoolAgainstOsmo DeliverTxResponse: ", response);


    const { msgResponses, code } = response

    if (msgResponses[0] && code !== 0) {
      throw Error(`Failed to create pool with uosmo and ${issuingDenom}`);
    }

    const poolId = MsgCreateBalancerPoolResponse.decode(
      result.msgResponses[0].value,
    ).poolId;

    return { poolId, hash };
  };

  const createNonNativePool = async (chainA: SwapParty, chainB: SwapParty) => {
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

    const response = await osmosisClient.signAndBroadcast(
      osmosisAddress,
      encodeObjects,
      fee,
    );

    console.log("createPoolAgainstOsmo DeliverTxResponse: ", response);


    const { msgResponses, code } = response

    if (msgResponses[0] && code !== 0) {
      throw Error(`Failed to create pool with uosmo and ${issuingDenom}`);
    }

    const poolId = MsgCreateBalancerPoolResponse.decode(
      msgResponses[0].value,
    ).poolId;
    return { poolId, hash };
  };

  const createNonNativePool = async (chainA: SwapParty, chainB: SwapParty) => {
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

  const isRouteSet = async (pool: OsmosisPool) => {
    try {
      await getPoolRoute(pool);
      return true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return false;
    }
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
    const chainId = useChain(issuingChain).chain.chain_id;

    const {
      transferChannel: { channelId },
    } = starshipChainInfo[currentChain].connections[chainId];

    const apiUrl = await useChain(currentChain).getRestEndpoint();
    const queryClient = makeQueryClient(apiUrl);

    const { hash } = await queryClient.queryDenom(
      `transfer/${channelId}`,
      issuingDenom,
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

  const getPoolRoute = async (pool: OsmosisPool) => {
    const swaprouterAddress = xcsContracts.swaprouter.address;
    if (!swaprouterAddress) {
      throw new Error('swaprouter contract address not found');
    }

    const { issuingChain, issuingDenom } = pool;

    const hash = await getDenomHash('osmosis', issuingChain, issuingDenom);
    const queryMsg = {
      get_route: {
        input_denom: `ibc/${hash}`,
        output_denom: 'uosmo',
      },
    };

    const { pool_route } = await queryOsmosisContract(
      swaprouterAddress,
      queryMsg,
    );

    return pool_route;
  };

  const getPoolRouteNew = async (chainA: SwapParty, chainB: SwapParty) => {
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

  const getContractsInfo = () => xcsContracts;

  const getOsmosisAccount = () => {
    return {
      client: osmosisClient,
      address: osmosisAddress,
      wallet: osmosisWallet,
    };
  };

  const setupXcsContracts = async (forceInstall = false) => {
    console.log('Seeting XCS contracts ...');
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

    console.log('XCS contracts instantiation completed!');

    return xcsContracts;
  };

  const setupXcsState = async (
    prefixList: Prefix[],
    channelList: Channel[],
  ) => {
    console.log('Seeting XCS state ...');

    if (!(await isXcsStateSet(channelList))) {
      for (const { chain, prefix } of prefixList) {
        console.log(`Seeting Prefix for ${chain} ...`);
        await setupXcsPrefix(chain, prefix);
      }

      for (const { primary, counterParty } of channelList) {
        console.log(
          `Seeting Channel Link for ${primary} and ${counterParty} ...`,
        );
        await setupXcsChannelLink(primary, counterParty);
      }
    }

    console.log('XCS state updated!');
  };

  const setupNewPool = async (originChain = 'agoric', originDenom = 'ubld') => {
    if (!(await isRouteSet(originChain, originDenom))) {
      console.log(`Pool being created with assets uosmo and ${originDenom}`);
      await fundRemote(originChain, originDenom);
      const { poolId, hash } = await createPoolAgainstOsmo(
        originChain,
        originDenom,
      );
      const denomHash = `ibc/${hash}`;
      await setPoolRoute('uosmo', denomHash, poolId.toString());
      await setPoolRoute(denomHash, 'uosmo', poolId.toString());
    } else {
      console.log(`Pool with assets uosmo and ${originDenom} already exisits`);
    }
  };

  const fundRemoteIfNecessary = async ({ chain, denom }: SwapParty) => {
    if (chain === 'osmosis') return;
    await fundRemote(chain, denom);
  };

  const setupNonNativePool = async (chainA: SwapParty, chainB: SwapParty) => {
    const isRouteSetNew = async (chainA: SwapParty, chainB: SwapParty) => {
      try {
        await getPoolRouteNew(chainA, chainB);
        return true;
      } catch (error) {
        console.error(
          `Pool Route is not set for ${chainA.chain}.${chainA.denom} <> ${chainB.chain}.${chainB.denom}`,
          error,
        );
        return false;
      }
    };

    if (!(await isRouteSetNew(chainA, chainB))) {
      console.log(
        `Pool being created with assets ${chainA.denom} and ${chainB.denom}`,
      );
      await Promise.all([
        fundRemoteIfNecessary(chainA),
        fundRemoteIfNecessary(chainB),
      ]);
      const { poolId, inDenom, outDenom } = await createNonNativePool(
        chainA,
        chainB,
      );
      // Don't Promise.all here to avoid sequence number mismatch
      await setPoolRoute(inDenom, outDenom, poolId.toString());
      await setPoolRoute(outDenom, inDenom, poolId.toString());
    } else {
      console.log(
        `Pool with assets ${chainA.denom} and ${chainB.denom} already exists`,
      );
    }
  };

  return {
    setupXcsContracts,
    setupXcsState,
    setupOsmosisPools,
    fundRemote,
    getDenomHash,
    getContractsInfo,
    getOsmosisAccount,
    getPools,
    getXcsState,
    getPoolRoute,
    getPoolRouteNew,
    getPool,
    getDenomHash,
    setupXcsContracts,
    setupXcsState,
    setupNewPool,
    setupNonNativePool,
    createNonNativePool,
    setPoolRoute,
  };
};

export type SetupOsmosisContext = Awaited<ReturnType<typeof osmosisSwapTools>>;
export type SetupOsmosisContextWithCommon = SetupOsmosisContext &
  SetupContextWithWallets;
export type SwapParty = { chain: string; denom: string; amount?: string };
