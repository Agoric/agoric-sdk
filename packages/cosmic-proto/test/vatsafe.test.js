// @ts-check
/* eslint-disable import/no-extraneous-dependencies -- requiring the package itself to check exports map */
import test from '@endo/ses-ava/prepare-endo.js';

import { MsgDelegate } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';

test('proto encoding', t => {
  const contents = {
    delegatorAddress:
      'osmo1wh2yvlj26dzuwu54vnm7lnu0q7znjru8r8dzdam6k6yunnmkduds6p25l7',
    validatorAddress: 'osmovaloper1qjtcxl86z0zua2egcsz4ncff2gzlcndzs93m43',
    amount: { denom: 'uosmo', amount: '10' },
  };
  t.deepEqual(
    MsgDelegate.fromProtoMsg(MsgDelegate.toProtoMsg(contents)),
    contents,
  );
});
