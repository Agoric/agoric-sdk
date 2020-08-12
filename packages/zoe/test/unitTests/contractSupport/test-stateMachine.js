// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import test from 'ava';

import { makeStateMachine } from '../../../src/contractSupport';

test('stateMachine', t => {
  t.plan(4);
  try {
    const startState = 'empty';
    const allowedTransitions = [
      ['empty', ['open']],
      ['open', ['rellocating', 'cancelled']],
      ['reallocating', ['dispersing']],
      ['dispersing', ['closed']],
      ['cancelled', []],
      ['closed', []],
    ];
    const stateMachine = makeStateMachine(startState, allowedTransitions);
   t.is(stateMachine.getStatus(), 'empty');
   t.assert(stateMachine.canTransitionTo('open'));
   t.falsy(stateMachine.canTransitionTo('closed'));
    stateMachine.transitionTo('open');
   t.is(stateMachine.getStatus(), 'open');
  } catch (e) {
    t.assert(false, e);
  }
});
