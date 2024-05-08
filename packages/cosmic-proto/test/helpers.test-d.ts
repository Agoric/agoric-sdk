import { expectType } from 'tsd';
import { typedJson } from '../src/helpers.js';
import type { ResponseTo } from '../src/helpers.ts';

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
