// Copyright (C) 2018 Agoric, under Apache License 2.0

import { Far } from '@agoric/marshal';
import { makeContractHost } from '../../../src/contractHost';

export function buildRootObject(vatPowers) {
  return Far('root', {
    makeHost() {
      return makeContractHost(vatPowers);
    },
  });
}
