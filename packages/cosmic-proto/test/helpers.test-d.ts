import { expectType } from 'tsd';
import { typedJson } from '../src/helpers.js';
import type { ResponseTo, TypedJson } from '../src/helpers.js';
import type { JsonSafe } from '../src/codegen/json-safe.js';
import type { Timestamp } from '../src/codegen/google/protobuf/timestamp.js';

// MsgSend
{
  const request = typedJson('/cosmos.bank.v1beta1.MsgSend', {
    fromAddress: 'agoric1from',
    toAddress: 'agoric1to',
    amount: [{ denom: 'ucosm', amount: '1' }],
  });
  const response: ResponseTo<typeof request> = null as any;
  expectType<'/cosmos.bank.v1beta1.MsgSendResponse'>(response['@type']);
  response['@type'] = '/cosmos.bank.v1beta1.MsgSendResponse';
  // @ts-expect-error invalid value for response
  response['@type'] = '/cosmos.bank.v1beta1.MsgSend';
}

// QueryAllBalances
{
  const request = typedJson('/cosmos.bank.v1beta1.QueryAllBalancesRequest', {
    address: 'agoric1from',
  });
  const response: ResponseTo<typeof request> = null as any;
  expectType<'/cosmos.bank.v1beta1.QueryAllBalancesResponse'>(
    response['@type'],
  );
  response['@type'] = '/cosmos.bank.v1beta1.QueryAllBalancesResponse';
  // @ts-expect-error invalid value for response
  response['@type'] = '/cosmos.bank.v1beta1.QueryAllBalancesRequest';
  response.balances = [{ denom: 'ucosm', amount: '1' }];
}

// Bech32Prefix
{
  const request = typedJson('/cosmos.auth.v1beta1.Bech32PrefixRequest', {});
  const response: ResponseTo<typeof request> = null as any;
  expectType<'/cosmos.auth.v1beta1.Bech32PrefixResponse'>(response['@type']);
  response['@type'] = '/cosmos.auth.v1beta1.Bech32PrefixResponse';
}

// Delegation
{
  const request = typedJson('/cosmos.staking.v1beta1.MsgDelegate', {
    amount: { denom: 'ucosm', amount: '1' },
    delegatorAddress: 'agoric1from',
    validatorAddress: 'agoric1to',
  });
  const response: ResponseTo<typeof request> = null as any;
  expectType<'/cosmos.staking.v1beta1.MsgDelegateResponse'>(response['@type']);
}
{
  const request = typedJson('/cosmos.staking.v1beta1.MsgUndelegate', {
    amount: { denom: 'ucosm', amount: '1' },
    delegatorAddress: 'agoric1from',
    validatorAddress: 'agoric1to',
  });
  const response: ResponseTo<typeof request> = null as any;
  expectType<'/cosmos.staking.v1beta1.MsgUndelegateResponse'>(
    response['@type'],
  );
}

// JsonSafe
{
  const response: TypedJson<'/cosmos.staking.v1beta1.MsgUndelegateResponse'> =
    null as any;
  expectType<Timestamp>(response.completionTime);
  const responseJson: JsonSafe<typeof response> = null as any;
  expectType<string>(responseJson.completionTime.seconds);
}
