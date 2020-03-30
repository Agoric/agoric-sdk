// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { makeStateMachine } from '../../../../src/contracts/helpers/stateMachine';

test('stateMachine', t => {
  t.plan(6);
  try {
    const startState = 'empty';
    const allowedTransitions = [
      ['empty', ['open']],
      ['open', ['reallocating', 'cancelled']],
      ['reallocating', ['dispersing']],
      ['dispersing', ['closed']],
      ['cancelled', []],
      ['closed', []],
    ];
    const stateMachine = makeStateMachine(startState, allowedTransitions);
    t.equal(stateMachine.getStatus(), 'empty');
    t.ok(stateMachine.canTransitionTo('open'));
    t.notOk(stateMachine.canTransitionTo('closed'));
    stateMachine.transitionTo('open');
    t.ok(stateMachine.canTransitionTo('reallocating'));
    t.ok(stateMachine.canTransitionTo('cancelled'));
    t.equal(stateMachine.getStatus(), 'open');
  } catch (e) {
    t.assert(false, e);
  }
});

test('stateMachine check', t => {
  try {
    const startState = 'empty';
    const allowedTransitions = [
      ['empty', ['open']],
      ['open', ['closed']],
      ['closed', []],
    ];
    const stateMachine = makeStateMachine(startState, allowedTransitions);
    t.equal(stateMachine.getStatus(), 'empty');
    t.ok(stateMachine.canTransitionTo('open'));
    t.notOk(stateMachine.canTransitionTo('closed'));
    t.throws(
      () => stateMachine.transitionTo('open', 'closed'),
      `Shouldn't be able to transition from closed`,
    );
    t.throws(() => stateMachine.check('closed'), `state was not closed`);
    stateMachine.transitionTo('open');
    t.equal(stateMachine.getStatus(), 'open');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('stateMachine names', t => {
  try {
    const startState = 'empty';
    const allowedTransitions = [
      ['empty', ['open']],
      ['open', ['closed']],
      ['closed', []],
    ];
    const sm = makeStateMachine(startState, allowedTransitions);
    t.equal(sm.getStatus(), sm.empty);
    t.ok(sm.canTransitionTo(sm.open));
    t.notOk(sm.canTransitionTo(sm.closed));
    t.throws(
      () => sm.transitionTo(sm.open, sm.closed),
      `Shouldn't be able to transition from closed`,
    );
    t.throws(() => sm.check('closed'), `state was not closed`);
    sm.transitionTo(sm.open);
    t.equal(sm.getStatus(), sm.open);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

const makeFakeLog = () => {
  const msgs = [];
  return {
    log: s => msgs.push(s),
    getMessage: () => [...msgs],
  };
};

test('stateMachine log', t => {
  try {
    const startState = 'empty';
    const allowedTransitions = [
      ['empty', ['open']],
      ['open', ['closed']],
      ['closed', []],
    ];
    const stateMachine = makeStateMachine(startState, allowedTransitions);
    t.equal(stateMachine.getStatus(), 'empty');
    const log = makeFakeLog();
    stateMachine.transitionTo('open', 'empty', log.log);
    t.equal(stateMachine.getStatus(), 'open');
    t.deepEqual(log.getMessage(), ['transition from empty to open']);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
