// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import { E } from '@agoric/eventual-send';
import { produceNotifier } from '../src/notifier';

function delay(n, thunk) {
  if (n <= 0) {
    return thunk();
  }
  return E.when(null, () => delay(n - 1, thunk));
}

test('iterable adaptor - last state no delay', async t => {
  const { notifier, updater } = produceNotifier();
  updater.updateState(1);

  let lastState;
  for await (const u of notifier) {
    lastState = u;
    updater.resolve(88);
  }

  t.equals(lastState, 1, 'lastState is one');
  t.end();
});

test('iterable adaptor - last state delay', async t => {
  const { notifier, updater } = produceNotifier();
  delay(0, () => updater.updateState(1));
  delay(1, () => updater.updateState(2));
  delay(4, () => updater.updateState(3));
  delay(4, () => updater.resolve(99));

  let lastState;
  for await (const u of notifier) {
    lastState = u;
  }

  t.equals(lastState, 3, 'lastState is three');
  t.end();
});

test('notifier - single update', t => {
  t.plan(3);
  const { notifier, updater } = produceNotifier();
  updater.updateState(1);

  const updateDeNovo = notifier.getUpdateSince();

  const updateInWaiting = notifier.getUpdateSince(updateDeNovo.updateHandle);
  t.equals(updateDeNovo.value, 1, 'initial state is one');
  Promise.all([updateInWaiting]).then(([update]) => {
    t.equals(update.value, 3, 'updated state is eventually three');
  });

  t.equals(notifier.getUpdateSince({}).value, 1);
  updater.updateState(3);
});

test('notifier - update after state change', t => {
  t.plan(5);
  const { notifier, updater } = produceNotifier();
  updater.updateState(1);

  const updateDeNovo = notifier.getUpdateSince();

  const updateInWaiting = notifier.getUpdateSince(updateDeNovo.updateHandle);
  t.equals(updateDeNovo.value, 1, 'first state check (1)');
  Promise.all([updateInWaiting]).then(([update1]) => {
    t.equals(update1.value, 3, '4th check (delayed) 3');
    const thirdStatePromise = notifier.getUpdateSince(update1.updateHandle);
    Promise.all([thirdStatePromise]).then(([update2]) => {
      t.equals(update2.value, 5, '5th check (delayed) 5');
    });
  });

  t.equals(notifier.getUpdateSince({}).value, 1, '2nd check (1)');
  updater.updateState(3);

  t.equals(notifier.getUpdateSince({}).value, 3, '3rd check (3)');
  updater.updateState(5);
});

test('notifier - final state', t => {
  t.plan(6);
  const { notifier, updater } = produceNotifier();
  updater.updateState(1);

  const updateDeNovo = notifier.getUpdateSince();
  const updateInWaiting = notifier.getUpdateSince(updateDeNovo.updateHandle);
  t.equals(updateDeNovo.value, 1, 'initial state is one');
  Promise.all([updateInWaiting]).then(([update]) => {
    t.equals(update.value, 'final', 'state is "final"');
    t.notOk(update.updateHandle, 'no handle after close');
    const postFinalUpdate = notifier.getUpdateSince(update.updateHandle);
    Promise.all([postFinalUpdate]).then(([after]) => {
      t.equals(after.value, 'final', 'stable');
      t.notOk(after.updateHandle, 'no handle after close');
    });
  });

  t.equals(notifier.getUpdateSince({}).value, 1, 'still one');
  updater.resolve('final');
});
