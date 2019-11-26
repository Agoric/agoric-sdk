import { parse } from '@agoric/babel-parser';
import generate from '@babel/generator';
import makeEventualSendTransformer from '@agoric/transform-eventual-send';
import { maybeExtendPromise, makeHandledPromise } from '@agoric/eventual-send';

const shims = [
  `(${maybeExtendPromise})(Promise)`,
  `this.HandledPromise = (${makeHandledPromise})(Promise)`,
];
const transforms = [...makeEventualSendTransformer(parse, generate)];

export default function makeDefaultEvaluateOptions() {
  return { shims, transforms };
}
