// Copyright (C) 2019 Agoric, under Apache License 2.0

/* global harden */

import produceIssuer from '@agoric/ertp';

export function buildRootObject(_vatPowers) {
  return harden({ produceIssuer });
}
