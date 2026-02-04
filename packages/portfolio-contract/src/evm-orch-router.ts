import type { GuestInterface } from '@agoric/async-flow';
import type { Brand } from '@agoric/ertp';
import {
  deeplyFulfilledObject,
  fromTypedEntries,
  makeTracer,
  objectMap,
} from '@agoric/internal';
import type {
  BaseChainInfo,
  Bech32Address,
  Chain,
  Orchestrator,
} from '@agoric/orchestration';
import { AxelarChain, type TxId } from '@agoric/portfolio-api';
import { hexToBytes } from '@noble/hashes/utils';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import {
  encodeFunctionData,
  type Abi,
  type AbiStateMutability,
  type Address,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type Hex,
} from 'viem';
import type {
  DepositPermit,
  RouterInstruction,
} from './interfaces/orch-router.ts';
import type {
  AxelarId,
  EVMContractAddresses,
  GmpAddresses,
} from './portfolio.contract.ts';
import type { GMPAccountInfo, PortfolioKit } from './portfolio.exo.ts';
import type { PortfolioInstanceContext } from './portfolio.flows.ts';
import type { EVMContractAddressesMap } from './type-guards.ts';
import { toUtf8 } from './utils/evm-orch-factory.ts';
import { computeCreate2Address } from './utils/create2.ts';

const { keys } = Object;
const trace = makeTracer('OrchRouter');

// TODO: use remoteAccountBytecodeHash for address prediction,
// along factory address and lca hash as salt

// TODO: use portfolio LCA to send GMP calls to router

// TODO: when registering transaction, must add some field indicating resolver
// should use the new OperationResult event (which relies on txId)
// See https://github.com/Agoric/agoric-sdk/pull/12414

// TODO: as a first step, issue separate calls for makeAccount (with deposit optional)
// and multicalls to match whatever high level flow logic already exists

const collectChainInfo = async (
  orch: Orchestrator,
): Promise<Record<AxelarChain, BaseChainInfo<'eip155'>>> =>
  deeplyFulfilledObject(
    objectMap(
      fromTypedEntries(
        (keys(AxelarChain) as AxelarChain[]).map(name => [name, name]),
      ),
      async name => {
        const chain = await orch.getChain(name);
        const info = await chain.getChainInfo();
        return harden(info);
      },
    ),
  );

export const makeAxelarChainHub = (details: {
  orch: Orchestrator;
  gmpFeeInfo: { brand: Brand<'nat'>; denom: string };
  axelarIds: AxelarId;
  contracts: EVMContractAddressesMap;
  remoteAccountBytecodeHash: Hex;
  gmpAddresses: GmpAddresses;
}) => {
  const { orch } = details;
  return harden({
    collectChainInfo: () => collectChainInfo(orch),
  });
};

// TODO/WIP type AxelarChainHub = ReturnType<typeof makeAxelarChainHub>;

type AbiContractArgs<
  TAbi extends Abi,
  Name extends ContractFunctionName<TAbi, AbiStateMutability>,
> =
  ContractFunctionArgs<
    TAbi,
    AbiStateMutability,
    Name
  > extends readonly unknown[]
    ? ContractFunctionArgs<TAbi, AbiStateMutability, Name>
    : readonly unknown[];

type AbiContract<TAbi extends Abi> = {
  [Name in ContractFunctionName<TAbi, AbiStateMutability>]: (
    ...args: AbiContractArgs<TAbi, Name>
  ) => void;
};

type CallData = { target: Address; data: Hex };

export const makePortfolioRouter = (
  pk: GuestInterface<PortfolioKit>,
  ctx: PortfolioInstanceContext,
  infoByChain: Record<AxelarChain, BaseChainInfo<'eip155'>>,
  _axelar: Chain<{ chainId: string }>,
) => {
  const pId = pk.reader.getPortfolioId();
  const lca = pk.reader.getLocalAccount();
  const portfolioLCA = lca.getAddress().value;

  const predictAddress = (
    owner: Bech32Address,
    chainName: AxelarChain,
    contracts: EVMContractAddresses,
  ) => {
    const traceChain = trace.sub(`portfolio${pId}`).sub(chainName);
    const factoryAddress = contracts.remoteAccountFactory;
    traceChain('factory', factoryAddress);
    assert(factoryAddress);

    assert(owner.length > 0);
    const salt = keccak256(toUtf8(owner));

    // TODO: old flow may not have bytecode in ctx?

    const initCodeHash = hexToBytes(
      ctx.remoteAccountBytecodeHash.replace(/^0x/, ''),
    );

    const remoteAddress = computeCreate2Address({
      deployer: factoryAddress,
      salt,
      initCodeHash,
    });

    const chainInfo = infoByChain[chainName];
    const info: GMPAccountInfo = {
      namespace: 'eip155',
      chainName,
      chainId: `${chainInfo.namespace}:${chainInfo.reference}`,
      remoteAddress,
      routerAddress: contracts.remoteAccountRouter,
    };
    traceChain('CREATE2', info.remoteAddress, 'for', owner);
    return info;
  };

  const makeSession = () => {
    const calls: CallData[] = [];
    const makeContract = <TAbi extends Abi>(
      target: Address,
      abi: TAbi,
    ): AbiContract<TAbi> => {
      const stubs: Record<string, (...args: readonly unknown[]) => void> = {};
      for (const item of abi) {
        if (item.type !== 'function') continue;
        const functionItem = item as Extract<
          TAbi[number],
          { type: 'function' }
        >;
        const functionAbi = [functionItem] as const;
        const functionName = functionItem.name as ContractFunctionName<
          typeof functionAbi,
          AbiStateMutability
        >;
        type FnArgs = AbiContractArgs<typeof functionAbi, typeof functionName>;
        const fn = (...argsUnknown: readonly unknown[]) => {
          const args = argsUnknown as FnArgs;
          const data = encodeFunctionData({
            abi: functionAbi,
            functionName,
            args,
          } as Parameters<typeof encodeFunctionData>[0]);
          calls.push({ target, data });
        };
        if (stubs[item.name]) {
          assert.fail(
            `ABI overload for ${item.name} requires disambiguation (not supported)`,
          );
        }
        stubs[item.name] = fn;
      }
      return harden(stubs) as AbiContract<TAbi>;
    };
    return harden({
      makeContract,
      finish: () => harden(calls),
    });
  };
  type Session = ReturnType<typeof makeSession>;

  const buildPayload = (
    config: {
      id: TxId;
      chainName: AxelarChain;
      depositPermit?: DepositPermit;
    },
    thunk: (
      s: Pick<Session, 'makeContract'>,
      addr: Address,
      contracts: EVMContractAddresses,
    ) => void,
  ): RouterInstruction => {
    const { chainName } = config;
    const contracts = ctx.contracts[chainName];

    // TODO: isNew flag
    // const evmAccount =
    //   reserve.state === 'new'
    //     ? predictAddress(lca.getAddress().value)
    //     : pk.reader.getGMPInfo(chainName);
    const evmAccount = predictAddress(portfolioLCA, chainName, contracts);
    const remoteAccountAddress = evmAccount.remoteAddress;

    const { makeContract, finish } = makeSession();
    thunk({ makeContract }, remoteAccountAddress, contracts);
    const multiCalls = finish();

    const { id, depositPermit } = config;
    return {
      id,
      expectedAccountAddress: remoteAccountAddress,
      depositPermit: depositPermit ? [depositPermit] : [],
      multiCalls,
    };
  };

  return harden({
    buildPayload,
  });
};
