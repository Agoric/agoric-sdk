import { Far } from '@endo/marshal';
import { provide } from '@agoric/vat-data';
import {
  prepareDurablePublishKit,
  subscribeEach,
  subscribeLatest,
} from '../../src/index.js';

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
    getParameters: () => vatParameters,
    getSubscriber: () => subscriber,
    subscribeEach: topic => subscribeEach(topic),
    subscribeLatest: topic => subscribeLatest(topic),
    makeDurablePublishKit: (...args) => makeDurablePublishKit(...args),
    publish: value => publisher.publish(value),
    finish: finalValue => publisher.finish(finalValue),
    fail: reason => publisher.fail(reason),
  });
};
