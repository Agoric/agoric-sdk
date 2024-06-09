import { AmountShape } from '@agoric/ertp';
import { M } from '@endo/patterns';

export const ConnectionHandlerI = M.interface('ConnectionHandler', {
  onOpen: M.callWhen(M.any(), M.string(), M.string(), M.any()).returns(M.any()),
  onClose: M.callWhen(M.any(), M.any(), M.any()).returns(M.any()),
  onReceive: M.callWhen(M.any(), M.string()).returns(M.any()),
});

export const ChainAddressShape = {
  address: M.string(),
  chainId: M.string(),
  addressEncoding: M.string(),
};

export const Proto3Shape = {
  typeUrl: M.string(),
  value: M.string(),
};

export const CoinShape = { value: M.bigint(), denom: M.string() };

export const ChainAmountShape = harden({ denom: M.string(), value: M.nat() });

export const AmountArgShape = M.or(AmountShape, ChainAmountShape);

export const DelegationShape = harden({
  delegatorAddress: M.string(),
  validatorAddress: M.string(),
  shares: M.string(), // TODO: bigint?
});

export const IBCTransferOptionsShape = M.splitRecord(
  {},
  {
    timeoutTimestamp: M.bigint(),
    timeoutHeight: {
      revisionHeight: M.bigint(),
      revisionNumber: M.bigint(),
    },
    memo: M.string(),
  },
);

export const CosmosChainInfoShape = M.splitRecord(
  {
    chainId: M.string(),
    connections: M.record(),
    stakingTokens: M.arrayOf({ denom: M.string() }),
  },
  {
    icaEnabled: M.boolean(),
    icqEnabled: M.boolean(),
    pfmEnabled: M.boolean(),
    ibcHooksEnabled: M.boolean(),
  },
);
