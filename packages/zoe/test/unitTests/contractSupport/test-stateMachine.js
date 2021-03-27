// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeStateMachine } from '../../../src/contractSupport';

test('stateMachine', t => {
  t.plan(4);
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
  t.truthy(stateMachine.canTransitionTo('open'));
  t.falsy(stateMachine.canTransitionTo('closed'));
  stateMachine.transitionTo('open');
  t.is(stateMachine.getStatus(), 'open');
});
