// Copyright (C) 2019 Agoric, under Apache License 2.0

import { makeIssuerKit } from '@agoric/ertp';

export function buildRootObject(_vatPowers) {
  return harden({ makeIssuerKit });
}
