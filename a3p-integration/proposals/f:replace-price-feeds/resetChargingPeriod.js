#!/usr/bin/env node

/* global setTimeout */

import {
  getQuoteBody,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
} from '@agoric/synthetic-chain';
import {
  proposeVaultDirectorParamChange,
  voteForNewParams,
} from './agoric-tools.js';

const GOV_ADDRESSES = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

const readChargingPeriod = async () => {
  const governanceBody = await getQuoteBody(
    'published.vaultFactory.governance',
  );
  const period =
    governanceBody.current.ChargingPeriod.value.match(/\+?(\d+)/)[1];
  return `+${period}`;
};

const setChargingPeriod = async period => {
  const params = {
    ChargingPeriod: period,
  };

  const path = { paramPath: { key: 'governedParams' } };

  await proposeVaultDirectorParamChange(GOV1ADDR, params, path);
  await voteForNewParams(GOV_ADDRESSES, 0);

  await new Promise(r => setTimeout(r, 65000));
};

const period = await readChargingPeriod();
await setChargingPeriod(period);
