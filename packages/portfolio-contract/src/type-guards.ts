import type { Amount, Brand, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import type { CaipChainId } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { AxelarChains, YieldProtocol } from './constants.js';
import type { YieldProtocol as YieldProtocolT } from './constants.js';
import { AxelarGMPMessageType } from '@agoric/orchestration/src/axelar-types.js';

const { fromEntries, keys, values } = Object;

/**
 * @param brand must be a 'nat' brand, not checked
 */
export const makeNatAmountShape = (brand: Brand<'nat'>, min?: NatValue) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

export const AxelarGas = {
  Account: 'Account',
  Gmp: 'Gmp',
} as const;
export type ProposalShapes = {
  openPortfolio: {
    give: Partial<
      Record<YieldProtocolT | keyof typeof AxelarGas, Amount<'nat'>>
    >;
  };
};

export type AxelarChain = keyof typeof AxelarChains;
export type AxelarChainsMap = {
  [chain in AxelarChain]: {
    caip: CaipChainId;
    /**
     * Axelar chain IDs differ between mainnet and testnet.
     * See [supported-chains-list.ts](https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts)
     */
    axelarId: string;
  };
};

export type EVMOfferArgs = {
  evmChain?: AxelarChain;
};

export const makeProposalShapes = (usdcBrand: Brand<'nat'>) => {
  // TODO: Update usdcAmountShape, to include BLD/aUSDC after discussion with Axelar team
  const usdcAmountShape = makeNatAmountShape(usdcBrand);
  return {
    openPortfolio: M.splitRecord({
      give: M.recordOf(
        M.or(...keys({ ...YieldProtocol, ...AxelarGas })),
        usdcAmountShape,
      ),
    }) as TypedPattern<ProposalShapes['openPortfolio']>,
  };
};

export const EVMOfferArgsShape: TypedPattern<EVMOfferArgs> = M.splitRecord(
  {},
  {
    evmChain: M.or(...keys(AxelarChains)),
  },
) as TypedPattern<EVMOfferArgs>;

export type EVMContractAddresses = {
  aavePool: `0x${string}`;
  compound: `0x${string}`;
  factory: `0x${string}`;
  usdc: `0x${string}`;
};

export const EVMContractAddressesShape: TypedPattern<EVMContractAddresses> =
  M.splitRecord({
    aavePool: M.string(),
    compound: M.string(),
    factory: M.string(),
    usdc: M.string(),
  });

const AxelarChainInfoPattern = M.splitRecord({
  caip: M.string(),
  axelarId: M.string(),
});

export const AxelarChainsMapShape: TypedPattern<AxelarChainsMap> =
  M.splitRecord(
    fromEntries(
      keys(AxelarChains).map(chain => [chain, AxelarChainInfoPattern]),
    ) as Record<AxelarChain, typeof AxelarChainInfoPattern>,
  );

export const ContractCallShape = M.splitRecord({
  target: M.string(),
  functionSignature: M.string(),
  args: M.arrayOf(M.any()),
});

export const GMPArgsShape = M.splitRecord({
  destinationAddress: M.string(),
  type: M.or(...values(AxelarGMPMessageType)),
  destinationEVMChain: M.or(...keys(AxelarChains)),
  amount: M.splitRecord({
    brand: M.remotable(),
    value: M.nat(),
  }),
  contractInvocationData: M.arrayOf(ContractCallShape),
});
