import { QueryDelegatorDelegationsResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';

export const plz = () => {
  const delegations = {
    agoric1valoper234: { denom: 'uatom', amount: '200' },
  };
  const { values } = Object;
  const qddr = QueryDelegatorDelegationsResponse.fromPartial({
    delegationResponses: values(delegations).map(d => ({
      delegation: {
        delegatorAddress: 'addrDelegatorTODO',
        validatorAddress: 'addrValidatorTODO',
        shares: d.amount,
      },
      balance: d,
    })),
  });

  const msgBytes = QueryDelegatorDelegationsResponse.encode(qddr).finish();
  const actual = QueryDelegatorDelegationsResponse.decode(msgBytes);
  return { qddr, msgBytes, actual };
};
