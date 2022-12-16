import { Far } from '@endo/marshal';
import { provide } from '@agoric/vat-data';
import { vivifyDurablePublishKit } from '../../src/index.js';

export const buildRootObject = (_vatPowers, vatParameters, baggage) => {
  const makeDurablePublishKit = vivifyDurablePublishKit(
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
    publish: value => publisher.publish(value),
    finish: finalValue => publisher.finish(finalValue),
    fail: reason => publisher.fail(reason),
  });
};
