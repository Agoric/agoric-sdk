// @ts-check
import { makeMarshal } from '@endo/marshal';
import test from 'ava';

import {
  isAbandonedError,
  isUpgradeDisconnection,
  makeUpgradeDisconnection,
} from '../src/upgrade-api.js';

test('isUpgradeDisconnection must recognize disconnection objects', t => {
  const disconnection = makeUpgradeDisconnection('vat upgraded', 2);
  t.true(isUpgradeDisconnection(disconnection));
});

test('isUpgradeDisconnection must recognize original-format disconnection objects', t => {
  const disconnection = harden({
    name: 'vatUpgraded',
    upgradeMessage: 'vat upgraded',
    incarnationNumber: 2,
  });
  t.true(isUpgradeDisconnection(disconnection));
});

test('isAbandonedError recognizes marshalled vat terminated errors', t => {
  const { fromCapData, toCapData } = makeMarshal(undefined, undefined, {
    serializeBodyFormat: 'smallcaps',
    errorIdNum: 70_000,
    marshalSaveError: () => {},
  });
  const error = harden(Error('vat terminated'));
  const remoteError = fromCapData(toCapData(error));

  t.true(isAbandonedError(remoteError));
});
