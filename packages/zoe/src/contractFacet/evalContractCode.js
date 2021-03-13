// @ts-check

import { importBundle } from '@agoric/import-bundle';
import { assert } from '@agoric/assert';

const evalContractBundle = bundle => {
  const louderConsole = {
    ...console,
    log: console.info,
  };

  const defaultEndowments = {
    console: louderConsole,
    assert,
  };

  const fullEndowments = Object.create(null, {
    ...Object.getOwnPropertyDescriptors(defaultEndowments),
  });

  const installation = importBundle(bundle, {
    endowments: fullEndowments,
  });

  installation.catch(() => {});
  return installation;
};

export { evalContractBundle };
