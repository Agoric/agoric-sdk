import { NatAmountShape } from '@agoric/ertp';
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

/**
 * - `give` allows any `Nat` `issuerKeyword` record. Must be exactly one entry.
 * - `exit` must be `{ waived: null }`
 * - `want` must be empty
 */
export const DepositProposalShape = M.splitRecord(
  {
    give: M.recordOf(M.string(), NatAmountShape, {
      numPropertiesLimit: 1,
    }),

    exit: { waived: M.null() },
  },
  { want: {} },
);
