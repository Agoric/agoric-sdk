import { makeExo } from '@agoric/store';
import { Far, makeMarshal } from '@endo/marshal';

const nullMarshaller = makeMarshal(
  _ => null,
  _ => Far('dummy'),
);

export const remoteNullMarshaller = makeExo('nullMarshaller', undefined, {
  serialize: val => nullMarshaller.toCapData(val),
  unserialize: slot => nullMarshaller.fromCapData(slot),
  toCapData: val => nullMarshaller.toCapData(val),
  fromCapData: slot => nullMarshaller.fromCapData(slot),
});
