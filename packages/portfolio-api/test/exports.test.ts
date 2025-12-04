/* eslint-disable import/no-extraneous-dependencies -- requiring the package itself to check exports map */
import test from 'ava';

import * as index from '@agoric/portfolio-api';

import * as ymaxMachine from '@agoric/portfolio-api/src/model/generated/ymax-machine.js';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});

test('ymaxMachine', t => {
  t.snapshot(Object.keys(ymaxMachine).sort());
});
