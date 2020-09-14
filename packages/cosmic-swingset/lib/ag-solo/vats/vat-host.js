// Copyright (C) 2018 Agoric, under Apache License 2.0

import { makeContractHost } from '@agoric/spawner';

export function buildRootObject(vatPowers) {
  return harden({
    makeHost() {
      return harden(makeContractHost(vatPowers));
    },
  });
}
