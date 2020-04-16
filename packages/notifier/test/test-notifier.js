// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import { produceNotifier } from '../src/notifier';

test('notifier - initital state', t => {
  const { notifier, updater } = produceNotifier();
  updater.updateState(1);

  const updateDeNovo = notifier.getUpdateSince();
  const updateFromNonExistent = notifier.getUpdateSince({});

  t.equals(updateDeNovo.value, 1, 'state is one');
  t.deepEquals(updateDeNovo, updateFromNonExistent, 'no param same as unknown');
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
