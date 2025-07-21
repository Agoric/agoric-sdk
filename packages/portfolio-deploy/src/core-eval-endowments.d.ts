/** @file provide type for E core eval endowment */
// XXX belongs in @agoric/vats?
import { EProxy } from '@endo/eventual-send';

declare global {
  const E: EProxy;
}

export {};
