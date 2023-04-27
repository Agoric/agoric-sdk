// Copyright (C) 2019 Agoric, under Apache License 2.0

import { Far } from '@endo/marshal';
import { makeSharingService } from '../../../src/sharing.js';

export function buildRootObject() {
  return Far('root', { makeSharingService });
}
