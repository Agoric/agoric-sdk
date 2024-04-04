import test from '@endo/ses-ava/prepare-endo.js';
import { dataToBase64, base64ToBytes } from '@agoric/network';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '../dist/codegen/cosmos/staking/v1beta1/tx.js';
import { TxBody } from '../dist/codegen/cosmos/tx/v1beta1/tx.js';

test('helloworld', t => {
  t.pass();
});

test('cosmos/MsgDelegate', t => {
  const msg = MsgDelegate.toProtoMsg({
    delegatorAddress:
      'osmo1wh2yvlj26dzuwu54vnm7lnu0q7znjru8r8dzdam6k6yunnmkduds6p25l7',
    validatorAddress: 'osmovaloper1qjtcxl86z0zua2egcsz4ncff2gzlcndzs93m43',
    amount: { denom: 'uosmo', amount: '10' },
  });

  t.log('msg', typeof msg, msg);

  const bytes = TxBody.encode(
    TxBody.fromPartial({
      messages: [msg],
    }),
  ).finish();

  const packet = JSON.stringify({
    type: 1,
    data: dataToBase64(bytes),
    memo: '',
  });
  t.log('packet', packet);
  t.truthy(packet);
});

test('cosmos/MsgDelegateResponse', t => {
  const response =
    '{"result":"Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U="}';
  const { result } = JSON.parse(response);
  const msg = MsgDelegateResponse.decode(base64ToBytes(result));
  t.deepEqual(msg, {});
});
