// Copyright (C) 2019 Agoric, under Apache License 2.0

import { Far } from '@agoric/marshal';
import { makeIssuerKit } from '@agoric/ertp';

export function buildRootObject(_vatPowers) {
  return Far('root', { makeIssuerKit });
}
