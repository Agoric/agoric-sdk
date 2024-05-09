// @ts-check
import test from 'ava';
import {
  makeUpgradeDisconnection,
  isUpgradeDisconnection,
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
