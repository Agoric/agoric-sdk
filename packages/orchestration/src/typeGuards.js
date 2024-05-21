// @ts-check
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

export const DelegationShape = M.record(); // TODO: DelegationShape fields

export const CosmosChainInfoShape = M.splitRecord(
  {
    chainId: M.string(),
    ibcConnectionInfo: M.splitRecord({
      id: M.string(), // TODO: IBCConnectionIDShape?
      client_id: M.string(),
      state: M.or('OPEN', 'TRYOPEN', 'INIT', 'CLOSED'),
      counterparty: {
        client_id: M.string(),
        connection_id: M.string(),
        prefix: {
          key_prefix: M.string(),
        },
      },
      versions: M.arrayOf({
        identifier: M.string(),
        features: M.arrayOf(M.string()),
      }),
      delay_period: M.nat(),
    }),
    stakingTokens: M.arrayOf({ denom: M.string() }),
  },
  {
    icaEnabled: M.boolean(),
    icqEnabled: M.boolean(),
    pfmEnabled: M.boolean(),
    ibcHooksEnabled: M.boolean(),
    allowedMessages: M.arrayOf(M.string()),
    allowedQueries: M.arrayOf(M.string()),
  },
);
