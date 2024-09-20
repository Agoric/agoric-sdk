import { VowShape } from '@agoric/vow';
import { M } from '@endo/patterns';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {ChainAddress, CosmosAssetInfo, Chain, ChainInfo, CosmosChainInfo, DenomAmount, DenomDetail, DenomInfo, AmountArg, CosmosValidatorAddress} from './types.js';
 * @import {Any as Proto3Msg} from '@agoric/cosmic-proto/google/protobuf/any.js';
 * @import {Delegation} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {TxBody} from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
 * @import {TypedJson} from '@agoric/cosmic-proto';
 */

/**
 * Used for IBC Channel Connections that only send outgoing transactions. If
 * your channel expects incoming transactions, please extend this interface to
 * include the `onReceive` handler.
 */
export const OutboundConnectionHandlerI = M.interface(
  'OutboundConnectionHandler',
  {
    onOpen: M.callWhen(M.any(), M.string(), M.string(), M.any()).returns(
      M.any(),
    ),
    onClose: M.callWhen(M.any(), M.any(), M.any()).returns(M.any()),
  },
);

/** @type {TypedPattern<ChainAddress>} */
export const ChainAddressShape = {
  chainId: M.string(),
  encoding: M.string(),
  value: M.string(),
};

/** @type {TypedPattern<Proto3Msg>} */
export const Proto3Shape = {
  typeUrl: M.string(),
  value: M.string(),
};

/** @internal */
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

/** @internal */
export const IBCChannelIDShape = M.string();
/** @internal */
export const IBCChannelInfoShape = M.splitRecord({
  portId: M.string(),
  channelId: IBCChannelIDShape,
  counterPartyPortId: M.string(),
  counterPartyChannelId: IBCChannelIDShape,
  ordering: M.scalar(), // XXX
  state: M.scalar(), // XXX
  version: M.string(),
});
/** @internal */
export const IBCConnectionIDShape = M.string();
/** @internal */
export const IBCConnectionInfoShape = M.splitRecord({
  id: IBCConnectionIDShape,
  client_id: M.string(),
  state: M.scalar(), // XXX STATE_OPEN or...
  counterparty: {
    client_id: M.string(),
    connection_id: IBCConnectionIDShape,
  },
  transferChannel: IBCChannelInfoShape,
});

/** @type {TypedPattern<CosmosAssetInfo>} */
export const CosmosAssetInfoShape = M.splitRecord({
  base: M.string(),
  name: M.string(),
  display: M.string(),
  symbol: M.string(),
  denom_units: M.arrayOf(
    M.splitRecord({ denom: M.string(), exponent: M.number() }),
  ),
});

/** @type {TypedPattern<CosmosChainInfo>} */
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

/** @type {TypedPattern<ChainInfo>} */
export const ChainInfoShape = M.splitRecord({
  chainId: M.string(),
});
export const LocalChainAccountShape = M.remotable('LocalChainAccount');
export const DenomShape = M.string();

/** @type {TypedPattern<DenomInfo<any, any>>} */
export const DenomInfoShape = {
  chain: M.remotable('Chain'),
  base: M.remotable('Chain'),
  brand: M.or(M.remotable('Brand'), M.undefined()),
  baseDenom: M.string(),
};

/** @type {TypedPattern<DenomAmount>} */
export const DenomAmountShape = { denom: DenomShape, value: M.bigint() };

/** @type {TypedPattern<Amount<'nat'>>} */
export const AnyNatAmountShape = harden({
  brand: M.remotable('Brand'),
  value: M.nat(),
});

/** @type {TypedPattern<AmountArg>} */
export const AmountArgShape = M.or(AnyNatAmountShape, DenomAmountShape);

/**
 * @type {TypedPattern<{
 *   validator: CosmosValidatorAddress;
 *   amount: AmountArg;
 * }>}
 */
export const DelegationShape = M.splitRecord(
  {
    validator: ChainAddressShape,
    amount: AmountArgShape,
  },
  { delegator: ChainAddressShape },
);

/** Approximately @see RequestQuery */
export const ICQMsgShape = M.splitRecord(
  { path: M.string(), data: M.string() },
  { height: M.string(), prove: M.boolean() },
);

/** @type {TypedPattern<TypedJson>} */
export const TypedJsonShape = M.splitRecord({ '@type': M.string() });

/** @see {Chain} */
export const chainFacadeMethods = harden({
  getChainInfo: M.call().returns(VowShape),
  makeAccount: M.call().returns(VowShape),
});

/**
 * for google/protobuf/timestamp.proto, not to be confused with TimestampShape
 * from `@agoric/time`
 *
 * `seconds` is a big integer but since it goes through JSON it is encoded as
 * string
 */
export const TimestampProtoShape = { seconds: M.string(), nanos: M.number() };

/**
 * see {@link TxBody} for more details
 *
 * @internal
 */
export const TxBodyOptsShape = M.splitRecord(
  {},
  {
    memo: M.string(),
    timeoutHeight: M.bigint(),
    extensionOptions: M.arrayOf(M.any()),
    nonCriticalExtensionOptions: M.arrayOf(M.any()),
  },
);

/**
 * Ensures at least one {@link AmountKeywordRecord} entry is present and only
 * permits Nat (fungible) amounts.
 */
export const AnyNatAmountsRecord = M.and(
  M.recordOf(M.string(), AnyNatAmountShape),
  M.not(harden({})),
);
harden(AnyNatAmountsRecord);
