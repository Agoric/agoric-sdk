// @ts-check

// Standard closing rule is a deadline and Timer. An alternative might allow for
// emergency votes that can close as soon as a quorum or other threshold is
// reached.

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

/** @type {CloseVoting} */
export const scheduleClose = (closingRule, closeVoting) => {
  const { timer, deadline } = closingRule;
  E(timer).setWakeup(
    deadline,
    Far('close voting', {
      wake: closeVoting,
    }),
  );
};
