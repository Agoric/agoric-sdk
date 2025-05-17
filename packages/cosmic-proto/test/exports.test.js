/* eslint-disable import/no-extraneous-dependencies -- requiring the package itself to check exports map */
// @ts-check

import test from 'ava';

import '@endo/init';

import * as index from '@agoric/cosmic-proto';
import { agoric } from '@agoric/cosmic-proto/agoric/bundle.js';
import { cosmos } from '@agoric/cosmic-proto/cosmos/bundle.js';
import { ibc } from '@agoric/cosmic-proto/ibc/bundle.js';
import * as swingsetMsgs from '@agoric/cosmic-proto/swingset/msgs.js';
import * as swingsetQuery from '@agoric/cosmic-proto/swingset/query.js';
import * as vstorageQuery from '@agoric/cosmic-proto/vstorage/query.js';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});

test('swingset/msgs', t => {
  t.snapshot(Object.keys(swingsetMsgs).sort());
});

test('swingset/query', t => {
  t.snapshot(Object.keys(swingsetQuery).sort());
});

test('vstorage/query', t => {
  t.snapshot(Object.keys(vstorageQuery).sort());
});

test('agoric', t => {
  t.snapshot(Object.keys(agoric).sort());
});

test('cosmos', t => {
  t.snapshot(Object.keys(cosmos).sort());
});

test('ibc', t => {
  t.snapshot(Object.keys(ibc).sort());
});
