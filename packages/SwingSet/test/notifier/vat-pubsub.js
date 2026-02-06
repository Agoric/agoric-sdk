import { Far } from '@endo/marshal';
import { provide } from '@agoric/vat-data';
import {
  prepareDurablePublishKit,
  subscribeEach,
  subscribeLatest,
} from '@agoric/notifier';

export const buildRootObject = (_vatPowers, vatParameters, baggage) => {
  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'DurablePublishKit',
  );
  const { publisher, subscriber } = provide(
    baggage,
    'publishKitSingleton',
    () => makeDurablePublishKit(),
  );

  const { version } = vatParameters;

  return Far('root', {
    getVersion: () => version,
    getSubscriber: () => subscriber,
    subscribeEach: topic => subscribeEach(topic),
    subscribeLatest: topic => subscribeLatest(topic),
    publish: value => publisher.publish(value),
    finish: finalValue => publisher.finish(finalValue),
    fail: reason => publisher.fail(reason),
  });
};
