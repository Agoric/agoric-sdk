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

export const IBCChannelIDShape = M.string();
export const IBCChannelInfoShape = M.splitRecord({
  portId: M.string(),
  channelId: IBCChannelIDShape,
  counterPartyPortId: M.string(),
  counterPartyChannelId: IBCChannelIDShape,
  ordering: M.scalar(), // XXX
  state: M.scalar(), // XXX
  version: M.string(),
});
export const IBCConnectionIDShape = M.string();
export const IBCConnectionInfoShape = M.splitRecord({
  id: IBCConnectionIDShape,
  client_id: M.string(),
  state: M.scalar(), // XXX STATE_OPEN or...
  counterparty: {
    client_id: M.string(),
    connection_id: IBCConnectionIDShape,
    prefix: {
      key_prefix: M.string(),
    },
  },
  transferChannel: IBCChannelInfoShape,
});

export const CosmosChainInfoShape = M.splitRecord(
  {
    chainId: M.string(),
  },
  {
    connections: M.record(),
    stakingTokens: M.arrayOf({ denom: M.string() }),
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/9326
    icqEnabled: M.boolean(),
  },
);
